import React, { useState } from 'react';
import { Clock, Wrench, User, Phone, MapPin, AlertCircle, Users, X, AlertTriangle, Search, Edit3, Hash, Trash2, ExternalLink, Image as ImageIcon } from 'lucide-react';

// 🌐 URL ของ Google Apps Script Web App ล่าสุด
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydqD3x19rIfyttJPLhZung7NxIBh4LXetkGlZbhW4GmqLtJ-LI6HQ0vX-p_vrJ-QsH9w/exec";

// 🔔 [สวิตช์ควบคุม Telegram] เปิดใช้งานการแจ้งเตือนอัตโนมัติ
const ENABLE_TELEGRAM_NOTIFY = true; 
const TELEGRAM_BOT_TOKEN = "8601147798:AAFNBUcoRYH4tvZfyvWgxaXP9xrWiR4D6kk";
const TELEGRAM_CHAT_ID = "-1003925252865";

export default function JobPipeline({ jobs, onStatusChange, workerAccounts = [] }) {
  const [selectedJobForDispatch, setSelectedJobForDispatch] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('ปกติ');
  
  // 📍 State สำหรับระบุ/แก้ไขพิกัดจุดรั่วตอนจ่ายงาน
  const [dispatchLat, setDispatchLat] = useState('');
  const [dispatchLng, setDispatchLng] = useState('');

  const [pipelineSearch, setPipelineSearch] = useState('');

  const [editingTeamJob, setEditingTeamJob] = useState(null);
  const [newSelectedTeam, setNewSelectedTeam] = useState('');

  // 🔴 State สำหรับ Modal แก้ไขข้อมูลของแอดมิน
  const [editingAdminJob, setEditingAdminJob] = useState(null);
  const [adminEditForm, setAdminEditForm] = useState({
    receivedNo: '',
    reporterName: '',
    phone: '',
    location: '',
    complaintTopic: '',
    urgency: 'ปกติ'
  });

  const columns = [
    { id: 'PENDING', title: 'รอรับเรื่อง / มอบหมาย', color: 'bg-amber-500', bgLight: 'bg-amber-50/50', border: 'border-amber-200' },
    { id: 'DISPATCHED', title: 'มอบหมายช่างแล้ว', color: 'bg-cyan-500', bgLight: 'bg-cyan-50/50', border: 'border-cyan-200' },
    { id: 'IN_PROGRESS', title: 'กำลังดำเนินการซ่อม', color: 'bg-blue-600', bgLight: 'bg-blue-50/50', border: 'border-blue-200' },
    { id: 'COMPLETED', title: 'ซ่อมเสร็จสิ้น (ปิดงาน)', color: 'bg-emerald-600', bgLight: 'bg-emerald-50/50', border: 'border-emerald-200' },
  ];

  const formatThaiDateTimeString = (dateInput) => {
    if (!dateInput) return '-';
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
    const year = date.getFullYear() + 543;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day} ${month} ${year} เวลา ${hours}.${minutes} น.`;
  };

  const getThaiTimestamp = () => {
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return formatThaiDateTimeString(thaiTime);
  };

  const normalizeStatus = (status) => {
    if (!status) return 'PENDING';
    if (status === 'รอดำเนินการ' || status === 'PENDING') return 'PENDING';
    if (status === 'มอบหมายช่างแล้ว' || status === 'DISPATCHED') return 'DISPATCHED';
    if (status === 'กำลังดำเนินการซ่อม' || status === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (status === 'ซ่อมเสร็จสิ้น (ปิดงาน)' || status === 'COMPLETED') return 'COMPLETED';
    return status;
  };

  const getDisplayReceivedNo = (job) => {
    return job.receivedNo || job.JobID || job.id || '-';
  };

  // 📲 ฟังก์ชันส่งแจ้งเตือนเข้า Telegram สอดคล้องกับ Apps Script
  const sendTelegramNotification = async (jobPayload) => {
    if (!ENABLE_TELEGRAM_NOTIFY) return; 
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") return;
    
    const displayPhone = jobPayload.phone ? String(jobPayload.phone).replace(/^'/, '') : '-';

    try {
      const message = `🛠 *แจ้งมอบหมายงานซ่อม (กปภ.)* 🛠\n\n` +
        `📌 *เลขที่รับแจ้ง:* \`${jobPayload.receivedNo}\`\n` +
        `👤 *ผู้แจ้ง:* ${jobPayload.reporterName} (${displayPhone})\n` +
        `📍 *สถานที่:* ${jobPayload.location}\n` +
        (jobPayload.latitude && jobPayload.longitude ? `🗺 *พิกัดจุดรั่ว:* [เปิดแผนที่ Google Maps](https://maps.google.com/?q=${jobPayload.latitude},${jobPayload.longitude})\n` : '') +
        `🔧 *ปัญหา:* ${jobPayload.complaintTopic}\n` +
        `👷‍♂️ *ทีมช่างผู้รับผิดชอบ:* *${jobPayload.technician}*\n` +
        `⚡ *ความเร่งด่วน:* ${jobPayload.urgency}\n` +
        `📅 *เวลาสั่งงาน:* ${jobPayload.dispatchedAt}`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" })
      });
    } catch (err) {
      console.error("Telegram error:", err);
    }
  };

  // 🚀 ยืนยันจ่ายงานช่าง พร้อมบันทึกพิกัดและส่งแจ้งเตือน Telegram
  const handleConfirmDispatch = async () => {
    if (!selectedTeam) {
      alert("กรุณาเลือกทีมช่างก่อนทำการจ่ายงาน");
      return;
    }
    const workerObj = workerAccounts.find(w => w.teamName === selectedTeam);
    const workerPhoneFormatted = workerObj && workerObj.phone && workerObj.phone !== '-' 
      ? (String(workerObj.phone).startsWith("'") ? workerObj.phone : `'${String(workerObj.phone).trim()}`) 
      : '-';
    
    const techDetails = workerObj ? `${workerObj.teamName} (${String(workerPhoneFormatted).replace(/^'/, '')})` : selectedTeam;
    
    const currentDateTime = getThaiTimestamp();
    const originalReceivedNo = getDisplayReceivedNo(selectedJobForDispatch);

    const rawPhone = selectedJobForDispatch.phone || selectedJobForDispatch.Phone || '-';
    const formattedPhone = rawPhone !== '-' ? (String(rawPhone).startsWith("'") ? rawPhone : `'${String(rawPhone).trim()}`) : '-';

    // ใช้พิกัดที่ระบุใหม่ หรือพิกัดเดิมที่มีอยู่
    const finalLat = dispatchLat || selectedJobForDispatch.latitude || selectedJobForDispatch.Latitude || '';
    const finalLng = dispatchLng || selectedJobForDispatch.longitude || selectedJobForDispatch.Longitude || '';

    const dispatchPayload = {
      action: "dispatch_job",
      id: selectedJobForDispatch.id || selectedJobForDispatch.JobID || originalReceivedNo,
      JobID: originalReceivedNo,
      receivedNo: originalReceivedNo,
      reporterName: selectedJobForDispatch.reporterName || selectedJobForDispatch.ReporterName || 'ไม่ระบุชื่อ',
      ReporterName: selectedJobForDispatch.reporterName || selectedJobForDispatch.ReporterName || 'ไม่ระบุชื่อ',
      phone: formattedPhone,
      Phone: formattedPhone,
      location: selectedJobForDispatch.location || selectedJobForDispatch.Location || '-',
      Location: selectedJobForDispatch.location || selectedJobForDispatch.Location || '-',
      complaintTopic: selectedJobForDispatch.complaintTopic || selectedJobForDispatch.issueType || selectedJobForDispatch.IssueType || '-',
      IssueType: selectedJobForDispatch.complaintTopic || selectedJobForDispatch.issueType || selectedJobForDispatch.IssueType || '-',
      technician: techDetails,
      Technician: techDetails,
      techName: workerObj?.teamName || selectedTeam,
      techPhone: workerPhoneFormatted,
      urgency: urgencyLevel,
      Notes: urgencyLevel,
      status: 'DISPATCHED',
      Status: 'DISPATCHED',
      dispatchedAt: currentDateTime,
      latitude: finalLat,
      Latitude: finalLat,
      longitude: finalLng,
      Longitude: finalLng,
      beforeImg: selectedJobForDispatch.beforeImg || selectedJobForDispatch.BeforeImg || '',
      BeforeImg: selectedJobForDispatch.beforeImg || selectedJobForDispatch.BeforeImg || ''
    };

    try {
      await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "dispatch_job",
          jobData: dispatchPayload
        })
      });

      await sendTelegramNotification(dispatchPayload);
    } catch (err) {
      console.error("Error sending dispatch to Google Sheets:", err);
    }

    onStatusChange(selectedJobForDispatch.id || selectedJobForDispatch.JobID, 'DISPATCHED', { 
      receivedNo: originalReceivedNo,
      technician: techDetails,
      techName: workerObj?.teamName || selectedTeam,
      techPhone: String(workerPhoneFormatted).replace(/^'/, ''),
      dispatchedAt: currentDateTime,
      urgency: urgencyLevel,
      Notes: urgencyLevel,
      latitude: finalLat,
      longitude: finalLng
    });

    setSelectedJobForDispatch(null);
    setSelectedTeam('');
    setUrgencyLevel('ปกติ');
    setDispatchLat('');
    setDispatchLng('');
    alert("จ่ายงานช่างและบันทึกลง Google Sheets สำเร็จ!");
  };

  // 🚀 เปลี่ยนทีมช่าง
  const handleConfirmChangeTeam = async () => {
    if (!newSelectedTeam || !editingTeamJob) return;

    const workerObj = workerAccounts.find(w => w.teamName === newSelectedTeam);
    const workerPhoneFormatted = workerObj && workerObj.phone && workerObj.phone !== '-' 
      ? (String(workerObj.phone).startsWith("'") ? workerObj.phone : `'${String(workerObj.phone).trim()}`) 
      : '-';

    const techDetails = workerObj ? `${workerObj.teamName} (${String(workerPhoneFormatted).replace(/^'/, '')})` : newSelectedTeam;
    const originalReceivedNo = getDisplayReceivedNo(editingTeamJob);
    const currentDateTime = getThaiTimestamp();

    const rawPhone = editingTeamJob.phone || editingTeamJob.Phone || '-';
    const formattedPhone = rawPhone !== '-' ? (String(rawPhone).startsWith("'") ? rawPhone : `'${String(rawPhone).trim()}`) : '-';

    const changeTeamPayload = {
      action: "dispatch_job",
      id: editingTeamJob.id || editingTeamJob.JobID || originalReceivedNo,
      JobID: originalReceivedNo,
      receivedNo: originalReceivedNo,
      reporterName: editingTeamJob.reporterName || editingTeamJob.ReporterName || 'ไม่ระบุชื่อ',
      phone: formattedPhone,
      Phone: formattedPhone,
      location: editingTeamJob.location || editingTeamJob.Location || '-',
      complaintTopic: editingTeamJob.complaintTopic || editingTeamJob.issueType || editingTeamJob.IssueType || '-',
      urgency: editingTeamJob.Notes || editingTeamJob.urgency || 'ปกติ',
      technician: techDetails,
      Technician: techDetails,
      techName: workerObj?.teamName || newSelectedTeam,
      techPhone: workerPhoneFormatted,
      status: 'DISPATCHED',
      Status: 'DISPATCHED',
      dispatchedAt: currentDateTime
    };

    try {
      await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "dispatch_job",
          jobData: changeTeamPayload
        })
      });

      await sendTelegramNotification(changeTeamPayload);
    } catch (err) {
      console.error("Error changing team in Google Sheets:", err);
    }

    onStatusChange(editingTeamJob.id || editingTeamJob.JobID, editingTeamJob.status, {
      ...changeTeamPayload,
      techPhone: String(workerPhoneFormatted).replace(/^'/, '')
    });

    setEditingTeamJob(null);
    setNewSelectedTeam('');
    alert("เปลี่ยนทีมช่างและบันทึกลง Google Sheets เรียบร้อยแล้ว");
  };

  const handleOpenAdminEdit = (job) => {
    setEditingAdminJob(job);
    const currentUrgency = job.Notes || job.notes || job.urgency || job.Urgency || job.urgencyLevel || 'ปกติ';
    const rawPhone = job.phone || job.Phone || '';
    
    setAdminEditForm({
      receivedNo: getDisplayReceivedNo(job),
      reporterName: job.reporterName || job.ReporterName || '',
      phone: rawPhone ? String(rawPhone).replace(/^'/, '') : '',
      location: job.location || job.Location || '',
      complaintTopic: job.complaintTopic || job.issueType || job.IssueType || '',
      urgency: currentUrgency
    });
  };

  const handleSaveAdminEdit = async (e) => {
    e.preventDefault();
    if (!editingAdminJob) return;

    const trimmedPhone = adminEditForm.phone.trim();
    const formattedPhone = trimmedPhone ? (trimmedPhone.startsWith("'") ? trimmedPhone : `'${trimmedPhone}`) : '-';

    const targetId = editingAdminJob.id || editingAdminJob.JobID || adminEditForm.receivedNo;
    const updatedData = {
      action: "create_job",
      id: targetId,
      JobID: adminEditForm.receivedNo,
      receivedNo: adminEditForm.receivedNo,
      timestamp: editingAdminJob.receivedAt || editingAdminJob.Timestamp || getThaiTimestamp(),
      Timestamp: editingAdminJob.receivedAt || editingAdminJob.Timestamp || getThaiTimestamp(),
      reporterName: adminEditForm.reporterName,
      ReporterName: adminEditForm.reporterName,
      phone: formattedPhone,
      Phone: formattedPhone,
      location: adminEditForm.location,
      Location: adminEditForm.location,
      complaintTopic: adminEditForm.complaintTopic,
      issueType: adminEditForm.complaintTopic,
      IssueType: adminEditForm.complaintTopic,
      description: adminEditForm.complaintTopic,
      Description: adminEditForm.complaintTopic,
      urgency: adminEditForm.urgency,
      Notes: adminEditForm.urgency, 
      status: editingAdminJob.status || editingAdminJob.Status || 'PENDING',
      Status: editingAdminJob.status || editingAdminJob.Status || 'PENDING',
      technician: editingAdminJob.technician || editingAdminJob.Technician || '-'
    };

    try {
      await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "create_job",
          jobData: updatedData
        })
      });
    } catch (err) {
      console.error("Error updating job in Google Sheets:", err);
    }

    onStatusChange(targetId, updatedData.status, updatedData);
    setEditingAdminJob(null);
    alert("อัปเดตข้อมูลเรียบร้อยแล้ว");
  };

  const handleDeleteJob = async (jobToDelete) => {
    const targetId = jobToDelete.id || jobToDelete.JobID || getDisplayReceivedNo(jobToDelete);
    if (!window.confirm(`คุณต้องการลบใบงานเลขที่ ${getDisplayReceivedNo(jobToDelete)} ใช่หรือไม่?`)) return;

    try {
      await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "delete_job",
          jobData: { id: targetId }
        })
      });

      setTimeout(() => {
        window.location.reload(); 
      }, 500);
    } catch (err) {
      console.error("Error deleting job:", err);
      alert("เกิดข้อผิดพลาดในการลบใบงาน");
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 shrink-0">
          <Wrench className="w-5 h-5 text-blue-600" />
          กระดานติดตามสถานะงานซ่อม
        </h3>

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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colJobs = (jobs || []).filter(j => {
            const normalizedStatus = normalizeStatus(j.status || j.Status);
            const matchStatus = normalizedStatus === col.id;
            if (!matchStatus) return false;

            if (!pipelineSearch.trim()) return true;
            const q = pipelineSearch.trim().toLowerCase();
            const receivedNo = String(getDisplayReceivedNo(j)).toLowerCase();
            const reporterName = String(j.reporterName || j.ReporterName || '').toLowerCase();
            const phone = String(j.phone || j.Phone || '').toLowerCase();
            const location = String(j.location || j.Location || '').toLowerCase();
            const issue = String(j.complaintTopic || j.issueType || j.IssueType || '').toLowerCase();

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
                  colJobs.map((job, index) => {
                    const uniqueJobKey = job.id || job.JobID || job.receivedNo || `job-${col.id}-${index}`;
                    
                    const currentUrgency = job.Notes || job.notes || job.urgency || job.Urgency || job.urgencyLevel || 'ปกติ';
                    const displayPhone = job.phone || job.Phone ? String(job.phone || job.Phone).replace(/^'/, '') : '-';

                    const rawReceivedAt = job.receivedAt || job.Timestamp || job.createdAt;
                    const formattedReceivedAt = rawReceivedAt ? formatThaiDateTimeString(rawReceivedAt) : '-';

                    const rawDispatchedAt = job.dispatchedAt;
                    const formattedDispatchedAt = rawDispatchedAt ? formatThaiDateTimeString(rawDispatchedAt) : '';

                    const isCompletedJob = normalizeStatus(job.status || job.Status) === 'COMPLETED';
                    const rawCompletedAt = isCompletedJob ? (job.completedAt || job.CompletedAt) : '';
                    const formattedCompletedAt = rawCompletedAt ? formatThaiDateTimeString(rawCompletedAt) : '';

                    const rawTechPhone = job.techPhone || job.TechPhone;
                    const displayTechPhone = rawTechPhone && rawTechPhone !== '-' ? String(rawTechPhone).replace(/^'/, '') : '';

                    // ตรวจสอบรูปภาพและพิกัดที่ประชาชนแนบมา
                    const jobImg = job.beforeImg || job.BeforeImg;
                    const jobLat = job.latitude || job.Latitude;
                    const jobLng = job.longitude || job.Longitude;

                    return (
                      <div key={uniqueJobKey} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition space-y-2.5 relative">
                        
                        <button
                          onClick={() => handleOpenAdminEdit(job)}
                          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <div className="flex justify-between items-start pr-6">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-blue-600 text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                              {getDisplayReceivedNo(job)}
                            </span>
                            
                            {currentUrgency && currentUrgency !== 'ปกติ' && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                                currentUrgency === 'ด่วนมาก' 
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse' 
                                  : 'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}>
                                <AlertTriangle className="w-3 h-3" /> {currentUrgency}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 space-y-0.5">
                          <span className="block"><Clock className="w-3 h-3 inline mr-0.5" /> แจ้ง: {formattedReceivedAt}</span>
                          {formattedDispatchedAt && (
                            <span className="text-cyan-600 font-semibold block">สั่งงาน: {formattedDispatchedAt}</span>
                          )}
                          {formattedCompletedAt && (
                            <span className="text-emerald-600 font-bold block">เสร็จ: {formattedCompletedAt}</span>
                          )}
                        </div>

                        <div>
                          <h5 className="font-bold text-slate-800 text-xs leading-snug line-clamp-2">
                            {job.complaintTopic || job.issueType || job.IssueType || '-'}
                          </h5>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{job.reporterName || job.ReporterName} ({displayPhone})</span>
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-start gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{job.location || job.Location}</span>
                          </p>
                        </div>

                        {/* 📸 ปุ่มกดดูรูปและพิกัดที่ประชาชนแนบมา */}
                        {(jobImg || (jobLat && jobLng)) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {jobImg && (
                              <a
                                href={jobImg}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition shadow-xs"
                              >
                                <ImageIcon className="w-3 h-3 text-blue-600" /> ดูรูปถ่ายแจ้งซ่อม
                              </a>
                            )}
                            {jobLat && jobLng && (
                              <a
                                href={`https://maps.google.com/?q=${jobLat},${jobLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition shadow-xs border border-blue-200"
                              >
                                <MapPin className="w-3 h-3 text-rose-500" /> เปิดแผนที่จุดรั่ว <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}

                        {normalizeStatus(job.status || job.Status) !== 'PENDING' && (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1 relative">
                            <div className="flex justify-between items-center">
                              <p className="font-bold text-blue-700 flex items-center gap-1">
                                <Users className="w-3 h-3" /> ทีมรับงาน: {job.techName || job.technician || job.Technician}
                              </p>
                              
                              {normalizeStatus(job.status || job.Status) !== 'COMPLETED' && (
                                <button
                                  onClick={() => {
                                    setEditingTeamJob(job);
                                    setNewSelectedTeam(job.techName || job.technician || workerAccounts[0]?.teamName || '');
                                  }}
                                  className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition cursor-pointer"
                                  title="เปลี่ยนทีมช่าง"
                                >
                                  <Edit3 className="w-3 h-3" /> เปลี่ยนทีม
                                </button>
                              )}
                            </div>
                            
                            {displayTechPhone && (
                              <p className="text-slate-600 flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-emerald-600" /> โทร: {displayTechPhone}
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
                                  setDispatchLat(job.latitude || job.Latitude || '');
                                  setDispatchLng(job.longitude || job.Longitude || '');
                                }}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 py-1 rounded-lg font-bold transition shadow-sm cursor-pointer"
                              >
                                จ่ายงานช่าง
                              </button>
                            )}
                            {col.id === 'DISPATCHED' && (
                              <span className="text-[11px] text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                                ⏳ รอช่างเข้าตรวจสอบ
                              </span>
                            )}
                            {col.id === 'IN_PROGRESS' && (
                              <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                                รอช่างปิดงาน
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal จ่ายงานซ่อม (เพิ่มส่วนเลือก/ระบุแผนที่พิกัดจุดท่อรั่ว) */}
      {selectedJobForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm">จ่ายงานซ่อม: {getDisplayReceivedNo(selectedJobForDispatch)}</h4>
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
                    workerAccounts.map((worker, wIndex) => (
                      <option key={worker.id || worker.teamName || `worker-${wIndex}`} value={worker.teamName}>
                        {worker.teamName} {worker.phone && worker.phone !== '-' ? `(โทร: ${String(worker.phone).replace(/^'/, '')})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* 🗺️ เพิ่มส่วนระบุหรือตรวจสอบพิกัดจุดท่อรั่วตอนจ่ายงาน */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" /> พิกัดจุดท่อแตกรั่ว (ส่งให้ช่างภาคสนาม)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">Latitude (ละติจูด)</span>
                    <input
                      type="text"
                      value={dispatchLat}
                      onChange={(e) => setDispatchLat(e.target.value)}
                      placeholder="เช่น 17.380340"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">Longitude (ลองจิจูด)</span>
                    <input
                      type="text"
                      value={dispatchLng}
                      onChange={(e) => setDispatchLng(e.target.value)}
                      placeholder="เช่น 104.786512"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>
                {dispatchLat && dispatchLng && (
                  <a
                    href={`https://maps.google.com/?q=${dispatchLat},${dispatchLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 font-bold flex items-center gap-1 pt-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> ตรวจสอบตำแหน่งพิกัดนี้บน Google Maps
                  </a>
                )}
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

      {/* Modal สำหรับเปลี่ยนทีมช่าง */}
      {editingTeamJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm">เปลี่ยนทีมช่าง: {getDisplayReceivedNo(editingTeamJob)}</h4>
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
                  {workerAccounts.map((worker, wIndex) => (
                    <option key={worker.id || worker.teamName || `new-worker-${wIndex}`} value={worker.teamName}>
                      {worker.teamName} {worker.phone && worker.phone !== '-' ? `(โทร: ${String(worker.phone).replace(/^'/, '')})` : ''}
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

      {/* Modal สำหรับแอดมินแก้ไขข้อมูล */}
      {editingAdminJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                  <Hash className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-wide">แก้ไขข้อมูลใบงาน</h4>
                  <p className="text-[11px] text-blue-100 opacity-90">จัดการข้อมูล (ล็อกเลขที่รับแจ้งเพื่อใช้ติดตามสถานะ)</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingAdminJob(null)} 
                className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>เลขที่รับแจ้ง / Smart 1662 (อ้างอิงสำหรับติดตามสถานะ)</span>
                  <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    🔒 ล็อกข้อมูล
                  </span>
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    value={adminEditForm.receivedNo}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-slate-500 cursor-not-allowed shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อผู้แจ้ง</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      type="text"
                      value={adminEditForm.reporterName}
                      onChange={(e) => setAdminEditForm(prev => ({ ...prev, reporterName: e.target.value }))}
                      placeholder="ระบุชื่อผู้แจ้ง"
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">เบอร์โทรศัพท์</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      type="text"
                      value={adminEditForm.phone}
                      onChange={(e) => setAdminEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="ระบุเบอร์โทร"
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <span>สถานที่เกิดเหตุ</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute top-3 left-3.5 pointer-events-none text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  <textarea 
                    rows="2"
                    value={adminEditForm.location}
                    onChange={(e) => setAdminEditForm(prev => ({ ...prev, location: e.target.value }))}
                    required
                    placeholder="ระบุสถานที่ หรือจุดสังเกต..."
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">หัวข้อปัญหา</label>
                  <input 
                    type="text"
                    value={adminEditForm.complaintTopic}
                    onChange={(e) => setAdminEditForm(prev => ({ ...prev, complaintTopic: e.target.value }))}
                    placeholder="เช่น ท่อแตก, น้ำไม่ไหล"
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ระดับความเร่งด่วน</label>
                  <select
                    value={adminEditForm.urgency}
                    onChange={(e) => setAdminEditForm(prev => ({ ...prev, urgency: e.target.value }))}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm cursor-pointer"
                  >
                    <option value="ปกติ">ปกติ</option>
                    <option value="ด่วน">ด่วน</option>
                    <option value="ด่วนมาก">ด่วนมาก</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                {normalizeStatus(editingAdminJob.status || editingAdminJob.Status) !== 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteJob(editingAdminJob)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold py-3 px-4 rounded-2xl cursor-pointer border border-rose-200/60 flex items-center gap-1.5 transition shadow-sm"
                    title="ลบใบงาน"
                  >
                    <Trash2 className="w-4 h-4" /> 
                    <span>ลบ</span>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => setEditingAdminJob(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3 rounded-2xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold py-3 rounded-2xl shadow-lg shadow-blue-500/25 transition cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
