import React, { useState } from 'react';
import { 
  Search, Clock, CheckCircle2, Truck, AlertCircle, Phone, 
  User, MapPin, Package, ShieldCheck, ArrowRight, Activity, Wrench, Users
} from 'lucide-react';

export default function TrackingSearch({ jobs = [], teams = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // 📅 ฟังก์ชันแปลงรูปแบบวันที่และเวลาเป็นภาษาไทยเต็มรูปแบบ
  const formatThaiDateTime = (dateInput) => {
    if (!dateInput || dateInput === '-') return '-';
    let date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return String(dateInput).replace('T', ' '); 
    }

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    
    let year = date.getFullYear();
    if (year < 2500) year += 543;

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (hours === '00' && minutes === '00' && typeof dateInput === 'string' && !dateInput.includes(':')) {
      return `${day} ${month} ${year}`;
    }

    return `${day} ${month} ${year} เวลา ${hours}.${minutes} น.`;
  };

  // 🔍 ฟังก์ชันดึงเบอร์โทรศัพท์ทีมช่างจากตาราง Teams หรือฟิลด์ใน Job
  const getTeamPhone = (job) => {
    if (!job) return '-';

    const directPhone = job.techPhone || job.TechPhone || job.workerPhone;
    if (directPhone && directPhone !== '-') {
      return String(directPhone).replace(/^'/, '');
    }

    const rawTechField = job.techName || job.technician || job.Technician || '';

    if (rawTechField.includes('(') && rawTechField.includes(')')) {
      const match = rawTechField.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        const extracted = match[1].trim();
        if (/^\d{9,10}$/.test(extracted)) {
          return extracted;
        }
      }
    }

    if (teams && Array.isArray(teams) && teams.length > 0) {
      const matchedTeam = teams.find(t => {
        if (!t) return false;
        const tName = t.teamName || t.name || t.username || '';
        return tName && (rawTechField.includes(tName) || tName === rawTechField);
      });

      if (matchedTeam) {
        const p = matchedTeam.phone || matchedTeam.tel || matchedTeam.phoneNumber || '-';
        if (p && p !== '-') {
          return String(p).replace(/^'/, '');
        }
      }
    }

    if (rawTechField.includes('อัสดา')) return '0962922033';
    if (rawTechField.includes('สุเมธ')) return '0987475403';

    return '-';
  };

  // 🛠️ ฟังก์ชันแปลงสถานะ
  const normalizeStatus = (status) => {
    if (!status) return 'PENDING';
    const s = String(status).toUpperCase();
    if (s.includes('PENDING') || s.includes('รอดำเนินการ') || s.includes('รอรับเรื่อง')) return 'PENDING';
    if (s.includes('DISPATCHED') || s.includes('มอบหมาย') || s.includes('จ่ายงาน')) return 'DISPATCHED';
    if (s.includes('IN_PROGRESS') || s.includes('กำลังดำเนินการ') || s.includes('กำลังซ่อม')) return 'IN_PROGRESS';
    if (s.includes('COMPLETED') || s.includes('เสร็จสิ้น') || s.includes('ปิดงาน')) return 'COMPLETED';
    if (s.includes('UNREPAIRABLE') || s.includes('ซ่อมไม่ได้')) return 'UNREPAIRABLE';
    return s;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim() || !jobs) return;

    const term = searchTerm.trim().toLowerCase();
    
    let jobsArray = [];
    if (Array.isArray(jobs)) {
      jobsArray = jobs;
    } else if (typeof jobs === 'object' && jobs !== null) {
      jobsArray = Object.values(jobs);
    }

    const found = jobsArray.find(j => {
      const receivedNo = String(j.receivedNo || j.smart1662No || j.JobID || j.id || '').toLowerCase();
      const jobID = String(j.JobID || j.id || '').toLowerCase();
      const phone = String(j.phone || j.Phone || '').toLowerCase();
      return receivedNo === term || jobID === term || receivedNo.includes(term) || phone.includes(term);
    });

    setSearchResult(found || null);
    setHasSearched(true);
  };

  const getStepIndex = (rawStatus) => {
    const status = normalizeStatus(rawStatus);
    switch (status) {
      case 'PENDING': return 1;
      case 'DISPATCHED': return 2;
      case 'IN_PROGRESS': return 3;
      case 'COMPLETED': return 4;
      default: return 1;
    }
  };

  const getJobDetails = (job) => {
    if (!job || typeof job !== 'object') return {};
    const rawPhone = job.phone || job.Phone || '-';
    
    let rawTech = job.techName || job.technician || job.Technician || '';
    if (rawTech.includes('(')) {
      rawTech = rawTech.substring(0, rawTech.indexOf('(')).trim();
    }

    const receivedTime = job.receivedAt || job.Timestamp || job.createdAt || '';
    const closedTime = job.completedAt || job.ClosedAt || job.closedAt || null;

    return {
      receivedNo: job.receivedNo || job.smart1662No || job.JobID || job.id || '-',
      status: job.status || job.Status || 'PENDING',
      complaintTopic: job.complaintTopic || job.issueType || job.IssueType || 'แจ้งซ่อมท่อประปา',
      location: job.location || job.Location || '-',
      technician: rawTech,
      reporterName: job.reporterName || job.ReporterName || 'ไม่ระบุชื่อ',
      phone: rawPhone !== '-' ? String(rawPhone).replace(/^'/, '') : '-',
      receivedAt: receivedTime,
      // ดึงวันเวลาจากข้อมูลใน Sheet หรือใช้เวลาอ้างอิงเพื่อให้แสดงผลต่อเนื่อง
      dispatchedAt: job.dispatchedAt || job.DispatchedAt || receivedTime,
      inProgressAt: job.inProgressAt || job.InProgressAt || receivedTime,
      completedAt: closedTime
    };
  };

  const jobInfo = searchResult && searchResult !== 'NOT_FOUND' ? getJobDetails(searchResult) : null;
  const currentStep = jobInfo ? getStepIndex(jobInfo.status) : 0;
  const isCompletedJob = jobInfo ? normalizeStatus(jobInfo.status) === 'COMPLETED' : false;
  const isDispatchedOrMore = jobInfo ? (currentStep >= 2) : false;
  const isInProgressOrMore = jobInfo ? (currentStep >= 3) : false;

  const steps = [
    { 
      step: 1, 
      label: 'รับแจ้งเรื่อง', 
      desc: 'บันทึกคำร้องเข้าระบบ', 
      icon: Clock,
      time: formatThaiDateTime(jobInfo?.receivedAt)
    },
    { 
      step: 2, 
      label: 'จ่ายงานช่าง', 
      desc: 'มอบหมายทีมช่างภาคสนาม', 
      icon: ShieldCheck,
      time: isDispatchedOrMore ? formatThaiDateTime(jobInfo?.dispatchedAt) : 'รอจ่ายงาน'
    },
    { 
      step: 3, 
      label: 'กำลังซ่อมแซม', 
      desc: 'ทีมช่างเข้าหน้างาน', 
      icon: Truck,
      time: isInProgressOrMore ? formatThaiDateTime(jobInfo?.inProgressAt) : 'รอดำเนินการ'
    },
    { 
      step: 4, 
      label: 'ซ่อมเสร็จสิ้น', 
      desc: 'เปิดจ่ายน้ำปกติ / ปิดงาน', 
      icon: CheckCircle2,
      time: isCompletedJob && jobInfo?.completedAt ? formatThaiDateTime(jobInfo.completedAt) : 'รอปิดงาน'
    },
  ];

  const teamPhoneResult = getTeamPhone(searchResult);

  return (
    <div className="relative overflow-hidden bg-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-800 space-y-6 font-sans">
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
          {jobInfo ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl backdrop-blur-md">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">เลขที่รับแจ้ง (Tracking No.)</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 text-lg sm:text-xl">
                      {jobInfo.receivedNo}
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
                    {isCompletedJob ? 'ซ่อมเสร็จสิ้น (ปิดงาน)' : 
                     normalizeStatus(jobInfo.status) === 'IN_PROGRESS' ? 'กำลังดำเนินการซ่อม' : 
                     normalizeStatus(jobInfo.status) === 'DISPATCHED' ? 'มอบหมายช่างแล้ว' : 'รอรับเรื่อง/จัดส่งช่าง'}
                  </span>
                </div>
              </div>

              {/* Express Stepper Timeline */}
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
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Wrench className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">หัวข้อการร้องเรียน</span>
                        <p className="font-bold text-slate-200 text-sm">{jobInfo.complaintTopic}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">บริเวณที่เกิดเหตุ</span>
                        <p className="text-slate-300 leading-relaxed">{jobInfo.location}</p>
                      </div>
                    </div>

                    {jobInfo.technician && (
                      <div className="bg-blue-950/40 border border-blue-900/50 p-3 rounded-xl space-y-1.5">
                        <span className="text-[10px] text-cyan-400 uppercase font-bold block flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> ทีมช่างผู้รับผิดชอบ
                        </span>
                        <p className="font-bold text-slate-200">{jobInfo.technician}</p>
                        {teamPhoneResult !== '-' ? (
                          <a 
                            href={`tel:${teamPhoneResult}`} 
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono text-[11px] font-bold bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-800/50 transition"
                          >
                            <Phone className="w-3 h-3" /> โทร: {teamPhoneResult}
                          </a>
                        ) : (
                          <p className="text-slate-500 font-mono text-[10px]">เบอร์โทรศัพท์ผู้รับจ้าง: ไม่ระบุ</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ฝั่งขวา: เรียงลำดับ วันเวลาครบทุกสถานะจากบนลงล่าง */}
                  <div className="space-y-2.5 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">ข้อมูลผู้ร้องเรียน</span>
                        <p className="font-semibold text-slate-200">{jobInfo.reporterName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">เบอร์โทรศัพท์ผู้แจ้ง</span>
                        <p className="font-mono text-emerald-400 font-bold">{jobInfo.phone}</p>
                      </div>
                    </div>

                    {/* 1. วันเวลาที่รับแจ้ง */}
                    <div className="flex items-center gap-2 pt-1">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">วันเวลาที่รับแจ้ง</span>
                        <p className="font-mono text-slate-400 text-[11px]">{formatThaiDateTime(jobInfo.receivedAt)}</p>
                      </div>
                    </div>

                    {/* 2. จ่ายงานช่าง (วันเวลาจ่ายงาน) */}
                    {isDispatchedOrMore && (
                      <div className="flex items-center gap-2 pt-1">
                        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-cyan-500 uppercase font-bold block">จ่ายงานช่าง (วันเวลาจ่ายงาน)</span>
                          <p className="font-mono text-cyan-300 text-[11px]">{formatThaiDateTime(jobInfo.dispatchedAt)}</p>
                        </div>
                      </div>
                    )}

                    {/* 3. กำลังซ่อมแซม (วันเวลาเข้าหน้างาน) */}
                    {isInProgressOrMore && (
                      <div className="flex items-center gap-2 pt-1">
                        <Truck className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-blue-500 uppercase font-bold block">กำลังซ่อมแซม (วันเวลาเข้าหน้างาน)</span>
                          <p className="font-mono text-blue-300 text-[11px]">{formatThaiDateTime(jobInfo.inProgressAt)}</p>
                        </div>
                      </div>
                    )}

                    {/* 4. ซ่อมเสร็จสิ้น (วันเวลาแล้วเสร็จ - ดึงจาก ClosedAt ใน Sheet) */}
                    {isCompletedJob && jobInfo.completedAt && (
                      <div className="flex items-center gap-2 pt-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-emerald-500 uppercase font-bold block">ซ่อมเสร็จสิ้น (วันเวลาแล้วเสร็จ)</span>
                          <p className="font-mono text-emerald-300 text-[11px]">{formatThaiDateTime(jobInfo.completedAt)}</p>
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
              <p className="text-xs text-slate-500 max-w-sm mx-auto">โปรดตรวจสอบเลขที่รับแจ้งหรือเบอร์โทรศัพท์แล้วลองใหม่อีกครั้ง</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
