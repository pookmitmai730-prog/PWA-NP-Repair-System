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

  // กำหนดค่าเริ่มต้นของฟอร์ม
  const [formData, setFormData] = useState({
    id: 'JOB-' + Date.now().toString().slice(-6),
    receivedNo: '',
    receivedAt: getThaiNowForInput(),
    channel: 'รับแจ้งทางโทรศัพท์',
    complaintType: 'ท่อแตก/รั่ว',
    complainantInfo: '',
    complaintTopic: 'แจ้งท่อประปาชำรุด',
    details: '',
    location: '',
    receiverName: '',
    reporterName: '',
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
            channel: data.channel || prev.channel,
            complaintType: data.complaintType || prev.complaintType,
            complainantInfo: data.complainantInfo || prev.complainantInfo,
            complaintTopic: data.complaintTopic || prev.complaintTopic,
            details: data.details || prev.details,
            location: data.location || prev.location,
            receiverName: data.receiverName || prev.receiverName,
            reporterName: data.reporterName || prev.reporterName,
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

    const formattedData = {
      ...formData,
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
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 my-8 border border-slate-200">
        
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

        {/* ฟอร์มกรอกข้อมูล */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่รับแจ้ง</label>
              <input 
                type="text" 
                name="receivedNo" 
                value={formData.receivedNo} 
                onChange={handleChange} 
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-mono font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 shadow-xs" 
                placeholder="เช่น S67-00123" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">วัน-เวลาที่รับแจ้ง</label>
              <input 
                type="datetime-local" 
                name="receivedAt" 
                value={formData.receivedAt} 
                onChange={handleChange} 
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ช่องทางการรับแจ้ง</label>
              <input 
                type="text" 
                name="channel" 
                value={formData.channel} 
                onChange={handleChange} 
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทการร้องเรียน</label>
              <input 
                type="text" 
                name="complaintType" 
                value={formData.complaintType} 
                onChange={handleChange} 
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">บริเวณที่เกิดเหตุ</label>
            <input 
              type="text" 
              name="location" 
              value={formData.location} 
              onChange={handleChange} 
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
              placeholder="ระบุสถานที่ บ้านเลขที่ ถนน ซอย" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">รายละเอียดการรับแจ้ง</label>
            <textarea 
              name="details" 
              rows="3" 
              value={formData.details} 
              onChange={handleChange} 
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
              placeholder="รายละเอียดเพิ่มเติมของปัญหา"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้แจ้ง</label>
              <input 
                type="text" 
                name="reporterName" 
                value={formData.reporterName} 
                onChange={handleChange} 
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ข้อมูลผู้ร้องเรียน / เบอร์โทร</label>
              <input 
                type="text" 
                name="complainantInfo" 
                value={formData.complainantInfo} 
                onChange={handleChange} 
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ผู้รับแจ้ง</label>
              <input 
                type="text" 
                name="receiverName" 
                value={formData.receiverName} 
                onChange={handleChange} 
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs" 
              />
            </div>
          </div>

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
