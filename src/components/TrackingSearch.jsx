import React, { useState } from 'react';
import { 
  Search, Clock, CheckCircle2, Truck, AlertCircle, Phone, 
  User, MapPin, Package, ShieldCheck, ArrowRight, Activity, Wrench, Users
} from 'lucide-react';

export default function TrackingSearch({ jobs }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const term = searchTerm.trim().toLowerCase();
    const found = jobs.find(
      j => (j.receivedNo && j.receivedNo.toLowerCase().includes(term)) ||
           (j.id && j.id.toLowerCase().includes(term)) ||
           (j.phone && j.phone.includes(term))
    );

    setSearchResult(found || null);
    setHasSearched(true);
  };

  const getStepIndex = (status) => {
    switch (status) {
      case 'PENDING': return 1;
      case 'DISPATCHED': return 2;
      case 'IN_PROGRESS': return 3;
      case 'COMPLETED': return 4;
      default: return 1;
    }
  };

  const currentStep = searchResult ? getStepIndex(searchResult.status) : 0;

  const steps = [
    { 
      step: 1, 
      label: 'รับแจ้งเรื่อง', 
      desc: 'บันทึกคำร้องเข้าระบบ', 
      icon: Clock,
      time: searchResult?.receivedAt || searchResult?.createdAt || '-'
    },
    { 
      step: 2, 
      label: 'จ่ายงานช่าง', 
      desc: 'มอบหมายทีมช่างภาคสนาม', 
      icon: ShieldCheck,
      time: searchResult?.dispatchedAt || (searchResult?.status !== 'PENDING' ? 'จ่ายงานแล้ว' : 'รอจ่ายงาน')
    },
    { 
      step: 3, 
      label: 'กำลังซ่อมแซม', 
      desc: 'ทีมช่างเข้าหน้างาน', 
      icon: Truck,
      time: searchResult?.inProgressAt || (searchResult?.status === 'IN_PROGRESS' || searchResult?.status === 'COMPLETED' ? 'ดำเนินการแล้ว' : 'รอดำเนินการ')
    },
    { 
      step: 4, 
      label: 'ซ่อมเสร็จสิ้น', 
      desc: 'เปิดจ่ายน้ำปกติ / ปิดงาน', 
      icon: CheckCircle2,
      time: searchResult?.completedAt || (searchResult?.status === 'COMPLETED' ? 'เสร็จสิ้น' : 'รอปิดงาน')
    },
  ];

  return (
    <div className="relative overflow-hidden bg-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-800 space-y-6">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/30">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-white tracking-wide">PWA EXPRESS TRACKING</h3>
              <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                <Activity className="w-3 h-3 animate-pulse text-rose-500" /> Live Tracking
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">ระบบติดตามสถานะการซ่อมท่อประปา กปภ.สาขานครพนม แบบเรียลไทม์</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSearch} className="relative z-10 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ป้อนเลขที่รับแจ้ง (เช่น S2026101900440) หรือเบอร์โทรศัพท์..."
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30 font-mono tracking-wide transition shadow-inner"
          />
        </div>
        <button 
          type="submit"
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-7 py-3.5 rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/30 transition active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <span>ติดตามสถานะ</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {hasSearched && (
        <div className="relative z-10 pt-2">
          {searchResult ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl backdrop-blur-md">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">เลขที่รับแจ้ง (Tracking No.)</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 text-lg sm:text-xl">
                      {searchResult.receivedNo || searchResult.id}
                    </span>
                    <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2.5 py-0.5 rounded-md border border-slate-700">
                      กปภ.
                    </span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">สถานะปัจจุบัน</span>
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/20 animate-pulse">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                    {searchResult.status === 'COMPLETED' ? 'ซ่อมเสร็จสิ้น (ปิดงาน)' : 
                     searchResult.status === 'IN_PROGRESS' ? 'กำลังดำเนินการซ่อม' : 
                     searchResult.status === 'DISPATCHED' ? 'มอบหมายช่างแล้ว' : 'รอรับเรื่อง/จัดส่งช่าง'}
                  </span>
                </div>
              </div>

              {/* Express Stepper Timeline พร้อมแสดงวันเวลาใต้แต่ละขั้นตอน */}
              <div className="py-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                  {steps.map((s) => {
                    const Icon = s.icon;
                    const isActive = currentStep >= s.step;
                    const isCurrent = currentStep === s.step;

                    return (
                      <div key={s.step} className="relative flex flex-col items-center text-center group">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 z-10 border ${
                          isCurrent 
                            ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-500/50 scale-110' 
                            : isActive 
                            ? 'bg-slate-800 text-rose-400 border-rose-500/50' 
                            : 'bg-slate-950 text-slate-600 border-slate-800'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className={`text-xs font-bold transition ${isActive ? 'text-white' : 'text-slate-500'}`}>{s.label}</p>
                          <p className="text-[10px] text-slate-400 font-mono bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">{s.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Job Details Card */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Wrench className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">หัวข้อการร้องเรียน</span>
                        <p className="font-bold text-slate-200 text-sm">{searchResult.complaintTopic || searchResult.issueType}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">บริเวณที่เกิดเหตุ</span>
                        <p className="text-slate-300 leading-relaxed">{searchResult.location}</p>
                      </div>
                    </div>

                    {searchResult.status !== 'PENDING' && (
                      <div className="bg-blue-950/40 border border-blue-900/50 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] text-cyan-400 uppercase font-bold block flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> ทีมช่างผู้รับผิดชอบ
                        </span>
                        <p className="font-bold text-slate-200">{searchResult.techName || searchResult.technician}</p>
                        {searchResult.techPhone && searchResult.techPhone !== '-' && (
                          <p className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                            <Phone className="w-3 h-3" /> โทร: {searchResult.techPhone}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">ข้อมูลผู้ร้องเรียน</span>
                        <p className="font-semibold text-slate-200">{searchResult.reporterName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">เบอร์โทรศัพท์</span>
                        <p className="font-mono text-emerald-400 font-bold">{searchResult.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">วันเวลาที่รับแจ้ง</span>
                        <p className="font-mono text-slate-400 text-[11px]">{searchResult.receivedAt || searchResult.createdAt}</p>
                      </div>
                    </div>

                    {searchResult.completedAt && (
                      <div className="flex items-center gap-2 pt-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-emerald-500 uppercase font-bold block">วันที่ซ่อมเสร็จสิ้น</span>
                          <p className="font-mono text-emerald-300 text-[11px]">{searchResult.completedAt}</p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-3 backdrop-blur-md">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-200">ไม่พบข้อมูลตามเลขที่หรือเบอร์โทรศัพท์นี้</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">โปรดตรวจสอบเลขที่รับแจ้ง (เช่น S2026101900440) หรือเบอร์โทรศัพท์แล้วลองใหม่อีกครั้ง</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}