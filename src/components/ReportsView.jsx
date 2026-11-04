import React, { useState } from 'react';
import { Calendar, TrendingUp, CheckCircle2, Clock, Wrench, FileText, Eye, X, Download, Printer, Info, Hash, Users, Search, ChevronLeft, ChevronRight, Layers, Image as ImageIcon, ShieldAlert, Trash2, Filter, CalendarDays, MapPin } from 'lucide-react';

// 🌐 URL ของ Google Apps Script Web App หลัก[cite: 7]
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydqD3x19rIfyttJPLhZung7NxIBh4LXetkGlZbhW4GmqLtJ-LI6HQ0vX-p_vrJ-QsH9w/exec";

export default function ReportsView({ jobs, currentUser }) {
  const [reportType, setReportType] = useState('all');
  
  // 📅 State สำหรับตัวเลือกช่วงวันที่ค้นหา (Custom Date Range)[cite: 7]
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedJobForPrint, setSelectedJobForPrint] = useState(null);
  const [smart1662Input, setSmart1662Input] = useState('');
  const [selectedJobForPhotos, setSelectedJobForPhotos] = useState(null);
  const [isUnrepairableModalOpen, setIsUnrepairableModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // 📅 ฟังก์ชันแปลงวันที่ในรูปแบบ พ.ศ. สำหรับแสดงผลสวยๆ (เช่น 1 ก.ย. 2569)[cite: 7]
  const formatShortThaiDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${date.getDate()} ${thaiMonthsShort[date.getMonth()]} ${date.getFullYear() + 543}`;
  };

  // 📅 ฟังก์ชันแปลงรูปแบบวันที่และเวลาเป็นภาษาไทยเต็มรูปแบบ[cite: 7]
  const formatThaiDate = (dateInput) => {
    if (!dateInput || dateInput === '-') return '-';
    let date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return dateInput; 
    }

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (hours === '00' && minutes === '00' && typeof dateInput === 'string' && !dateInput.includes(':')) {
      return `${day} ${month} ${year}`;
    }

    return `${day} ${month} ${year} เวลา ${hours}.${minutes} น.`;
  };

  const parseJobDate = (rawDate) => {
    if (!rawDate || rawDate === '-') return new Date(0);
    let parsedDate;
    if (typeof rawDate === 'string' && rawDate.includes('/')) {
      const parts = rawDate.split(' ')[0].split('/');
      if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        if (year > 2400) year -= 543; // แปลงปี พ.ศ. เป็น ค.ศ.
        parsedDate = new Date(`${year}-${parts[1]}-${parts[0]}`);
      }
    } else {
      parsedDate = new Date(rawDate);
    }
    return isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
  };

  const getDisplayReceivedNo = (job) => {
    return job.JobID || job.receivedNo || job.id || '-';
  };

  const getFilteredJobs = () => {
    if (!jobs) return [];

    let jobsArray = [];
    if (Array.isArray(jobs)) {
      jobsArray = jobs;
    } else if (typeof jobs === 'object' && jobs !== null) {
      jobsArray = Object.entries(jobs).map(([key, value]) => ({
        sheetRowKey: key, 
        ...value
      }));
    }

    const now = new Date();

    const filtered = jobsArray.filter(job => {
      // 1. 🎯 เงื่อนไขการกรองรายงาน: ใช้ "วันที่ซ่อมเสร็จ" (ClosedAt) เป็นเงื่อนไขหลัก
      const rawClosedAt = job.ClosedAt || job.closedAt;
      const isCompletedOrClosed = (job.Status === 'COMPLETED' || job.status === 'COMPLETED' || job.Status === 'UNREPAIRABLE' || job.status === 'UNREPAIRABLE');

      if (startDate || endDate || reportType !== 'all') {
        // หากมีการเลือกช่วงเวลาหรือตัวกรองรอบเวลา งานนั้นต้องมีวันที่ซ่อมเสร็จจึงจะนำมาคิดในรายงานตามช่วงเวลา
        if (!isCompletedOrClosed || !rawClosedAt || rawClosedAt === '-') return false;

        const closedDate = parseJobDate(rawClosedAt);
        const closedDateStr = closedDate.toISOString().split('T')[0];

        if (startDate || endDate) {
          if (startDate && closedDateStr < startDate) return false;
          if (endDate && closedDateStr > endDate) return false;
        } else {
          if (reportType === 'daily') {
            if (closedDateStr !== todayStr) return false;
          } else if (reportType === 'weekly') {
            const diffTime = Math.abs(now - closedDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 7) return false;
          } else if (reportType === 'monthly') {
            if (closedDate.getMonth() !== now.getMonth() || closedDate.getFullYear() !== now.getFullYear()) return false;
          } else if (reportType === 'yearly') {
            if (closedDate.getFullYear() !== now.getFullYear()) return false;
          }
        }
      }

      // 2. กรองตามคำค้นหาในช่อง Search[cite: 7]
      if (tableSearchTerm.trim()) {
        const term = tableSearchTerm.trim().toLowerCase();
        const matchNo = (job.JobID || job.receivedNo || '').toLowerCase().includes(term);
        const matchSmart = (job.smart1662No || '').toLowerCase().includes(term);
        const matchName = (job.ReporterName || job.reporterName || '').toLowerCase().includes(term);
        const matchPhone = (job.Phone || job.phone || '').toLowerCase().includes(term);
        const matchLocation = (job.Location || job.location || '').toLowerCase().includes(term);
        const matchTech = (job.Technician || job.technician || '').toLowerCase().includes(term);
        const matchPipe = (job.PipeType || job.pipeType || '').toLowerCase().includes(term);

        if (!matchNo && !matchSmart && !matchName && !matchPhone && !matchLocation && !matchTech && !matchPipe) {
          return false;
        }
      }

      return true;
    });

    const uniqueMap = new Map();
    filtered.forEach(job => {
      const uniqueKey = job.JobID || job.id || JSON.stringify(job);
      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, job);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => parseJobDate(b.ClosedAt || b.Timestamp) - parseJobDate(a.ClosedAt || a.Timestamp));
  };

  const filteredJobs = getFilteredJobs();
  const completedCount = filteredJobs.filter(j => j.Status === 'COMPLETED' || j.status === 'COMPLETED').length;
  const inProgressCount = (jobs || []).filter(j => {
    const s = j.Status || j.status;
    return s === 'DISPATCHED' || s === 'IN_PROGRESS' || s === 'PENDING';
  }).length;
  
  const unrepairableJobsList = filteredJobs.filter(j => j.Status === 'UNREPAIRABLE' || j.status === 'UNREPAIRABLE');

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

  const handleTabChange = (type) => {
    setReportType(type);
    setStartDate(''); 
    setEndDate('');
    setCurrentPage(1);
  };

  const handleClearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const teamSummary = filteredJobs
    .filter(j => j.Status === 'COMPLETED' || j.status === 'COMPLETED')
    .reduce((acc, job) => {
      let techName = job.Technician || job.technician || 'ไม่ระบุทีม';
      if (techName.includes('(')) {
        techName = techName.split('(')[0].trim();
      }
      acc[techName] = (acc[techName] || 0) + 1;
      return acc;
    }, {});

  const pipeSummary = filteredJobs
    .filter(j => j.Status === 'COMPLETED' || j.status === 'COMPLETED')
    .reduce((acc, job) => {
      const type = job.PipeType || job.pipeType || 'ไม่ระบุชนิด';
      const size = (job.PipeSize || job.pipeSize) ? `${job.PipeSize || job.pipeSize} มม.` : 'ไม่ระบุขนาด';
      const key = `${type} (ขนาด ${size})`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

  const parseImages = (imgData) => {
    if (!imgData) return [];
    try {
      let urls = [];
      if (Array.isArray(imgData)) {
        urls = imgData;
      } else if (typeof imgData === 'string') {
        if (imgData.startsWith('[')) {
          try {
            const parsed = JSON.parse(imgData);
            if (Array.isArray(parsed)) urls = parsed;
          } catch {
            urls = [imgData];
          }
        } else if (imgData.includes('\n')) {
          urls = imgData.split('\n');
        } else if (imgData.includes(',')) {
          urls = imgData.split(',');
        } else {
          urls = [imgData];
        }
      }

      return urls
        .map(u => (u ? u.trim() : ''))
        .filter(u => u !== '')
        .map(u => {
          if (u.includes('drive.google.com') || u.includes('docs.google.com')) {
            let fileId = '';
            if (u.includes('/file/d/')) {
              const match = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
              if (match && match[1]) fileId = match[1];
            } else if (u.includes('id=')) {
              const urlParams = new URLSearchParams(u.split('?')[1]);
              fileId = urlParams.get('id');
            }
            if (fileId) {
              return `https://lh3.googleusercontent.com/d/${fileId}`;
            }
          }

          if (!u.startsWith('http') && !u.startsWith('data:')) {
            if (u.startsWith('/9j/') || u.startsWith('iVBOR') || u.length > 100) {
              return `data:image/jpeg;base64,${u}`;
            }
          }
          return u;
        });
    } catch (e) {
      console.error("Error parsing images:", e);
    }
    return [];
  };

  const handleDownloadSingleImage = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'repair-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  const handleExportCSV = () => {
    if (filteredJobs.length === 0) {
      alert("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }

    const headers = ["JobID", "Timestamp", "ReporterName", "Phone", "Location", "IssueType", "PipeType", "PipeSize", "Description", "Technician", "Status", "ClosedAt", "Latitude", "Longitude"];
    const csvRows = [headers.join(",")];

    filteredJobs.forEach(job => {
      const row = [
        `"${job.JobID || ""}"`,
        `"${job.Timestamp || ""}"`,
        `"${job.ReporterName || ""}"`,
        `"${job.Phone || ""}"`,
        `"${(job.Location || "").replace(/"/g, '""')}"`,
        `"${job.IssueType || ""}"`,
        `"${job.PipeType || ""}"`,
        `"${job.PipeSize || ""}"`,
        `"${(job.Description || "").replace(/"/g, '""')}"`,
        `"${job.Technician || ""}"`,
        `"${job.Status || ""}"`,
        `"${job.ClosedAt || ""}"`,
        `"${job.Latitude || job.latitude || ""}"`,
        `"${job.Longitude || job.longitude || ""}"`
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

    const imagesBefore = parseImages(job.BeforeImg || job.beforeImg);
    const imagesInProg = parseImages(job.InProgImg || job.inProgImg);
    const imagesAfter = parseImages(job.AfterImg || job.afterImg);

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
        <title>ตัวอย่างก่อนพิมพ์</title>
        <meta charset="UTF-8">
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Sarabun', 'Tahoma', sans-serif; margin: 0; padding: 15px; color: #1e293b; background: #fff; -webkit-print-color-adjust: exact; }
          .container { max-width: 750px; margin: 0 auto; background: white; }
          .header-wrapper { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 15px; }
          .logo { width: 60px; height: 60px; object-fit: contain; }
          .header-text { flex-grow: 1; text-align: center; margin-right: 60px; }
          .header-text h1 { font-size: 18px; margin: 0; color: #0f172a; font-weight: bold; }
          .header-text h2 { font-size: 14px; margin: 4px 0 0 0; color: #2563eb; font-weight: bold; }
          .info-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; font-size: 12px; line-height: 1.6; }
          .info-row { display: flex; justify-content: space-between; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
          .section-block { page-break-inside: avoid; margin-bottom: 15px; }
          .section-title { font-weight: bold; font-size: 12px; background: #e2e8f0; color: #1e293b; padding: 6px 10px; margin-bottom: 8px; border-radius: 5px; text-transform: uppercase; }
          .img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .img-card { border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; height: 130px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; page-break-inside: avoid; }
          .img-card img { width: 100%; height: 100%; object-fit: cover; }
          .no-img { font-size: 11px; color: #94a3b8; text-align: center; padding: 12px; border: 1px dashed #cbd5e1; border-radius: 6px; }
          .signature-section { margin-top: 30px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
          .signature-box { text-align: center; width: 240px; font-size: 12px; line-height: 1.8; }
          .print-btn { display: block; width: 100%; background: #059669; color: white; border: none; padding: 10px; font-size: 13px; font-weight: bold; border-radius: 8px; cursor: pointer; margin-bottom: 15px; text-align: center; }
          @media print { .print-btn { display: none; } body { padding: 0; background: none; } .container { border: none; padding: 0; width: 100%; } }
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
            <div><strong>เลขที่รับแจ้ง:</strong> <span style="font-family: monospace; color: #2563eb; font-weight: bold;">${job.JobID || job.receivedNo}</span></div>
            ${job.smart1662No ? `<div><strong>เลขที่ปิดงานซ่อม Smart 1662:</strong> <span style="font-family: monospace; color: #0891b2; font-weight: bold;">${job.smart1662No}</span></div>` : ''}
            <div><strong>สถานที่ซ่อม:</strong> ${job.Location || '-'}</div>
            ${job.PipeType || job.PipeSize ? `
              <div style="margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                <strong>วัสดุท่อที่ซ่อม:</strong> 
                <span style="color: #ea580c; font-weight: bold;">ท่อชนิด ${job.PipeType || 'ไม่ระบุ'} ขนาด ${job.PipeSize ? job.PipeSize + ' มม.' : 'ไม่ระบุ'}</span>
              </div>
            ` : ''}
            <div class="info-row">
              <span><strong>ผู้แจ้ง:</strong> ${job.ReporterName || '-'} (${job.Phone || '-'})</span>
              <span><strong>ทีมช่างซ่อม:</strong> ${job.Technician || '-'}</span>
            </div>
            <div class="info-row">
              <span><strong>วันเวลาที่รับแจ้ง:</strong> ${formatThaiDate(job.Timestamp)}</span>
              <span><strong>วันเวลาแล้วเสร็จ:</strong> <span style="color: #059669; font-weight: bold;">${job.ClosedAt && job.ClosedAt !== '-' ? formatThaiDate(job.ClosedAt) : 'ยังไม่ปิดงาน'}</span></span>
            </div>
          </div>
          <div class="section-block">
            <div class="section-title">ภาพก่อนซ่อม (${imagesBefore.length} รูป)</div>
            ${imagesBefore.length > 0 ? `<div class="img-grid">${imagesBefore.map(src => `<div class="img-card"><img src="${src}" /></div>`).join('')}</div>` : '<div class="no-img">ไม่มีรูปภาพก่อนซ่อม</div>'}
          </div>
          <div class="section-block">
            <div class="section-title">ภาพระหว่างซ่อม (${imagesInProg.length} รูป)</div>
            ${imagesInProg.length > 0 ? `<div class="img-grid">${imagesInProg.map(src => `<div class="img-card"><img src="${src}" /></div>`).join('')}</div>` : '<div class="no-img">ไม่มีรูปภาพระหว่างซ่อม</div>'}
          </div>
          <div class="section-block">
            <div class="section-title">ภาพหลังซ่อมเสร็จ (${imagesAfter.length} รูป)</div>
            ${imagesAfter.length > 0 ? `<div class="img-grid">${imagesAfter.map(src => `<div class="img-card"><img src="${src}" /></div>`).join('')}</div>` : '<div class="no-img">ไม่มีรูปภาพหลังซ่อม</div>'}
          </div>
          <div class="info-box section-block" style="margin-top: 15px;">
            <strong>รายละเอียด/อุปกรณ์ที่ใช้:</strong> ${job.Equipment || job.equipment || job.Description || job.Notes || '-'}
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
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 text-slate-800 font-sans">
      
      {/* 🌟 ส่วนหัวรายงานและการเลือกช่วงเวลาแบบไทย[cite: 7] */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            รายงานผลการปฏิบัติงานซ่อมท่อประปา
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            การประปาส่วนภูมิภาคสาขานครพนม • เชื่อมต่อฐานข้อมูล Google Sheets สำเร็จ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          
          {/* 📅 กล่องเลือกช่วงวันที่แบบไทย[cite: 7] */}
          <div className="bg-slate-50 border border-slate-200/80 p-2 rounded-2xl flex flex-wrap items-center gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 px-2 text-slate-600 text-xs font-bold">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span>เลือกช่วงวันที่ (ซ่อมเสร็จ):</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  title="จากวันที่ซ่อมเสร็จ"
                />
              </div>

              <span className="text-xs text-slate-400 font-bold">ถึง</span>

              <div className="relative">
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  title="ถึงวันที่ซ่อมเสร็จ"
                />
              </div>

              {(startDate || endDate) && (
                <button 
                  onClick={handleClearDateFilter}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="ล้างตัวกรองวันที่"
                >
                  <X className="w-3.5 h-3.5" /> ล้าง
                </button>
              )}
            </div>
          </div>

          <button 
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer ml-auto xl:ml-0"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          {/* ปุ่มเลือกช่วงเวลารวดเร็ว[cite: 7] */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'daily', label: 'ซ่อมเสร็จวันนี้' },
              { id: 'weekly', label: '7 วันที่แล้ว' },
              { id: 'monthly', label: 'เดือนนี้' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  !startDate && !endDate && reportType === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* แถบแสดงสถานะช่วงวันที่ที่เลือกอยู่ (ถ้ามี)[cite: 7] */}
      {(startDate || endDate) && (
        <div className="bg-blue-50 border border-blue-200 px-5 py-3 rounded-2xl flex items-center justify-between text-xs text-blue-900 font-medium">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              กำลังแสดงงานที่ <strong>ซ่อมเสร็จ</strong> ระหว่างวันที่: <strong className="font-bold underline">{startDate ? formatShortThaiDate(startDate) : 'เริ่มต้น'}</strong> ถึง <strong className="font-bold underline">{endDate ? formatShortThaiDate(endDate) : 'ปัจจุบัน'}</strong>
            </span>
          </div>
          <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-bold text-[11px]">
            พบ {filteredJobs.length} รายการ
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-3xl shadow-md space-y-2">
          <p className="text-xs text-blue-100 font-medium">รายการในรายงาน (ตามเงื่อนไข)</p>
          <h3 className="text-3xl font-bold">{filteredJobs.length} <span className="text-sm font-normal">เคส</span></h3>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-md space-y-2">
          <p className="text-xs text-emerald-100 font-medium">ดำเนินการเสร็จสิ้น (ปิดงาน)</p>
          <h3 className="text-3xl font-bold">{completedCount} <span className="text-sm font-normal">จุด</span></h3>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-3xl shadow-md space-y-2">
          <p className="text-xs text-amber-100 font-medium">กำลังดำเนินการ / ค้างซ่อมทั้งหมด</p>
          <h3 className="text-3xl font-bold">{inProgressCount} <span className="text-sm font-normal">จุด</span></h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            สรุปผลงานซ่อมเสร็จ แยกตามทีมช่าง
          </h3>
          {Object.keys(teamSummary).length === 0 ? (
            <p className="text-xs text-slate-400 py-2">ยังไม่มีข้อมูลงานที่ซ่อมเสร็จสิ้น</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {Object.entries(teamSummary).map(([teamName, count]) => (
                <div key={teamName} className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex justify-between items-center shadow-2xs">
                  <span className="text-xs font-bold text-slate-700 truncate">{teamName}</span>
                  <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs">{count} จุด</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-600" />
            สรุปชนิดและขนาดท่อที่ใช้ซ่อม
          </h3>
          {Object.keys(pipeSummary).length === 0 ? (
            <p className="text-xs text-slate-400 py-2">ยังไม่มีข้อมูลชนิดและขนาดท่อ</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {Object.entries(pipeSummary).map(([pipeInfo, count]) => (
                <div key={pipeInfo} className="bg-orange-50/50 border border-orange-200/80 p-3 rounded-2xl flex justify-between items-center shadow-2xs">
                  <span className="text-xs font-bold text-slate-700 truncate">{pipeInfo}</span>
                  <span className="bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs">{count} จุด</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            งานที่ไม่สามารถดำเนินการได้
          </h3>
          <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-2xl flex justify-between items-center shadow-2xs">
            <div>
              <p className="text-xs text-rose-800 font-bold">รวมอุปสรรค / ซ่อมไม่ได้</p>
              <p className="text-[10px] text-rose-600">คลิกเพื่อดูรายละเอียดรายจุด</p>
            </div>
            <button
              onClick={() => setIsUnrepairableModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1"
            >
              {unrepairableJobsList.length} จุด <Eye className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">ตรวจสอบสาเหตุอุปสรรคหน้างานที่ไม่สามารถซ่อมเสร็จได้</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50/50">
          <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            รายการรายงานผลการซ่อม ({filteredJobs.length} รายการ)
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={tableSearchTerm}
                onChange={(e) => {
                  setTableSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาเลขรับแจ้ง, ผู้แจ้ง, ชนิดท่อ..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 shadow-2xs"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <th className="p-4 font-semibold">เลขที่รับแจ้ง / วันเวลา</th>
                <th className="p-4 font-semibold">ผู้แจ้ง / เบอร์โทร</th>
                <th className="p-4 font-semibold">หัวข้อร้องเรียน</th>
                <th className="p-4 font-semibold">บริเวณ / ชนิดท่อ</th>
                <th className="p-4 font-semibold text-center">สถานะ</th>
                <th className="p-4 font-semibold text-center">รูปภาพ</th>
                <th className="p-4 font-semibold text-center">พิมพ์ A4</th>
                <th className="p-4 font-semibold text-center">พิกัดท่อแตก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentJobs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    <p className="text-sm font-bold">ไม่พบข้อมูลรายงานตามเงื่อนไขนี้</p>
                    <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนช่วงวันที่ หรือเลือกคำค้นหาอื่น</p>
                  </td>
                </tr>
              ) : (
                currentJobs.map((job) => {
                  const lat = job.Latitude || job.latitude;
                  const lng = job.Longitude || job.longitude;
                  const hasCoords = lat && lng && !isNaN(lat) && !isNaN(lng);

                  const isDone = (job.Status === 'COMPLETED' || job.status === 'COMPLETED');
                  const isUnrep = (job.Status === 'UNREPAIRABLE' || job.status === 'UNREPAIRABLE');

                  return (
                    <tr key={job.JobID || job.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <span className="font-mono font-bold text-blue-600">{getDisplayReceivedNo(job)}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">รับแจ้ง: {formatThaiDate(job.Timestamp)}</p>
                        {isDone || isUnrep ? (
                          <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                            ซ่อมเสร็จ: {job.ClosedAt && job.ClosedAt !== '-' ? formatThaiDate(job.ClosedAt) : '-'}
                          </p>
                        ) : (
                          <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                            สถานะ: รอดำเนินการ / กำลังซ่อม
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{job.ReporterName || 'ไม่ระบุชื่อ'}</p>
                        <p className="text-slate-500 font-mono">{job.Phone || '-'}</p>
                      </td>
                      <td className="p-4 font-medium text-slate-700 max-w-xs truncate">{job.IssueType || '-'}</td>
                      <td className="p-4 text-slate-600 max-w-xs">
                        <p className="truncate">{job.Location || '-'}</p>
                        {job.PipeType && job.PipeType !== '-' && (
                          <p className="text-[10px] font-bold text-orange-600 mt-0.5">
                            ท่อ {job.PipeType} {job.PipeSize ? `(${job.PipeSize} มม.)` : ''}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1.5 border shadow-2xs ${
                          isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          isUnrep ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          (job.Status === 'IN_PROGRESS' || job.status === 'IN_PROGRESS') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isDone ? 'bg-emerald-500' :
                            isUnrep ? 'bg-rose-500' :
                            (job.Status === 'IN_PROGRESS' || job.status === 'IN_PROGRESS') ? 'bg-blue-500' : 'bg-amber-500'
                          }`} />
                          {isDone ? 'ปิดงานแล้ว' : 
                           isUnrep ? 'ซ่อมไม่ได้' :
                           (job.Status === 'IN_PROGRESS' || job.status === 'IN_PROGRESS') ? 'กำลังซ่อม' : 'รอดำเนินการ'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedJobForPhotos(job)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2 rounded-xl font-bold inline-flex items-center justify-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer text-xs"
                        >
                          <ImageIcon className="w-4 h-4" /> ดูรูป
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleStartPrint(job)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl font-bold inline-flex items-center justify-center shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        {hasCoords ? (
                          <a
                            href={`https://www.google.com/maps?q=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 p-2 rounded-xl font-bold inline-flex items-center justify-center gap-1 shadow-2xs transition active:scale-95 text-xs"
                            title={`พิกัด: ${lat}, ${lng}`}
                          >
                            <MapPin className="w-4 h-4 text-emerald-600" /> ดูแผนที่
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">ไม่มีพิกัด GPS</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredJobs.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              แสดงข้อมูลรายการที่ <span className="font-bold text-slate-800">{startIndex + 1}</span> ถึง <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredJobs.length)}</span> จากทั้งหมด <span className="font-bold text-slate-800">{filteredJobs.length}</span> รายการ
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
              </button>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono">
                หน้า {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                ถัดไป <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ⚠️ MODAL แสดงงานซ่อมไม่ได้[cite: 7] */}
      {isUnrepairableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-gradient-to-r from-rose-700 to-rose-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-200" />
                <h3 className="font-bold text-sm">งานที่ไม่สามารถดำเนินการได้ ({unrepairableJobsList.length} จุด)</h3>
              </div>
              <button onClick={() => setIsUnrepairableModalOpen(false)} className="p-1.5 rounded-xl bg-rose-800 text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50">
              {unrepairableJobsList.map((job) => (
                <div key={job.JobID} className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs space-y-2">
                  <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">{job.JobID}</span>
                  <p className="text-xs text-slate-600"><strong>สถานที่:</strong> {job.Location}</p>
                  <p className="text-xs text-slate-500"><strong>วันที่ซ่อมเสร็จ/บันทึก:</strong> {formatThaiDate(job.ClosedAt)}</p>
                  <p className="text-xs text-rose-900"><strong>สาเหตุ:</strong> {job.Description || '-'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ MODAL ดูรูปภาพ[cite: 7] */}
      {selectedJobForPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">รูปภาพ: <span className="font-mono text-cyan-400">{selectedJobForPhotos.JobID}</span></h3>
              <button onClick={() => setSelectedJobForPhotos(null)} className="p-1.5 rounded-xl bg-slate-800 text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-slate-50">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">ภาพก่อนซ่อม ({parseImages(selectedJobForPhotos.BeforeImg).length} รูป)</h4>
                {parseImages(selectedJobForPhotos.BeforeImg).length === 0 ? (
                  <p className="text-xs text-slate-400 bg-white p-3 rounded-xl border">ไม่มีรูปภาพก่อนซ่อม</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {parseImages(selectedJobForPhotos.BeforeImg).map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border bg-white shadow-2xs">
                        <img src={url} alt="before" className="w-full h-full object-cover" />
                        <button onClick={() => handleDownloadSingleImage(url, `BEFORE_${selectedJobForPhotos.JobID}_${idx+1}.jpg`)} className="absolute bottom-1 right-1 bg-emerald-600 text-white p-1 rounded text-[10px]">ดาวน์โหลด</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">ภาพระหว่างซ่อม ({parseImages(selectedJobForPhotos.InProgImg).length} รูป)</h4>
                {parseImages(selectedJobForPhotos.InProgImg).length === 0 ? (
                  <p className="text-xs text-slate-400 bg-white p-3 rounded-xl border">ไม่มีรูปภาพระหว่างซ่อม</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {parseImages(selectedJobForPhotos.InProgImg).map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border bg-white shadow-2xs">
                        <img src={url} alt="inProg" className="w-full h-full object-cover" />
                        <button onClick={() => handleDownloadSingleImage(url, `INPROG_${selectedJobForPhotos.JobID}_${idx+1}.jpg`)} className="absolute bottom-1 right-1 bg-emerald-600 text-white p-1 rounded text-[10px]">ดาวน์โหลด</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">ภาพหลังซ่อม ({parseImages(selectedJobForPhotos.AfterImg).length} รูป)</h4>
                {parseImages(selectedJobForPhotos.AfterImg).length === 0 ? (
                  <p className="text-xs text-slate-400 bg-white p-3 rounded-xl border">ไม่มีรูปภาพหลังซ่อม</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {parseImages(selectedJobForPhotos.AfterImg).map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border bg-white shadow-2xs">
                        <img src={url} alt="after" className="w-full h-full object-cover" />
                        <button onClick={() => handleDownloadSingleImage(url, `AFTER_${selectedJobForPhotos.JobID}_${idx+1}.jpg`)} className="absolute bottom-1 right-1 bg-emerald-600 text-white p-1 rounded text-[10px]">ดาวน์โหลด</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ MODAL กรอกเลข Smart 1662 ก่อนพิมพ์[cite: 7] */}
      {selectedJobForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">ระบุเลขที่ปิดงานซ่อม Smart 1662</h3>
            <p className="text-xs text-slate-500 font-mono">JobID: {selectedJobForPrint.JobID}</p>
            <input
              type="text"
              value={smart1662Input}
              onChange={(e) => setSmart1662Input(e.target.value)}
              placeholder="เช่น 1662-68-XXXXX"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setSelectedJobForPrint(null)} className="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold cursor-pointer">ยกเลิก</button>
              <button onClick={handleConfirmAndOpenReport} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer">พิมพ์รายงาน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
