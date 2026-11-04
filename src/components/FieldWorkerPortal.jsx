import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Camera, CheckCircle2, Wrench, Send, Phone, User, LogOut, Lock, Navigation, AlertTriangle, PlusCircle, X, Edit3, Search, Loader2, Plus, Image as ImageIcon, Save, RotateCcw, ExternalLink } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

// 🌐 URL ของ Google Apps Script Web App
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydqD3x19rIfyttJPLhZung7NxIBh4LXetkGlZbhW4GmqLtJ-LI6HQ0vX-p_vrJ-QsH9w/exec";

// รายการอุปกรณ์สำรอง (Fallback Data)
const DEFAULT_EQUIPMENT_LIST = [
  { id: 'EQ-001', name: 'ข้อต่อตรง HDPE 110 มม.', unit: 'ตัว' },
  { id: 'EQ-002', name: 'ท่อ HDPE ขนาด 110 มม.', unit: 'เมตร' },
  { id: 'EQ-003', name: 'เทปพันเกลียว', unit: 'ม้วน' },
  { id: 'EQ-004', name: 'กาวทาท่อ PVC', unit: 'กระป๋อง' },
  { id: 'EQ-005', name: 'ข้อต่อตรง PVC 2 นิ้ว', unit: 'ตัว' },
  { id: 'EQ-006', name: 'ประตูน้ำทองเหลือง 1 นิ้ว', unit: 'ตัว' },
  { id: 'EQ-007', name: 'หน้าจานเหล็ก 110 มม.', unit: 'ชุด' },
];

export default function FieldWorkerPortal({ jobs, onUpdateJobStatus, teams, onLogout, onJobCreated }) {
  const [currentTeam, setCurrentTeam] = useState(localStorage.getItem('pwa_worker_team') || '');
  const [selectedJob, setSelectedJob] = useState(null);
  
  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  const [completedSearchTerm, setCompletedSearchTerm] = useState('');
  const [editingPhotoJob, setEditingPhotoJob] = useState(null);

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
  
  const [equipmentList, setEquipmentList] = useState(DEFAULT_EQUIPMENT_LIST);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  
  const [teamListFromSheet, setTeamListFromSheet] = useState([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedEquipmentItem, setSelectedEquipmentItem] = useState(null);
  const [equipmentQuantity, setEquipmentQuantity] = useState(1);
  const [selectedEquipmentList, setSelectedEquipmentList] = useState([]);
  const [notes, setNotes] = useState('');

  const [isNoEquipmentUsed, setIsNoEquipmentUsed] = useState(false);
  const [isSurfaceRestored, setIsSurfaceRestored] = useState(false);

  const [isUnrepairable, setIsUnrepairable] = useState(false);
  const [unrepairableReasonType, setUnrepairableReasonType] = useState('ติดสิ่งกีดขวาง/โครงสร้างอาคาร/สิ่งปลูกสร้าง');
  const [customUnrepairableReason, setCustomUnrepairableReason] = useState('');
  const [unrepairableDetails, setUnrepairableDetails] = useState('');

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

  const convertGoogleDriveUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/);
    if (match && (match[1] || match[2])) {
      const fileId = match[1] || match[2];
      return `https://lh3.googleusercontent.com/d/${fileId}=s800`;
    }
    return cleanUrl;
  };

  const parseImages = (imgData) => {
    if (!imgData) return [];
    try {
      let extractedUrls = [];
      if (Array.isArray(imgData)) {
        extractedUrls = imgData.filter(url => url && typeof url === 'string' && url.trim() !== '');
      } else if (typeof imgData === 'string') {
        let cleanData = imgData.trim();
        if (cleanData === '' || cleanData === '-') return [];

        if (cleanData.startsWith('[')) {
          try {
            const parsed = JSON.parse(cleanData);
            if (Array.isArray(parsed)) {
              extractedUrls = parsed.filter(url => url && typeof url === 'string' && url.trim() !== '');
            }
          } catch (e) {
            extractedUrls = [cleanData];
          }
        } else if (cleanData.includes('\n') || cleanData.includes(',') || cleanData.includes(' ')) {
          extractedUrls = cleanData.split(/[\n,\s]+/).map(u => u.trim()).filter(u => u !== '');
        } else {
          extractedUrls = [cleanData];
        }
      }

      const formattedUrls = extractedUrls.map(u => convertGoogleDriveUrl(u));
      return Array.from(new Set(formattedUrls));
    } catch (e) {
      console.error("Error parsing images:", e);
    }
    return [];
  };

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

    const fetchTeamsFromSheet = async () => {
      setIsLoadingTeams(true);
      try {
        const response = await fetch(`${WEB_APP_URL}?action=teams`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setTeamListFromSheet(data);
        }
      } catch (err) {
        console.error("Error fetching teams:", err);
      } finally {
        setIsLoadingTeams(false);
      }
    };

    fetchEquipmentFromSheets();
    fetchTeamsFromSheet();
  }, []);

  const handleSearchEquipmentChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (!value || !value.trim()) {
      setSuggestions([]);
    } else {
      const query = value.trim().toLowerCase();
      const filtered = equipmentList
        .filter(item => {
          const itemName = String(
            item.name || item.itemName || item.ชื่ออุปกรณ์ || item.รายการ || item.อุปกรณ์ || ''
          ).trim().toLowerCase();
          return itemName.includes(query);
        })
        .sort((a, b) => {
          const nameA = String(a.name || a.itemName || a.อุปกรณ์ || '').toLowerCase();
          const nameB = String(b.name || b.itemName || b.อุปกรณ์ || '').toLowerCase();
          if (nameA.startsWith(query) && !nameB.startsWith(query)) return -1;
          if (!nameA.startsWith(query) && nameB.startsWith(query)) return 1;
          return nameA.localeCompare(nameB, 'th');
        });
      
      setSuggestions(filtered);
    }
  };

  const handleSelectEquipmentSuggestion = (item) => {
    const itemName = item.name || item.itemName || item.อุปกรณ์ || '';
    setSelectedEquipmentItem(item);
    setSearchTerm(itemName);
    setSuggestions([]);
  };

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

    const summaryText = updatedList.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ');
    setNotes(summaryText);

    setSearchTerm('');
    setSelectedEquipmentItem(null);
    setEquipmentQuantity(1);
    setSuggestions([]);
  };

  const handleRemoveEquipmentItem = (id) => {
    const updatedList = selectedEquipmentList.filter(item => item.id !== id);
    setSelectedEquipmentList(updatedList);
    const summaryText = updatedList.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ');
    setNotes(summaryText);
  };

  const handleClearAllEquipment = () => {
    if (selectedEquipmentList.length === 0) return;
    if (window.confirm("คุณต้องการยกเลิกอุปกรณ์ที่เลือกทั้งหมดใช่หรือไม่?")) {
      setSelectedEquipmentList([]);
      setNotes('');
    }
  };

  const handleToggleNoEquipment = (checked) => {
    setIsNoEquipmentUsed(checked);
    if (checked) {
      setIsSurfaceRestored(false);
      setSelectedEquipmentList([]);
      setSearchTerm('');
      setNotes('น้ำไหลปกติแล้ว ไม่ได้ใช้อุปกรณ์');
    } else {
      setNotes('');
    }
  };

  const handleToggleSurfaceRestored = (checked) => {
    setIsSurfaceRestored(checked);
    if (checked) {
      setIsNoEquipmentUsed(false);
      setSelectedEquipmentList([]);
      setSearchTerm('');
      setNotes('ซ่อมคืนผิวหลังซ่อมท่อเรียบร้อยแล้ว');
    } else {
      setNotes('');
    }
  };

  const handleLogin = (teamName) => {
    setCurrentTeam(teamName);
    localStorage.setItem('pwa_worker_team', teamName);
  };

  const handleLogoutAction = () => {
    setCurrentTeam('');
    localStorage.removeItem('pwa_worker_team');
    localStorage.removeItem('pwa_worker_pos');
    localStorage.removeItem('pwa_worker_phone');
    setSelectedJob(null);
    setEditingPhotoJob(null);
    if (onLogout) {
      onLogout();
    }
  };

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

  const getUrgencyWeight = (urgency) => {
    switch (urgency) {
      case 'ด่วนมาก': return 3;
      case 'ด่วน': return 2;
      case 'ปกติ': 
      default: return 1;
    }
  };

  const normalizeStatus = (status) => {
    if (!status) return 'PENDING';
    const s = String(status).trim();
    if (s === 'รอดำเนินการ' || s === 'PENDING') return 'PENDING';
    if (s === 'มอบหมายช่างแล้ว' || s === 'DISPATCHED') return 'DISPATCHED';
    if (s === 'กำลังดำเนินการซ่อม' || s === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (s === 'ซ่อมไม่สำเร็จ' || s === 'UNREPAIRABLE') return 'UNREPAIRABLE';
    if (s === 'ซ่อมเสร็จสิ้น (ปิดงาน)' || s === 'COMPLETED') return 'COMPLETED';
    return s;
  };

  const activeJobs = (jobs || [])
    .filter(j => {
      if (!j) return false;
      const jobTech = String(j.technician || j.Technician || j.techName || '').trim().toLowerCase();
      const myTeam = String(currentTeam || '').trim().toLowerCase();
      
      const isMyTeam = !myTeam || jobTech.includes(myTeam) || myTeam.includes(jobTech);
      
      const currentNormStatus = normalizeStatus(j.status || j.Status);
      const isValidStatus = ['PENDING', 'DISPATCHED', 'IN_PROGRESS', 'UNREPAIRABLE'].includes(currentNormStatus);
      return isMyTeam && isValidStatus;
    })
    .sort((a, b) => {
      const urgencyA = a.Notes || a.notes || a.urgency || a.Urgency || 'ปกติ';
      const urgencyB = b.Notes || b.notes || b.urgency || b.Urgency || 'ปกติ';
      const weightA = getUrgencyWeight(urgencyA);
      const weightB = getUrgencyWeight(urgencyB);
      if (weightA !== weightB) return weightB - weightA;

      const timeA = new Date(a.receivedAt || a.Timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.receivedAt || b.Timestamp || b.createdAt || 0).getTime();
      return timeA - timeB;
    });

  const myCompletedJobs = (jobs || []).filter(j => {
    if (!j) return false;
    const jobTech = String(j.technician || j.Technician || j.techName || '').trim().toLowerCase();
    const myTeam = String(currentTeam || '').trim().toLowerCase();
    const isMyTeam = !myTeam || jobTech.includes(myTeam) || myTeam.includes(jobTech);
    
    const currentNormStatus = normalizeStatus(j.status || j.Status);
    const isClosed = ['COMPLETED', 'CLOSED', 'UNREPAIRABLE'].includes(currentNormStatus);
    
    if (!isMyTeam || !isClosed) return false;

    if (completedSearchTerm.trim()) {
      const term = completedSearchTerm.trim().toLowerCase();
      const matchNo = (j.receivedNo || j.JobID || j.id || '').toLowerCase().includes(term);
      const matchName = (j.reporterName || j.ReporterName || '').toLowerCase().includes(term);
      const matchPhone = (j.phone || j.Phone || '').toLowerCase().includes(term);
      const matchLocation = (j.location || j.Location || '').toLowerCase().includes(term);
      return matchNo || matchName || matchPhone || matchLocation;
    }

    return true;
  });

  const handleOpenEditPhotosModal = (job) => {
    setEditingPhotoJob(job);
    setImages({
      before: parseImages(job.BeforeImg || job.beforeImg || job.beforeImgBase64 || job.before_img),
      inProgress: parseImages(job.InProgImg || job.inProgImg || job.inProgImgBase64 || job.inprog_img),
      after: parseImages(job.AfterImg || job.afterImg || job.afterImgBase64 || job.after_img)
    });
    setCoords({
      lat: job.latitude || job.Latitude || '',
      lng: job.longitude || job.Longitude || ''
    });
    setPipeType(job.pipeType || job.PipeType || 'HDPE');
    setPipeSize(job.pipeSize || job.PipeSize || '110');
    
    const existingEquipment = job.equipment || job.Equipment || job.description || job.Description || '';
    setNotes(existingEquipment);
    setSelectedEquipmentList([]);
    setSearchTerm('');
  };

  const handleSaveUpdatedPhotos = async () => {
    if (!editingPhotoJob || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const targetId = editingPhotoJob.id || editingPhotoJob.JobID;
      const cleanBeforeImg = Array.from(new Set(images.before));
      const cleanInProgImg = Array.from(new Set(images.inProgress));
      const cleanAfterImg = Array.from(new Set(images.after));

      const jobDataPayload = {
        action: "archive_job",
        jobData: {
          id: targetId,
          JobID: targetId,
          receivedNo: editingPhotoJob.receivedNo || editingPhotoJob.JobID || targetId,
          timestamp: editingPhotoJob.receivedAt || editingPhotoJob.Timestamp || new Date().toLocaleString("th-TH"),
          Timestamp: editingPhotoJob.receivedAt || editingPhotoJob.Timestamp || new Date().toLocaleString("th-TH"),
          reporterName: editingPhotoJob.reporterName || editingPhotoJob.ReporterName || 'ไม่ระบุชื่อ',
          ReporterName: editingPhotoJob.reporterName || editingPhotoJob.ReporterName || 'ไม่ระบุชื่อ',
          phone: editingPhotoJob.phone || editingPhotoJob.Phone || '-',
          Phone: editingPhotoJob.phone || editingPhotoJob.Phone || '-',
          location: editingPhotoJob.location || editingPhotoJob.Location || '-',
          Location: editingPhotoJob.location || editingPhotoJob.Location || '-',
          issueType: editingPhotoJob.complaintTopic || editingPhotoJob.IssueType || 'ท่อแตกรั่ว',
          IssueType: editingPhotoJob.complaintTopic || editingPhotoJob.IssueType || 'ท่อแตกรั่ว',
          pipeType: pipeType,
          PipeType: pipeType,
          pipeSize: pipeSize,
          PipeSize: pipeSize,
          description: editingPhotoJob.details || editingPhotoJob.Description || '-',
          Description: editingPhotoJob.details || editingPhotoJob.Description || '-',
          technician: currentTeam,
          Technician: currentTeam,
          status: editingPhotoJob.status || editingPhotoJob.Status || 'COMPLETED',
          Status: editingPhotoJob.status || editingPhotoJob.Status || 'COMPLETED',
          beforeImg: cleanBeforeImg,
          BeforeImg: cleanBeforeImg,
          inProgImg: cleanInProgImg,
          InProgImg: cleanInProgImg,
          afterImg: cleanAfterImg,
          AfterImg: cleanAfterImg,
          Notes: editingPhotoJob.Notes || editingPhotoJob.notes || 'ปกติ',
          closedAt: editingPhotoJob.closedAt || editingPhotoJob.ClosedAt || new Date().toLocaleString("th-TH"),
          ClosedAt: editingPhotoJob.closedAt || editingPhotoJob.ClosedAt || new Date().toLocaleString("th-TH"),
          equipment: notes,
          Equipment: notes,
          latitude: coords.lat || '',
          Latitude: coords.lat || '',
          longitude: coords.lng || '',
          Longitude: coords.lng || ''
        }
      };

      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(jobDataPayload)
      });

      const responseText = await res.text();
      let result = {};
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        result = { status: 'success' };
      }

      const updatedData = {
        ...editingPhotoJob,
        pipeType: pipeType,
        pipeSize: pipeSize,
        equipment: notes,
        beforeImg: result.beforeImgUrl ? parseImages(result.beforeImgUrl) : cleanBeforeImg,
        afterImg: result.afterImgUrl ? parseImages(result.afterImgUrl) : cleanAfterImg,
        inProgImg: result.inProgImgUrl ? parseImages(result.inProgImgUrl) : cleanInProgImg,
        latitude: coords.lat || '',
        longitude: coords.lng || ''
      };

      await onUpdateJobStatus(targetId, editingPhotoJob.status || editingPhotoJob.Status, updatedData);
      alert("อัปเดตข้อมูล, รูปภาพ และพิกัดเรียบร้อยแล้ว!");
      setEditingPhotoJob(null);
      setImages({ before: [], inProgress: [], after: [] });
      setCoords({ lat: null, lng: null });
    } catch (err) {
      console.error("Error updating info:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMultipleImagesChange = async (type, e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      const compressedList = [];
      for (let i = 0; i < files.length; i++) {
        const compressedBase64 = await compressImage(files[i], 1024, 0.7);
        if (compressedBase64) {
          compressedList.push(compressedBase64);
        }
      }

      setImages(prev => {
        const combined = [...prev[type], ...compressedList];
        return {
          ...prev,
          [type]: Array.from(new Set(combined))
        };
      });
    } catch (err) {
      console.error("Image compression error:", err);
      alert("เกิดข้อผิดพลาดในการโหลดรูปภาพ");
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveImage = (type, index) => {
    setImages(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
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

    const newAdHocJob = {
      id: 'JOB-' + Date.now().toString().slice(-6),
      JobID: adHocData.receivedNo,
      receivedNo: adHocData.receivedNo,
      receivedAt: currentDateTime,
      Timestamp: currentDateTime,
      channel: 'พบเหตุหน้างาน/แจ้งฉุกเฉิน',
      complaintType: finalComplaintTopic,
      complainantInfo: adHocData.phone || '-',
      complaintTopic: finalComplaintTopic,
      IssueType: finalComplaintTopic,
      details: 'เปิดใบงานด่วนโดยช่างภาคสนามระหว่างปฏิบัติงาน',
      Description: 'เปิดใบงานด่วนโดยช่างภาคสนามระหว่างปฏิบัติงาน',
      location: adHocData.location,
      Location: adHocData.location,
      reporterName: adHocData.reporterName.trim() || 'ไม่ระบุชื่อ',
      ReporterName: adHocData.reporterName.trim() || 'ไม่ระบุชื่อ',
      phone: adHocData.phone.trim() || '-',
      Phone: adHocData.phone.trim() || '-',
      receiverName: currentTeam + ' (ภาคสนาม)',
      status: 'IN_PROGRESS',
      Status: 'IN_PROGRESS',
      Notes: adHocData.urgency,
      technician: currentTeam,
      Technician: currentTeam,
      dispatchedAt: currentDateTime,
      inProgressAt: currentDateTime
    };

    try {
      const jobDataPayload = {
        action: "archive_job",
        jobData: {
          id: newAdHocJob.id,
          JobID: newAdHocJob.receivedNo,
          receivedNo: newAdHocJob.receivedNo,
          timestamp: newAdHocJob.receivedAt,
          Timestamp: newAdHocJob.receivedAt,
          reporterName: newAdHocJob.reporterName,
          ReporterName: newAdHocJob.reporterName,
          phone: newAdHocJob.phone,
          Phone: newAdHocJob.phone,
          location: newAdHocJob.location,
          Location: newAdHocJob.location,
          issueType: newAdHocJob.complaintTopic,
          IssueType: newAdHocJob.complaintTopic,
          pipeType: '-',
          PipeType: '-',
          pipeSize: '-',
          PipeSize: '-',
          description: newAdHocJob.details,
          Description: newAdHocJob.details,
          technician: currentTeam,
          Technician: currentTeam,
          status: 'IN_PROGRESS',
          Status: 'IN_PROGRESS',
          Notes: adHocData.urgency,
          closedAt: '-',
          ClosedAt: '-'
        }
      };

      await fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(jobDataPayload)
      });

      if (onJobCreated) onJobCreated(newAdHocJob);
      
      setIsAdHocModalOpen(false);
      setSelectedJob(newAdHocJob);
      setIsUnrepairable(false);
      setIsNoEquipmentUsed(false);
      setIsSurfaceRestored(false);
      setCoords({ lat: null, lng: null });
      alert("สร้างเลขที่รับแจ้งสำเร็จ! กรุณาถ่ายภาพและบันทึกผลการซ่อม");
    } catch (err) {
      console.error("Error saving ad-hoc job:", err);
      alert("ไม่สามารถบันทึกใบงานด่วนได้");
    }
  };

  const handleSubmitFix = async (e) => {
    e.preventDefault();
    if (!selectedJob || isSubmitting) return;

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

    let finalEquipment = '';
    if (isUnrepairable) {
      finalEquipment = `❌ ไม่สามารถซ่อมได้เนื่องจาก: ${finalReason} (${unrepairableDetails.trim()})`;
    } else if (isNoEquipmentUsed) {
      finalEquipment = 'น้ำไหลปกติแล้ว ไม่ได้ใช้อุปกรณ์';
    } else if (isSurfaceRestored) {
      finalEquipment = 'ซ่อมคืนผิวหลังซ่อมท่อเรียบร้อยแล้ว';
    } else {
      finalEquipment = notes || selectedEquipmentList.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ') || '-';
    }

    const targetJobId = selectedJob.id || selectedJob.JobID;
    const cleanBeforeImg = Array.from(new Set(images.before));
    const cleanInProgImg = Array.from(new Set(images.inProgress));
    const cleanAfterImg = Array.from(new Set(images.after));

    const targetStatus = isUnrepairable ? 'UNREPAIRABLE' : 'COMPLETED';

    const jobDataPayload = {
      action: "archive_job",
      jobData: {
        id: targetJobId,
        JobID: targetJobId,
        receivedNo: selectedJob.receivedNo || selectedJob.JobID || targetJobId,
        timestamp: selectedJob.receivedAt || selectedJob.Timestamp || currentDateTime,
        Timestamp: selectedJob.receivedAt || selectedJob.Timestamp || currentDateTime,
        reporterName: selectedJob.reporterName || selectedJob.ReporterName || 'ไม่ระบุชื่อ',
        ReporterName: selectedJob.reporterName || selectedJob.ReporterName || 'ไม่ระบุชื่อ',
        phone: selectedJob.phone || selectedJob.Phone || '-',
        Phone: selectedJob.phone || selectedJob.Phone || '-',
        location: selectedJob.location || selectedJob.Location || '-',
        Location: selectedJob.location || selectedJob.Location || '-',
        issueType: selectedJob.complaintTopic || selectedJob.IssueType || 'ท่อแตกรั่ว',
        IssueType: selectedJob.complaintTopic || selectedJob.IssueType || 'ท่อแตกรั่ว',
        pipeType: (isUnrepairable || isNoEquipmentUsed || isSurfaceRestored) ? '-' : pipeType,
        PipeType: (isUnrepairable || isNoEquipmentUsed || isSurfaceRestored) ? '-' : pipeType,
        pipeSize: (isUnrepairable || isNoEquipmentUsed || isSurfaceRestored) ? '-' : pipeSize,
        PipeSize: (isUnrepairable || isNoEquipmentUsed || isSurfaceRestored) ? '-' : pipeSize,
        description: selectedJob.details || selectedJob.Description || 'ดำเนินการซ่อมเสร็จสิ้น',
        Description: selectedJob.details || selectedJob.Description || 'ดำเนินการซ่อมเสร็จสิ้น',
        technician: currentTeam,
        Technician: currentTeam,
        status: targetStatus,
        Status: targetStatus,
        beforeImg: cleanBeforeImg,
        BeforeImg: cleanBeforeImg,
        inProgImg: cleanInProgImg,
        InProgImg: cleanInProgImg,
        afterImg: cleanAfterImg,
        AfterImg: cleanAfterImg,
        Notes: selectedJob.Notes || selectedJob.notes || selectedJob.urgency || 'ปกติ',
        closedAt: currentDateTime,
        ClosedAt: currentDateTime,
        equipment: finalEquipment,
        Equipment: finalEquipment,
        latitude: coords.lat || selectedJob.latitude || selectedJob.Latitude || '',
        Latitude: coords.lat || selectedJob.latitude || selectedJob.Latitude || '',
        longitude: coords.lng || selectedJob.longitude || selectedJob.Longitude || '',
        Longitude: coords.lng || selectedJob.longitude || selectedJob.Longitude || ''
      }
    };

    try {
      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(jobDataPayload)
      });

      const responseText = await response.text();
      let result = {};
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        result = { status: 'success' };
      }

      if (result && result.status === 'error') {
        throw new Error(result.message || 'Unknown server error');
      }

      const finalUpdatedData = {
        ...jobDataPayload.jobData,
        beforeImg: result.beforeImgUrl ? parseImages(result.beforeImgUrl) : cleanBeforeImg,
        inProgImg: result.inProgImgUrl ? parseImages(result.inProgImgUrl) : cleanInProgImg,
        afterImg: result.afterImgUrl ? parseImages(result.afterImgUrl) : cleanAfterImg
      };

      if (onUpdateJobStatus) {
        await onUpdateJobStatus(targetJobId, targetStatus, finalUpdatedData);
      }

      alert(isUnrepairable 
        ? `บันทึกรายงานซ่อมไม่ได้เรียบร้อยแล้ว` 
        : `ปิดงานซ่อมเรียบร้อยแล้ว!`
      );

      setSelectedJob(null);
      setImages({ before: [], inProgress: [], after: [] });
      setNotes('');
      setSelectedEquipmentList([]);
      setIsUnrepairable(false);
      setIsNoEquipmentUsed(false);
      setIsSurfaceRestored(false);
      setUnrepairableDetails('');
      setCustomUnrepairableReason('');
      setPipeType('HDPE');
      setPipeSize('110');
      setCoords({ lat: null, lng: null });

    } catch (err) {
      console.error("Error submitting fix:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (err.message || 'กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentTeam) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-900 text-white p-6 flex flex-col justify-center space-y-6 font-sans">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center mx-auto text-cyan-400">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">เข้าสู่ระบบช่างภาคสนาม</h2>
          <p className="text-xs text-slate-400">กรุณาเลือกทีมช่างผู้ปฏิบัติงาน เพื่อเข้าดูงานที่ได้รับมอบหมาย</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-3xl space-y-3 shadow-xl">
          <label className="block text-xs font-bold text-slate-300">เลือกทีมช่าง / ผู้ปฏิบัติงาน *</label>
          
          {isLoadingTeams ? (
            <div className="text-center py-4 text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> กำลังโหลดรายชื่อผู้ใช้งานจาก Google Sheets...
            </div>
          ) : teamListFromSheet.length > 0 ? (
            teamListFromSheet.map((t, idx) => (
              <button
                key={`team-sheet-${t.teamName || idx}`}
                onClick={() => {
                  handleLogin(t.teamName);
                  localStorage.setItem('pwa_worker_pos', t.position || '-');
                  localStorage.setItem('pwa_worker_phone', t.phone || '-');
                }}
                className="w-full bg-slate-700/90 hover:bg-blue-600 text-white p-3.5 rounded-2xl text-xs flex justify-between items-center transition shadow-sm active:scale-95 cursor-pointer text-left"
              >
                <div>
                  <div className="font-bold text-sm text-white">{t.teamName}</div>
                  <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5">
                    <span>🪪 {t.position || '-'}</span>
                    <span>📞 {t.phone || '-'}</span>
                  </div>
                </div>
                <span className="text-[10px] text-cyan-300 bg-blue-950/80 border border-blue-500/30 px-2 py-1 rounded-lg shrink-0">
                  เข้าสู่ระบบ
                </span>
              </button>
            ))
          ) : (!teams || teams.length === 0) ? (
            <p className="text-xs text-rose-400 text-center py-2">ยังไม่มีการเพิ่มบัญชีช่างใน Google Sheets (ชีต Teams)</p>
          ) : (
            teams.map((t, idx) => {
              const teamName = typeof t === 'string' ? t : t.teamName;
              return (
                <button
                  key={`team-fallback-${teamName || idx}`}
                  onClick={() => handleLogin(teamName)}
                  className="w-full bg-slate-700 hover:bg-blue-600 text-white font-bold p-3.5 rounded-2xl text-xs flex justify-between items-center transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <span>{teamName}</span>
                  <span className="text-[10px] text-cyan-300 bg-blue-950 px-2 py-1 rounded-lg">เข้าสู่ระบบ</span>
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
    <div className="max-w-md mx-auto bg-slate-100 min-h-screen pb-10 border-x border-slate-200 font-sans">
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-4 sticky top-0 z-20 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Wrench className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm">{currentTeam}</h2>
            <p className="text-[10px] text-slate-300">
              {localStorage.getItem('pwa_worker_pos') || 'กปภ.สาขานครพนม'} {localStorage.getItem('pwa_worker_phone') && `(${localStorage.getItem('pwa_worker_phone')})`}
            </p>
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
        {!selectedJob && !editingPhotoJob ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  รายการงานซ่อมค้างรับผิดชอบ ({activeJobs.length} งาน)
                </h3>
              </div>

              {activeJobs.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl text-center space-y-2 border border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">ไม่มีงานค้างรับผิดชอบ</p>
                  <p className="text-xs text-slate-400">หากพบท่อแตกระหว่างทาง สามารถกดปุ่ม "เปิดใบงานด่วน" ด้านบนได้ทันที</p>
                </div>
              ) : (
                activeJobs.map((job, index) => {
                  const currentUrgency = job.Notes || job.notes || job.urgency || job.Urgency || 'ปกติ';
                  const jobNo = job.receivedNo || job.JobID || job.id || `JOB-${index}`;
                  const reporter = job.reporterName || job.ReporterName || 'ไม่ระบุชื่อ';
                  const phoneNum = job.phone || job.Phone || '-';
                  const locationText = job.location || job.Location || 'ไม่ระบุสถานที่';
                  const topicText = job.complaintTopic || job.IssueType || job.issueType || 'ท่อแตกรั่ว';
                  const uniqueJobKey = job.id || job.JobID || job.receivedNo || `worker-job-${index}`;
                  const currentStatus = normalizeStatus(job.status || job.Status);
                  
                  // พิกัดจุดรั่ว (ถ้ามี)
                  const jobLat = job.latitude || job.Latitude;
                  const jobLng = job.longitude || job.Longitude;

                  // รูปภาพที่ประชาชนแนบมา (ถ้ามี)
                  const citizenImg = job.beforeImg || job.BeforeImg;

                  return (
                    <div key={uniqueJobKey} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3 relative overflow-hidden">
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                        currentStatus === 'UNREPAIRABLE' ? 'bg-purple-600' :
                        currentUrgency === 'ด่วนมาก' ? 'bg-rose-600' :
                        currentUrgency === 'ด่วน' ? 'bg-amber-500' : 'bg-slate-300'
                      }`} />

                      <div className="flex justify-between items-start pl-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                            {jobNo}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                            currentUrgency === 'ด่วนมาก' 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse' 
                              : currentUrgency === 'ด่วน'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {currentUrgency === 'ด่วนมาก' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                            {currentUrgency}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ml-1 ${
                            currentStatus === 'UNREPAIRABLE' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                            currentStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 
                            currentStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {currentStatus === 'UNREPAIRABLE' ? 'ซ่อมไม่ได้ (รอแก้ไข)' :
                             currentStatus === 'IN_PROGRESS' ? 'กำลังซ่อม' : 
                             currentStatus === 'PENDING' || currentStatus === 'DISPATCHED' ? 'รอเริ่มซ่อม' : 'รอเริ่มซ่อม'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 pl-2">
                        <h4 className="font-bold text-slate-800 text-sm">{topicText}</h4>
                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="font-semibold">{reporter}</span>
                          <a href={`tel:${phoneNum}`} className="text-blue-600 hover:underline flex items-center gap-0.5 ml-auto font-mono">
                            <Phone className="w-3 h-3" /> {phoneNum}
                          </a>
                        </p>
                        <p className="text-xs text-slate-600 flex items-start gap-1.5 mt-1">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span>{locationText}</span>
                        </p>

                        {/* 📸 ปุ่มดูรูปที่ประชาชนแนบมา และ 🗺️ ปุ่มนำทางพิกัดแผนที่ (แสดงเฉพาะเมื่อมีข้อมูลเท่านั้น) */}
                        {(citizenImg || (jobLat && jobLng)) && (
                          <div className="pt-1.5 flex flex-wrap gap-1.5">
                            {citizenImg && (
                              <a
                                href={citizenImg}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> ดูรูปถ่ายแจ้งซ่อม
                              </a>
                            )}
                            {jobLat && jobLng && (
                              <>
                                <a
                                  href={`https://maps.google.com/?q=${jobLat},${jobLng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-xs border border-blue-200"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-rose-500" /> ดูแผนที่จุดท่อรั่ว
                                </a>
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${jobLat},${jobLng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-xs border border-emerald-200"
                                >
                                  <Navigation className="w-3.5 h-3.5 text-emerald-600" /> นำทางไปยังจุดเกิดเหตุ <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex gap-2 pl-2">
                        {(currentStatus === 'DISPATCHED' || currentStatus === 'PENDING') && (
                          <button 
                            onClick={() => {
                              const now = new Date();
                              const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
                              const currentDateTime = thaiTime.toISOString().replace('T', ' ').substring(0, 16);
                              onUpdateJobStatus(job.id || job.JobID, 'IN_PROGRESS', { inProgressAt: currentDateTime });
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                          >
                            <Truck className="w-4 h-4" /> เริ่มเดินทาง / รับงาน
                          </button>
                        )}

                        {currentStatus === 'IN_PROGRESS' && (
                          <button 
                            onClick={() => {
                              setSelectedJob(job);
                              setIsUnrepairable(false);
                              setIsNoEquipmentUsed(false);
                              setIsSurfaceRestored(false);
                              setCoords({ 
                                lat: job.latitude || job.Latitude || null, 
                                lng: job.longitude || job.Longitude || null 
                              });
                            }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" /> บันทึกผลซ่อม / ปิดงาน
                          </button>
                        )}

                        {currentStatus === 'UNREPAIRABLE' && (
                          <button 
                            onClick={() => {
                              setSelectedJob(job);
                              setIsUnrepairable(false);
                              setIsNoEquipmentUsed(false);
                              setIsSurfaceRestored(false);
                              setCoords({ 
                                lat: job.latitude || job.Latitude || null, 
                                lng: job.longitude || job.Longitude || null 
                              });
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

            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                จัดการแก้ไขรูปภาพและข้อมูลใบงานที่ปิดแล้ว ({myCompletedJobs.length} งาน)
              </h3>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={completedSearchTerm}
                  onChange={(e) => setCompletedSearchTerm(e.target.value)}
                  placeholder="ค้นหาเลขรับแจ้ง, ผู้แจ้ง, สถานที่ซ่อม..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 shadow-xs"
                />
              </div>

              {myCompletedJobs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-2xl border border-slate-200">
                  ไม่พบรายการใบงานที่ปิดแล้วตามคำค้นหา
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {myCompletedJobs.map((job, cIdx) => (
                    <div key={job.id || job.JobID || `completed-${cIdx}`} className="bg-white p-3 rounded-2xl border border-slate-200 flex justify-between items-center hover:border-indigo-300 transition shadow-xs">
                      <div>
                        <span className="font-mono font-bold text-xs text-blue-600">{job.receivedNo || job.JobID || job.id}</span>
                        <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{job.location || job.Location}</p>
                        <p className="text-[10px] text-slate-400">เสร็จเมื่อ: {job.completedAt || job.closedAt || job.ClosedAt || '-'}</p>
                      </div>

                      <button
                        onClick={() => handleOpenEditPhotosModal(job)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> แก้ไขข้อมูล / รูป
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : editingPhotoJob ? (
          <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  แก้ไขใบงาน: <span className="font-mono text-blue-600">{editingPhotoJob.receivedNo || editingPhotoJob.JobID || editingPhotoJob.id}</span>
                </h3>
                <p className="text-xs text-slate-500">เลขที่ใบแจ้งซ่อมถูกล็อกไว้ ไม่สามารถแก้ไขได้</p>
              </div>
              <button 
                onClick={() => setEditingPhotoJob(null)} 
                className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ชนิดท่อ</label>
                <select
                  value={pipeType}
                  onChange={(e) => setPipeType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                >
                  {pipeTypes.map((t, idx) => (
                    <option key={`edit-ptype-${idx}`} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ขนาดท่อ (มม.)</label>
                <select
                  value={pipeSize}
                  onChange={(e) => setPipeSize(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                >
                  {pipeSizes.map((s, idx) => (
                    <option key={`edit-psize-${idx}`} value={s}>{s} มม.</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-blue-600" /> เพิ่ม/เลือกอุปกรณ์ซ่อมท่อ
                </label>
                {selectedEquipmentList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllEquipment}
                    className="text-[10px] text-rose-600 hover:underline font-bold"
                  >
                    ล้างรายการที่เลือกเพิ่ม
                  </button>
                )}
              </div>

              <div className="relative space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchEquipmentChange}
                      placeholder="พิมพ์ค้นหาชื่ออุปกรณ์..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                    />
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-40 overflow-y-auto divide-y divide-slate-100">
                        {suggestions.map((item, sIndex) => (
                          <button
                            key={`edit-suggestion-item-${item.id || sIndex}`}
                            type="button"
                            onClick={() => handleSelectEquipmentSuggestion(item)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition font-medium text-slate-700 flex justify-between"
                          >
                            <span>{item.name || item.itemName || item.อุปกรณ์}</span>
                            <span className="text-[10px] text-slate-400">{item.unit || 'หน่วย'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="number"
                    min="1"
                    value={equipmentQuantity}
                    onChange={(e) => setEquipmentQuantity(e.target.value)}
                    className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleAddEquipmentToList}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    เพิ่ม
                  </button>
                </div>

                {selectedEquipmentList.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {selectedEquipmentList.map((item, eqIdx) => {
                      const uniqueEqKey = item.id || `edit-selected-equipment-${eqIdx}`;
                      return (
                        <div key={uniqueEqKey} className="bg-white p-2 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700">{item.name} x {item.quantity} {item.unit}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEquipmentItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">รายการอุปกรณ์ที่ใช้ซ่อม / หมายเหตุ (แก้ไขในช่องนี้ได้)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุอุปกรณ์ที่ใช้ซ่อม..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">ข้อมูลเดิมจะแสดงในช่องนี้ คุณสามารถแก้ไขหรือลบออกได้ก่อนกดบันทึก</span>
            </div>

            <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200 space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-blue-900 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" /> พิกัดจุดซ่อม (GPS)
                </label>
                <button
                  type="button"
                  onClick={handleGetGPS}
                  disabled={isGettingLocation}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  {isGettingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                  ดึงพิกัดปัจจุบัน
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">ละติจูด (Latitude)</span>
                  <input
                    type="text"
                    value={coords.lat || ''}
                    onChange={(e) => setCoords({ ...coords, lat: e.target.value })}
                    placeholder="เช่น 17.4135"
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">ลองจิจูด (Longitude)</span>
                  <input
                    type="text"
                    value={coords.lng || ''}
                    onChange={(e) => setCoords({ ...coords, lng: e.target.value })}
                    placeholder="เช่น 104.7912"
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">📸 ภาพก่อนซ่อม ({images.before.length} รูป)</label>
                  <label className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรูป
                    <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImagesChange('before', e)} className="hidden" />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {images.before.map((img, idx) => (
                    <div key={`edit-before-${idx}`} className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 group">
                      <img src={img} alt="before" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemoveImage('before', idx)} className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full shadow-md">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">📸 ภาพระหว่างซ่อม ({images.inProgress.length} รูป)</label>
                  <label className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรูป
                    <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImagesChange('inProgress', e)} className="hidden" />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {images.inProgress.map((img, idx) => (
                    <div key={`edit-inprog-${idx}`} className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 group">
                      <img src={img} alt="inProgress" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemoveImage('inProgress', idx)} className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full shadow-md">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">📸 ภาพหลังซ่อมเสร็จ ({images.after.length} รูป)</label>
                  <label className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรูป
                    <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImagesChange('after', e)} className="hidden" />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {images.after.map((img, idx) => (
                    <div key={`edit-after-${idx}`} className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 group">
                      <img src={img} alt="after" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemoveImage('after', idx)} className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full shadow-md">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingPhotoJob(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold text-xs transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveUpdatedPhotos}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-md disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึกการแก้ไขข้อมูล
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">บันทึกผลการทำงาน: {selectedJob.receivedNo || selectedJob.JobID || selectedJob.id}</h3>
                <p className="text-xs text-slate-500">{selectedJob.reporterName || selectedJob.ReporterName} ({selectedJob.phone || selectedJob.Phone})</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ยกเลิก
              </button>
            </div>

            <form onSubmit={handleSubmitFix} className="space-y-4">
              {!isUnrepairable && (
                <div className="space-y-2">
                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    isNoEquipmentUsed ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={isNoEquipmentUsed}
                        onChange={(e) => handleToggleNoEquipment(e.target.checked)}
                        className="w-5 h-5 text-emerald-600 rounded-lg focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                      <div>
                        <span className={`text-xs font-bold block ${isNoEquipmentUsed ? 'text-emerald-700' : 'text-slate-700'}`}>
                          💧 น้ำไหลปกติแล้ว / ไม่ได้ใช้อุปกรณ์ซ่อม
                        </span>
                        <span className="text-[10px] text-slate-500">ติ๊กถูกหากตรวจสอบแล้วพบว่าน้ำไหลปกติและไม่ได้ใช้อุปกรณ์ใดๆ</span>
                      </div>
                    </label>
                  </div>

                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    isSurfaceRestored ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={isSurfaceRestored}
                        onChange={(e) => handleToggleSurfaceRestored(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <div>
                        <span className={`text-xs font-bold block ${isSurfaceRestored ? 'text-blue-700' : 'text-slate-700'}`}>
                          🛣️ ซ่อมคืนผิวหลังซ่อมท่อ (ไม่ต้องเบิกอุปกรณ์)
                        </span>
                        <span className="text-[10px] text-slate-500">ติ๊กถูกกรณีงานคืนผิวทาง เทคอนกรีต/ยางมะตอย โดยไม่ได้ใช้อุปกรณ์ท่อเพิ่ม</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {!isNoEquipmentUsed && !isSurfaceRestored && (
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  isUnrepairable ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={isUnrepairable}
                      onChange={(e) => {
                        setIsUnrepairable(e.target.checked);
                        if (e.target.checked) {
                          setIsNoEquipmentUsed(false);
                          setIsSurfaceRestored(false);
                        }
                      }}
                      className="w-5 h-5 text-rose-600 rounded-lg focus:ring-rose-500 border-slate-300 cursor-pointer"
                    />
                    <div>
                      <span className={`text-xs font-bold block ${isUnrepairable ? 'text-rose-700' : 'text-slate-700'}`}>
                        ⚠️ ไม่สามารถดำเนินการซ่อมได้ในขณะนี้
                      </span>
                      <span className="text-[10px] text-slate-500">ติ๊กถูกหากพบอุปสรรคที่ไม่สามารถดำเนินการซ่อมเสร็จได้</span>
                    </div>
                  </label>

                  {isUnrepairable && (
                    <div className="mt-3 space-y-3 pt-3 border-t border-rose-200">
                      <div>
                        <label className="block text-xs font-bold text-rose-800 mb-1">สาเหตุอุปสรรคที่ไม่สามารถซ่อมได้ *</label>
                        <select
                          value={unrepairableReasonType}
                          onChange={(e) => setUnrepairableReasonType(e.target.value)}
                          className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-rose-500 text-slate-800 outline-none"
                        >
                          {unrepairableReasons.map((r, rIdx) => (
                            <option key={`reason-opt-${rIdx}`} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>

                      {unrepairableReasonType === 'อื่นๆ (ระบุในรายละเอียด)' && (
                        <div>
                          <label className="block text-xs font-bold text-rose-800 mb-1">ระบุสาเหตุอื่นๆ *</label>
                          <input
                            type="text"
                            value={customUnrepairableReason}
                            onChange={(e) => setCustomUnrepairableReason(e.target.value)}
                            placeholder="กรอกสาเหตุที่ไม่สามารถซ่อมได้..."
                            className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-rose-500 text-slate-800 outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-rose-800 mb-1">รายละเอียดเพิ่มเติม/แนวทางแก้ไข *</label>
                        <textarea
                          rows="2"
                          value={unrepairableDetails}
                          onChange={(e) => setUnrepairableDetails(e.target.value)}
                          placeholder="ระบุสิ่งที่ต้องการการสนับสนุน เช่น ต้องการรถขุด..."
                          className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-rose-500 text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isUnrepairable && !isNoEquipmentUsed && !isSurfaceRestored && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชนิดท่อที่ซ่อม *</label>
                    <select
                      value={pipeType}
                      onChange={(e) => setPipeType(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                    >
                      {pipeTypes.map((t, tIdx) => (
                        <option key={`pipe-type-opt-${tIdx}`} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ขนาดท่อ (มม.) *</label>
                    <select
                      value={pipeSize}
                      onChange={(e) => setPipeSize(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                    >
                      {pipeSizes.map((s, sIdx) => (
                        <option key={`pipe-size-opt-${sIdx}`} value={s}>{s} มม.</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {!isUnrepairable && !isNoEquipmentUsed && !isSurfaceRestored && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-blue-600" /> เบิก/ใช้อุปกรณ์ซ่อมท่อ
                    </label>
                    {selectedEquipmentList.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllEquipment}
                        className="text-[10px] text-rose-600 hover:underline font-bold"
                      >
                        ล้างรายการทั้งหมด
                      </button>
                    )}
                  </div>

                  <div className="relative space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={handleSearchEquipmentChange}
                          placeholder="พิมพ์ค้นหาชื่ออุปกรณ์..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                        />
                        {suggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-40 overflow-y-auto divide-y divide-slate-100">
                            {suggestions.map((item, sIndex) => (
                              <button
                                key={`suggestion-item-${item.id || sIndex}`}
                                type="button"
                                onClick={() => handleSelectEquipmentSuggestion(item)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition font-medium text-slate-700 flex justify-between"
                              >
                                <span>{item.name || item.itemName || item.อุปกรณ์}</span>
                                <span className="text-[10px] text-slate-400">{item.unit || 'หน่วย'}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <input
                        type="number"
                        min="1"
                        value={equipmentQuantity}
                        onChange={(e) => setEquipmentQuantity(e.target.value)}
                        className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                      />

                      <button
                        type="button"
                        onClick={handleAddEquipmentToList}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                      >
                        เพิ่ม
                      </button>
                    </div>

                    {selectedEquipmentList.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        {selectedEquipmentList.map((item, eqIdx) => {
                          const uniqueEqKey = item.id || `selected-equipment-${eqIdx}`;
                          return (
                            <div key={uniqueEqKey} className="bg-white p-2 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-700">{item.name} x {item.quantity} {item.unit}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveEquipmentItem(item.id)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">📸 แนบรูปภาพปฏิบัติงาน *</label>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block text-center">ก่อนซ่อม</span>
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 rounded-xl p-2 flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[70px] transition">
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-[9px] text-slate-500 font-bold">+ เพิ่มรูป</span>
                      <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImagesChange('before', e)} className="hidden" />
                    </label>
                    {images.before.length > 0 && <p className="text-[10px] text-emerald-600 font-bold text-center">{images.before.length} รูป</p>}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block text-center">ระหว่างซ่อม</span>
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 rounded-xl p-2 flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[70px] transition">
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-[9px] text-slate-500 font-bold">+ เพิ่มรูป</span>
                      <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImagesChange('inProgress', e)} className="hidden" />
                    </label>
                    {images.inProgress.length > 0 && <p className="text-[10px] text-emerald-600 font-bold text-center">{images.inProgress.length} รูป</p>}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block text-center">หลังซ่อม</span>
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 rounded-xl p-2 flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[70px] transition">
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-[9px] text-slate-500 font-bold">+ เพิ่มรูป</span>
                      <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImagesChange('after', e)} className="hidden" />
                    </label>
                    {images.after.length > 0 && <p className="text-[10px] text-emerald-600 font-bold text-center">{images.after.length} รูป</p>}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" /> พิกัดหน้างาน (GPS)
                  </label>
                  <button
                    type="button"
                    onClick={handleGetGPS}
                    disabled={isGettingLocation}
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    {isGettingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                    ดึงพิกัดปัจจุบัน
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">ละติจูด (Latitude)</span>
                    <input
                      type="text"
                      value={coords.lat || ''}
                      onChange={(e) => setCoords({ ...coords, lat: e.target.value })}
                      placeholder="เช่น 17.4135"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">ลองจิจูด (Longitude)</span>
                    <input
                      type="text"
                      value={coords.lng || ''}
                      onChange={(e) => setCoords({ ...coords, lng: e.target.value })}
                      placeholder="เช่น 104.7912"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold text-xs transition cursor-pointer"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 text-white py-3 rounded-2xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-md ${
                    isUnrepairable ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isUnrepairable ? 'บันทึกรายงานซ่อมไม่ได้' : 'ยืนยันปิดงานซ่อม'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {isAdHocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-rose-600" />
                เปิดใบงานด่วน (หน้างาน)
              </h3>
              <button onClick={() => setIsAdHocModalOpen(false)} className="p-1 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdHocJob} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">เลขที่รับแจ้ง</label>
                <input
                  type="text"
                  readOnly
                  value={adHocData.receivedNo}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-blue-600 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">บริเวณที่เกิดเหตุ / สถานที่ซ่อม *</label>
                <textarea
                  rows="2"
                  required
                  value={adHocData.location}
                  onChange={(e) => setAdHocData({ ...adHocData, location: e.target.value })}
                  placeholder="ระบุบ้านเลขที่, ถนน, ซอย หรือจุดสังเกต..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อผู้แจ้ง (ถ้ามี)</label>
                  <input
                    type="text"
                    value={adHocData.reporterName}
                    onChange={(e) => setAdHocData({ ...adHocData, reporterName: e.target.value })}
                    placeholder="ไม่ระบุชื่อ"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ (ถ้ามี)</label>
                  <input
                    type="tel"
                    value={adHocData.phone}
                    onChange={(e) => setAdHocData({ ...adHocData, phone: e.target.value })}
                    placeholder="-"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-medium focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หัวข้อปัญหา/ความชำรุด *</label>
                <select
                  value={adHocData.complaintTopicType}
                  onChange={(e) => setAdHocData({ ...adHocData, complaintTopicType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                >
                  <option value="ท่อแตกรั่ว">ท่อแตกรั่ว</option>
                  <option value="น้ำไม่ไหล/น้ำไหลอ่อน">น้ำไม่ไหล/น้ำไหลอ่อน</option>
                  <option value="อื่นๆ">อื่นๆ (ระบุ)</option>
                </select>
              </div>

              {adHocData.complaintTopicType === 'อื่นๆ' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ระบุหัวข้อปัญหา *</label>
                  <input
                    type="text"
                    required
                    value={adHocData.customComplaintTopic}
                    onChange={(e) => setAdHocData({ ...adHocData, customComplaintTopic: e.target.value })}
                    placeholder="ระบุรายละเอียดปัญหา..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">ความเร่งด่วน *</label>
                <select
                  value={adHocData.urgency}
                  onChange={(e) => setAdHocData({ ...adHocData, urgency: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-bold focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                >
                  <option value="ปกติ">ปกติ</option>
                  <option value="ด่วน">ด่วน</option>
                  <option value="ด่วนมาก">ด่วนมาก</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdHocModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-2xl font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-2xl font-bold transition cursor-pointer shadow-md"
                >
                  สร้างใบงานด่วน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
