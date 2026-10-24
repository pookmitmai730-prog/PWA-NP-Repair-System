import React, { useState } from 'react';
import { saveJobToFirebase } from '../services/firebase';

export default function CreateJobModal({ isOpen, onClose, onJobCreated }) {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    id: 'JOB-' + Date.now().toString().slice(-6),
    receivedNo: '',
    receivedAt: new Date().toISOString().split('T')[0],
    channel: 'รับแจ้งทางโทรศัพท์',
    complaintType: 'ท่อแตก/รั่ว',
    complainantInfo: '',
    complaintTopic: 'แจ้งท่อประปาชำรุด',
    details: '',
    location: '',
    receiverName: '',
    reporterName: '',
    status: 'รอดำเนินการ'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ฟังก์ชันย่อขนาดภาพและส่ง OCR
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
        const maxDim = 1024; // จำกัดขนาดไม่เกิน 1024px เพื่อลด Payload size

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

        // แปลงเป็น JPEG คุณภาพ 0.7 (ขนาดไฟล์จะลดลงเหลือหลักร้อย KB ปลอดภัย 100%)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

        try {
          const response = await fetch('/api/ocr-vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: compressedBase64 }),
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'ไม่สามารถประมวลผล OCR ได้');
          }

          const data = result.data;

          setFormData(prev => ({
            ...prev,
            receivedNo: data.receivedNo || prev.receivedNo,
            receivedAt: data.receivedAt || prev.receivedAt,
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

    try {
      await saveJobToFirebase(formData);
      if (onJobCreated) onJobCreated(formData);
      onClose();
    } catch (err) {
      console.error('Firebase Save Error:', err);
      setError('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">เพิ่มใบแจ้งซ่อมใหม่ (ด้วยระบบ AI OCR)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-sm font-medium text-blue-900 mb-2">
            📸 อัปโหลดรูปภาพใบแจ้งซ่อม เพื่อให้ AI กรอกข้อมูลอัตโนมัติ:
          </label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload}
            disabled={ocrLoading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
          />
          {ocrLoading && (
            <p className="mt-2 text-sm text-blue-600 font-medium animate-pulse">
              ⏳ กำลังบีบอัดภาพและให้ AI อ่านข้อมูล กรุณารอสักครู่...
            </p>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">เลขที่รับแจ้ง</label>
              <input type="text" name="receivedNo" value={formData.receivedNo} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">วันที่รับแจ้ง</label>
              <input type="date" name="receivedAt" value={formData.receivedAt} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ช่องทางการรับแจ้ง</label>
              <input type="text" name="channel" value={formData.channel} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ประเภทการร้องเรียน</label>
              <input type="text" name="complaintType" value={formData.complaintType} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">บริเวณที่เกิดเหตุ</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">รายละเอียดการรับแจ้ง</label>
            <textarea name="details" rows="3" value={formData.details} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ชื่อผู้แจ้ง</label>
              <input type="text" name="reporterName" value={formData.reporterName} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ข้อมูลผู้ร้องเรียน / เบอร์โทร</label>
              <input type="text" name="complainantInfo" value={formData.complainantInfo} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ผู้รับแจ้ง</label>
              <input type="text" name="receiverName" value={formData.receiverName} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium">ยกเลิก</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50">
              {loading ? 'กำลังบันทึก...' : 'บันทึกใบแจ้งซ่อม'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}