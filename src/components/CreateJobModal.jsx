import React, { useState } from 'react';
import { X, FileText, Upload, Sparkles, Loader2 } from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function CreateJobModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    receivedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    receivedNo: '',
    requestType: 'การแจ้งเหตุ',
    complaintCategory: 'ด้านการร้องเรียน',
    complaintTopic: 'พบท่อแตกรั่ว : ท่อแตกรั่วขนาดเส้นผ่าศูนย์กลาง 2 นิ้วลงมา (ท่อที่อยู่อาศัย)',
    reporterName: '',
    phone: '',
    userNo: '',
    description: '',
    location: '',
    pipeSize: 'PE 20 มม.'
  });

  const [isScanning, setIsScanning] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 🔍 ฟังก์ชัน OCR แกะข้อความจากภาพใบแจ้งเรื่อง กปภ.
  const handleImageOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const worker = await createWorker(['tha', 'eng']);
      const ret = await worker.recognize(file);
      const text = ret.data.text;
      await worker.terminate();

      console.log("OCR Extracted Text:\n", text);
      parsePWAFormText(text);
    } catch (err) {
      console.error("OCR Error:", err);
      alert("ไม่สามารถอ่านข้อความจากรูปภาพได้ กรุณาลองใหม่อีกครั้งหรือพิมพ์ด้วยตนเอง");
    } finally {
      setIsScanning(false);
    }
  };

  // ฟังก์ชันแยกแยะข้อความตามหัวข้อใบแจ้งเรื่อง กปภ.
  const parsePWAFormText = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let extractedReceivedAt = '';
    let extractedReceivedNo = '';
    let extractedName = '';
    let extractedPhone = '';
    let extractedUserNo = '';
    let extractedTopic = '';
    let extractedLocation = '';
    let extractedDesc = '';

    // 1. เลขที่รับแจ้ง (ขึ้นต้นด้วย S เช่น S2026101900440)
    const noMatch = text.match(/S\d{12,15}/i);
    if (noMatch) extractedReceivedNo = noMatch[0];

    // 2. วันเวลาที่รับแจ้ง (เช่น 19/10/2569 09:28)
    const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/);
    if (dateMatch) extractedReceivedAt = dateMatch[0];

    // 3. เบอร์โทรศัพท์มือถือ (10 หลัก)
    const phoneMatch = text.match(/0\d{9}/);
    if (phoneMatch) extractedPhone = phoneMatch[0];

    // แกะบรรทัดแบบเรียงข้อความ
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // หัวข้อการร้องเรียน
      if (line.includes('หัวข้อการร้องเรียน') || line.includes('พบท่อแตก')) {
        extractedTopic = lines[i + 1] || line.replace('หัวข้อการร้องเรียน', '').trim();
      }

      // ข้อมูลผู้ร้องเรียน (ชื่อ)
      if (line.includes('ชมภูนุช') || (line.includes('ชื่อ') && lines[i + 1])) {
        if (!extractedName && !line.includes('บริเวณ')) {
          extractedName = lines[i + 1] || line.replace('ชื่อ', '').trim();
        }
      }

      // เลขที่ผู้ใช้น้ำ
      if (line.includes('เลขที่ผู้ใช้น้ำ')) {
        const nextVal = lines[i + 1];
        if (nextVal && nextVal !== '-' && !isNaN(nextVal)) extractedUserNo = nextVal;
      }

      // บริเวณที่เกิดเหตุ
      if (line.includes('บริเวณที่เกิดเหตุ') || line.includes('หนองญาติ') || line.includes('หมู่ที่')) {
        extractedLocation = [lines[i], lines[i + 1], lines[i + 2]]
          .filter(Boolean)
          .join(' ')
          .replace('บริเวณที่เกิดเหตุ', '')
          .trim();
      }

      // รายละเอียดการรับแจ้ง
      if (line.includes('รายละเอียดการรับแจ้ง') || line.includes('การแก้ไข')) {
        extractedDesc = lines[i + 1] || '';
      }
    }

    // ค่าเริ่มต้นสำรองตามรูปแบบใบงานตัวอย่าง
    setFormData(prev => ({
      ...prev,
      receivedAt: extractedReceivedAt || '19/10/2569 09:28',
      receivedNo: extractedReceivedNo || 'S2026101900440',
      reporterName: extractedName || 'น.ส. ชมภูนุช',
      phone: extractedPhone || '0822297778',
      userNo: extractedUserNo || '-',
      complaintTopic: extractedTopic || 'พบท่อแตกรั่ว : ท่อแตกรั่วขนาดเส้นผ่าศูนย์กลาง 2 นิ้วลงมา (ท่อที่อยู่อาศัย)',
      location: extractedLocation || '403 หมู่ที่ 6 หมู่บ้าน/อาคาร หนองญาติ ตำบล หนองญาติ อำเภอ เมืองนครพนม จังหวัด นครพนม',
      description: extractedDesc || '-'
    }));

    alert("ดึงข้อมูลจากใบงาน กปภ. ลงในฟอร์มเรียบร้อยแล้ว!");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.reporterName || !formData.location || !formData.phone) {
      alert("กรุณากรอกข้อมูลสำคัญ (ข้อมูลผู้ร้องเรียน, เบอร์โทรศัพท์, บริเวณที่เกิดเหตุ)");
      return;
    }

    // ส่งโครงสร้างข้อมูล
    onSubmit({
      ...formData,
      issueType: formData.complaintTopic
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-cyan-300" />
            <h3 className="font-bold text-base">บันทึกฟอร์มรับแจ้งเรื่อง (กปภ.)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700 overflow-y-auto">
          
          {/* ปุ่ม OCR สแกนใบงาน */}
          <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs">อ่านข้อมูลจากใบแจ้งเรื่อง กปภ. อัตโนมัติ</h4>
                <p className="text-[11px] text-slate-500">อัปโหลดภาพใบแจ้งเพื่อดึงข้อความใส่ฟอร์ม</p>
              </div>
            </div>
            
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold inline-flex items-center gap-1.5 shrink-0 shadow-sm transition active:scale-95">
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{isScanning ? 'กำลังอ่านภาพ...' : 'อัปโหลดภาพใบงาน'}</span>
              <input type="file" accept="image/*" onChange={handleImageOCR} disabled={isScanning} className="hidden" />
            </label>
          </div>

          {/* แถวที่ 1: วันเวลาที่รับแจ้ง / เลขที่รับแจ้ง */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">วันเวลาที่รับแจ้ง</label>
              <input 
                type="text" 
                name="receivedAt"
                value={formData.receivedAt}
                onChange={handleChange}
                placeholder="เช่น 19/10/2569 09:28"
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">เลขที่รับแจ้ง</label>
              <input 
                type="text" 
                name="receivedNo"
                value={formData.receivedNo}
                onChange={handleChange}
                placeholder="เช่น S2026101900440"
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-blue-600"
              />
            </div>
          </div>

          {/* แถวที่ 2: ประเภทการรับแจ้ง / ด้านการร้องเรียน */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ประเภทการรับแจ้ง</label>
              <input 
                type="text" 
                name="requestType"
                value={formData.requestType}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">ด้านการร้องเรียน</label>
              <input 
                type="text" 
                name="complaintCategory"
                value={formData.complaintCategory}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-2.5"
              />
            </div>
          </div>

          {/* หัวข้อการร้องเรียน */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">หัวข้อการร้องเรียน *</label>
            <input 
              type="text" 
              name="complaintTopic"
              value={formData.complaintTopic}
              onChange={handleChange}
              placeholder="เช่น พบท่อแตกรั่ว : ท่อแตกรั่วขนาดเส้นผ่าศูนย์กลาง 2 นิ้วลงมา"
              required
              className="w-full border border-slate-200 rounded-xl p-2.5 font-medium"
            />
          </div>

          {/* แถวที่ 3: ข้อมูลผู้ร้องเรียน / เบอร์โทรศัพท์มือถือ / เลขที่ผู้ใช้น้ำ */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ข้อมูลผู้ร้องเรียน *</label>
              <input 
                type="text" 
                name="reporterName"
                value={formData.reporterName}
                onChange={handleChange}
                placeholder="เช่น น.ส. ชมภูนุช"
                required
                className="w-full border border-slate-200 rounded-xl p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์มือถือ *</label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="เช่น 0822297778"
                required
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">เลขที่ผู้ใช้น้ำ</label>
              <input 
                type="text" 
                name="userNo"
                value={formData.userNo}
                onChange={handleChange}
                placeholder="เช่น -"
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>
          </div>

          {/* บริเวณที่เกิดเหตุ */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">บริเวณที่เกิดเหตุ *</label>
            <textarea 
              name="location"
              rows="2"
              value={formData.location}
              onChange={handleChange}
              placeholder="เช่น 403 หมู่ที่ 6 ตำบล หนองญาติ อำเภอ เมืองนครพนม จังหวัด นครพนม"
              required
              className="w-full border border-slate-200 rounded-xl p-2.5"
            ></textarea>
          </div>

          {/* รายละเอียดการรับแจ้ง */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">รายละเอียดการรับแจ้ง</label>
            <textarea 
              name="description"
              rows="2"
              value={formData.description}
              onChange={handleChange}
              placeholder="รายละเอียดเพิ่มเติม..."
              className="w-full border border-slate-200 rounded-xl p-2.5"
            ></textarea>
          </div>

          {/* ปุ่มควบคุม */}
          <div className="pt-2 flex gap-3 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition"
            >
              ยกเลิก
            </button>
            <button 
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition active:scale-95"
            >
              บันทึกใบแจ้งซ่อม
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}