import React, { useState } from 'react';
import { Calendar, TrendingUp, CheckCircle2, Clock, Wrench, FileText, Eye, X, Download, Printer, Info, Hash, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ReportsView({ jobs }) {
  const [reportType, setReportType] = useState('all');
  
  // 🔍 State สำหรับช่องค้นหาและระบบแบ่งหน้า (Pagination)
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // State สำหรับควบคุม Modal กรอกเลข Smart 1662 ก่อนสั่งพิมพ์
  const [selectedJobForPrint, setSelectedJobForPrint] = useState(null);
  const [smart1662Input, setSmart1662Input] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const parseJobDate = (job) => {
    const rawDate = job.receivedAt || job.createdAt;
    if (!rawDate) return new Date(0);

    if (rawDate.includes('/')) {
      const parts = rawDate.split(' ')[0].split('/');
      if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        if (year > 2400) year -= 543;
        return new Date(`${year}-${parts[1]}-${parts[0]}`);
      }
    }
    return new Date(rawDate);
  };

  const getFilteredJobs = () => {
    const now = new Date();
    return jobs.filter(job => {
      // 1. กรองตามเงื่อนไขเวลา
      if (reportType !== 'all') {
        const jobDate = parseJobDate(job);
        const jobDateStr = jobDate.toISOString().split('T')[0];

        if (reportType === 'daily') {
          if (jobDateStr !== todayStr) return false;
        } else if (reportType === 'weekly') {
          const diffTime = Math.abs(now - jobDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 7) return false;
        } else if (reportType === 'monthly') {
          if (jobDate.getMonth() !== now.getMonth() || jobDate.getFullYear() !== now.getFullYear()) return false;
        } else if (reportType === 'yearly') {
          if (jobDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      // 2. กรองตามคำค้นหา (เลขรับแจ้ง, เลข Smart 1662, ผู้แจ้ง, เบอร์โทร, สถานที่, ทีมช่าง)
      if (tableSearchTerm.trim()) {
        const term = tableSearchTerm.trim().toLowerCase();
        const matchNo = (job.receivedNo || job.id || '').toLowerCase().includes(term);
        const matchSmart = (job.smart1662No || '').toLowerCase().includes(term);
        const matchName = (job.reporterName || '').toLowerCase().includes(term);
        const matchPhone = (job.phone || '').toLowerCase().includes(term);
        const matchLocation = (job.location || '').toLowerCase().includes(term);
        const matchTech = (job.technician || '').toLowerCase().includes(term);

        if (!matchNo && !matchSmart && !matchName && !matchPhone && !matchLocation && !matchTech) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => parseJobDate(b) - parseJobDate(a));
  };

  const filteredJobs = getFilteredJobs();
  const completedCount = filteredJobs.filter(j => j.status === 'COMPLETED').length;
  const inProgressCount = filteredJobs.filter(j => j.status === 'DISPATCHED' || j.status === 'IN_PROGRESS').length;

  // 📄 ระบบแบ่งหน้า (Pagination Logic)
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

  // เปลี่ยนแท็บเวลาให้รีเซ็ตหน้า Pagination กลับไปหน้า 1 เสมอ
  const handleTabChange = (type) => {
    setReportType(type);
    setCurrentPage(1);
  };

  const teamSummary = filteredJobs
    .filter(j => j.status === 'COMPLETED')
    .reduce((acc, job) => {
      let techName = job.techName || job.technician || 'ไม่ระบุทีม';
      if (techName.includes('(')) {
        techName = techName.split('(')[0].trim();
      }
      
      acc[techName] = (acc[techName] || 0) + 1;
      return acc;
    }, {});

  const parseImages = (imgData) => {
    if (!imgData) return [];
    try {
      if (typeof imgData === 'string' && imgData.startsWith('[')) {
        return JSON.parse(imgData);
      } else if (typeof imgData === 'string' && imgData.trim() !== '') {
        return [imgData];
      }
    } catch (e) {
      console.error("Error parsing images:", e);
    }
    return [];
  };

  const handleExportCSV = () => {
    if (filteredJobs.length === 0) {
      alert("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }

    const headers = ["ReceivedNo", "Smart1662No", "CreatedAt", "CompletedAt", "ReporterName", "Phone", "Location", "Latitude", "Longitude", "ComplaintTopic", "Technician", "Status", "Notes"];
    const csvRows = [headers.join(",")];

    filteredJobs.forEach(job => {
      const row = [
        `"${job.receivedNo || job.id || ""}"`,
        `"${job.smart1662No || ""}"`,
        `"${job.receivedAt || job.createdAt || ""}"`,
        `"${job.completedAt || ""}"`,
        `"${job.reporterName || ""}"`,
        `"${job.phone || ""}"`,
        `"${(job.location || "").replace(/"/g, '""')}"`,
        `"${job.latitude || ""}"`,
        `"${job.longitude || ""}"`,
        `"${job.complaintTopic || job.issueType || ""}"`,
        `"${job.technician || ""}"`,
        job.status || "",
        `"${(job.notes || job.description || "").replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvBlob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("target", "_blank");
    link.setAttribute("download", `PWA_NakhonPhanom_Report_${reportType}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartPrint = (job) => {
    setSelectedJobForPrint(job);
    setSmart1662Input(job.smart1662No || '');
  };

  const handleConfirmAndOpenReport = () => {
    if (!selectedJobForPrint) return;

    const job = {
      ...selectedJobForPrint,
      smart1662No: smart1662Input.trim()
    };

    const imagesBefore = parseImages(job.beforeImgBase64 || job.beforeImg);
    const imagesInProg = parseImages(job.inProgImgBase64 || job.inProgImg);
    const imagesAfter = parseImages(job.afterImgBase64 || job.afterImg);

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert("กรุณาอนุญาตให้เบราว์เซอร์เปิดหน้าต่างป๊อปอัป (Popup) เพื่อดูรายงาน A4");
      return;
    }

    const logoPath = `${window.location.origin}/pwa.webp`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>รายงาน A4 - ${job.receivedNo || job.id}</title>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body { 
            font-family: 'Sarabun', 'Tahoma', sans-serif; 
            margin: 0; 
            padding: 15px; 
            color: #1e293b; 
            background: #fff; 
            -webkit-print-color-adjust: exact;
          }
          .container { 
            max-width: 750px; 
            margin: 0 auto; 
            background: white; 
          }
          .header-wrapper { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            border-bottom: 2px solid #2563eb; 
            padding-bottom: 10px; 
            margin-bottom: 15px; 
          }
          .logo { width: 60px; height: 60px; object-fit: contain; }
          .header-text { flex-grow: 1; text-align: center; margin-right: 60px; }
          .header-text h1 { font-size: 18px; margin: 0; color: #0f172a; font-weight: bold; }
          .header-text h2 { font-size: 14px; margin: 4px 0 0 0; color: #2563eb; font-weight: bold; }
          
          .info-box { 
            background: #f8fafc; 
            border: 1px solid #cbd5e1; 
            padding: 12px 15px; 
            border-radius: 8px; 
            margin-bottom: 15px; 
            font-size: 12px; 
            line-height: 1.6; 
          }
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 6px; 
            border-top: 1px solid #e2e8f0; 
            padding-top: 6px; 
          }

          .section-block {
            page-break-inside: avoid;
            margin-bottom: 15px;
          }

          .section-title { 
            font-weight: bold; 
            font-size: 12px; 
            background: #e2e8f0; 
            color: #1e293b;
            padding: 6px 10px; 
            margin-bottom: 8px; 
            border-radius: 5px; 
            text-transform: uppercase; 
          }
          
          .img-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 8px; 
          }
          .img-card { 
            border: 1px solid #cbd5e1; 
            border-radius: 6px; 
            overflow: hidden; 
            height: 130px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: #f1f5f9; 
            page-break-inside: avoid;
          }
          .img-card img { width: 100%; height: 100%; object-fit: cover; }
          
          .no-img { 
            font-size: 11px; 
            color: #94a3b8; 
            text-align: center; 
            padding: 12px; 
            border: 1px dashed #cbd5e1; 
            border-radius: 6px; 
          }

          .signature-section { 
            margin-top: 30px; 
            display: flex; 
            justify-content: flex-end; 
            page-break-inside: avoid;
          }
          .signature-box { text-align: center; width: 240px; font-size: 12px; line-height: 1.8; }
          
          .print-btn { 
            display: block; 
            width: 100%; 
            background: #059669; 
            color: white; 
            border: none; 
            padding: 10px; 
            font-size: 13px; 
            font-weight: bold; 
            border-radius: 8px; 
            cursor: pointer; 
            margin-bottom: 15px; 
            text-align: center; 
          }
          .print-btn:hover { background: #047857; }

          @media print {
            .print-btn { display: none; }
            body { padding: 0; background: none; }
            .container { border: none; padding: 0; width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF (A4)</button>
          
          <div class="header-wrapper">
            <img src="${logoPath}" alt="โลโก้ กปภ." class="logo" onerror="this.style.display='none'" />
            <div class="header-text">
              <h1>การประปาส่วนภูมิภาคสาขานครพนม</h1>
              <h2>รายงานผลการปฏิบัติงานซ่อมท่อประปา</h2>
            </div>
          </div>

          <div class="info-box">
            <div><strong>เลขที่รับแจ้ง:</strong> <span style="font-family: monospace; color: #2563eb; font-weight: bold;">${job.receivedNo || job.id}</span></div>
            ${job.smart1662No ? `<div><strong>เลขที่ปิดงานซ่อม Smart 1662:</strong> <span style="font-family: monospace; color: #0891b2; font-weight: bold;">${job.smart1662No}</span></div>` : ''}
            <div><strong>สถานที่ซ่อม:</strong> ${job.location || '-'}</div>

            ${job.latitude && job.longitude ? `
              <div><strong>พิกัด GPS โลเคชั่น:</strong> 
                <span style="font-family: monospace; color: #059669; font-weight: bold;">${job.latitude}, ${job.longitude}</span>
                <a href="https://www.google.com/maps?q=${job.latitude},${job.longitude}" target="_blank" style="margin-left: 10px; color: #2563eb; text-decoration: none; font-size: 11px;">[🗺️ เปิดดูแผนที่ Google Maps]</a>
              </div>
            ` : ''}

            <div class="info-row">
              <span><strong>ผู้แจ้ง:</strong> ${job.reporterName || '-'} (${job.phone || '-'})</span>
              <span><strong>ทีมช่าง:</strong> ${job.technician || '-'}</span>
            </div>
            <div class="info-row">
              <span><strong>วันเวลาที่รับแจ้ง:</strong> ${job.receivedAt || job.createdAt || '-'}</span>
              <span><strong>วันเวลาแล้วเสร็จ:</strong> <span style="color: #059669; font-weight: bold;">${job.completedAt || 'ยังไม่ปิดงาน'}</span></span>
            </div>
          </div>

          <div class="section-block">
            <div class="section-title">ภาพก่อนซ่อม (${imagesBefore.length} รูป)</div>
            ${imagesBefore.length > 0 
              ? `<div class="img-grid">${imagesBefore.map(src => `<div class="img-card"><img src="${src}" /></div>`).join('')}</div>` 
              : '<div class="no-img">ไม่มีรูปภาพก่อนซ่อม</div>'}
          </div>

          <div class="section-block">
            <div class="section-title">ภาพระหว่างซ่อม (${imagesInProg.length} รูป)</div>
            ${imagesInProg.length > 0 
              ? `<div class="img-grid">${imagesInProg.map(src => `<div class="img-card"><img src="${src}" /></div>`).join('')}</div>` 
              : '<div class="no-img">ไม่มีรูปภาพระหว่างซ่อม</div>'}
          </div>

          <div class="section-block">
            <div class="section-title">ภาพหลังซ่อมเสร็จ (${imagesAfter.length} รูป)</div>
            ${imagesAfter.length > 0 
              ? `<div class="img-grid">${imagesAfter.map(src => `<div class="img-card"><img src="${src}" /></div>`).join('')}</div>` 
              : '<div class="no-img">ไม่มีรูปภาพหลังซ่อม</div>'}
          </div>

          <div class="info-box section-block" style="margin-top: 15px;">
            <strong>การแก้ไข / อุปกรณ์:</strong> ${job.notes || job.description || '-'}
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <p>ลงชื่อ........................................................</p>
              <p>(........................................................)</p>
              <p>ตำแหน่ง...................................................</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
    setSelectedJobForPrint(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 text-slate-800">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            รายงานสรุปผลการปฏิบัติงานซ่อมท่อประปา
          </h2>
          <p className="text-xs text-slate-500 mt-1">กปภ.สาขานครพนม - ติดตามสถิติและการดำเนินงาน (เรียงจากล่าสุด)</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV (Excel)
          </button>

          <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'daily', label: 'วันนี้' },
              { id: 'weekly', label: 'รายสัปดาห์' },
              { id: 'monthly', label: 'รายเดือน' },
              { id: 'yearly', label: 'รายปี' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  reportType === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-3xl shadow-md space-y-2">
          <p className="text-xs text-blue-100 font-medium">รับแจ้งซ่อมทั้งหมด ({reportType.toUpperCase()})</p>
          <h3 className="text-3xl font-bold">{filteredJobs.length} <span className="text-sm font-normal">เคส</span></h3>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-md space-y-2">
          <p className="text-xs text-emerald-100 font-medium">ดำเนินการเสร็จสิ้น (ปิดงาน)</p>
          <h3 className="text-3xl font-bold">{completedCount} <span className="text-sm font-normal">จุด</span></h3>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-3xl shadow-md space-y-2">
          <p className="text-xs text-amber-100 font-medium">กำลังดำเนินการ / ค้างซ่อม</p>
          <h3 className="text-3xl font-bold">{inProgressCount} <span className="text-sm font-normal">จุด</span></h3>
        </div>
      </div>

      {/* 📊 สรุปผลงานซ่อมเสร็จ แยกตามทีมช่าง */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          สรุปผลงานซ่อมเสร็จ แยกตามทีมช่าง (ตามเงื่อนไขเวลาที่เลือก)
        </h3>
        
        {Object.keys(teamSummary).length === 0 ? (
          <p className="text-xs text-slate-400 py-2">ยังไม่มีข้อมูลงานที่ซ่อมเสร็จสิ้นในช่วงเวลานี้</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(teamSummary).map(([teamName, count]) => (
              <div key={teamName} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex justify-between items-center shadow-xs">
                <span className="text-xs font-bold text-slate-700 truncate">{teamName}</span>
                <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-xs">
                  {count} จุด
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* 🔎 ส่วนหัวตาราง พร้อมเท็กซ์บ็อกซ์ค้นหาใบงาน */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50/50">
          <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            รายการใบแจ้งซ่อม กปภ.สาขานครพนม ({filteredJobs.length} รายการ)
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* 🔍 ช่องค้นหาใบงาน */}
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={tableSearchTerm}
                onChange={(e) => {
                  setTableSearchTerm(e.target.value);
                  setCurrentPage(1); // รีเซ็ตหน้าเมื่อพิมพ์ค้นหา
                }}
                placeholder="ค้นหาเลขรับแจ้ง, 1662, ผู้แจ้ง, สถานที่..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 shadow-xs"
              />
            </div>

            <div className="hidden lg:flex items-center gap-2 text-[11px] bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs shrink-0">
              <span className="font-bold text-slate-500 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> สัญลักษณ์:</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> ปิดงาน</span>
              <span className="inline-flex items-center gap-1 text-blue-700 font-semibold"><span className="w-2 h-2 rounded-full bg-blue-500"></span> กำลังซ่อม</span>
              <span className="inline-flex items-center gap-1 text-cyan-700 font-semibold"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> จ่ายงาน</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <th className="p-4 font-semibold">เลขที่รับแจ้ง</th>
                <th className="p-4 font-semibold">ผู้แจ้ง / เบอร์โทร</th>
                <th className="p-4 font-semibold">หัวข้อร้องเรียน</th>
                <th className="p-4 font-semibold">บริเวณที่เกิดเหตุ / พิกัด</th>
                <th className="p-4 font-semibold text-center">สถานะ</th>
                <th className="p-4 font-semibold text-center">พิมพ์รายงาน A4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentJobs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    <p className="text-sm font-bold">ไม่พบข้อมูลใบแจ้งซ่อมตามคำค้นหานี้</p>
                    <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกช่วงเวลาอื่น</p>
                  </td>
                </tr>
              ) : (
                currentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <span className="font-mono font-bold text-blue-600">{job.receivedNo || job.id}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">แจ้ง: {job.receivedAt || job.createdAt}</p>
                      {job.completedAt && (
                        <p className="text-[10px] text-emerald-600 font-bold">เสร็จ: {job.completedAt}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{job.reporterName}</p>
                      <p className="text-slate-500 font-mono">{job.phone}</p>
                    </td>
                    <td className="p-4 font-medium text-slate-700 max-w-xs truncate">
                      {job.complaintTopic || job.issueType}
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs">
                      <p className="truncate">{job.location}</p>
                      {job.latitude && job.longitude && (
                        <p className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 mt-0.5">
                          <span className="font-bold">GPS:</span> {job.latitude}, {job.longitude}
                        </p>
                      )}
                    </td>
                    
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1.5 border shadow-xs ${
                        job.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        job.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        job.status === 'DISPATCHED' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          job.status === 'COMPLETED' ? 'bg-emerald-500' :
                          job.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                          job.status === 'DISPATCHED' ? 'bg-cyan-500' : 'bg-amber-500'
                        }`} />
                        {job.status === 'COMPLETED' ? 'ปิดงานแล้ว' : 
                         job.status === 'IN_PROGRESS' ? 'กำลังซ่อม' : 
                         job.status === 'DISPATCHED' ? 'จ่ายงานแล้ว' : 'รอดำเนินการ'}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleStartPrint(job)}
                        title="พิมพ์รายงาน A4"
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl font-bold inline-flex items-center justify-center shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 📄 แถบควบคุมการแบ่งหน้า (Pagination Controls) */}
        {filteredJobs.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              แสดงข้อมูลรายการที่ <span className="font-bold text-slate-800">{startIndex + 1}</span> ถึง <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredJobs.length)}</span> จากทั้งหมด <span className="font-bold text-slate-800">{filteredJobs.length}</span> รายการ
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
              </button>

              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono">
                หน้า {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                ถัดไป <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal ป้อนเลข Smart 1662 ก่อนเปิดหน้าต่างปริ้นท์ */}
      {selectedJobForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Hash className="w-5 h-5 text-cyan-600" />
                กรอกเลขปิดงาน Smart 1662 ก่อนพิมพ์
              </h4>
              <button onClick={() => setSelectedJobForPrint(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
                <p className="font-bold text-slate-800">เลขที่รับแจ้ง: <span className="font-mono text-blue-600">{selectedJobForPrint.receivedNo || selectedJobForPrint.id}</span></p>
                <p className="text-slate-500">สถานที่: {selectedJobForPrint.location}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่ปิดงานซ่อมใน Smart 1662 (ถ้ามี / ไม่บังคับ)</label>
                <input 
                  type="text"
                  value={smart1662Input}
                  onChange={(e) => setSmart1662Input(e.target.value)}
                  placeholder="เช่น 1662-69-XXXXXX"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">หากไม่มี สามารถเว้นว่างไว้แล้วกดปุ่มเปิดรายงาน A4 ได้ทันที</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedJobForPrint(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmAndOpenReport}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> เปิดรายงาน A4
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
