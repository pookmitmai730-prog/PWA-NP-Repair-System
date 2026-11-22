import React, { useState, useEffect } from 'react';
import { Search, Printer, FileText, Calendar, Users, ChevronLeft, ChevronRight } from 'lucide-react';

// 🌐 URL ของ Google Apps Script Web App (เชื่อมโยงกับฐานข้อมูลเดิม)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydqD3x19rIfyttJPLhZung7NxIBh4LXetkGlZbhW4GmqLtJ-LI6HQ0vX-p_vrJ-QsH9w/exec";

// 📅 ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย
const formatThaiDate = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = d.getDate();
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
};

// 🛠️ ฟังก์ชันตัดส่วนเบอร์โทรศัพท์/วงเล็บต่อท้าย เพื่อให้ชื่อทีมที่เหมือนกันถูกจัดเป็นกลุ่มเดียวกัน
const normalizeTeamName = (rawName) => {
  if (!rawName) return '';
  return String(rawName)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*（[^）]*）\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function RepairCostReportView({ jobs = [] }) {
  const [savedRepairCosts, setSavedRepairCosts] = useState([]);
  const [loading, setLoading] = useState(false);

  // เงื่อนไขการกรองรายงาน
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // สถานะสำหรับการแบ่งหน้า (แสดงทีละ 10 รายการ)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ดึงข้อมูลประวัติการเบิกซ่อมจาก Google Sheets
  const fetchRepairCostsHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${WEB_APP_URL}?action=getRepairCosts`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setSavedRepairCosts(data);
      }
    } catch (err) {
      console.error("Error fetching repair costs history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairCostsHistory();
  }, []);

  // เมื่อมีการเปลี่ยนตัวกรอง ให้รีเซ็ตกลับไปหน้าแรกสุด (หน้า 1)
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeam, startDate, endDate]);

  // ดึงรายชื่อทีมผู้รับจ้างทั้งหมดจากข้อมูลใบงาน และกรองชื่อทีมที่เหมือนกันให้เหลือรายการเดียว
  const availableTeams = (() => {
    const teamMap = new Map();
    jobs.forEach((j) => {
      const rawTeam = String(j.Technician || j.technician || j.Team || '').trim();
      if (!rawTeam) return;
      const normalizedKey = normalizeTeamName(rawTeam).toLowerCase();
      if (!normalizedKey) return;

      if (!teamMap.has(normalizedKey)) {
        teamMap.set(normalizedKey, rawTeam);
      } else {
        const existingLabel = teamMap.get(normalizedKey);
        // เลือกชื่อที่สั้นและสะอาดกว่า (เช่น ไม่มีวงเล็บเบอร์โทรต่อท้าย) หากมีทั้งสองรูปแบบ
        if (existingLabel.includes('(') && !rawTeam.includes('(')) {
          teamMap.set(normalizedKey, rawTeam);
        }
      }
    });
    return Array.from(teamMap.values());
  })();

  const selectedTeamKey = normalizeTeamName(selectedTeam).toLowerCase();

  // กรองข้อมูลตามเงื่อนไข (ทีมผู้รับจ้าง และ ช่วงเวลา)
  const filteredReportData = savedRepairCosts.filter(item => {
    // 1. กรองตามทีมผู้รับจ้าง (เชื่อมโยงจากข้อมูล Job หรือชื่อผู้รับผิดชอบ)
    const matchingJob = jobs.find(j => String(j.JobID || j.id || '').trim() === String(item.Job_ID || item.jobId || '').trim());
    const teamName = matchingJob ? (matchingJob.Technician || matchingJob.technician || '-') : (item.Team || 'ไม่ระบุทีม');
    const itemTeamKey = normalizeTeamName(teamName).toLowerCase();

    if (selectedTeam !== 'ALL' && itemTeamKey !== selectedTeamKey) {
      return false;
    }

    // 2. กรองตามช่วงเวลา (ตรวจสอบจากวันที่สร้างรายการประมาณการหรือวันที่ซ่อมเสร็จ)
    const itemDateStr = item.Repair_Closed_At || item.createdAt || item.Timestamp;
    if (itemDateStr && (startDate || endDate)) {
      const itemDate = new Date(itemDateStr);
      if (!isNaN(itemDate.getTime())) {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (itemDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
      }
    }

    return true;
  });

  // คำนวณหายอดรวมค่าจ้างทั้งหมดจากข้อมูลที่กรองแล้ว (ทุกหน้า)
  const grandTotalSum = filteredReportData.reduce((acc, curr) => {
    const val = Number(curr.Grand_Total || curr.grandTotal || 0);
    return acc + val;
  }, 0);

  // คำนวณข้อมูลสำหรับแสดงผลแบบแบ่งหน้า (Pagination) ทีละ 10 รายการ
  const totalPages = Math.ceil(filteredReportData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableData = filteredReportData.slice(startIndex, startIndex + itemsPerPage);

  // ฟังก์ชันสั่งพิมพ์รายงานเฉพาะส่วน (จะพิมพ์ข้อมูลทั้งหมดโดยไม่ตัดหน้าตาราง)
  const handlePrintReport = () => {
    const printContent = document.getElementById('report-printable-area');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      alert("กรุณาอนุญาตให้เว็บไซต์เปิดหน้าต่างป๊อปอัป (Popup) เพื่อใช้งานฟังก์ชันพิมพ์รายงาน");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>รายงานการเบิกซ่อมท่อ - กปภ.สาขานครพนม</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
            @page { size: A4 landscape; margin: 10mm; }
            body { 
              background: white !important; 
              margin: 0 !important; 
              padding: 10mm !important; 
              font-family: 'Sarabun', 'TH Sarabun PSK', sans-serif !important;
              color: black !important;
              -webkit-print-color-adjust: exact; 
            }
            .no-print { display: none !important; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; }
            th { background-color: #f1f5f9 !important; text-align: center; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 font-sans">
      
      {/* หัวข้อรายงานและการควบคุม */}
      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <FileText className="w-6 h-6"/>
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg">รายงานการเบิกซ่อมท่อ (แยกตามทีมและช่วงเวลา)</h1>
              <p className="text-xs text-slate-500">การประปาส่วนภูมิภาคสาขานครพนม</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchRepairCostsHistory}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-4 h-4"/> <span>รีเฟรชข้อมูล</span>
            </button>
            <button
              onClick={handlePrintReport}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4"/> <span>พิมพ์รายงานเต็ม (PDF)</span>
            </button>
          </div>
        </div>

        {/* แผงตัวกรองเงื่อนไข (เงื่อนไขทีมผู้รับจ้าง และ ช่วงเวลา) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          
          {/* ตัวเลือก: ชื่อทีมผู้รับจ้าง */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-600"/> ทีมผู้รับจ้าง / ช่างผู้ปฏิบัติงาน
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none shadow-xs"
            >
              <option value="ALL">-- ทุกทีมผู้รับจ้างทั้งหมด --</option>
              {availableTeams.map((team, idx) => (
                <option key={idx} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* ตัวเลือก: ตั้งแต่วันที่ */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600"/> ตั้งแต่วันที่
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none shadow-xs"
            />
          </div>

          {/* ตัวเลือก: ถึงวันที่ */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600"/> ถึงวันที่
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none shadow-xs"
            />
          </div>

        </div>
      </div>

      {/* พื้นที่แสดงรายงาน (สามารถพิมพ์ได้) */}
      <div id="report-printable-area" className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 space-y-6">
        
        {/* หัวกระดาษรายงาน */}
        <div className="text-center space-y-1 border-b border-slate-200 pb-4">
          <h2 className="font-bold text-base text-slate-900">การประปาส่วนภูมิภาคสาขานครพนม</h2>
          <h3 className="font-extrabold text-lg text-indigo-900">รายงานการเบิกซ่อมท่อประปา</h3>
          <p className="text-xs text-slate-600">
            <b>ทีมผู้รับจ้าง:</b> {selectedTeam === 'ALL' ? 'ทุกทีมทั้งหมด' : selectedTeam} | 
            <b> ช่วงเวลา:</b> {startDate ? formatThaiDate(startDate) : 'เริ่มต้น'} ถึง {endDate ? formatThaiDate(endDate) : 'ปัจจุบัน'}
          </p>
        </div>

        {/* ตารางแสดงรายละเอียด (แสดงทีละ 10 รายการต่อหน้าในหน้าจอเว็บ) */}
        <div className="overflow-x-auto space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">กำลังโหลดข้อมูลรายงาน...</div>
          ) : filteredReportData.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">ไม่พบข้อมูลการเบิกซ่อมตามเงื่อนไขที่เลือก</div>
          ) : (
            <>
              <div className="flex justify-between items-center text-xs text-slate-500 px-1">
                <span>แสดงรายการที่ {startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, filteredReportData.length)} จากทั้งหมด {filteredReportData.length} รายการ</span>
                <span className="font-medium">หน้า {currentPage} / {totalPages}</span>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-700 text-center">
                    <th className="border border-slate-300 p-2" width="5%">ลำดับ</th>
                    <th className="border border-slate-300 p-2" width="12%">เลขที่รับแจ้ง / คำสั่งงาน</th>
                    <th className="border border-slate-300 p-2" width="12%">วันที่ซ่อมเสร็จ</th>
                    <th className="border border-slate-300 p-2" width="28%">สถานที่เกิดเหตุ</th>
                    <th className="border border-slate-300 p-2" width="18%">ทีมผู้รับจ้าง</th>
                    <th className="border border-slate-300 p-2 text-right" width="15%">วงเงินค่าจ้าง (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTableData.map((item, index) => {
                    const actualIndex = startIndex + index;
                    const jobId = item.Job_ID || item.jobId || '-';
                    const rNum = item.R_Number ? ` (R: ${item.R_Number})` : '';
                    const matchingJob = jobs.find(j => String(j.JobID || j.id || '').trim() === String(jobId).trim());
                    const teamName = matchingJob ? (matchingJob.Technician || matchingJob.technician || '-') : (item.Team || 'ไม่ระบุทีม');
                    const costVal = Number(item.Grand_Total || item.grandTotal || 0);

                    return (
                      <tr key={`rep-${actualIndex}`} className="hover:bg-slate-50 transition">
                        <td className="border border-slate-300 p-2 text-center">{actualIndex + 1}</td>
                        <td className="border border-slate-300 p-2 font-mono font-bold text-center text-blue-600">{jobId}{rNum}</td>
                        <td className="border border-slate-300 p-2 text-center">{formatThaiDate(item.Repair_Closed_At || item.createdAt)}</td>
                        <td className="border border-slate-300 p-2 truncate max-w-xs">{item.Location || '-'}</td>
                        <td className="border border-slate-300 p-2 font-medium">{teamName}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-bold text-emerald-700">
                          {costVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-50 font-extrabold text-indigo-950">
                    <td colSpan="5" className="border border-slate-300 p-3 text-right">รวมวงเงินค่าจ้างซ่อมท่อทั้งสิ้น ({filteredReportData.length} รายการ):</td>
                    <td className="border border-slate-300 p-3 text-right font-mono text-sm text-emerald-800">
                      ฿{grandTotalSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* ปุ่มเปลี่ยนหน้า (Pagination Controls) - จะถูกซ่อนเวลาสั่งพิมพ์ PDF */}
              {totalPages > 1 && (
                <div className="no-print flex justify-center items-center gap-2 pt-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <ChevronLeft className="w-4 h-4"/> ก่อนหน้า
                  </button>

                  <span className="text-xs font-bold text-slate-600 px-3">
                    หน้า {currentPage} จาก {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    ถัดไป <ChevronRight className="w-4 h-4"/>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ส่วนลายมือชื่อท้ายรายงาน */}
        <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs page-break-inside-avoid">
          <div className="space-y-12">
            <p>ลงชื่อ.............................................................. (ผู้จัดทำรายงาน)</p>
            <p>(..............................................................)</p>
          </div>
          <div className="space-y-12">
            <p>ลงชื่อ.............................................................. (ผู้ตรวจสอบ / หัวหน้างาน)</p>
            <p>(..............................................................)</p>
          </div>
        </div>

      </div>

    </div>
  );
}