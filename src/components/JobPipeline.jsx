import React, { useState } from 'react';
import { Clock, Truck, Wrench, CheckCircle2, User, Phone, MapPin, AlertCircle, Users, Plus, Trash2, Edit2, X, AlertTriangle } from 'lucide-react';

export default function JobPipeline({ jobs, onStatusChange, teams, onAddTeam, onEditTeam, onDeleteTeam }) {
  const [selectedJobForDispatch, setSelectedJobForDispatch] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  
  // 🔴 เพิ่ม State สำหรับเลือกระดับความเร่งด่วน
  const [urgencyLevel, setUrgencyLevel] = useState('ปกติ');

  const [isManageTeamsOpen, setIsManageTeamsOpen] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [teamPhoneInput, setTeamPhoneInput] = useState('');
  const [editingTeamOriginalName, setEditingTeamOriginalName] = useState(null);

  const columns = [
    { id: 'PENDING', title: 'รอรับเรื่อง / มอบหมาย', color: 'bg-amber-500', bgLight: 'bg-amber-50/50', border: 'border-amber-200' },
    { id: 'DISPATCHED', title: 'มอบหมายช่างแล้ว', color: 'bg-cyan-500', bgLight: 'bg-cyan-50/50', border: 'border-cyan-200' },
    { id: 'IN_PROGRESS', title: 'กำลังดำเนินการซ่อม', color: 'bg-blue-600', bgLight: 'bg-blue-50/50', border: 'border-blue-200' },
    { id: 'COMPLETED', title: 'ซ่อมเสร็จสิ้น (ปิดงาน)', color: 'bg-emerald-600', bgLight: 'bg-emerald-50/50', border: 'border-emerald-200' },
  ];

  // ยืนยันการจ่ายงาน พร้อมบันทึกความเร่งด่วน
  const handleConfirmDispatch = () => {
    if (!selectedTeam) {
      alert("กรุณาเลือกทีมช่างก่อนทำการจ่ายงาน");
      return;
    }
    const teamObj = teams.find(t => t.name === selectedTeam);
    const techDetails = teamObj ? `${teamObj.name} (${teamObj.phone || 'ไม่มีเบอร์'})` : selectedTeam;
    
    const currentDateTime = new Date().toISOString().replace('T', ' ').substring(0, 16);

    onStatusChange(selectedJobForDispatch.id, 'DISPATCHED', { 
      technician: techDetails,
      techName: teamObj?.name || selectedTeam,
      techPhone: teamObj?.phone || '-',
      dispatchedAt: currentDateTime,
      urgency: urgencyLevel // 🔴 ส่งค่าระดับความเร่งด่วน
    });
    setSelectedJobForDispatch(null);
    setSelectedTeam('');
    setUrgencyLevel('ปกติ');
  };

  const handleSaveTeamForm = (e) => {
    e.preventDefault();
    if (!teamNameInput.trim()) return;

    if (editingTeamOriginalName) {
      onEditTeam(editingTeamOriginalName, { name: teamNameInput.trim(), phone: teamPhoneInput.trim() });
      setEditingTeamOriginalName(null);
    } else {
      onAddTeam({ name: teamNameInput.trim(), phone: teamPhoneInput.trim() });
    }

    setTeamNameInput('');
    setTeamPhoneInput('');
  };

  const handleStartEditTeam = (team) => {
    setEditingTeamOriginalName(team.name);
    setTeamNameInput(team.name);
    setTeamPhoneInput(team.phone || '');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-600" />
          กระดานติดตามสถานะงานซ่อม (Pipeline)
        </h3>
        
        <button
          onClick={() => {
            setIsManageTeamsOpen(true);
            setEditingTeamOriginalName(null);
            setTeamNameInput('');
            setTeamPhoneInput('');
          }}
          className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Users className="w-4 h-4 text-cyan-400" />
          จัดการทีมช่าง ({teams.length} ทีม)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colJobs = jobs.filter(j => j.status === col.id);

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
                          {/* Badge แสดงระดับความเร่งด่วน */}
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

                      {job.status !== 'PENDING' && (
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-[11px] space-y-0.5">
                          <p className="font-bold text-blue-700 flex items-center gap-1">
                            <Users className="w-3 h-3" /> ทีมรับงาน: {job.techName || job.technician}
                          </p>
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
                                setSelectedTeam(teams[0]?.name || '');
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

      {/* Modal จ่ายงานซ่อม พร้อมตัวเลือกระดับความเร่งด่วน */}
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
                  {teams.length === 0 ? (
                    <option value="">ไม่มีทีมช่าง (กรุณาเพิ่มทีมช่างก่อน)</option>
                  ) : (
                    teams.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} {t.phone ? `(โทร: ${t.phone})` : ''}
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
                disabled={teams.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
              >
                ยืนยันการจ่ายงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {isManageTeamsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> จัดการรายชื่อและเบอร์ติดต่อทีมช่าง
              </h4>
              <button onClick={() => setIsManageTeamsOpen(false)} className="cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveTeamForm} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-700">
                {editingTeamOriginalName ? `แก้ไขข้อมูล: ${editingTeamOriginalName}` : 'เพิ่มทีมช่างใหม่'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="ชื่อทีม เช่น ทีมซ่อมท่อเขต 1"
                  required
                  className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  value={teamPhoneInput}
                  onChange={(e) => setTeamPhoneInput(e.target.value)}
                  placeholder="เบอร์ติดต่อ เช่น 0812345678"
                  className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                {editingTeamOriginalName && (
                  <button
                    type="button"
                    onClick={() => { setEditingTeamOriginalName(null); setTeamNameInput(''); setTeamPhoneInput(''); }}
                    className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    ยกเลิกแก้ไข
                  </button>
                )}
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-sm cursor-pointer">
                  {editingTeamOriginalName ? 'บันทึกการแก้ไข' : '+ เพิ่มทีมช่าง'}
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">รายชื่อทีมช่างทั้งหมด ({teams.length})</span>
              {teams.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีข้อมูลทีมช่าง</p>
              ) : (
                teams.map((t) => (
                  <div key={t.name} className="flex justify-between items-center bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs shadow-xs">
                    <div>
                      <p className="font-bold text-slate-800">{t.name}</p>
                      <p className="text-slate-500 font-mono text-[11px]">โทร: {t.phone || 'ไม่ระบุเบอร์'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleStartEditTeam(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer" title="แก้ไข">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDeleteTeam(t.name)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer" title="ลบ">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}