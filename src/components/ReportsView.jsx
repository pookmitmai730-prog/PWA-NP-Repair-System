import React, { useState } from 'react';
import { Calendar, TrendingUp, CheckCircle2, Clock, Wrench, FileText, Eye, X, Download, Printer, Info, Hash, Users, Search, ChevronLeft, ChevronRight, Layers, Image as ImageIcon, ShieldAlert, Trash2 } from 'lucide-react';
// 📌 นำเข้า Database และฟังก์ชัน remove, ref จาก Firebase (ตรวจสอบ path ให้ตรงกับโปรเจกต์ของคุณ)
import { db } from '../firebase'; 
import { ref, remove } from 'firebase/database';

export default function ReportsView({ jobs, currentUser }) {
  const [reportType, setReportType] = useState('all');
  
  // 🔍 State สำหรับช่องค้นหาและระบบแบ่งหน้า (Pagination)
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // State สำหรับควบคุม Modal กรอกเลข Smart 1662 ก่อนสั่งพิมพ์
  const [selectedJobForPrint, setSelectedJobForPrint] = useState(null);
  const [smart1662Input, setSmart1662Input] = useState('');

  // 🖼️ State สำหรับ Modal จัดการ/ดาวน์โหลดรูปภาพ
  const [selectedJobForPhotos, setSelectedJobForPhotos] = useState(null);

  // ⚠️ State สำหรับ Modal แสดงรายละเอียดงานซ่อมไม่ได้
  const [isUnrepairableModalOpen, setIsUnrepairableModalOpen] = useState(false);

  // 🗑️ State สำหรับ Modal ยืนยันการลบข้อมูล
  const [jobToDelete, setJobToDelete] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // 📅 ฟังก์ชันแปลงวันที่โดยอิงตาม "วันเวลาที่รับแจ้ง" เป็นหลัก
  const parseJobDate = (job) => {
    const rawDate = job.receivedAt || job.createdAt || job.completedAt;
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
    if (!jobs || !Array.isArray(jobs)) return [];

    const now = new Date();

    // 1. กรองข้อมูลตามเงื่อนไขเวลาและคำค้นหา
    const filtered = jobs.filter(job => {
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

      if (tableSearchTerm.trim()) {
        const term = tableSearchTerm.trim().toLowerCase();
        const matchNo = (job.receivedNo || job.id || '').toLowerCase().includes(term);
        const matchSmart = (job.smart1662No || '').toLowerCase().includes(term);
        const matchName = (job.reporterName || '').toLowerCase().includes(term);
        const matchPhone = (job.phone || '').toLowerCase().includes(term);
        const matchLocation = (job.location || '').toLowerCase().includes(term);
        const matchTech = (job.technician || '').toLowerCase().includes(term);
        const matchPipe = (job.pipeType || '').toLowerCase().includes(term);
        const matchFirebaseKey = (job.firebaseKey || job.dbKey || '').toLowerCase().includes(term);

        if (!matchNo && !matchSmart && !matchName && !matchPhone && !matchLocation && !matchTech && !matchPipe && !matchFirebaseKey) {
          return false;
        }
      }

      return true;
    });

    // 2. ป้องกันข้อมูลซ้ำ (Deduplication) บนหน้า UI
    const uniqueMap = new Map();
    filtered.forEach(job => {
      const uniqueKey = job.receivedNo || job.id || JSON.stringify(job);
      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, job);
      }
    });

    // 3. แปลงกลับเป็น Array และเรียงลำดับจากล่าสุดไปเก่าสุด
    return Array.from(uniqueMap.values()).sort((a, b) => parseJobDate(b) - parseJobDate(a));
  };

  const filteredJobs = getFilteredJobs();
  const completedCount = filteredJobs.filter(j => j.status === 'COMPLETED').length;
  const inProgressCount = filteredJobs.filter(j => j.status === 'DISPATCHED' || j.status === 'IN_PROGRESS').length;
  
  // ⚠️ รายการงานที่ไม่สามารถดำเนินการได้ (UNREPAIRABLE) ตามช่วงเวลา
  const unrepairableJobsList = filteredJobs.filter(j => j.status === 'UNREPAIRABLE');

  // 📄 ระบบแบ่งหน้า (Pagination Logic)
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

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

  const pipeSummary = filteredJobs
    .filter(j => j.status === 'COMPLETED')
    .reduce((acc, job) => {
      const type = job.pipeType || 'ไม่ระบุชนิด';
      const size = job.pipeSize ? `${job.pipeSize} มม.` : 'ไม่ระบุขนาด';
      const key = `${type} (ขนาด ${size})`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

  // 🔒 ฟังก์ชันตรวจสอบสิทธิ์แอดมินก่อนอนุญาตให้ลบข้อมูล
  const checkAdminPermission = () => {
    if (currentUser && currentUser.role === 'viewer') {
      alert("❌ คุณไม่มีสิทธิ์ในการลบข้อมูล (สิทธิ์ของคุณเป็นผู้ดูรายงาน)");
      return false;
    }
    return true;
  };

  const handleRequestDelete = (job) => {
    if (!checkAdminPermission()) return;
    setJobToDelete(job);
  };

  // 🗑️ ฟังก์ชันลบข้อมูลออกจาก Firebase จริง (อ้างอิง Node ชื่อ 'repairs')
  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;
    
    // ดึง Key จริงใน Firebase (รองรับชื่อตัวแปร firebaseKey, dbKey หรือ id)
    const targetKey = jobToDelete.firebaseKey || jobToDelete.dbKey || jobToDelete.id;
    
    if (!targetKey) {
      alert("⚠️ ไม่พบรหัสอ้างอิง (Key) สำหรับลบข้อมูลในฐานข้อมูล");
      setJobToDelete(null);
      return;
    }

    try {
      // 📌 ใช้ Node 'repairs' ตามที่คุณแจ้ง
      const jobRef = ref(db, `repairs/${targetKey}`); 
      await remove(jobRef);
      
      alert("🗑️ ลบข้อมูลออกจากฐานข้อมูล Firebase (repairs) สำเร็จแล้ว");
    } catch (error) {
      console.error("Error deleting job from Firebase: ", error);
      alert("❌ เกิดข้อผิดพลาดในการลบข้อมูล: " + error.message);
    } finally {
      setJobToDelete(null);
    }
  };

  // 📸 ฟังก์ชันแปลงและแยกรูปภาพให้รองรับทั้ง Array, JSON, และ String ที่คั่นด้วยบรรทัดใหม่หรือจุลภาค
  const parseImages = (imgData) => {
    if (!imgData) return [];
    try {
      if (Array.isArray(imgData)) {
        return imgData.filter(url => url && typeof url === 'string' && url.trim() !== '');
      }
      if (typeof imgData === 'string') {
        if (imgData.startsWith('[')) {
          const parsed = JSON.parse(imgData);
          if (Array.isArray(parsed)) return parsed.filter(url => url && typeof url === 'string');
        }
        if (imgData.includes('\n')) {
          return imgData.split('\n').map(u => u.trim()).filter(u => u !== '');
        }
        if (imgData.includes(',')) {
          return imgData.split(',').map(u => u.trim()).filter(u => u !== '');
        }
        if (imgData.trim() !== '') {
          return [imgData.trim()];
        }
      }
    } catch (e) {
      console.error("Error parsing images:", e);
    }
    return [];
  };

  // 📥 ฟังก์ชันดาวน์โหลดไฟล์ภาพลงเครื่องคอมพิวเตอร์/มือถือ
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

    const headers = ["FirebaseKey", "ReceivedNo", "Smart1662No", "CreatedAt", "CompletedAt", "ReporterName", "Phone", "Location", "Latitude", "Longitude", "ComplaintTopic", "PipeType", "PipeSize", "Technician", "Status", "Notes"];
    const csvRows = [headers.join(",")];

    filteredJobs.forEach(job => {
      const row = [
        `"${job.firebaseKey || job.dbKey || job.id || ""}"`,
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
        `"${job.pipeType || ""}"`,
        `"${job.pipeSize || ""}"`,
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
        <title>ตัวอย่างก่อนพิมพ์</title>
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

            ${job.pipeType || job.pipeSize ? `
              <div style="margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                <strong>วัสดุท่อที่ซ่อม:</strong> 
                <span style="color: #ea580c; font-weight: bold;">ท่อชนิด ${job.pipeType || 'ไม่ระบุ'} ขนาด ${job.pipeSize ? job.pipeSize + ' มม.' : 'ไม่ระบุ'}</span>
              </div>
            ` : ''}

            ${job.latitude && job.longitude ? `
              <div><strong>พิกัด GPS โลเคชั่น:</strong> 
                <span style="font-family: monospace; color: #059669; font-weight: bold;">${job.latitude}, ${job.longitude}</span>
                <a href="https://www.google.com/maps?q=${job.latitude},${job.longitude}" target="_blank" style="margin-left: 10px; color: #2563eb; text-decoration: none; font-size: 11px;">[🗺️ เปิดดูแผนที่ Google Maps]</a>
              </div>
            ` : ''}

            <div class="info-row">
              <span><strong>ผู้แจ้ง:</strong> ${job.reporterName || '-'} (${job.phone || '-'})</span>
              <span><strong>ทีมช่างซ่อม:</strong> ${job.technician || '-'}</span>
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
            <strong>อุปกรณ์ที่ใช้:</strong> ${job.notes || job.description || '-'}
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
            รายงานผลการปฏิบัติงานซ่อมท่อประปา
          </h2>
          <p className="text-xs text-slate-500 mt-1">กปภ.สาขานครพนม - ติดตามสถิติและการดำเนินงาน (อิงตามวันที่รับแจ้ง)</p>
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
          <p className="text-xs text-blue-100 font-medium">ใบแจ้งซ่อมทั้งหมด ({reportType.toUpperCase()})</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 📊 สรุปผลงานซ่อมเสร็จ แยกตามทีมช่าง */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            สรุปผลงานซ่อมเสร็จ แยกตามทีมช่าง
          </h3>
          
          {Object.keys(teamSummary).length === 0 ? (
            <p className="text-xs text-slate-400 py-2">ยังไม่มีข้อมูลงานที่ซ่อมเสร็จสิ้นในช่วงเวลานี้</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {Object.entries(teamSummary).map(([teamName, count]) => (
                <div key={teamName} className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex justify-between items-center shadow-xs">
                  <span className="text-xs font-bold text-slate-700 truncate">{teamName}</span>
                  <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-xs">
                    {count} จุด
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🛠️ สรุปชนิดและขนาดท่อที่ใช้ซ่อม */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-600" />
            สรุปชนิดและขนาดท่อที่ใช้ซ่อม
          </h3>
          
          {Object.keys(pipeSummary).length === 0 ? (
            <p className="text-xs text-slate-400 py-2">ยังไม่มีข้อมูลชนิดและขนาดท่อในช่วงเวลานี้</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {Object.entries(pipeSummary).map(([pipeInfo, count]) => (
                <div key={pipeInfo} className="bg-orange-50/50 border border-orange-200/80 p-3 rounded-2xl flex justify-between items-center shadow-xs">
                  <span className="text-xs font-bold text-slate-700 truncate">{pipeInfo}</span>
                  <span className="bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-xs">
                    {count} จุด
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ⚠️ สรุปงานที่ไม่สามารถดำเนินการได้ (UNREPAIRABLE) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            งานที่ไม่สามารถดำเนินการได้
          </h3>

          <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-2xl flex justify-between items-center shadow-xs">
            <div>
              <p className="text-xs text-rose-800 font-bold">รวมอุปสรรค / ซ่อมไม่ได้</p>
              <p className="text-[10px] text-rose-600">คลิกเพื่อดูรายละเอียดรายจุด</p>
            </div>
            
            <button
              onClick={() => setIsUnrepairableModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
            >
              {unrepairableJobsList.length} จุด <Eye className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">ตรวจสอบสาเหตุอุปสรรคหน้างานที่ไม่สามารถซ่อมเสร็จได้ในช่วงเวลานี้</p>
        </div>
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
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาเลขรับแจ้ง, 1662, ผู้แจ้ง, ชนิดท่อ..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 shadow-xs"
              />
            </div>

            <div className="hidden lg:flex items-center gap-2 text-[11px] bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs shrink-0">
              <span className="font-bold text-slate-500 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> สัญลักษณ์:</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> ปิดงาน</span>
              <span className="inline-flex items-center gap-1 text-rose-700 font-semibold"><span className="w-2 h-2 rounded-full bg-rose-500"></span> ซ่อมไม่ได้</span>
              <span className="inline-flex items-center gap-1 text-blue-700 font-semibold"><span className="w-2 h-2 rounded-full bg-blue-500"></span> กำลังซ่อม</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <th className="p-4 font-semibold">เลขที่รับแจ้ง / DB Key</th>
                <th className="p-4 font-semibold">ผู้แจ้ง / เบอร์โทร</th>
                <th className="p-4 font-semibold">หัวข้อร้องเรียน</th>
                <th className="p-4 font-semibold">บริเวณที่เกิดเหตุ / ชนิดท่อ</th>
                <th className="p-4 font-semibold text-center">สถานะ</th>
                <th className="p-4 font-semibold text-center">รูปภาพหน้างาน</th>
                <th className="p-4 font-semibold text-center">พิมพ์รายงาน A4</th>
                <th className="p-4 font-semibold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentJobs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    <p className="text-sm font-bold">ไม่พบข้อมูลใบแจ้งซ่อมตามคำค้นหานี้</p>
                    <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกช่วงเวลาอื่น</p>
                  </td>
                </tr>
              ) : (
                currentJobs.map((job) => (
                  <tr key={job.firebaseKey || job.dbKey || job.id || job.receivedNo} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <span className="font-mono font-bold text-blue-600">{job.receivedNo || job.id}</span>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5" title="Firebase Unique Key">
                        Key: {job.firebaseKey || job.dbKey || job.id || '-'}
                      </p>
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
                      {job.pipeType && job.pipeType !== '-' && (
                        <p className="text-[10px] font-bold text-orange-600 mt-0.5">
                          ท่อ {job.pipeType} {job.pipeSize ? `(${job.pipeSize} มม.)` : ''}
                        </p>
                      )}
                    </td>
                    
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1.5 border shadow-xs ${
                        job.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        job.status === 'UNREPAIRABLE' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        job.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        job.status === 'DISPATCHED' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          job.status === 'COMPLETED' ? 'bg-emerald-500' :
                          job.status === 'UNREPAIRABLE' ? 'bg-rose-500' :
                          job.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                          job.status === 'DISPATCHED' ? 'bg-cyan-500' : 'bg-amber-500'
                        }`} />
                        {job.status === 'COMPLETED' ? 'ปิดงานแล้ว' : 
                         job.status === 'UNREPAIRABLE' ? 'ซ่อมไม่ได้' :
                         job.status === 'IN_PROGRESS' ? 'กำลังซ่อม' : 
                         job.status === 'DISPATCHED' ? 'จ่ายงานแล้ว' : 'รอดำเนินการ'}
                      </span>
                    </td>

                    {/* 🖼️ ปุ่มเปิดดู/ดาวน์โหลดรูปภาพ */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedJobForPhotos(job)}
                        title="ดูและดาวน์โหลดรูปภาพ"
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2 rounded-xl font-bold inline-flex items-center justify-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer text-xs"
                      >
                        <ImageIcon className="w-4 h-4" /> ดูรูป
                      </button>
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

                    {/* 🗑️ ปุ่มลบข้อมูล */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleRequestDelete(job)}
                        title="ลบข้อมูลใบงานนี้"
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl font-bold inline-flex items-center justify-center shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 📄 แถบควบคุมการแบ่งหน้า */}
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

      {/* ⚠️ MODAL แสดงรายละเอียดงานที่ไม่สามารถดำเนินการได้ */}
      {isUnrepairableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-gradient-to-r from-rose-700 to-rose-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-200" />
                <h3 className="font-bold text-sm">รายการงานที่ไม่สามารถดำเนินการได้ ({unrepairableJobsList.length} จุด)</h3>
              </div>
              <button onClick={() => setIsUnrepairableModalOpen(false)} className="p-1.5 rounded-xl bg-rose-800 hover:bg-rose-700 text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50">
              {unrepairableJobsList.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">ไม่มีรายการงานที่ไม่สามารถซ่อมได้ในช่วงเวลานี้</p>
              ) : (
                unrepairableJobsList.map((job) => (
                  <div key={job.firebaseKey || job.dbKey || job.id || job.receivedNo} className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs space-y-2 relative">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                        {job.receivedNo || job.id}
                      </span>
                      <span className="text-[10px] text-slate-400">แจ้ง: {job.receivedAt || job.createdAt}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{job.complaintTopic || job.issueType}</h4>
                      <p className="text-xs text-slate-600 mt-0.5"><strong>สถานที่:</strong> {job.location}</p>
                      <p className="text-xs text-slate-600"><strong>ผู้แจ้ง:</strong> {job.reporterName} ({job.phone})</p>
                    </div>

                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-xs text-rose-900 space-y-1">
                      <span className="font-bold block text-[11px] text-rose-700">⚠️ สาเหตุอุปสรรคหน้างาน:</span>
                      <p>{job.notes || '-'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 text-right">
              <button
                onClick={() => setIsUnrepairableModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ MODAL ยืนยันการลบข้อมูล */}
      {jobToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">ยืนยันการลบข้อมูลใบงาน</h3>
                <p className="text-[11px] text-slate-500">ข้อมูลจะถูกลบออกจาก Firebase ทันที</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5 font-medium">
              <div><strong className="text-slate-500">เลขที่รับแจ้ง:</strong> <span className="font-mono text-blue-600">{jobToDelete.receivedNo || jobToDelete.id}</span></div>
              <div><strong className="text-slate-500">สถานที่:</strong> {jobToDelete.location || '-'}</div>
              <div><strong className="text-slate-500">ผู้แจ้ง:</strong> {jobToDelete.reporterName || '-'}</div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setJobToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ MODAL แสดงและดาวน์โหลดรูปภาพหน้างาน */}
      {selectedJobForPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">รูปภาพปฏิบัติงาน: <span className="font-mono text-cyan-400">{selectedJobForPhotos.receivedNo || selectedJobForPhotos.id}</span></h3>
                <p className="text-[11px] text-slate-300 truncate max-w-sm">{selectedJobForPhotos.location}</p>
              </div>
              <button onClick={() => setSelectedJobForPhotos(null)} className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-slate-50">
              {/* ภาพก่อนซ่อม */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> ภาพก่อนซ่อม ({parseImages(selectedJobForPhotos.beforeImgBase64 || selectedJobForPhotos.beforeImg).length} รูป)
                </h4>
                {parseImages(selectedJobForPhotos.beforeImgBase64 || selectedJobForPhotos.beforeImg).length === 0 ? (
                  <p className="text-xs text-slate-400 bg-white p-3 rounded-xl border border-slate-200">ไม่มีรูปภาพก่อนซ่อม</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {parseImages(selectedJobForPhotos.beforeImgBase64 || selectedJobForPhotos.beforeImg).map((url, idx) => (
                      <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-white aspect-square shadow-xs">
                        <img src={url} alt="before" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2 gap-2">
                          <a href={url} target="_blank" rel="noreferrer" className="bg-white text-slate-900 p-2 rounded-xl text-xs font-bold shadow-md hover:bg-blue-50 transition" title="เปิดดูรูปเต็ม">
                            <Eye className="w-4 h-4" />
                          </a>
                          <button onClick={() => handleDownloadSingleImage(url, `BEFORE_${selectedJobForPhotos.receivedNo || selectedJobForPhotos.id}_${idx+1}.jpg`)} className="bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold shadow-md hover:bg-emerald-700 transition" title="ดาวน์โหลดรูปภาพ">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ภาพระหว่างซ่อม */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> ภาพระหว่างซ่อม ({parseImages(selectedJobForPhotos.inProgImgBase64 || selectedJobForPhotos.inProgImg).length} รูป)
                </h4>
                {parseImages(selectedJobForPhotos.inProgImgBase64 || selectedJobForPhotos.inProgImg).length === 0 ? (
                  <p className="text-xs text-slate-400 bg-white p-3 rounded-xl border border-slate-200">ไม่มีรูปภาพระหว่างซ่อม</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {parseImages(selectedJobForPhotos.inProgImgBase64 || selectedJobForPhotos.inProgImg).map((url, idx) => (
                      <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-white aspect-square shadow-xs">
                        <img src={url} alt="inProgress" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2 gap-2">
                          <a href={url} target="_blank" rel="noreferrer" className="bg-white text-slate-900 p-2 rounded-xl text-xs font-bold shadow-md hover:bg-blue-50 transition" title="เปิดดูรูปเต็ม">
                            <Eye className="w-4 h-4" />
                          </a>
                          <button onClick={() => handleDownloadSingleImage(url, `INPROG_${selectedJobForPhotos.receivedNo || selectedJobForPhotos.id}_${idx+1}.jpg`)} className="bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold shadow-md hover:bg-emerald-700 transition" title="ดาวน์โหลดรูปภาพ">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ภาพหลังซ่อมเสร็จ */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ภาพหลังซ่อมเสร็จ ({parseImages(selectedJobForPhotos.afterImgBase64 || selectedJobForPhotos.afterImg).length} รูป)
                </h4>
                {parseImages(selectedJobForPhotos.afterImgBase64 || selectedJobForPhotos.afterImg).length === 0 ? (
                  <p className="text-xs text-slate-400 bg-white p-3 rounded-xl border border-slate-200">ไม่มีรูปภาพหลังซ่อมเสร็จ</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {parseImages(selectedJobForPhotos.afterImgBase64 || selectedJobForPhotos.afterImg).map((url, idx) => (
                      <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-white aspect-square shadow-xs">
                        <img src={url} alt="after" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2 gap-2">
                          <a href={url} target="_blank" rel="noreferrer" className="bg-white text-slate-900 p-2 rounded-xl text-xs font-bold shadow-md hover:bg-blue-50 transition" title="เปิดดูรูปเต็ม">
                            <Eye className="w-4 h-4" />
                          </a>
                          <button onClick={() => handleDownloadSingleImage(url, `AFTER_${selectedJobForPhotos.receivedNo || selectedJobForPhotos.id}_${idx+1}.jpg`)} className="bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold shadow-md hover:bg-emerald-700 transition" title="ดาวน์โหลดรูปภาพ">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedJobForPhotos(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ Modal กรอกเลข Smart 1662 ก่อนพิมพ์รายงาน */}
      {selectedJobForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                ระบุเลขที่ปิดงานซ่อม Smart 1662
              </h3>
              <button onClick={() => setSelectedJobForPrint(null)} className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                เลขที่ใบรับแจ้ง: <strong className="text-blue-600 font-mono">{selectedJobForPrint.receivedNo || selectedJobForPrint.id}</strong>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่ Smart 1662 (ถ้ามี):</label>
                <input
                  type="text"
                  value={smart1662Input}
                  onChange={(e) => setSmart1662Input(e.target.value)}
                  placeholder="เช่น 1662-68-XXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-mono"
                  autoFocus
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedJobForPrint(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAndOpenReport}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> ยืนยันและพิมพ์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
