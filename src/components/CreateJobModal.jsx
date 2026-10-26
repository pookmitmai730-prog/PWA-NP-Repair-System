import React, { useState } from 'react';
import { saveJobToFirebase } from '../services/firebase';
import { X, Sparkles, AlertCircle, FileText, Loader2 } from 'lucide-react';

export default function CreateJobModal({ isOpen, onClose, onJobCreated }) {
  if (!isOpen) return null;

  // 🕒 ฟังก์ชันดึง วัน-เวลา ปัจจุบันตามเขตเวลาประเทศไทย (GMT+7) สำหรับ type="datetime-local"
  const getThaiNowForInput = () => {
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return thaiTime.toISOString().slice(0, 16); // รูปแบบ YYYY-MM-DDTHH:mm
  };

  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState(null);

  // กำหนดค่าเริ่มต้นของฟอร์มให้ตรงกับฟิลด์ที่ต้องการ
  const [formData, setFormData] = useState({
    id: 'JOB-' + Date.now().toString().slice(-6),
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

  // ฟังก์ชันย่อขนาดภาพและส่ง OCR ไปที่ Vercel Serverless API
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
            throw new Error('ไม่พบ Serverless API (/api/ocr-vision) หรือกำลังรันในโหมด Local');
          }

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'ไม่สามารถประมวลผล OCR ได้');
          }

          const data = result.data;

          setFormData(prev => ({
            ...prev,
            receivedNo: data.receivedNo || prev.receivedNo,
            receivedAt: data.receivedAt ? data.receivedAt.replace(' ', 'T') : prev.receivedAt,
            reporterName: data.reporterName || prev.reporterName,
            phone: data.phone || data.complainantInfo || prev.phone,
            location: data.location || prev.location,
            complaintTopic: data.complaintTopic || prev.complaintTopic,
            urgency: data.urgency || prev.urgency,
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
    setLoading(true);
    setError(null);

    const finalTopic = formData.complaintTopic === 'อื่นๆ' 
      ? (formData.customComplaintTopic.trim() || 'อื่นๆ') 
      : formData.complaintTopic;

    const formattedData = {
      ...formData,
      complaintTopic: finalTopic,
      complaintType: finalTopic,
      receivedAt: formData.receivedAt ? formData.receivedAt.replace('T', ' ') : getThaiNowForInput().replace('T', ' ')
    };

    try {
      await saveJobToFirebase(formattedData);
      if (onJobCreated) onJobCreated(formattedData);
      onClose();
    } catch (err) {
      console.error('Firebase Save Error:', err);
      setError('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 my-8 border border-slate-200">
        
        {/* หัวข้อโมดัล */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">เพิ่มใบแจ้งซ่อมใหม่</h2>
              <p className="text-xs text-slate-400">บันทึกข้อมูลรับแจ้งปัญหาหรือใช้ AI OCR ช่วยกรอกอัตโนมัติ</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ส่วนอัปโหลดรูป AI OCR */}
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl space-y-2">
          <label className="block text-xs font-bold text-blue-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" /> อัปโหลดรูปภาพใบแจ้งซ่อม เพื่อให้ AI กรอกข้อมูลอัตโนมัติ
          </label>
          
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload}
            disabled={ocrLoading}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-white border border-blue-200 rounded-xl shadow-xs"
          />
          
          {ocrLoading && (
            <div className="flex items-center gap-2 pt-1 text-xs text-blue-600 font-bold animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังบีบอัดภาพและให้ AI อ่านข้อมูล กรุณารอสักครู่...</span>
            </div>
          )}
        </div>

        {/* แสดง Error ถ้ามี */}
        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ฟอร์มกรอกข้อมูลตามที่กำหนด */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่รับแจ้ง *</label>
              <input 
                type="text" 
                name="receivedNo" 
                value={formData.receivedNo} 
                onChange={handleChange} 
                required
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-mono font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 shadow-xs" 
                placeholder="เช่น S67-00123" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">วัน-เวลารับแจ้ง *</label>
              <input 
                type="datetime-local" 
                name="receivedAt" 
                value={formData.receivedAt} 
                onChange={handleChange} 
                required
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้แจ้ง</label>
              <input 
                type="text" 
                name="reporterName" 
                value={formData.reporterName} 
                onChange={handleChange} 
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
                placeholder="ชื่อ-นามสกุล ผู้แจ้ง"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
                placeholder="เบอร์โทรติดต่อ"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">บริเวณที่เกิดเหตุ / สถานที่ *</label>
            <input 
              type="text" 
              name="location" 
              value={formData.location} 
              onChange={handleChange} 
              required
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
              placeholder="ระบุสถานที่ บ้านเลขที่ ถนน ซอย" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">หัวข้อปัญหา *</label>
              <select
                name="complaintTopic"
                value={formData.complaintTopic}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                <option value="ท่อแตกรั่ว">ท่อแตกรั่ว</option>
                <option value="น้ำไม่ไหล/น้ำไหลอ่อน">น้ำไม่ไหล/น้ำไหลอ่อน</option>
                <option value="มาตรวัดน้ำชำรุด">มาตรวัดน้ำชำรุด</option>
                <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ระดับความเร่งด่วน</label>
              <select
                name="urgency"
                value={formData.urgency}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-bold text-amber-600 focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                <option value="ปกติ">ปกติ</option>
                <option value="ด่วน">ด่วน</option>
                <option value="ด่วนมาก">ด่วนมาก</option>
              </select>
            </div>
          </div>

          {formData.complaintTopic === 'อื่นๆ' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ระบุหัวข้อปัญหาเพิ่มเติม *</label>
              <input 
                type="text" 
                name="customComplaintTopic" 
                value={formData.customComplaintTopic} 
                onChange={handleChange} 
                required
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
                placeholder="ระบุลักษณะปัญหา..."
              />
            </div>
          )}

          <div className="flex justify-end space-x-2.5 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-bold text-xs cursor-pointer transition"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer transition flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'กำลังบันทึก...' : 'บันทึกใบแจ้งซ่อม'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
