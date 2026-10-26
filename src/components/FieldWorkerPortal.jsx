import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Camera, CheckCircle2, Wrench, Send, Trash2, Phone, User, LogOut, Lock, Navigation, AlertTriangle, PlusCircle, X, Edit3, ShieldAlert, Search, Loader2, Plus, AlertCircle, XCircle, RotateCcw } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';
import { saveJobToFirebase } from '../services/firebase';

// 🌐 URL ของ Google Apps Script Web App (ตรวจสอบให้แน่ใจว่าเป็น URL ล่าสุดจากการ Deploy)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbywoc-W-hGbo4AbCJm78g4lic5pz0bsqoAqBxtDnbb7Q7_xV5J3u12W3oK7lGzRkVrRww/exec";

// รายการอุปกรณ์สำรอง (Fallback Data) ในกรณีดึงข้อมูลผ่าน API ไม่สำเร็จ
const DEFAULT_EQUIPMENT_LIST = [
  { id: 'EQ-001', name: 'ข้อต่อตรง HDPE 110 มม.', unit: 'ตัว' },
  { id: 'EQ-002', name: 'ท่อ HDPE ขนาด 110 มม.', unit: 'เมตร' },
  { id: 'EQ-003', name: 'เทปพันเกลียว', unit: 'ม้วน' },
  { id: 'EQ-004', name: 'กาวทาท่อ PVC', unit: 'กระป๋อง' },
  { id: 'EQ-005', name: 'ข้อต่อตรง PVC 2 นิ้ว', unit: 'ตัว' },
  { id: 'EQ-006', name: 'ประตูน้ำทองเหลือง 1 นิ้ว', unit: 'ตัว' },
  { id: 'EQ-007', name: 'หน้าจานเหล็ก 110 มม.', unit: 'ชุด' },
];

export default function FieldWorkerPortal({ jobs, onUpdateJobStatus, teams, onLogout, onJobCreated, onDeleteJob }) {
  const [currentTeam, setCurrentTeam] = useState(localStorage.getItem('pwa_worker_team') || '');
  const [selectedJob, setSelectedJob] = useState(null);
  
  // State สำหรับเปิด Modal เพิ่มใบงานด่วนหน้างาน (Ad-hoc Job)
  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  
  // State สำหรับแก้ไขงานเดิม (Editing Job)
  const [editingJob, setEditingJob] = useState(null);

  const [adHocData, setAdHocData] = useState({
    receivedNo: '',
    reporterName: '',
    phone: '',
    location: '',
    complaintTopicType: 'ท่อแตกรั่ว',
    customComplaintTopic: '',
    urgency: 'ด่วน'
  });

  const [images, setImages] = useState({ before: [], inProgress: [], after: [] });
  
  // 🛠️ State สำหรับระบบเลือกอุปกรณ์จาก Google Sheets
  const [equipmentList, setEquipmentList] = useState(DEFAULT_EQUIPMENT_LIST);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedEquipmentItem, setSelectedEquipmentItem] = useState(null);
  const [equipmentQuantity, setEquipmentQuantity] = useState(1);
  const [selectedEquipmentList, setSelectedEquipmentList] = useState([]);
  const [notes, setNotes] = useState(''); // เก็บข้อความสรุปอุปกรณ์

  // ⚠️ State เพิ่มเติมสำหรับกรณีไม่สามารถซ่อมได้
  const [isUnrepairable, setIsUnrepairable] = useState(false);
  const [unrepairableReasonType, setUnrepairableReasonType] = useState('ติดสิ่งกีดขวาง/โครงสร้างอาคาร/สิ่งปลูกสร้าง');
  const [customUnrepairableReason, setCustomUnrepairableReason] = useState('');
  const [unrepairableDetails, setUnrepairableDetails] = useState('');

  // State สำหรับชนิดท่อและขนาดท่อ
  const [pipeType, setPipeType] = useState('HDPE');
  const [pipeSize, setPipeSize] = useState('110');

  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pipeTypes = ['PB', 'PVC', 'AC', 'HDPE', 'GS', 'SP'];
  const pipeSizes = ['20', '25', '40', '50', '100', '110', '150', '160', '200', '225', '250', '280', '300', '315', '400', '630'];

  const unrepairableReasons = [
    'ติดสิ่งกีดขวาง/โครงสร้างอาคาร/สิ่งปลูกสร้าง',
    'จำเป็นต้องใช้เครื่องจักรใหญ่/รถขุด (ตักเปิดหน้าดิน)',
    'ต้องประสานตัดท่อเมนใหญ่/ดับน้ำพื้นที่กว้าง',
    'ท่อวางลึกเกินศักยภาพเครื่องมือช่างภาคสนาม',
    'รอหนังสืออนุญาตรื้อถอน/ขุดเจาะจากทางหลวงหรือท้องถิ่น',
    'พบว่าเป็นท่อภายในบ้าน/หลังมาตรผู้ใช้น้ำ',
    'หาจุดแตกรั่วไม่พบ (ต้องใช้เครื่องฟังเสียงสำรวจ)',
    'อื่นๆ (ระบุในรายละเอียด)'
  ];

  // 🌐 ดึงข้อมูลรายการอุปกรณ์จาก Google Sheets (ผ่าน Web App API)
  useEffect(() => {
    const fetchEquipmentFromSheets = async () => {
      setIsLoadingEquipment(true);
      try {
        const response = await fetch(`${WEB_APP_URL}?action=equipment`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setEquipmentList(data);
        } else {
          setEquipmentList(DEFAULT_EQUIPMENT_LIST);
        }
      } catch (err) {
        console.error("Error fetching equipment:", err);
        setEquipmentList(DEFAULT_EQUIPMENT_LIST);
      } finally {
        setIsLoadingEquipment(false);
      }
    };

    if (currentTeam) {
      fetchEquipmentFromSheets();
    }
  }, [currentTeam]);

  // ฟังก์ชันพิมพ์ค้นหาอุปกรณ์อัตโนมัติ
  const handleSearchEquipmentChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (!value || !value.trim()) {
      setSuggestions([]);
    } else {
      const query = value.trim().toLowerCase();
      const filtered = equipmentList.filter(item => {
        const itemName = String(
          item.name || item.itemName || item.ชื่ออุปกรณ์ || item.รายการ || item.อุปกรณ์ || ''
        ).trim().toLowerCase();

        return itemName.includes(query);
      });
      setSuggestions(filtered);
    }
  };

  // เลือกอุปกรณ์จากรายชื่อแนะนำ
  const handleSelectEquipmentSuggestion = (item) => {
    const itemName = item.name || item.itemName || item.อุปกรณ์ || '';
    setSelectedEquipmentItem(item);
    setSearchTerm(itemName);
    setSuggestions([]);
  };

  // กดปุ่มเพิ่มอุปกรณ์ลงในรายการสะสม
  const handleAddEquipmentToList = () => {
    if (!searchTerm.trim()) {
      alert("กรุณาพิมพ์หรือเลือกชื่ออุปกรณ์");
      return;
    }

    const itemName = selectedEquipmentItem 
      ? (selectedEquipmentItem.name || selectedEquipmentItem.itemName || selectedEquipmentItem.อุปกรณ์) 
      : searchTerm.trim();
    
    const itemUnit = selectedEquipmentItem 
      ? (selectedEquipmentItem.unit || selectedEquipmentItem.หน่วยนับ || selectedEquipmentItem.หน่วย || 'หน่วย') 
      : 'หน่วย';

    const newItem = {
      id: Date.now(),
      name: itemName,
      quantity: Number(equipmentQuantity) || 1,
      unit: itemUnit
    };

    const updatedList = [...selectedEquipmentList, newItem];
    setSelectedEquipmentList(updatedList);

    const summaryText = updatedList.map(i => `- ${i.name}: ${i.quantity} ${i.unit}`).join('\n');
    setNotes(summaryText);

    setSearchTerm('');
    setSelectedEquipmentItem(null);
    setEquipmentQuantity(1);
  };

  // ลบอุปกรณ์ออกจากรายการสะสม
  const handleRemoveEquipmentItem = (id) => {
    const updatedList = selectedEquipmentList.filter(item => item.id !== id);
    setSelectedEquipmentList(updatedList);
    const summaryText = updatedList.map(i => `- ${i.name}: ${i.quantity} ${i.unit}`).join('\n');
    setNotes(summaryText);
  };

  const handleLogin = (teamName) => {
    setCurrentTeam(teamName);
    localStorage.setItem('pwa_worker_team', teamName);
  };

  const handleLogoutAction = () => {
    setCurrentTeam('');
    localStorage.removeItem('pwa_worker_team');
    setSelectedJob(null);
    if (onLogout) {
      onLogout();
    }
  };

  // 🕒 ฟังก์ชันสร้างเลขที่รับแจ้งอัตโนมัติ
  const generateAutoReceivedNo = () => {
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
    const yy = String(thaiTime.getFullYear()).slice(-2);
    const mm = String(thaiTime.getMonth() + 1).padStart(2, '0');
    const dd = String(thaiTime.getDate()).padStart(2, '0');
    const hh = String(thaiTime.getHours()).padStart(2, '0');
    const min = String(thaiTime.getMinutes()).padStart(2, '0');
    const dateCode = `${yy}${mm}${dd}-${hh}${min}`;

    const runningNo = String((jobs ? jobs.length : 0) + 1).padStart(2, '0');
    const teamShortName = currentTeam || 'ทีมช่าง';

    return `${teamShortName}-${dateCode}-${runningNo}`;
  };

  const handleOpenAdHocModal = () => {
    setEditingJob(null);
    setAdHocData({
      receivedNo: generateAutoReceivedNo(),
      reporterName: '',
      phone: '',
      location: '',
      complaintTopicType: 'ท่อแตกรั่ว',
      customComplaintTopic: '',
      urgency: 'ด่วน'
    });
    setIsAdHocModalOpen(true);
  };

  const handleOpenEditModal = (job) => {
    if (job.channel && job.channel !== 'พบเหตุหน้างาน/แจ้งฉุกเฉิน') {
      alert("ไม่อนุญาตให้แก้ไข: งานนี้เป็นงานที่ได้รับมอบหมายจากแอดมิน");
      return;
    }

    setEditingJob(job);
    const isStandardTopic = ['ท่อแตกรั่ว', 'น้ำไม่ไหล/น้ำไหลอ่อน'].includes(job.complaintTopic);
    
    setAdHocData({
      receivedNo: job.receivedNo || job.id,
      reporterName: job.reporterName !== 'ไม่ระบุชื่อ' ? job.reporterName : '',
      phone: job.phone !== '-' ? job.phone : '',
      location: job.location || '',
      complaintTopicType: isStandardTopic ? job.complaintTopic : 'อื่นๆ',
      customComplaintTopic: isStandardTopic ? '' : job.complaintTopic,
      urgency: job.urgency || 'ปกติ'
    });
    setIsAdHocModalOpen(true);
  };

  const handleDeleteJobAction = async (job) => {
    if (job.channel && job.channel !== 'พบเหตุหน้างาน/แจ้งฉุกเฉิน') {
      alert("ไม่อนุญาตให้ลบ: งานนี้เป็นงานที่ได้รับมอบหมายจากแอดมิน");
      return;
    }

    if (job.status === 'COMPLETED') {
      alert("ไม่สามารถลบใบงานที่ซ่อมเสร็จสิ้นแล้วได้");
      return;
    }

    if (window.confirm(`คุณต้องการลบใบแจ้งซ่อมเลขที่ "${job.receivedNo || job.id}" ใช่หรือไม่?`)) {
      try {
        if (onDeleteJob) {
          await onDeleteJob(job.id);
        } else {
          await onUpdateJobStatus(job.id, 'DELETED');
        }
        alert("ลบรายการแจ้งซ่อมเรียบร้อยแล้ว");
      } catch (err) {
        console.error("Error deleting job:", err);
        alert("เกิดข้อผิดพลาดในการลบรายการ");
      }
    }
  };

  const getUrgencyWeight = (urgency) => {
    switch (urgency) {
      case 'ด่วนมาก': return 3;
      case 'ด่วน': return 2;
      case 'ปกติ': 
      default: return 1;
    }
  };

  // 🔄 ดึงทั้งงาน DISPATCHED, IN_PROGRESS และ UNREPAIRABLE (เพื่อให้สามารถกลับมาซ่อมซ้ำได้)
  const activeJobs = jobs
    .filter(j => {
      const matchTechName = j.techName && j.techName.trim() === currentTeam.trim();
      const matchTechnicianStr = j.technician && j.technician.includes(currentTeam);
      const isMyTeam = matchTechName || matchTechnicianStr;
      
      const isValidStatus = ['DISPATCHED', 'IN_PROGRESS', 'UNREPAIRABLE'].includes(j.status);
      return isMyTeam && isValidStatus;
    })
    .sort((a, b) => {
      const weightA = getUrgencyWeight(a.urgency);
      const weightB = getUrgencyWeight(b.urgency);
      if (weightA !== weightB) return weightB - weightA;

      const timeA = new Date(a.receivedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.receivedAt || b.createdAt || 0).getTime();
      return timeA - timeB;
    });

  const handleMultipleImagesChange = async (type, files) => {
    if (!files || files.length === 0) return;
    try {
      const compressedList = [];
      for (let i = 0; i < files.length; i++) {
        const compressedBase64 = await compressImage(files[i], 1024, 0.7);
        compressedList.push(compressedBase64);
      }
      setImages(prev => ({ ...prev, [type]: [...prev[type], ...compressedList] }));
    } catch (err) {
      console.error("Image compression error:", err);
      alert("เกิดข้อผิดพลาดในการโหลดรูปภาพ");
    }
  };

  const handleRemoveImage = (type, index) => {
    setImages(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง GPS");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        });
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("ไม่สามารถดึงพิกัดได้ (กรุณาอนุญาตการเข้าถึงตำแหน่ง GPS)");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSaveAdHocJob = async (e) => {
    e.preventDefault();
    if (!adHocData.location.trim()) {
      alert("กรุณาระบุบริเวณที่เกิดเหตุ");
      return;
    }

    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const currentDateTime = thaiTime.toISOString().replace('T', ' ').substring(0, 16);

    const finalComplaintTopic = adHocData.complaintTopicType === 'อื่นๆ' 
      ? (adHocData.customComplaintTopic.trim() || 'อื่นๆ') 
      : adHocData.complaintTopicType;

    if (editingJob) {
      const updatedPayload = {
        receivedNo: adHocData.receivedNo,
        reporterName: adHocData.reporterName.trim() || 'ไม่ระบุชื่อ',
        phone: adHocData.phone.trim() || '-',
        location: adHocData.location,
        complaintTopic: finalComplaintTopic,
        complaintType: finalComplaintTopic,
        urgency: adHocData.urgency
      };

      try {
        await onUpdateJobStatus(editingJob.id, editingJob.status, updatedPayload);
        setIsAdHocModalOpen(false);
        setEditingJob(null);
        alert("แก้ไขข้อมูลใบงานเรียบร้อยแล้ว");
      } catch (err) {
        console.error("Error updating job:", err);
        alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
      }
    } else {
      const newAdHocJob = {
        id: 'JOB-' + Date.now().toString().slice(-6),
        receivedNo: adHocData.receivedNo,
        receivedAt: currentDateTime,
        channel: 'พบเหตุหน้างาน/แจ้งฉุกเฉิน',
        complaintType: finalComplaintTopic,
        complainantInfo: adHocData.phone || '-',
        complaintTopic: finalComplaintTopic,
        details: 'เปิดใบงานด่วนโดยช่างภาคสนามระหว่างปฏิบัติงาน',
        location: adHocData.location,
        reporterName: adHocData.reporterName.trim() || 'ไม่ระบุชื่อ',
        phone: adHocData.phone.trim() || '-',
        receiverName: currentTeam + ' (ภาคสนาม)',
        status: 'IN_PROGRESS',
        urgency: adHocData.urgency,
        technician: currentTeam,
        techName: currentTeam,
        techPhone: '-',
        dispatchedAt: currentDateTime,
        inProgressAt: currentDateTime
      };

      try {
        await saveJobToFirebase(newAdHocJob);
        if (onJobCreated) onJobCreated(newAdHocJob);
        
        setIsAdHocModalOpen(false);
        setSelectedJob(newAdHocJob);
        setIsUnrepairable(false);
        setCoords({ lat: null, lng: null });
        alert("สร้างเลขที่รับแจ้งสำเร็จ! กรุณาถ่ายภาพและบันทึกผลการซ่อม");
      } catch (err) {
        console.error("Error saving ad-hoc job:", err);
        alert("ไม่สามารถบันทึกใบงานด่วนได้");
      }
    }
  };

  // 📝 บันทึกผลการปฏิบัติงาน (ส่งผ่าน URLSearchParams Form-Data เพื่อทะลุ CORS และยิง Telegram)
  const handleSubmitFix = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    setIsSubmitting(true);
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const currentDateTime = thaiTime.toISOString().replace('T', ' ').substring(0, 16);

    let finalReason = '';
    if (isUnrepairable) {
      finalReason = unrepairableReasonType === 'อื่นๆ (ระบุในรายละเอียด)' 
        ? (customUnrepairableReason.trim() || 'ไม่ระบุสาเหตุ') 
        : unrepairableReasonType;

      if (!unrepairableDetails.trim()) {
        alert("กรุณากรอกรายละเอียดอุปสรรคหน้างานที่ไม่สามารถซ่อมได้");
        setIsSubmitting(false);
        return;
      }
    }

    const jobDataPayload = {
      action: "archive_job",
      jobData: {
        id: selectedJob.id,
        receivedNo: selectedJob.receivedNo || selectedJob.id,
        timestamp: selectedJob.receivedAt || selectedJob.timestamp || currentDateTime,
        receivedAt: selectedJob.receivedAt || selectedJob.timestamp || '-',
        reporterName: selectedJob.reporterName || 'ไม่ระบุชื่อ',
        phone: selectedJob.phone || '-',
        location: selectedJob.location || '-',
        issueType: selectedJob.complaintTopic || selectedJob.issueType || 'ท่อแตกรั่ว',
        pipeType: isUnrepairable ? '-' : pipeType,
        pipeSize: isUnrepairable ? '-' : pipeSize,
        description: selectedJob.details || '-',
        technician: currentTeam,
        status: isUnrepairable ? 'UNREPAIRABLE' : 'COMPLETED',
        beforeImgBase64: images.before.length > 0 ? images.before[0] : '',
        inProgImgBase64: images.inProgress.length > 0 ? images.inProgress[0] : '',
        afterImgBase64: images.after.length > 0 ? images.after[0] : '',
        notes: isUnrepairable 
          ? `❌ ไม่สามารถซ่อมได้เนื่องจาก: ${finalReason}\nรายละเอียด: ${unrepairableDetails.trim()}` 
          : (notes || `ใช้อุปกรณ์: ท่อ ${pipeType} ขนาด ${pipeSize} มม.`),
        closedAt: currentDateTime,
        completedAt: currentDateTime,
        latitude: coords.lat || selectedJob.latitude || '',
        longitude: coords.lng || selectedJob.longitude || ''
      }
    };

    try {
      // 🚀 ใช้ URLSearchParams เพื่อส่ง Form-Data ข้าม CORS ไปยัง Apps Script ได้อย่างสมบูรณ์
      const formData = new URLSearchParams();
      formData.append("payload", JSON.stringify(jobDataPayload));

      await fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      });

      // อัปเดตสถานะในระบบฐานข้อมูลหลัก (Firebase)
      await onUpdateJobStatus(selectedJob.id, isUnrepairable ? 'UNREPAIRABLE' : 'COMPLETED', jobDataPayload.jobData);

      alert(isUnrepairable 
        ? `บันทึกรายงานซ่อมไม่ได้ของใบงาน ${selectedJob.receivedNo || selectedJob.id} เรียบร้อยแล้ว` 
        : `ปิดงานซ่อม ${selectedJob.receivedNo || selectedJob.id} เรียบร้อยแล้ว!`
      );
    } catch (err) {
      console.error("Error submitting fix:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
      setSelectedJob(null);
      setImages({ before: [], inProgress: [], after: [] });
      setNotes('');
      setSelectedEquipmentList([]);
      setIsUnrepairable(false);
      setUnrepairableDetails('');
      setCustomUnrepairableReason('');
      setPipeType('HDPE');
      setPipeSize('110');
      setCoords({ lat: null, lng: null });
    }
  };

  if (!currentTeam) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-900 text-white p-6 flex flex-col justify-center space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center mx-auto text-cyan-400">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">เข้าสู่ระบบช่างภาคสนาม</h2>
          <p className="text-xs text-slate-400">กรุณาเลือกทีมช่างผู้ปฏิบัติงาน เพื่อเข้าดูงานที่ได้รับมอบหมาย</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-3xl space-y-3 shadow-xl">
          <label className="block text-xs font-bold text-slate-300">เลือกทีมช่างของคุณ *</label>
          {!teams || teams.length === 0 ? (
            <p className="text-xs text-rose-400">ยังไม่มีการเพิ่มบัญชีช่างในระบบ</p>
          ) : (
            teams.map((t) => {
              const teamName = typeof t === 'string' ? t : t.teamName;
              return (
                <button
                  key={teamName}
                  onClick={() => handleLogin(teamName)}
                  className="w-full bg-slate-700 hover:bg-blue-600 text-white font-bold p-3.5 rounded-2xl text-xs flex justify-between items-center transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <span>{teamName}</span>
                  <span className="text-[10px] text-cyan-300 bg-blue-950 px-2 py-1 rounded-lg">เลือกทีมนี้</span>
                </button>
              );
            })
          )}
        </div>

        <button
          onClick={handleLogoutAction}
          className="w-full text-xs text-slate-400 hover:text-white py-2 flex items-center justify-center gap-1 cursor-pointer"
        >
          <LogOut className="w-3 h-3" /> กลับหน้าหลักเลือกสิทธิ์
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-slate-100 min-h-screen pb-10 border-x border-slate-200">
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-4 sticky top-0 z-20 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Wrench className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm">{currentTeam}</h2>
            <p className="text-[10px] text-slate-300">กปภ.สาขานครพนม</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdHocModal}
            className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            title="เปิดใบงานด่วนหน้างาน"
          >
            <PlusCircle className="w-3.5 h-3.5" /> เปิดใบงานด่วน
          </button>
          
          <button 
            onClick={handleLogoutAction} 
            className="p-1.5 bg-slate-800 hover:bg-rose-600 rounded-lg text-slate-300 hover:text-white transition cursor-pointer" 
            title="ออกจากระบบไปหน้าหลัก"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {!selectedJob ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                รายการงานซ่อม ({activeJobs.length} งาน)
              </h3>
            </div>

            {activeJobs.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center space-y-3 border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-700">ไม่มีงานค้างรับผิดชอบ</p>
                <p className="text-xs text-slate-400">หากพบท่อแตกระหว่างทาง สามารถกดปุ่ม "เปิดใบงานด่วน" ด้านบนได้ทันที</p>
              </div>
            ) : (
              activeJobs.map((job) => {
                const isAdminAssigned = job.channel && job.channel !== 'พบเหตุหน้างาน/แจ้งฉุกเฉิน';

                return (
                  <div key={job.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                      job.status === 'UNREPAIRABLE' ? 'bg-purple-600' :
                      job.urgency === 'ด่วนมาก' ? 'bg-rose-600' :
                      job.urgency === 'ด่วน' ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />

                    <div className="flex justify-between items-start pl-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                          {job.receivedNo || job.id}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                          job.urgency === 'ด่วนมาก' 
                            ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse' 
                            : job.urgency === 'ด่วน'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {job.urgency === 'ด่วนมาก' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {job.urgency || 'ปกติ'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isAdminAssigned && job.status !== 'COMPLETED' && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(job)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="แก้ไขข้อมูลใบแจ้งซ่อม"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteJobAction(job)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="ลบรายการแจ้งซ่อมนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {isAdminAssigned && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-0.5" title="งานที่ได้รับมอบหมายจากแอดมิน">
                            <ShieldAlert className="w-3 h-3 text-slate-500" /> งานแอดมิน
                          </span>
                        )}

                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ml-1 ${
                          job.status === 'UNREPAIRABLE' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                          job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {job.status === 'UNREPAIRABLE' ? 'ซ่อมไม่ได้ (รอแก้ไข)' :
                           job.status === 'IN_PROGRESS' ? 'กำลังซ่อม' : 'รอเริ่มซ่อม'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 pl-2">
                      <h4 className="font-bold text-slate-800 text-sm">{job.complaintTopic || job.issueType}</h4>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-semibold">{job.reporterName}</span>
                        <a href={`tel:${job.phone}`} className="text-blue-600 hover:underline flex items-center gap-0.5 ml-auto font-mono">
                          <Phone className="w-3 h-3" /> {job.phone}
                        </a>
                      </p>
                      <p className="text-xs text-slate-600 flex items-start gap-1.5 mt-1">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{job.location}</span>
                      </p>

                      {job.status === 'UNREPAIRABLE' && job.notes && (
                        <div className="mt-2 bg-purple-50 p-2 rounded-xl border border-purple-200 text-[11px] text-purple-900">
                          <span className="font-bold block">⚠️ อุปสรรคหน้างานเดิม:</span>
                          <span>{job.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex gap-2 pl-2">
                      {job.status === 'DISPATCHED' && (
                        <button 
                          onClick={() => {
                            const now = new Date();
                            const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
                            const currentDateTime = thaiTime.toISOString().replace('T', ' ').substring(0, 16);
                            onUpdateJobStatus(job.id, 'IN_PROGRESS', { inProgressAt: currentDateTime });
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Truck className="w-4 h-4" /> เริ่มเดินทาง / ถึงหน้างาน
                        </button>
                      )}

                      {job.status === 'IN_PROGRESS' && (
                        <button 
                          onClick={() => {
                            setSelectedJob(job);
                            setIsUnrepairable(false);
                            setCoords({ lat: null, lng: null });
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" /> บันทึกผลซ่อม / ปิดงาน
                        </button>
                      )}

                      {job.status === 'UNREPAIRABLE' && (
                        <button 
                          onClick={() => {
                            setSelectedJob(job);
                            setIsUnrepairable(false);
                            setCoords({ lat: null, lng: null });
                          }}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" /> กลับมาซ่อมอีกครั้ง / บันทึกปิดงาน
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">บันทึกผลการทำงาน: {selectedJob.receivedNo || selectedJob.id}</h3>
                <p className="text-xs text-slate-500">{selectedJob.reporterName} ({selectedJob.phone})</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ยกเลิก
              </button>
            </div>

            <form onSubmit={handleSubmitFix} className="space-y-4">
              
              <div className={`p-3.5 rounded-2xl border transition-all ${
                isUnrepairable ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
              }`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={isUnrepairable}
                    onChange={(e) => setIsUnrepairable(e.target.checked)}
                    className="w-5 h-5 text-rose-600 rounded-lg focus:ring-rose-500 border-slate-300 cursor-pointer"
                  />
                  <div>
                    <span className={`text-xs font-bold block ${isUnrepairable ? 'text-rose-700' : 'text-slate-700'}`}>
                      ⚠️ ไม่สามารถดำเนินการซ่อมได้ในขณะนี้
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ติ๊กถูกช่องนี้หากพบอุปสรรคหน้างาน เพื่อบันทึกสาเหตุรายงานผู้บังคับบัญชา
                    </span>
                  </div>
                </label>
              </div>

              {isUnrepairable ? (
                <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 space-y-3">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>กรอกข้อมูลอุปสรรคที่ไม่สามารถซ่อมได้</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">สาเหตุหลักที่ไม่สามารถซ่อมได้ *</label>
                    <select
                      value={unrepairableReasonType}
                      onChange={(e) => setUnrepairableReasonType(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-rose-500"
                    >
                      {unrepairableReasons.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>

                  {unrepairableReasonType === 'อื่นๆ (ระบุในรายละเอียด)' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ระบุสาเหตุเพิ่มเติม *</label>
                      <input 
                        type="text"
                        value={customUnrepairableReason}
                        onChange={(e) => setCustomUnrepairableReason(e.target.value)}
                        placeholder="กรอกสาเหตุ..."
                        className="w-full border border-slate-200 rounded-xl p-2 text-xs focus:ring-2 focus:ring-rose-500 bg-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">รายละเอียดและคำแนะนำเพิ่มเติม *</label>
                    <textarea 
                      rows="3"
                      value={unrepairableDetails}
                      onChange={(e) => setUnrepairableDetails(e.target.value)}
                      placeholder="อธิบายสภาพปัญหาหน้างาน เช่น มีอาคารทับแนวท่อ ต้องใช้แม็คโครขนาดใหญ่ หรือประสานหน่วยงานใด..."
                      required
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                    ></textarea>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ชนิดท่อ *</label>
                      <select
                        value={pipeType}
                        onChange={(e) => setPipeType(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      >
                        {pipeTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ขนาดท่อ (มม.) *</label>
                      <select
                        value={pipeSize}
                        onChange={(e) => setPipeSize(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      >
                        {pipeSizes.map((size) => (
                          <option key={size} value={size}>{size} มม.</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-700">เลือกอุปกรณ์ที่ใช้ซ่อม (จาก Google Sheets)</label>
                      {isLoadingEquipment && <span className="text-[10px] text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> กำลังโหลด...</span>}
                    </div>
                    
                    <div className="flex gap-2 relative">
                      <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </div>
                        <input 
                          type="text"
                          value={searchTerm}
                          onChange={handleSearchEquipmentChange}
                          placeholder="พิมพ์ชื่ออุปกรณ์ เช่น ท่อ, ข้อต่อ..."
                          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 shadow-xs"
                        />

                        {suggestions.length > 0 && (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                            {suggestions.map((item, idx) => {
                              const itemName = item.name || item.itemName || item.อุปกรณ์ || '';
                              const itemUnit = item.unit || item.หน่วยนับ || item.หน่วย || 'หน่วย';
                              return (
                                <div 
                                  key={idx}
                                  onClick={() => handleSelectEquipmentSuggestion(item)}
                                  className="p-2.5 hover:bg-slate-100 text-xs text-slate-800 cursor-pointer border-b border-slate-100 last:border-none flex justify-between items-center"
                                >
                                  <span className="font-semibold">{itemName}</span>
                                  <span className="text-[10px] text-slate-400">หน่วย: {itemUnit}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="w-20">
                        <input 
                          type="number"
                          min="1"
                          value={equipmentQuantity}
                          onChange={(e) => setEquipmentQuantity(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs text-center font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 shadow-xs"
                          placeholder="จำนวน"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddEquipmentToList}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" /> เพิ่ม
                      </button>
                    </div>

                    {selectedEquipmentList.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500">รายการอุปกรณ์ที่เลือกไว้ ({selectedEquipmentList.length}):</span>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {selectedEquipmentList.map((item) => (
                            <div key={item.id} className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex justify-between items-center text-xs shadow-xs">
                              <span className="font-medium text-slate-800">🔹 {item.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-emerald-600 font-mono">จำนวน: {item.quantity} {item.unit}</span>
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveEquipmentItem(item.id)}
                                  className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                    <Navigation className="w-4 h-4 text-blue-600" /> พิกัด GPS หน้างาน
                  </span>
                  <button
                    type="button"
                    onClick={handleGetGPS}
                    disabled={isGettingLocation}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isGettingLocation ? 'กำลังดึงพิกัด...' : '📍 ดึงพิกัดปัจจุบัน'}
                  </button>
                </div>

                {coords.lat && coords.lng ? (
                  <p className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    Lat: {coords.lat}, Lng: {coords.lng} (บันทึกพิกัดสำเร็จ)
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    * ควรกดปุ่ม "ดึงพิกัดปัจจุบัน" เพื่อเป็นหลักฐานตำแหน่งหน้างาน
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">ถ่ายรูปหลักฐานหน้างาน (เลือกหลายรูปได้)</label>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-2 text-center relative hover:bg-slate-50">
                    <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImagesChange('before', e.target.files)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
                    <div className="py-1 space-y-1">
                      <Camera className="w-5 h-5 mx-auto text-blue-500" />
                      <span className="text-[10px] block font-bold text-slate-600">รูปสภาพปัญหา ({images.before.length})</span>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-2 text-center relative hover:bg-slate-50">
                    <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImagesChange('inProgress', e.target.files)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
                    <div className="py-1 space-y-1">
                      <Camera className="w-5 h-5 mx-auto text-amber-500" />
                      <span className="text-[10px] block font-bold text-slate-600">รูประหว่างทำ ({images.inProgress.length})</span>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-2 text-center relative hover:bg-slate-50">
                    <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImagesChange('after', e.target.files)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
                    <div className="py-1 space-y-1">
                      <Camera className="w-5 h-5 mx-auto text-emerald-500" />
                      <span className="text-[10px] block font-bold text-slate-600">รูปหลังซ่อม ({images.after.length})</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {['before', 'inProgress', 'after'].map((type) => (
                    images[type].length > 0 && (
                      <div key={type} className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          {type === 'before' ? 'รูปสภาพปัญหา' : type === 'inProgress' ? 'รูประหว่างทำ' : 'รูปหลังซ่อม'} ({images[type].length})
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {images[type].map((imgSrc, idx) => (
                            <div key={idx} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
                              <img src={imgSrc} alt="preview" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => handleRemoveImage(type, idx)} className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 cursor-pointer">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {!isUnrepairable && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สรุปอุปกรณ์ที่ใช้ (บันทึกอัตโนมัติจากด้านบน)</label>
                  <textarea 
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="อุปกรณ์ที่เลือกจะแสดงที่นี่อัตโนมัติ หรือพิมพ์เพิ่มเติม..."
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-medium"
                  ></textarea>
                </div>
              )}

              <button 
                type="submit"
                disabled={isSubmitting}
                className={`w-full text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50 cursor-pointer ${
                  isUnrepairable ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isUnrepairable ? <XCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {isSubmitting 
                  ? 'กำลังบันทึกข้อมูล...' 
                  : isUnrepairable 
                  ? 'ยืนยันบันทึกรายงานซ่อมไม่ได้' 
                  : 'ยืนยันปิดงานซ่อม'}
              </button>
            </form>
          </div>
        )}
      </div>

      {isAdHocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                {editingJob ? <Edit3 className="w-5 h-5 text-blue-600" /> : <PlusCircle className="w-5 h-5 text-rose-600" />}
                {editingJob ? 'แก้ไขข้อมูลใบแจ้งซ่อม' : 'เปิดใบงานด่วนหน้างาน (Ad-hoc Job)'}
              </h4>
              <button onClick={() => setIsAdHocModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveAdHocJob} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่รับแจ้ง (แก้ไขได้)</label>
                <input 
                  type="text"
                  value={adHocData.receivedNo}
                  onChange={(e) => setAdHocData(prev => ({ ...prev, receivedNo: e.target.value }))}
                  required
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-blue-600 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้แจ้ง</label>
                  <input 
                    type="text"
                    value={adHocData.reporterName}
                    onChange={(e) => setAdHocData(prev => ({ ...prev, reporterName: e.target.value }))}
                    placeholder="กรอกชื่อผู้แจ้ง"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input 
                    type="tel"
                    value={adHocData.phone}
                    onChange={(e) => setAdHocData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="เบอร์โทรผู้แจ้ง"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">บริเวณที่เกิดเหตุ / สถานที่ *</label>
                <input 
                  type="text"
                  value={adHocData.location}
                  onChange={(e) => setAdHocData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="เช่น หน้าบ้านเลขที่ 123 ถ.นิตโย"
                  required
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หัวข้อปัญหา</label>
                  <select
                    value={adHocData.complaintTopicType}
                    onChange={(e) => setAdHocData(prev => ({ ...prev, complaintTopicType: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="ท่อแตกรั่ว">ท่อแตกรั่ว</option>
                    <option value="น้ำไม่ไหล/น้ำไหลอ่อน">น้ำไม่ไหล/น้ำไหลอ่อน</option>
                    <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ระดับความเร่งด่วน</label>
                  <select
                    value={adHocData.urgency}
                    onChange={(e) => setAdHocData(prev => ({ ...prev, urgency: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 font-bold text-amber-600"
                  >
                    <option value="ปกติ">ปกติ</option>
                    <option value="ด่วน">ด่วน</option>
                    <option value="ด่วนมาก">ด่วนมาก</option>
                  </select>
                </div>
              </div>

              {adHocData.complaintTopicType === 'อื่นๆ' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ระบุหัวข้อปัญหาเพิ่มเติม</label>
                  <input 
                    type="text"
                    value={adHocData.customComplaintTopic}
                    onChange={(e) => setAdHocData(prev => ({ ...prev, customComplaintTopic: e.target.value }))}
                    placeholder="ระบุลักษณะปัญหา..."
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdHocModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md cursor-pointer"
                >
                  {editingJob ? 'บันทึกการแก้ไข' : 'บันทึกและเริ่มงานทันที'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
