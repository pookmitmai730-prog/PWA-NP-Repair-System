import React, { useState } from 'react';
import { Clock, Wrench, User, Phone, MapPin, AlertCircle, Users, X, AlertTriangle, Search, Edit3 } from 'lucide-react';

export default function JobPipeline({ jobs, onStatusChange, workerAccounts = [] }) {
  const [selectedJobForDispatch, setSelectedJobForDispatch] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('ปกติ');

  // 🔴 State สำหรับช่องค้นหางานซ่อมบนหัวกระดาน Pipeline
  const [pipelineSearch, setPipelineSearch] = useState('');

  // 🔴 State สำหรับ Modal แก้ไข/เปลี่ยนทีมช่างในเคสที่จ่ายงานแล้วหรือกำลังซ่อม
  const [editingTeamJob, setEditingTeamJob] = useState(null);
  const [newSelectedTeam, setNewSelectedTeam] = useState('');

  const columns = [
    { id: 'PENDING', title: 'รอรับเรื่อง / มอบหมาย', color: 'bg-amber-500', bgLight: 'bg-amber-50/50', border: 'border-amber-200' },
    { id: 'DISPATCHED', title: 'มอบหมายช่างแล้ว', color: 'bg-cyan-500', bgLight: 'bg-cyan-50/50', border: 'border-cyan-200' },
    { id: 'IN_PROGRESS', title: 'กำลังดำเนินการซ่อม', color: 'bg-blue-600', bgLight: 'bg-blue-50/50', border: 'border-blue-200' },
    { id: 'COMPLETED', title: 'ซ่อมเสร็จสิ้น (ปิดงาน)', color: 'bg-emerald-600', bgLight: 'bg-emerald-50/50', border: 'border-emerald-200' },
  ];

  // ยืนยันการจ่ายงาน
  const handleConfirmDispatch = () => {
    if (!selectedTeam) {
      alert("กรุณาเลือกทีมช่างก่อนทำการจ่ายงาน");
      return;
    }
    const workerObj = workerAccounts.find(w => w.teamName === selectedTeam);
    const techDetails = workerObj ? `${workerObj.teamName} (${workerObj.phone || '-'})` : selectedTeam;
    
    const currentDateTime = new Date().toISOString().replace('T', ' ').substring(0, 16);

    onStatusChange(selectedJobForDispatch.id, 'DISPATCHED', { 
      technician: techDetails,
      techName: workerObj?.teamName || selectedTeam,
      techPhone: workerObj?.phone || '-',
      dispatchedAt: currentDateTime,
      urgency: urgencyLevel
    });
    setSelectedJobForDispatch(null);
    setSelectedTeam('');
    setUrgencyLevel('ปกติ');
  };

  // 🔴 ยืนยันการเปลี่ยนทีมช่างสำหรับงานที่กำลังดำเนินการอยู่
  const handleConfirmChangeTeam = () => {
    if (!newSelectedTeam || !editingTeamJob) return;

    const workerObj = workerAccounts.find(w => w.teamName === newSelectedTeam);
    const techDetails = workerObj ? `${workerObj.teamName} (${workerObj.phone || '-'})` : newSelectedTeam;

    onStatusChange(editingTeamJob.id, editingTeamJob.status, {
      technician: techDetails,
      techName: workerObj?.teamName || newSelectedTeam,
      techPhone: workerObj?.phone || '-'
    });

    setEditingTeamJob(null);
    setNewSelectedTeam('');
  };

  return (
    <div className="space-y-4">
      
      {/* หัวข้อกระดาน และ Textbox ค้นหางานซ่อม */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 shrink-0">
          <Wrench className="w-5 h-5 text-blue-600" />
          กระดานติดตามสถานะงานซ่อม
        </h3>

        {/* 🔍 เท็กซ์บ็อกซ์ค้นหางานซ่อมบนหัวกระดาน */}
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={pipelineSearch}
            onChange={(e) => setPipelineSearch(e.target.value)}
            placeholder="ค้นหาเลขรับแจ้ง, ชื่อ, สถานที่..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
          {pipelineSearch && (
            <button
              onClick={() => setPipelineSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* คอลัมน์ Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          // กรองงานตามสถานะ และกรองตามคำค้นหา (Pipeline Search)
          const colJobs = jobs.filter(j => {
            const matchStatus = j.status === col.id;
            if (!matchStatus) return false;

            if (!pipelineSearch.trim()) return true;
            const q = pipelineSearch.trim().toLowerCase();
            const receivedNo = String(j.receivedNo || j.id || '').toLowerCase();
            const reporterName = String(j.reporterName || '').toLowerCase();
            const phone = String(j.phone || '').toLowerCase();
            const location = String(j.location || '').toLowerCase();
            const issue = String(j.complaintTopic || j.issueType || '').toLowerCase();

            return receivedNo.includes(q) || reporterName.includes(q) || phone.includes(q) || location.includes(q) || issue.includes(q);
          });

          return (
            <div key={col.id} className={`rounded-3xl border ${col.border} ${col.bgLight} p-4 flex flex-col min-h-[500px]`}>
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200/60">
                <div className="flex items-center space-x-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`}></div>
                  <h4 className="font-bold text-xs text-slate-700">{col.title}</h4>
                </div>
                <span className="bg-white px-2 py-0.5 rounded-full text-[11px] font-bold text-slate-600 border border-slate-200 shadow-sm">
                  {colJobs.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {colJobs.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs text-center border border-dashed border-slate-200 rounded-2xl bg-white/40">
                    <AlertCircle className="w-5 h-5 mb-1 opacity-40" />
                    <span>ไม่มีรายการในหมวดนี้</span>
                  </div>
                ) : (
                  colJobs.map((job) => (
                    <div key={job.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-600 text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            {job.receivedNo || job.id}
                          </span>
                          {job.urgency && job.urgency !== 'ปกติ' && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                              job.urgency === 'ด่วนมาก' 
                                ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse' 
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                              <AlertTriangle className="w-3 h-3" /> {job.urgency}
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block"><Clock className="w-3 h-3 inline mr-0.5" /> แจ้ง: {job.receivedAt || job.createdAt}</span>
                          {job.dispatchedAt && (
                            <span className="text-[10px] text-cyan-600 font-semibold block">สั่งงาน: {job.dispatchedAt}</span>
                          )}
                          {job.completedAt && (
                            <span className="text-[10px] text-emerald-600 font-bold block">เสร็จ: {job.completedAt}</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-bold text-slate-800 text-xs leading-snug line-clamp-2">
                          {job.complaintTopic || job.issueType}
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{job.reporterName} ({job.phone})</span>
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-start gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{job.location}</span>
                        </p>
                      </div>

                      {/* แสดงชื่อทีมช่าง พร้อมปุ่มแก้ไขทีมช่าง (ยกเว้นเคสที่ปิดงาน COMPLETED แล้ว) */}
                      {job.status !== 'PENDING' && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1 relative group">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-blue-700 flex items-center gap-1">
                              <Users className="w-3 h-3" /> ทีมรับงาน: {job.techName || job.technician}
                            </p>
                            
                            {/* 🛠️ ปุ่มแก้ไข/เปลี่ยนทีมช่าง (แสดงเฉพาะงานที่ยังไม่ปิดงาน COMPLETED) */}
                            {job.status !== 'COMPLETED' && (
                              <button
                                onClick={() => {
                                  setEditingTeamJob(job);
                                  setNewSelectedTeam(job.techName || workerAccounts[0]?.teamName || '');
                                }}
                                className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition cursor-pointer"
                                title="เปลี่ยนทีมช่าง"
                              >
                                <Edit3 className="w-3 h-3" /> เปลี่ยนทีม
                              </button>
                            )}
                          </div>
                          
                          {job.techPhone && job.techPhone !== '-' && (
                            <p className="text-slate-600 flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-emerald-600" /> โทร: {job.techPhone}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">จัดการสถานะ</span>
                        <div className="flex gap-1">
                          {col.id === 'PENDING' && (
                            <button
                              onClick={() => {
                                setSelectedJobForDispatch(job);
                                setSelectedTeam(workerAccounts[0]?.teamName || '');
                                setUrgencyLevel('ปกติ');
                              }}
                              className="bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 py-1 rounded-lg font-bold transition shadow-sm cursor-pointer"
                            >
                              จ่ายงานช่าง
                            </button>
                          )}
                          {col.id === 'DISPATCHED' && (
                            <button
                              onClick={() => onStatusChange(job.id, 'IN_PROGRESS')}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg font-bold transition shadow-sm cursor-pointer"
                            >
                              เริ่มซ่อม
                            </button>
                          )}
                          {col.id === 'IN_PROGRESS' && (
                            <button
                              onClick={() => onStatusChange(job.id, 'COMPLETED')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold transition shadow-sm cursor-pointer"
                            >
                              ปิดงาน
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal จ่ายงานซ่อม */}
      {selectedJobForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm">จ่ายงานซ่อม: {selectedJobForDispatch.receivedNo || selectedJobForDispatch.id}</h4>
              <button onClick={() => setSelectedJobForDispatch(null)} className="cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">เลือกระดับความเร่งด่วน *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ปกติ', label: '1. ปกติ', activeClass: 'bg-slate-700 text-white border-slate-700' },
                    { id: 'ด่วน', label: '2. ด่วน', activeClass: 'bg-amber-500 text-white border-amber-500' },
                    { id: 'ด่วนมาก', label: '3. ด่วนมาก', activeClass: 'bg-rose-600 text-white border-rose-600 animate-pulse' }
                  ].map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setUrgencyLevel(level.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        urgencyLevel === level.id 
                          ? level.activeClass 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">เลือกทีมช่างผู้รับผิดชอบ *</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {workerAccounts.length === 0 ? (
                    <option value="">ไม่มีบัญชีช่าง (กรุณาเพิ่มบัญชีช่างในตั้งค่าแอดมินก่อน)</option>
                  ) : (
                    workerAccounts.map((worker) => (
                      <option key={worker.id || worker.teamName} value={worker.teamName}>
                        {worker.teamName} {worker.phone && worker.phone !== '-' ? `(โทร: ${worker.phone})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedJobForDispatch(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDispatch}
                disabled={workerAccounts.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
              >
                ยืนยันการจ่ายงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛠️ Modal สำหรับแก้ไข / เปลี่ยนทีมช่าง (กรณีเปลี่ยนใจเปลี่ยนทีมระหว่างดำเนินงาน) */}
      {editingTeamJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm">เปลี่ยนทีมช่าง: {editingTeamJob.receivedNo || editingTeamJob.id}</h4>
              <button onClick={() => setEditingTeamJob(null)} className="cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                ทีมช่างปัจจุบัน: <span className="font-bold text-slate-800">{editingTeamJob.techName || editingTeamJob.technician}</span>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">เลือกทีมช่างใหม่ *</label>
                <select
                  value={newSelectedTeam}
                  onChange={(e) => setNewSelectedTeam(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {workerAccounts.map((worker) => (
                    <option key={worker.id || worker.teamName} value={worker.teamName}>
                      {worker.teamName} {worker.phone && worker.phone !== '-' ? `(โทร: ${worker.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingTeamJob(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmChangeTeam}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md cursor-pointer"
              >
                บันทึกการเปลี่ยนทีม
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
