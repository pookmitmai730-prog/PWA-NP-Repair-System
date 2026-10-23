import React, { useState } from 'react';
import { Search, Wrench, Lock, UserCheck, ArrowRight, Shield, Smartphone, Globe, KeyRound, User } from 'lucide-react';

export default function RolePortal({ onSelectRole, adminUsers, workerAccounts, onAdminLogin, onWorkerLogin }) {
  const [activeTab, setActiveTab] = useState('public'); // 'public', 'admin', 'worker'
  
  // State สำหรับฟอร์ม Login Admin (เพิ่ม adminUsername)
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // State สำหรับฟอร์ม Login ช่างภาคสนาม
  const [workerUsername, setWorkerUsername] = useState('');
  const [workerPassword, setWorkerPassword] = useState('');
  const [workerError, setWorkerError] = useState('');

  // จัดการ Login แอดมิน (ตรวจสอบทั้ง Username/Password จาก Firebase หรือ Default)
  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setAdminError('');

    // กรณีใช้ Default Admin (รหัส 1234 หรือระบุ username เป็น admin/root)
    const isDefaultAdmin = adminPassword === '1234' && (!adminUsername.trim() || adminUsername === 'admin' || adminUsername === 'root');
    
    // ตรวจสอบจากรายชื่อแอดมินที่บันทึกไว้ใน Firebase
    const foundAdmin = adminUsers.find(
      a => (a.username === adminUsername.trim() || a.name === adminUsername.trim()) && a.password === adminPassword
    );

    if (isDefaultAdmin || foundAdmin) {
      onAdminLogin();
    } else {
      setAdminError('ชื่อผู้ใช้หรือรหัสผ่านแอดมินไม่ถูกต้อง (รหัสตั้งต้น: 1234)');
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
      <div className="text-center space-y-2 mb-8">
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
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">
        
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
        <div className="p-6 sm:p-8">
          
          {/* 1. ส่วนประชาชนทั่วไป */}
          {activeTab === 'public' && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white">ตรวจสอบสถานะการแจ้งซ่อม</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  สำหรับประชาชนทั่วไปหรือผู้ใช้น้ำ สามารถเข้ามาตรวจสอบขั้นตอนการดำเนินงานซ่อมท่อประปาได้ทันทีโดยไม่ต้องเข้าสู่ระบบ
                </p>
              </div>

              <button
                onClick={() => onSelectRole('public')}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-95 cursor-pointer"
              >
                <span>เข้าสู่หน้าค้นหา Tracking (ไม่ต้อง Login)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
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
                <p className="text-xs text-slate-400">กรุณากรอก Username และ Password</p>
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
                      placeholder="เช่น admin (หรือเว้นว่างไว้สำหรับรหัสตั้งต้น)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">รหัสผ่าน (Password) *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="•••• (รหัสเริ่มต้น: 1234)"
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
                <ArrowRight className="w-4 h-4" />
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
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer mt-2"
              >
                <span>เข้าสู่ระบบหน้าช่างภาคสนาม</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Footer info */}
      <div className="mt-8 text-center text-[11px] text-slate-500 space-y-1">
        <p>พัฒนาโดย งานบริการและควบคุมน้ำสูญเสีย</p>
        <p className="font-mono">การประปาส่วนภูมิภาคสาขานครพนม v1.0</p>
      </div>

    </div>
  );
}
