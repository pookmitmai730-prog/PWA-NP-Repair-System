import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, FileText, Loader2, AlertTriangle, User, Phone, MapPin, Calendar, Hash } from 'lucide-react';

// 🌐 URL ของ Google Apps Script Web App หลักสำหรับบันทึกข้อมูล
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydqD3x19rIfyttJPLhZung7NxIBh4LXetkGlZbhW4GmqLtJ-LI6HQ0vX-p_vrJ-QsH9w/exec";

// 🔔 เปิดการใช้งานการแจ้งเตือน Telegram
const ENABLE_TELEGRAM_NOTIFY = true; 
const TELEGRAM_BOT_TOKEN = "8601147798:AAFNBUcoRYH4tvZfyvWgxaXP9xrWiR4D6kk";
const TELEGRAM_CHAT_ID = "-1003925252865";

export default function CreateJobModal({ isOpen, onClose, onJobCreated }) {
  if (!isOpen) return null;

  const getThaiNowForInput = () => {
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return thaiTime.toISOString().slice(0, 16);
  };

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

  // 📱 ฟังก์ชันจัดฟอร์แมตเบอร์โทรศัพท์ให้ใส่ Single Quote (') นำหน้า ป้องกัน Google Sheets ตัดเลข 0
  const formatPhoneForSheet = (phoneStr) => {
    if (!phoneStr || phoneStr === '-') return '-';
    const cleanPhone = String(phoneStr).trim().replace(/^'/, '');
    if (!cleanPhone || cleanPhone === '-') return '-';
    return `'${cleanPhone}`;
  };

  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    receivedNo: '', 
    receivedAt: getThaiNowForInput(),
    reporterName: '',
    phone: '',
    location: '',
    complaintTopic: 'ท่อแตกรั่ว',
    customComplaintTopic: '',
    urgency: 'ปกติ',
    channel: 'รับแจ้งทางโทรศัพท์',
    status: 'PENDING'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const sendTelegramNotification = async (jobPayload) => {
    if (!ENABLE_TELEGRAM_NOTIFY) return;
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") return;

    const displayPhone = jobPayload.phone ? String(jobPayload.phone).replace(/^'/, '') : '-';

    const message = `🚨 *รับแจ้งซ่อมใหม่ (ระบบ กปภ.)* 🚨\n\n` +
      `📌 *เลขที่รับแจ้ง:* \`${jobPayload.receivedNo}\`\n` +
      `👤 *ผู้แจ้ง:* ${jobPayload.reporterName} (${displayPhone})\n` +
      `📍 *สถานที่:* ${jobPayload.location}\n` +
      `🔧 *ปัญหา:* ${jobPayload.complaintTopic}\n` +
      `⚡ *ความเร่งด่วน:* ${jobPayload.urgency}\n` +
      `📅 *เวลา:* ${jobPayload.receivedAt}`;

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown"
        })
      });
    } catch (err) {
      console.error("Failed to send Telegram notification:", err);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1024;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

        try {
          const response = await fetch('/api/ocr-vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: compressedBase64 }),
          });

          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error('ไม่พบ Serverless API (/api/ocr-vision)');
          }

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'ไม่สามารถประมวลผล OCR ได้');
          }

          const data = result.data;

          let detectedUrgency = data.urgency || data.urgencyLevel || data.priority || 'ปกติ';
          if (!['ปกติ', 'ด่วน', 'ด่วนมาก'].includes(detectedUrgency)) {
            if (detectedUrgency.includes('ด่วนมาก') || detectedUrgency.includes('สูงสุด')) {
              detectedUrgency = 'ด่วนมาก';
            } else if (detectedUrgency.includes('ด่วน')) {
              detectedUrgency = 'ด่วน';
            } else {
              detectedUrgency = 'ปกติ';
            }
          }

          const rawOcrPhone = data.phone || data.complainantInfo || prev.phone;

          setFormData(prev => ({
            ...prev,
            receivedNo: data.receivedNo || prev.receivedNo,
            receivedAt: data.receivedAt ? data.receivedAt.replace(' ', 'T') : prev.receivedAt,
            reporterName: data.reporterName || prev.reporterName,
            phone: rawOcrPhone ? String(rawOcrPhone).replace(/^'/, '') : prev.phone,
            location: data.location || prev.location,
            complaintTopic: data.complaintTopic || prev.complaintTopic,
            urgency: detectedUrgency,
          }));

        } catch (err) {
          console.error('Vision API Error:', err);
          setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI OCR');
        } finally {
          setOcrLoading(false);
        }
      };
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.receivedNo.trim()) {
      alert("กรุณากรอกเลขที่รับแจ้ง");
      return;
    }
    if (!formData.receivedAt) {
      alert("กรุณากรอกวัน-เวลารับแจ้ง");
      return;
    }
    if (!formData.reporterName.trim()) {
      alert("กรุณากรอกชื่อผู้แจ้ง");
      return;
    }
    if (!formData.phone.trim()) {
      alert("กรุณากรอกเบอร์โทรศัพท์");
      return;
    }
    if (!formData.location.trim()) {
      alert("กรุณากรอกบริเวณที่เกิดเหตุ / สถานที่");
      return;
    }
    if (formData.complaintTopic === 'อื่นๆ' && !formData.customComplaintTopic.trim()) {
      alert("กรุณาระบุหัวข้อปัญหาเพิ่มเติม");
      return;
    }

    setLoading(true);
    setError(null);

    const finalTopic = formData.complaintTopic === 'อื่นๆ' 
      ? formData.customComplaintTopic.trim() 
      : formData.complaintTopic;

    const thaiDateTimeFormatted = formatThaiDateTimeString(formData.receivedAt);
    const manualReceivedNo = formData.receivedNo.trim();

    // 🔴 ฟอร์แมตเบอร์โทรศัพท์ด้วย formatPhoneForSheet
    const formattedPhone = formatPhoneForSheet(formData.phone);

    const jobPayload = {
      action: "create_job",
      receivedNo: manualReceivedNo,
      JobID: manualReceivedNo,
      id: manualReceivedNo,
      receivedAt: thaiDateTimeFormatted, 
      Timestamp: thaiDateTimeFormatted,
      timestamp: thaiDateTimeFormatted,
      receivedAtThai: thaiDateTimeFormatted,
      reporterName: formData.reporterName.trim(),
      ReporterName: formData.reporterName.trim(),
      phone: formattedPhone,
      Phone: formattedPhone,
      location: formData.location.trim(),
      Location: formData.location.trim(),
      complaintTopic: finalTopic,
      issueType: finalTopic,
      IssueType: finalTopic,
      customComplaintTopic: formData.customComplaintTopic.trim() || finalTopic,
      description: formData.customComplaintTopic.trim() || finalTopic,
      Description: formData.customComplaintTopic.trim() || finalTopic,
      urgency: formData.urgency,
      Notes: formData.urgency,
      status: 'PENDING',
      Status: 'PENDING'
    };

    try {
      await fetch(WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "create_job",
          jobData: jobPayload
        })
      });

      await sendTelegramNotification(jobPayload);

      if (onJobCreated) {
        onJobCreated(jobPayload);
      }

      onClose();
      
      alert(
        `บันทึกใบแจ้งซ่อมลง Google Sheets สำเร็จ!\n\n` +
        `📌 เลขที่รับแจ้ง: ${manualReceivedNo}\n` +
        `📍 สถานที่: ${formData.location}\n\n` +
        `*** ระบบกำลังโหลดหน้าใหม่เพื่อซิงค์ข้อมูลล่าสุด... ***`
      );

      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (err) {
      console.error('Google Sheets Save Error:', err);
      setError('ไม่สามารถบันทึกข้อมูลลง Google Sheets ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto font-sans animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden my-8 border border-slate-100 transform transition-all">
        
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">เพิ่มใบแจ้งซ่อมใหม่</h2>
              <p className="text-[11px] text-blue-100 opacity-90">บันทึกข้อมูลรับแจ้งปัญหาหรือใช้ AI OCR ช่วยกรอก</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-100 rounded-2xl space-y-2.5 shadow-xs">
            <label className="block text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" /> อัปโหลดรูปภาพใบแจ้งซ่อม เพื่อให้ AI กรอกข้อมูลอัตโนมัติ
            </label>
            
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              disabled={ocrLoading}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-white border border-blue-200 rounded-xl shadow-xs transition"
            />
            
            {ocrLoading && (
              <div className="flex items-center gap-2 pt-1 text-xs text-blue-600 font-bold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบีบอัดภาพและให้ AI อ่านข้อมูล กรุณารอสักครู่...</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>เลขที่รับแจ้ง / Smart 1662</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="receivedNo" 
                  value={formData.receivedNo} 
                  onChange={handleChange} 
                  required
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold text-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm" 
                  placeholder="พิมพ์เลขที่รับแจ้ง..." 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>วัน-เวลารับแจ้ง (เวลาไทย)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="datetime-local" 
                  name="receivedAt" 
                  value={formData.receivedAt} 
                  onChange={handleChange} 
                  required
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>ชื่อผู้แจ้ง</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="reporterName" 
                  value={formData.reporterName} 
                  onChange={handleChange} 
                  required
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm" 
                  placeholder="ชื่อ-นามสกุล ผู้แจ้ง"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>เบอร์โทรศัพท์</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  required
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm" 
                  placeholder="เบอร์โทรติดต่อ"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>บริเวณที่เกิดเหตุ / สถานที่</span>
                <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                name="location" 
                value={formData.location} 
                onChange={handleChange} 
                required
                className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm" 
                placeholder="ระบุสถานที่ บ้านเลขที่ ถนน ซอย" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>หัวข้อปัญหา</span>
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  name="complaintTopic"
                  value={formData.complaintTopic}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm cursor-pointer"
                >
                  <option value="ท่อแตกรั่ว">ท่อแตกรั่ว</option>
                  <option value="น้ำไม่ไหล/น้ำไหลอ่อน">น้ำไม่ไหล/น้ำไหลอ่อน</option>
                  <option value="มาตรวัดน้ำชำรุด">มาตรวัดน้ำชำรุด</option>
                  <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>ระดับความเร่งด่วน</span>
                </label>
                <select
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm cursor-pointer"
                >
                  <option value="ปกติ" className="text-slate-700 font-medium">ปกติ</option>
                  <option value="ด่วน" className="text-amber-600 font-bold">ด่วน</option>
                  <option value="ด่วนมาก" className="text-rose-600 font-bold">ด่วนมาก</option>
                </select>
              </div>
            </div>

            {formData.complaintTopic === 'อื่นๆ' && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ระบุหัวข้อปัญหาเพิ่มเติม *</label>
                <input 
                  type="text" 
                  name="customComplaintTopic" 
                  value={formData.customComplaintTopic} 
                  onChange={handleChange} 
                  required
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm" 
                  placeholder="ระบุลักษณะปัญหา..."
                />
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs cursor-pointer transition"
              >
                ยกเลิก
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {loading ? 'กำลังบันทึก...' : 'บันทึกใบแจ้งซ่อม'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
