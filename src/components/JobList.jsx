import React, { useState } from 'react';
import { Search, MapPin, CheckCircle2, Clock, Wrench, FileText, AlertCircle } from 'lucide-react';

export default function TrackingSearch({ jobs }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const found = jobs.find(j => j.id.toLowerCase() === searchQuery.trim().toLowerCase());
    setSelectedJob(found || 'NOT_FOUND');
  };

  const getStepStatus = (jobStatus) => {
    switch (jobStatus) {
      case 'PENDING': return 1;
      case 'DISPATCHED': return 2;
      case 'IN_PROGRESS': return 3;
      case 'COMPLETED': return 4;
      default: return 1;
    }
  };

  return (
    <section className="bg-linear-to-br from-slate-900 via-slate-900 to-blue-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-800">
      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-300 via-white to-blue-200">
          ติดตามสถานะงานซ่อมท่อ (Real-time Tracking)
        </h2>
        <p className="text-xs md:text-sm text-slate-300">
          กรอกเลขที่ใบแจ้งซ่อมเพื่อดูสถานะและขั้นตอนปฏิบัติงานภาคสนาม
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto pt-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="กรอกรหัส เช่น REP-202610-001"
              className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm backdrop-blur-md"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
          </div>
          <button 
            type="submit"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition text-sm shadow-lg shadow-cyan-500/20 active:scale-95 shrink-0"
          >
            ค้นหา
          </button>
        </form>

        {selectedJob === 'NOT_FOUND' && (
          <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs md:text-sm rounded-xl flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            ไม่พบข้อมูลใบสั่งซ่อมรหัสนี้ กรุณาตรวจสอบอีกครั้ง
          </div>
        )}

        {selectedJob && selectedJob !== 'NOT_FOUND' && (
          <div className="mt-6 bg-white/10 border border-white/15 rounded-2xl p-5 backdrop-blur-md text-left space-y-5">
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <span className="text-xs bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 px-2.5 py-1 rounded-md font-mono font-semibold">
                  {selectedJob.id}
                </span>
                <h3 className="text-base font-bold text-white mt-2">{selectedJob.issueType} ({selectedJob.pipeSize})</h3>
                <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" /> {selectedJob.location}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-medium">
                  {selectedJob.status === 'COMPLETED' ? 'ปิดงานเรียบร้อย' : 'กำลังดำเนินการ'}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">ช่างผู้ดูแล: {selectedJob.technician}</p>
              </div>
            </div>

            <div className="pt-2">
              <div className="grid grid-cols-4 gap-2 text-center text-xs relative">
                {[
                  { step: 1, title: 'รับคำร้อง', icon: FileText },
                  { step: 2, title: 'จ่ายงาน', icon: Clock },
                  { step: 3, title: 'กำลังซ่อม', icon: Wrench },
                  { step: 4, title: 'ปิดงาน', icon: CheckCircle2 }
                ].map((st) => {
                  const currentStep = getStepStatus(selectedJob.status);
                  const isDone = currentStep >= st.step;
                  const IconComp = st.icon;

                  return (
                    <div key={st.step} className="space-y-2 z-10">
                      <div className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center font-bold transition-all ${
                        isDone 
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' 
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <p className={`text-[11px] font-medium ${isDone ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {st.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}