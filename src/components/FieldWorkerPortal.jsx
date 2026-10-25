import React, { useState } from 'react';
import { Truck, MapPin, Camera, CheckCircle2, Wrench, Send, Trash2, Phone, User, LogOut, Lock, Navigation, AlertTriangle, PlusCircle, X, Edit3 } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';
import { saveJobToFirebase } from '../services/firebase';

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
  const [notes, setNotes] = useState('');
  
  // State สำหรับชนิดท่อและขนาดท่อ
  const [pipeType, setPipeType] = useState('HDPE');
  const [pipeSize, setPipeSize] = useState('110');

  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pipeTypes = ['PB', 'PVC', 'AC', 'HDPE', 'GS', 'SP'];
  const pipeSizes = ['20', '25', '40', '50', '100', '110', '150', '160', '200', '225', '250', '280', '300', '315', '400', '630'];

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

  // 🕒 ฟังก์ชันสร้างเลขที่รับแจ้งอัตโนมัติ ตามเวลาประเทศไทย
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

  // ✏️ เปิด Modal เพื่อแก้ไขใบงาน
  const handleOpenEditModal = (job) => {
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

  // 🗑️ ฟังก์ชันลบเรื่อง
  const handleDeleteJobAction = async (job) => {
    if (job.status === 'COMPLETED') {
      alert("ไม่สามารถลบใบงานที่ซ่อมเสร็จสิ้นแล้วได้");
      return;
    }

    if (window.confirm(`คุณต้องการลบใบแจ้งซ่อมเลขที่ "${job.receivedNo || job.id}" ใช่หรือไม่?`)) {
      try {
        if (onDeleteJob) {
          await onDeleteJob(job.id);
        } else {
          // เผื่อเรียกตรงไปยังสถานะ CANCELED/DELETED
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

  const activeJobs = jobs
    .filter(j => {
      const matchTechName = j.techName && j.techName.trim() === currentTeam.trim();
      const matchTechnicianStr = j.technician && j.technician.includes(currentTeam);
      const isMyTeam = matchTechName || matchTechnicianStr;
      
      const isValidStatus = j.status === 'DISPATCHED' || j.status === 'IN_PROGRESS';
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

  // 🔴 บันทึกหรืออัปเดตใบงานด่วนหน้างาน
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
      // โหมดแก้ไขข้อมูลใบงานเดิม
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
      // โหมดสร้างใบงานใหม่
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
        setCoords({ lat: null, lng: null });
        alert("สร้างเลขที่รับแจ้งสำเร็จ! กรุณาถ่ายภาพและบันทึกผลการซ่อม");
      } catch (err) {
        console.error("Error saving ad-hoc job:", err);
        alert("ไม่สามารถบันทึกใบงานด่วนได้");
      }
    }
  };

  const handleSubmitFix = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    setIsSubmitting(true);

    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const currentDateTime = thaiTime.toISOString().replace('T', ' ').substring(0, 16);

    const updatePayload = {
      status: 'COMPLETED',
      pipeType: pipeType,
      pipeSize: pipeSize,
      beforeImgBase64: JSON.stringify(images.before),
      inProgImgBase64: JSON.stringify(images.inProgress),
      afterImgBase64: JSON.stringify(images.after),
      notes: notes || `ใช้อุปกรณ์: ท่อ ${pipeType} ขนาด ${pipeSize} มม.`,
      completedAt: currentDateTime,
      latitude: coords.lat || selectedJob.latitude || '',
      longitude: coords.lng || selectedJob.longitude || ''
    };

    await onUpdateJobStatus(selectedJob.id, 'COMPLETED', updatePayload);

    setIsSubmitting(false);
    setSelectedJob(null);
    setImages({ before: [], inProgress: [], after: [] });
    setNotes('');
    setPipeType('HDPE');
    setPipeSize('110');
    setCoords({ lat: null, lng: null });
    alert(`ปิดงานซ่อม ${selectedJob.receivedNo || selectedJob.id} เรียบร้อยแล้ว!`);
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
              activeJobs.map((job) => (
                <div key={job.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3 relative overflow-hidden">
                  
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
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
                      {/* 🛠️ ปุ่มแก้ไขและลบ แสดงเฉพาะเคสที่ยังไม่ปิดงาน (COMPLETED) */}
                      {job.status !== 'COMPLETED' && (
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

                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ml-1 ${
                        job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {job.status === 'IN_PROGRESS' ? 'กำลังซ่อม' : 'รอเริ่มซ่อม'}
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
                          setCoords({ lat: null, lng: null });
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> บันทึกผลซ่อม / ปิดงาน
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">บันทึกผลซ่อม: {selectedJob.receivedNo || selectedJob.id}</h3>
                <p className="text-xs text-slate-500">{selectedJob.reporterName} ({selectedJob.phone})</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ยกเลิก
              </button>
            </div>

            <form onSubmit={handleSubmitFix} className="space-y-4">
              
              {/* ส่วนเลือกชนิดท่อและขนาดท่อ */}
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
                    * ควรกดปุ่ม "ดึงพิกัดปัจจุบัน" ขณะยืนอยู่ที่จุดซ่อมท่อ
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
                      <span className="text-[10px] block font-bold text-slate-600">ก่อนซ่อม ({images.before.length})</span>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-2 text-center relative hover:bg-slate-50">
                    <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImagesChange('inProgress', e.target.files)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
                    <div className="py-1 space-y-1">
                      <Camera className="w-5 h-5 mx-auto text-amber-500" />
                      <span className="text-[10px] block font-bold text-slate-600">ระหว่างซ่อม ({images.inProgress.length})</span>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-2 text-center relative hover:bg-slate-50">
                    <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImagesChange('after', e.target.files)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
                    <div className="py-1 space-y-1">
                      <Camera className="w-5 h-5 mx-auto text-emerald-500" />
                      <span className="text-[10px] block font-bold text-slate-600">หลังซ่อม ({images.after.length})</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {['before', 'inProgress', 'after'].map((type) => (
                    images[type].length > 0 && (
                      <div key={type} className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          {type === 'before' ? 'รูปก่อนซ่อม' : type === 'inProgress' ? 'รูประหว่างซ่อม' : 'รูปหลังซ่อม'} ({images[type].length})
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">อุปกรณ์ที่ใช้</label>
                <textarea 
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="กรุณาใส่อุปกรณ์ซ่อม"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันปิดงานซ่อม'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 🔴 Modal สำหรับเปิดใบงานด่วน หรือแก้ไขใบงานเดิม */}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input 
                    type="text"
                    value={adHocData.phone}
                    onChange={(e) => setAdHocData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="เบอร์โทรผู้แจ้ง"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">บริเวณที่เกิดเหตุ / สถานที่ซ่อม *</label>
                <textarea 
                  rows="2"
                  value={adHocData.location}
                  onChange={(e) => setAdHocData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="ระบุบ้านเลขที่ ถนน ซอย หรือจุดสังเกต"
                  required
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หัวข้อปัญหา *</label>
                <select
                  value={adHocData.complaintTopicType}
                  onChange={(e) => setAdHocData(prev => ({ ...prev, complaintTopicType: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 mb-2"
                >
                  <option value="ท่อแตกรั่ว">1. ท่อแตกรั่ว</option>
                  <option value="น้ำไม่ไหล/น้ำไหลอ่อน">2. น้ำไม่ไหล/น้ำไหลอ่อน</option>
                  <option value="อื่นๆ">3. อื่นๆ</option>
                </select>

                {adHocData.complaintTopicType === 'อื่นๆ' && (
                  <input 
                    type="text"
                    value={adHocData.customComplaintTopic}
                    onChange={(e) => setAdHocData(prev => ({ ...prev, customComplaintTopic: e.target.value }))}
                    placeholder="กรุณาระบุหัวข้อปัญหาเพิ่มเติม..."
                    required
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdHocModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  {editingJob ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                  {editingJob ? 'บันทึกการแก้ไข' : 'บันทึกและไปหน้าบันทึกผลซ่อม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
