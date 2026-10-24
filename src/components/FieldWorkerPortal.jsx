import React, { useState } from 'react';
import { Truck, MapPin, Camera, CheckCircle2, Wrench, Send, Trash2, Phone, User, LogOut, Lock, Navigation, AlertTriangle } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export default function FieldWorkerPortal({ jobs, onUpdateJobStatus, teams, onLogout }) {
  const [currentTeam, setCurrentTeam] = useState(localStorage.getItem('pwa_worker_team') || '');
  const [selectedJob, setSelectedJob] = useState(null);
  const [images, setImages] = useState({ before: [], inProgress: [], after: [] });
  const [notes, setNotes] = useState('');
  
  // 🔴 State สำหรับชนิดท่อและขนาดท่อ
  const [pipeType, setPipeType] = useState('HDPE');
  const [pipeSize, setPipeSize] = useState('110');

  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // รายการตัวเลือกชนิดท่อและขนาดท่อ
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

      if (weightA !== weightB) {
        return weightB - weightA;
      }

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
        alert("ไม่สามารถดึงพิกัดได้ (กรุณาอนุญาตการเข้าถึงตำแหน่ง GPS ในเบราว์เซอร์)");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
      notes: notes || `ดำเนินการซ่อมท่อเสร็จสิ้น ชนิดท่อ ${pipeType} ขนาด ${pipeSize} มม. เปิดจ่ายน้ำปกติ`,
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
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-bold">
            {activeJobs.length} งาน
          </span>
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
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              รายการงานซ่อม (เรียงตามลำดับความเร่งด่วน)
            </h3>

            {activeJobs.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center space-y-2 border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-700">ไม่มีงานค้างรับผิดชอบ</p>
                <p className="text-xs text-slate-400">งานซ่อมของทีมคุณถูกดำเนินการเสร็จสิ้นทั้งหมดแล้ว</p>
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

                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                      job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {job.status === 'IN_PROGRESS' ? 'กำลังซ่อม' : 'รอเริ่มซ่อม'}
                    </span>
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
              
              {/* 🔴 ส่วนเลือกชนิดท่อและขนาดท่อ */}
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
                    * ควรกดปุ่ม "ดึงพิกัดปัจจุบัน" ขณะยืนอยู่ที่จุดซ่อมท่อ เพื่อใช้อ้างอิงตำแหน่งในอนาคต
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
                <label className="block text-xs font-bold text-slate-700 mb-1">สรุปการซ่อม / การแก้ไข</label>
                <textarea 
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น เปลี่ยนท่อ HDPE ขนาด 110 มม. แตกชำรุดเรียบร้อย"
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
    </div>
  );
}
