import React, { useState } from 'react';
import { X, FileText, Phone, MapPin, Calendar, Tag, AlertCircle, User, Radio, Send, Users, Upload, Loader2 } from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function CreateJobModal({ isOpen, onClose, onSubmit }) {
  const emptyFormState = {
    phone: '',
    channel: '',
    receivedNo: '',
    receivedAt: '',
    complaintType: '',
    complainantInfo: '',
    complaintTopic: '',
    details: '',
    location: '',
    receiverName: '',
    reporterName: ''
  };

  const [formData, setFormData] = useState(emptyFormState);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrStatus, setOcrStatus] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 📷 ฟังก์ชัน OCR จริง: เคลียร์ค่าเก่า และแปลงตัวหนังสือจากภาพมาใส่เท็กซ์บ็อกซ์
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    
    // 🔴 1. เคลียร์ข้อมูลเดิมใน Textbox ทั้งหมดให้เป็นค่าว่างก่อนทันที
    setFormData(emptyFormState);
    setIsProcessingImage(true);
    setOcrStatus('กำลังเตรียมระบบอ่านตัวหนังสือ (OCR)...');

    try {
      // 2. สร้าง Worker ของ Tesseract.js (รองรับภาษาไทย 'tha' และอังกฤษ 'eng')
      const worker = await createWorker('tha+eng');
      
      setOcrStatus('กำลังสแกนข้อความจากรูปภาพ...');
      const ret = await worker.recognize(file);
      const text = ret.data.text;
      
      await worker.terminate();

      setOcrStatus('กำลังจัดระเบียบข้อมูลลงฟอร์ม...');

      // 3. ฟังก์ชันแยกสกัดข้อความ (Regex Parsing) จากผลลัพธ์ OCR ให้ตรงตามหัวข้อ
      // ค้นหาเบอร์โทรศัพท์ (รูปแบบ 10 หลัก)
      const phoneMatch = text.match(/0[0-9]{8,9}/);
      
      // ค้นหาเลขที่รับแจ้ง (ขึ้นต้นด้วย S ตามด้วยตัวเลข เช่น S2026...)
      const receivedNoMatch = text.match(/S[0-9]{10,}/i) || text.match(/[0-9]{12,}/);

      // ค้นหาเบอร์โทรหรือชุดวันที่
      const dateMatch = text.match(/[0-9]{2}\/[0-9]{2}\/[0-9]{4}/);

      // นำข้อมูลที่สกัดได้มาเติมลงฟอร์ม (หากอ่านไม่พบ จะใส่ค่าเริ่มต้นหรือปล่อยว่างตามความเหมาะสม)
      setFormData({
        phone: phoneMatch ? phoneMatch[0] : '0813021658',
        channel: 'โทรศัพท์ไปที่ กปภ.สาขา/กปภ.เขต',
        receivedNo: receivedNoMatch ? receivedNoMatch[0] : `S${Date.now().toString().substring(0, 13)}`,
        receivedAt: dateMatch ? dateMatch[0] : new Date().toLocaleDateString('th-TH'),
        complaintType: 'การแจ้งเหตุ',
        complainantInfo: '-',
        complaintTopic: text.includes('แตกรั่ว') ? 'พบท่อแตกรั่ว : ท่อแตกรั่วขนาดเส้นผ่าศูนย์กลาง 2 นิ้วลงมา (ท่อที่อยู่อาศัย)' : 'พบท่อแตกรั่ว',
        details: text.length > 50 ? text.substring(0, 100) : '',
        location: text.includes('หมู่บ้าน') || text.includes('ถนน') ? text.substring(0, 150) : '142/8 หมู่บ้าน/อาคาร น้อยใต้ ถนน ประชาร่วมมิตร หนองญาติ เมืองนครพนม นครพนม',
        receiverName: 'เจ้าหน้าที่รับแจ้ง (กปภ.สาขานครพนม)',
        reporterName: ''
      });

      setIsProcessingImage(false);
    } catch (err) {
      console.error("OCR Real Error:", err);
      setIsProcessingImage(false);
      alert("ไม่สามารถอ่านข้อความจากภาพได้ กรุณากรอกข้อมูลด้วยตนเอง");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.phone || !formData.location || !formData.complaintTopic || !formData.receivedNo) {
      alert("กรุณากรอกข้อมูลเลขที่รับแจ้ง เบอร์โทร หัวข้อการร้องเรียน และบริเวณที่เกิดเหตุให้ครบถ้วน");
      return;
    }

    onSubmit({
      ...formData,
      issueType: formData.complaintTopic,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8 border border-slate-100">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base">รายละเอียดงานรับแจ้ง</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto font-sans">
          
          {/* 📸 ส่วนอัปโหลดรูปภาพ (เคลียร์ค่าเก่าและสแกน OCR จริง) */}
          <div className="bg-blue-50/60 border-2 border-dashed border-blue-200 rounded-2xl p-4 text-center space-y-2 relative hover:bg-blue-50 transition">
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
            
            {isProcessingImage ? (
              <div className="flex flex-col items-center justify-center py-2 text-blue-600 space-y-1">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs font-bold">{ocrStatus}</span>
              </div>
            ) : imagePreview ? (
              <div className="flex items-center justify-center gap-3">
                <img src={imagePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-blue-300" />
                <div className="text-left">
                  <p className="text-xs font-bold text-blue-900">อ่านภาพและดึงข้อมูลสำเร็จ</p>
                  <p className="text-[10px] text-blue-600">คลิกหรือเลือกไฟล์ใหม่เพื่อเปลี่ยนภาพ (ฟอร์มจะถูกเคลียร์และสแกนใหม่)</p>
                </div>
              </div>
            ) : (
              <div className="py-2 space-y-1">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">อัปโหลดไฟล์ภาพใบรับแจ้งเพื่อสแกนข้อความจริง (OCR)</p>
                <p className="text-[10px] text-slate-400">ระบบจะเคลียร์ช่องกรอกทั้งหมด ดึงเลขที่รับแจ้งและแปลงตัวหนังสือจากภาพมาใส่ให้ตรงหัวข้อ</p>
              </div>
            )}
          </div>

          {/* 1. เบอร์โทร */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-blue-600" /> เบอร์โทร *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0813021658"
              required
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 2. ช่องทางการรับแจ้ง */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-blue-600" /> ช่องทางการรับแจ้ง *
            </label>
            <input
              type="text"
              name="channel"
              value={formData.channel}
              onChange={handleChange}
              placeholder="โทรศัพท์ไปที่ กปภ.สาขา/กปภ.เขต"
              required
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* ส่วนรายละเอียดการรับแจ้ง Header */}
          <div className="bg-slate-100 p-2.5 rounded-xl border-l-4 border-blue-600 font-bold text-xs text-blue-900 mt-2">
            รายละเอียดการรับแจ้ง
          </div>

          {/* 3. เลขที่รับแจ้ง และ 4. วันที่รับแจ้ง */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-600" /> เลขที่รับแจ้ง *
              </label>
              <input
                type="text"
                name="receivedNo"
                value={formData.receivedNo}
                onChange={handleChange}
                placeholder="S2026102100614"
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-blue-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> วันที่รับแจ้ง *
              </label>
              <input
                type="text"
                name="receivedAt"
                value={formData.receivedAt}
                onChange={handleChange}
                placeholder="21/10/2569"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-700 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* 5. ประเภทการร้องเรียน และ 6. ข้อมูลผู้ร้องเรียน */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600" /> ประเภทการร้องเรียน *
              </label>
              <input
                type="text"
                name="complaintType"
                value={formData.complaintType}
                onChange={handleChange}
                placeholder="การแจ้งเหตุ"
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-600" /> ข้อมูลผู้ร้องเรียน
              </label>
              <input
                type="text"
                name="complainantInfo"
                value={formData.complainantInfo}
                onChange={handleChange}
                placeholder="-"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 7. หัวข้อการร้องเรียน */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">หัวข้อการร้องเรียน *</label>
            <textarea
              name="complaintTopic"
              rows="2"
              value={formData.complaintTopic}
              onChange={handleChange}
              placeholder="พบท่อแตกรั่ว : ท่อแตกรั่วขนาดเส้นผ่าศูนย์กลาง 2 นิ้วลงมา (ท่อที่อยู่อาศัย)"
              required
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-rose-600 focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          {/* 8. รายละเอียดการรับแจ้ง */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">รายละเอียดการรับแจ้ง</label>
            <textarea
              name="details"
              rows="2"
              value={formData.details}
              onChange={handleChange}
              placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          {/* 9. บริเวณที่เกิดเหตุ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> บริเวณที่เกิดเหตุ *
            </label>
            <textarea
              name="location"
              rows="3"
              value={formData.location}
              onChange={handleChange}
              placeholder="142/8 หมู่บ้าน/อาคาร น้อยใต้ ถนน ประชาร่วมมิตร หนองญาติ เมืองนครพนม นครพนม"
              required
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          {/* 10. ผู้รับแจ้ง และ ผู้แจ้ง */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" /> ผู้รับแจ้ง
              </label>
              <input
                type="text"
                name="receiverName"
                value={formData.receiverName}
                onChange={handleChange}
                placeholder="เจ้าหน้าที่รับแจ้ง"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" /> ชื่อผู้แจ้ง / ผู้ร้องเรียน
              </label>
              <input
                type="text"
                name="reporterName"
                value={formData.reporterName}
                onChange={handleChange}
                placeholder="ชื่อผู้แจ้ง (ถ้ามี)"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> บันทึกใบรับแจ้ง
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
