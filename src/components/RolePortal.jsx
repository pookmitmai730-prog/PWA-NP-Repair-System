import React, { useState } from 'react';
import { Wrench, Lock, UserCheck, Shield, Smartphone, Globe, KeyRound, User, PlusCircle, X, MapPin, Phone, AlertTriangle, Send, Loader2, Camera, Navigation } from 'lucide-react';
import TrackingSearch from './TrackingSearch';
import { compressImage } from '../utils/imageCompressor';
import { saveJobToFirebase } from '../services/firebase';

// 🌐 URL ของ Google Apps Script Web App (สำหรับบันทึกและยิง Telegram)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzLRYvfkGZPfhOffS-9aPjmPh1pHJClIWGh-OkPQRVSJHDz3i27OOmPtvSYEH1IcJnZTA/exec";

export default function RolePortal({ 
  adminUsers = [], 
  workerAccounts = [], 
  onAdminLogin, 
  onWorkerLogin,
  jobs = [],
  onJobCreated
}) {
  const [activeTab, setActiveTab] = useState('public'); // 'public', 'admin', 'worker'
  
  // State สำหรับเปิด/ปิด Modal ฟอร์มแจ้งท่อแตกรั่วสำหรับประชาชน
  const [isPublicFormOpen, setIsPublicFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicFormImages, setPublicFormImages] = useState([]);

  // State สำหรับฟอร์มแจ้งซ่อมของประชาชนทั่วไป
  const [publicData, setPublicData] = useState({
    receivedNo: '',
    reporterName: '',
    phone: '',
    location: '',
    complaintTopicType: 'ท่อแตกรั่ว',
    customComplaintTopic: '',
    urgency: 'ปกติ',
    description: ''
  });

  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // State สำหรับฟอร์ม Login Admin
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // State สำหรับฟอร์ม Login ช่างภาคสนาม
  const [workerUsername, setWorkerUsername] = useState('');
  const [workerPassword, setWorkerPassword] = useState('');
  const [workerError, setWorkerError] = useState('');

  // 🕒 ฟังก์ชันสร้างเลขที่รับแจ้งอัตโนมัติสำหรับ ปชช.
  const generatePublicReceivedNo = () => {
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
    const yy = String(thaiTime.getFullYear()).slice(-2);
    const mm = String(thaiTime.getMonth() + 1).padStart(2, '0');
    const dd = String(thaiTime.getDate()).padStart(2, '0');
    const hh = String(thaiTime.getHours()).padStart(2, '0');
    const min = String(thaiTime.getMinutes()).padStart(2, '0');
    const dateCode = `${yy}${mm}${dd}-${hh}${min}`;

    const runningNo = String((jobs ? jobs.length : 0) + 1).padStart(2, '0');
    return `PWA-${dateCode}-${runningNo}`;
  };

  const handleOpenPublicForm = () => {
    setPublicData({
      receivedNo: generatePublicReceivedNo(),
      reporterName: '',
      phone: '',
      location: '',
      complaintTopicType: 'ท่อแตกรั่ว',
      customComplaintTopic: '',
      urgency: 'ปกติ',
      description: ''
    });
    setPublicFormImages([]);
    setCoords({ lat: null, lng: null });
    setIsPublicFormOpen(true);
  };

  const handlePublicImagesChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const compressedList = [];
      for (let i = 0; i < files.length; i++) {
        const compressedBase64 = await compressImage(files[i], 1024, 0.7);
        compressedList.push(compressedBase64);
      }
      setPublicFormImages(prev => [...prev, ...compressedList]);
    } catch (err) {
      console.error("Image compression error:", err);
      alert("เกิดข้อผิดพลาดในการโหลดรูปภาพ");
    }
  };

  const handleRemovePublicImage = (index) => {
    setPublicFormImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง GPS");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        });
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("ไม่สามารถดึงพิกัดได้ (กรุณาอนุญาตการเข้าถึงตำแหน่ง GPS)");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 🚀 ส่งข้อมูลแจ้งซ่อมจากประชาชนทั่วไป
  const handlePublicSubmit = async (e) => {
    e.preventDefault();
    if (!publicData.location.trim()) {
      alert("กรุณาระบุสถานที่เกิดเหตุ");
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const currentDateTime = thaiTime.toISOString().replace('T', ' ').substring(0, 16);

    const finalComplaintTopic = publicData.complaintTopicType === 'อื่นๆ' 
      ? (publicData.customComplaintTopic.trim() || 'อื่นๆ') 
      : publicData.complaintTopicType;

    const newPublicJob = {
      id: 'JOB-' + Date.now().toString().slice(-6),
      receivedNo: publicData.receivedNo,
      receivedAt: currentDateTime,
      timestamp: currentDateTime,
      channel: 'แจ้งผ่านระบบเว็บไซต์ประชาชน',
      complaintType: finalComplaintTopic,
      complainantInfo: publicData.phone || '-',
      complaintTopic: finalComplaintTopic,
      description: publicData.description || 'แจ้งซ่อมโดยประชาชนทั่วไปผ่านเว็บไซต์',
      location: publicData.location,
      reporterName: publicData.reporterName.trim() || 'ประชาชนทั่วไป',
      phone: publicData.phone.trim() || '-',
      receiverName: 'ระบบรับแจ้งอัตโนมัติ',
      status: 'PENDING',
      urgency: publicData.urgency,
      technician: '-',
      techName: '-',
      techPhone: '-',
      latitude: coords.lat || '',
      longitude: coords.lng || '',
      beforeImgBase64: publicFormImages.length > 0 ? publicFormImages[0] : ''
    };

    try {
      // 1. บันทึกลง Firebase
      await saveJobToFirebase(newPublicJob);
      if (onJobCreated) onJobCreated(newPublicJob);

      // 2. ส่งข้อมูลไป Apps Script เพื่อเก็บบันทึกลง Sheets และยิงแจ้งเตือน Telegram (ถ้าต้องการ)
      try {
        const payload = {
          action: "archive_job", // หรือจะส่งไปเก็บบันทึก
          jobData: newPublicJob
        };
        await fetch(WEB_APP_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
      } catch (netErr) {
        console.error("Network notice:", netErr);
      }

      alert(`แจ้งซ่อมสำเร็จ! เลขที่รับแจ้งของคุณคือ: ${publicData.receivedNo}\n(กรุณาจดเลขที่รับแจ้งไว้สำหรับตรวจสอบสถานะ)`);
      setIsPublicFormOpen(false);
    } catch (err) {
      console.error("Error saving public job:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  // จัดการ Login แอดมิน
  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setAdminError('');

    const foundAdmin = adminUsers.find(
      a => a.username === adminUsername.trim() && a.password === adminPassword
    );

    if (foundAdmin) {
      onAdminLogin();
    } else {
      setAdminError('ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง');
    }
  };

  // จัดการ Login ช่างภาคสนาม
  const handleWorkerSubmit = (e) => {
    e.preventDefault();
    setWorkerError('');

    const foundWorker = workerAccounts.find(
      w => w.username === workerUsername.trim() && w.password === workerPassword
    );

    if (foundWorker) {
      onWorkerLogin(foundWorker.teamName);
    } else {
      setWorkerError('ชื่อผู้ใช้หรือรหัสผ่านช่างภาคสนามไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      
      {/* Header Logo & Title */}
      <div className="text-center space-y-2 mb-6">
        <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/40 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/10 backdrop-blur-md">
          <Wrench className="w-8 h-8 text-cyan-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          PWA Nakhon Phanom Repair System
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          ระบบจัดการและติดตามงานซ่อมท่อประปา การประปาส่วนภูมิภาคสาขานครพนม
        </p>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-xl bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">
        
        {/* Navigation Tabs (เลือกส่วนใช้งาน) */}
        <div className="grid grid-cols-3 bg-slate-950/60 p-1.5 border-b border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('public')}
            className={`py-3 rounded-2xl transition flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === 'public' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>ประชาชนทั่วไป</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`py-3 rounded-2xl transition flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === 'admin' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>ส่วน Admin</span>
          </button>

          <button
            onClick={() => setActiveTab('worker')}
            className={`py-3 rounded-2xl transition flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === 'worker' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>เจ้าหน้าที่ช่าง</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 space-y-6">
          
          {/* 1. ส่วนประชาชนทั่วไป: ค้นหา Tracking และปุ่มแจ้งท่อแตกรั่ว */}
          {activeTab === 'public' && (
            <div className="space-y-6">
              {/* ปุ่มแจ้งท่อแตกรั่ว */}
              <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 p-5 rounded-3xl text-center space-y-3">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">พบปัญหาท่อแตกรั่ว / น้ำไม่ไหล?</h3>
                  <p className="text-xs text-slate-300 mt-0.5">แจ้งเรื่องเข้ามาเพื่อให้เจ้าหน้าที่ตรวจสอบและดำเนินการแก้ไขได้ทันที</p>
                </div>
                <button
                  onClick={handleOpenPublicForm}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>แจ้งท่อแตกรั่ว / ส่งเรื่องร้องเรียน</span>
                </button>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <div className="text-center space-y-1 mb-3">
                  <h3 className="font-bold text-sm text-white">ตรวจสอบสถานะการแจ้งซ่อม</h3>
                  <p className="text-xs text-slate-400">
                    กรอกเลขที่ใบรับแจ้ง เบอร์โทรศัพท์ หรือชื่อผู้แจ้ง เพื่อค้นหาติดตามสถานะได้ทันที
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <TrackingSearch jobs={jobs} />
                </div>
              </div>
            </div>
          )}

          {/* 2. ส่วนของ Admin */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="text-center space-y-1 mb-4">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white">เข้าสู่ระบบผู้ดูแลระบบ (Admin)</h3>
                <p className="text-xs text-slate-400">กรุณาใช้ Username และ Password ที่กำหนดไว้ในระบบ</p>
              </div>

              {adminError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs text-center font-medium">
                  {adminError}
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">ชื่อผู้ใช้งาน (Username)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="กรอกชื่อผู้ใช้งานแอดมิน"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">รหัสผ่าน (Password)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่าน"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer mt-2"
              >
                <span>เข้าสู่ระบบ Admin Dashboard</span>
              </button>
            </form>
          )}

          {/* 3. ส่วนเจ้าหน้าที่ภาคสนาม */}
          {activeTab === 'worker' && (
            <form onSubmit={handleWorkerSubmit} className="space-y-4">
              <div className="text-center space-y-1 mb-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white">เข้าสู่ระบบเจ้าหน้าที่ภาคสนาม</h3>
                <p className="text-xs text-slate-400">กรุณาใช้ Username และ Password ที่กำหนดจากระบบ</p>
              </div>

              {workerError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs text-center font-medium">
                  {workerError}
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">ชื่อผู้ใช้งาน (Username)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={workerUsername}
                      onChange={(e) => setWorkerUsername(e.target.value)}
                      placeholder="เช่น team1"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">รหัสผ่าน (Password)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={workerPassword}
                      onChange={(e) => setWorkerPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
              >
                <span>เข้าสู่ระบบหน้าช่างภาคสนาม</span>
              </button>
            </form>
          )}

        </div>
      </div>

      {/* 🔴 Modal ฟอร์มแจ้งท่อแตกรั่วสำหรับประชาชนทั่วไป */}
      {isPublicFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-500" />
                แบบฟอร์มแจ้งท่อแตกรั่ว / ร้องเรียน
              </h4>
              <button onClick={() => setIsPublicFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublicSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">เลขที่รับแจ้ง (รหัสอ้างอิงอัตโนมัติ) *</label>
                <input 
                  type="text"
                  value={publicData.receivedNo}
                  disabled
                  className="w-full border border-slate-800 rounded-xl p-2.5 text-xs font-mono font-bold text-cyan-400 bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ชื่อผู้แจ้ง *</label>
                  <input 
                    type="text"
                    value={publicData.reporterName}
                    onChange={(e) => setPublicData(prev => ({ ...prev, reporterName: e.target.value }))}
                    placeholder="กรอกชื่อ-นามสกุลของคุณ"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                  <input 
                    type="text"
                    value={publicData.phone}
                    onChange={(e) => setPublicData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="เช่น 0812345678"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">สถานที่เกิดเหตุ / จุดสังเกตชัดเจน *</label>
                <textarea 
                  rows="2"
                  value={publicData.location}
                  onChange={(e) => setPublicData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="เช่น ซอย 3 ถนนสุนทรราชกิจ ใกล้ร้านค้า..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">หัวข้อปัญหา *</label>
                <select
                  value={publicData.complaintTopicType}
                  onChange={(e) => setPublicData(prev => ({ ...prev, complaintTopicType: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ท่อแตกรั่ว">ท่อแตกรั่ว</option>
                  <option value="น้ำไม่ไหล/น้ำไหลอ่อน">น้ำไม่ไหล/น้ำไหลอ่อน</option>
                  <option value="อื่นๆ">อื่นๆ (ระบุเพิ่มเติม)</option>
                </select>
              </div>

              {publicData.complaintTopicType === 'อื่นๆ' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ระบุหัวข้อปัญหาเพิ่มเติม *</label>
                  <input 
                    type="text"
                    value={publicData.customComplaintTopic}
                    onChange={(e) => setPublicData(prev => ({ ...prev, customComplaintTopic: e.target.value }))}
                    placeholder="ระบุปัญหา..."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ระดับความเร่งด่วน *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ปกติ', label: 'ปกติ', activeClass: 'bg-slate-700 text-white border-slate-700' },
                    { id: 'ด่วน', label: 'ด่วน', activeClass: 'bg-amber-500 text-white border-amber-500' },
                    { id: 'ด่วนมาก', label: 'ด่วนมาก', activeClass: 'bg-rose-600 text-white border-rose-600 animate-pulse' }
                  ].map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setPublicData(prev => ({ ...prev, urgency: level.id }))}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        publicData.urgency === level.id 
                          ? level.activeClass 
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">รายละเอียดเพิ่มเติม (ถ้ามี)</label>
                <textarea 
                  rows="2"
                  value={publicData.description}
                  onChange={(e) => setPublicData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="ลักษณะน้ำรั่วไหล หรือข้อมูลเพิ่มเติม..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 📸 แนบรูปถ่ายหน้างาน */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-300">แนบรูปถ่ายจุดเกิดเหตุ (ถ้ามี)</label>
                  <label className="bg-slate-800 hover:bg-slate-700 text-cyan-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition">
                    <Camera className="w-3.5 h-3.5" /> เลือกรูปภาพ
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePublicImagesChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {publicFormImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {publicFormImages.map((imgUrl, index) => (
                      <div key={index} className="relative group rounded-xl overflow-hidden border border-slate-800 aspect-square bg-slate-950">
                        <img src={imgUrl} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePublicImage(index)}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 📍 พิกัด GPS */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-blue-400" /> พิกัดจุดเกิดเหตุ (GPS)
                  </span>
                  <button
                    type="button"
                    onClick={handleGetGPS}
                    disabled={isGettingLocation}
                    className="bg-slate-800 hover:bg-slate-700 text-blue-400 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    {isGettingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3 text-rose-500" />}
                    {coords.lat ? 'ดึงพิกัดใหม่' : 'กดดึงพิกัดปัจจุบัน'}
                  </button>
                </div>

                {coords.lat && (
                  <p className="text-[11px] font-mono font-semibold text-slate-300 bg-slate-900 p-2 rounded-xl border border-slate-800">
                    📍 Lat: {coords.lat}, Lng: {coords.lng}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPublicFormOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-3 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังส่งเรื่อง...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ยืนยันส่งเรื่องแจ้งซ่อม</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="mt-6 text-center text-[11px] text-slate-500 space-y-1">
        <p>พัฒนาโดย งานบริการและควบคุมน้ำสูญเสีย โทรศัพท์ 042-511409</p>
        <p className="font-mono">การประปาส่วนภูมิภาคสาขานครพนม v1.0</p>
      </div>

    </div>
  );
}
