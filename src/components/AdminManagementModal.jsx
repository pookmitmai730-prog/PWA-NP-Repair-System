import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Smartphone, 
  Trash2, 
  Edit2, 
  X, 
  KeyRound, 
  UserCheck, 
  Phone,
  Briefcase,
  FileText,
  UserPlus,
  Loader2
} from 'lucide-react';

export default function AdminManagementModal({ 
  isOpen, 
  onClose, 
  adminUsers, 
  onAddAdmin, 
  onEditAdmin, 
  onDeleteAdmin,
  workerAccounts,
  onAddWorkerAccount,
  onEditWorkerAccount,
  onDeleteWorkerAccount,
  webAppUrl // 🌐 เชื่อมต่อ URL Google Apps Script
}) {
  const [activeTab, setActiveTab] = useState('admins');

  // Form State: Admin
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminNameInput, setAdminNameInput] = useState('');
  const [adminPositionInput, setAdminPositionInput] = useState('');
  const [adminPhoneInput, setAdminPhoneInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [editingAdminUsername, setEditingAdminUsername] = useState(null);

  // Form State: Worker
  const [workerTeamNameInput, setWorkerTeamNameInput] = useState('');
  const [workerPositionInput, setWorkerPositionInput] = useState('');
  const [workerPhoneInput, setWorkerPhoneInput] = useState('');
  const [workerUsernameInput, setWorkerUsernameInput] = useState('');
  const [workerPasswordInput, setWorkerPasswordInput] = useState('');
  const [editingWorkerUsername, setEditingWorkerUsername] = useState(null);

  // Form State: Document Signers (สอดคล้องกับ Google Sheets DocumentSigners)
  const [signersData, setSignersData] = useState({
    committeeCheck: [],
    committeeReceive: [],
    managers: []
  });
  const [isLoadingSigners, setIsLoadingSigners] = useState(false);
  const [signerCategory, setSignerCategory] = useState('committeeCheck'); 
  const [signerNameInput, setSignerNameInput] = useState('');
  const [signerPositionInput, setSignerPositionInput] = useState('');
  const [editingSignerId, setEditingSignerId] = useState(null);

  // 📥 ดึงข้อมูลผู้ลงนามจาก Google Sheets เมื่อเปิดแท็บเอกสาร
  useEffect(() => {
    if (isOpen && activeTab === 'documents' && webAppUrl) {
      const fetchSigners = async () => {
        setIsLoadingSigners(true);
        try {
          const res = await fetch(`${webAppUrl}?action=document_signers`);
          const data = await res.json();
          if (data && !data.status) {
            setSignersData(data);
          }
        } catch (err) {
          console.error("Error fetching document signers:", err);
        } finally {
          setIsLoadingSigners(false);
        }
      };
      fetchSigners();
    }
  }, [isOpen, activeTab, webAppUrl]);

  if (!isOpen) return null;

  // --- Handlers Admin ---
  const handleSaveAdmin = (e) => {
    e.preventDefault();
    if (!adminUsernameInput.trim() || !adminNameInput.trim() || !adminPasswordInput.trim()) return;

    const trimmedPhone = adminPhoneInput.trim();
    const trimmedPassword = adminPasswordInput.trim();

    const payload = {
      username: adminUsernameInput.trim(),
      name: adminNameInput.trim(),
      position: adminPositionInput.trim() || 'แอดมิน',
      phone: trimmedPhone ? (trimmedPhone.startsWith("'") ? trimmedPhone : `'${trimmedPhone}`) : '-',
      password: trimmedPassword ? (trimmedPassword.startsWith("'") ? trimmedPassword : `'${trimmedPassword}`) : '',
      role: 'admin'
    };

    if (editingAdminUsername) {
      onEditAdmin(editingAdminUsername, payload);
    } else {
      onAddAdmin(payload);
    }
    resetAdminForm();
  };

  const handleEditAdminClick = (admin) => {
    setEditingAdminUsername(admin.username);
    setAdminUsernameInput(admin.username || '');
    setAdminNameInput(admin.name || '');
    setAdminPositionInput(admin.position !== '-' ? admin.position : '');
    setAdminPhoneInput(admin.phone && admin.phone !== '-' ? admin.phone.replace(/^'/, '') : '');
    setAdminPasswordInput(admin.password ? admin.password.replace(/^'/, '') : '');
  };

  const resetAdminForm = () => {
    setEditingAdminUsername(null);
    setAdminUsernameInput('');
    setAdminNameInput('');
    setAdminPositionInput('');
    setAdminPhoneInput('');
    setAdminPasswordInput('');
  };

  // --- Handlers Worker ---
  const handleSaveWorker = (e) => {
    e.preventDefault();
    if (!workerUsernameInput.trim() || !workerPasswordInput.trim()) return;

    const trimmedPhone = workerPhoneInput.trim();
    const trimmedPassword = workerPasswordInput.trim();

    const payload = {
      teamName: workerTeamNameInput.trim() || workerUsernameInput.trim(),
      position: workerPositionInput.trim() || 'ช่างภาคสนาม',
      phone: trimmedPhone ? (trimmedPhone.startsWith("'") ? trimmedPhone : `'${trimmedPhone}`) : '-',
      username: workerUsernameInput.trim(),
      password: trimmedPassword ? (trimmedPassword.startsWith("'") ? trimmedPassword : `'${trimmedPassword}`) : '',
      role: 'tech'
    };

    if (editingWorkerUsername) {
      onEditWorkerAccount(editingWorkerUsername, payload);
    } else {
      onAddWorkerAccount(payload);
    }
    resetWorkerForm();
  };

  const handleEditWorkerClick = (worker) => {
    setEditingWorkerUsername(worker.username);
    setWorkerTeamNameInput(worker.teamName || '');
    setWorkerPositionInput(worker.position !== '-' ? worker.position : '');
    setWorkerPhoneInput(worker.phone && worker.phone !== '-' ? worker.phone.replace(/^'/, '') : '');
    setWorkerUsernameInput(worker.username || '');
    setWorkerPasswordInput(worker.password ? worker.password.replace(/^'/, '') : '');
  };

  const resetWorkerForm = () => {
    setEditingWorkerUsername(null);
    setWorkerTeamNameInput('');
    setWorkerPositionInput('');
    setWorkerPhoneInput('');
    setWorkerUsernameInput('');
    setWorkerPasswordInput('');
  };

  // --- Handlers Document Signers (ส่งข้อมูลไปบันทึกใน Google Sheets) ---
  const handleSaveSignerToSheet = async (newSignersData) => {
    if (!webAppUrl) return;
    try {
      await fetch(webAppUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'save_document_signers',
          signers: newSignersData
        })
      });
    } catch (err) {
      console.error("Error saving signers to sheet:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Google Sheets");
    }
  };

  const handleSaveSigner = (e) => {
    e.preventDefault();
    if (!signerNameInput.trim()) return;

    const updatedData = { ...signersData };

    if (editingSignerId) {
      updatedData[signerCategory] = updatedData[signerCategory].map(item => 
        item.id === editingSignerId 
          ? { ...item, name: signerNameInput.trim(), position: signerPositionInput.trim() }
          : item
      );
    } else {
      const newItem = {
        id: Date.now(),
        name: signerNameInput.trim(),
        position: signerPositionInput.trim() || (signerCategory === 'managers' ? 'ผู้จัดการ' : 'กรรมการฯ')
      };
      updatedData[signerCategory] = [...(updatedData[signerCategory] || []), newItem];
    }

    setSignersData(updatedData);
    handleSaveSignerToSheet(updatedData);
    resetSignerForm();
  };

  const handleEditSignerClick = (category, item) => {
    setSignerCategory(category);
    setEditingSignerId(item.id);
    setSignerNameInput(item.name || '');
    setSignerPositionInput(item.position || '');
  };

  const handleDeleteSigner = (category, id) => {
    const updatedData = { ...signersData };
    updatedData[category] = updatedData[category].filter(item => item.id !== id);
    setSignersData(updatedData);
    handleSaveSignerToSheet(updatedData);
  };

  const resetSignerForm = () => {
    setEditingSignerId(null);
    setSignerNameInput('');
    setSignerPositionInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">จัดการระบบและตั้งค่าเอกสาร (Admin Dashboard)</h3>
              <p className="text-xs text-slate-400">จัดการสิทธิ์ผู้ใช้งานและรายชื่อผู้ลงนามในแบบฟอร์มซ่อมท่อ</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-2 gap-2 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'admins' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>จัดการแอดมิน</span>
          </button>

          <button
            onClick={() => setActiveTab('workers')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'workers' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>จัดการทีมช่าง</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'documents' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ตั้งค่าผู้ลงนามเอกสาร</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* TAB 1: Admins */}
          {activeTab === 'admins' && (
            <div className="space-y-5">
              <form onSubmit={handleSaveAdmin} className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  {editingAdminUsername ? 'แก้ไขบัญชีแอดมิน' : 'เพิ่มบัญชีผู้ดูแลระบบ (Admin) ใหม่'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Username *</label>
                    <input
                      type="text"
                      disabled={!!editingAdminUsername}
                      value={adminUsernameInput}
                      onChange={(e) => setAdminUsernameInput(e.target.value)}
                      placeholder="เช่น admin1"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 font-medium disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ชื่อ-สกุล *</label>
                    <input
                      type="text"
                      value={adminNameInput}
                      onChange={(e) => setAdminNameInput(e.target.value)}
                      placeholder="เช่น สมชาย ใจดี"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ตำแหน่ง</label>
                    <input
                      type="text"
                      value={adminPositionInput}
                      onChange={(e) => setAdminPositionInput(e.target.value)}
                      placeholder="เช่น หัวหน้างาน"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">เบอร์โทร</label>
                    <input
                      type="text"
                      value={adminPhoneInput}
                      onChange={(e) => setAdminPhoneInput(e.target.value)}
                      placeholder="เช่น 0812345678"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Password *</label>
                    <input
                      type="text"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="เช่น 1234"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {editingAdminUsername && (
                    <button
                      type="button"
                      onClick={resetAdminForm}
                      className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs cursor-pointer">
                    {editingAdminUsername ? 'บันทึกแก้ไข' : '+ เพิ่มแอดมิน'}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">รายชื่อแอดมินใน Google Sheets ({adminUsers.length})</p>
                {adminUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีข้อมูลแอดมินใน Google Sheets</p>
                ) : (
                  adminUsers.map((a) => (
                    <div key={a.username} className="flex justify-between items-center bg-white border border-slate-200 px-4 py-3 rounded-2xl text-xs shadow-xs">
                      <div>
                        <p className="font-bold text-slate-800 flex items-center gap-2">
                          <span>{a.name}</span>
                          <span className="text-[11px] font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {a.position || 'แอดมิน'}
                          </span>
                          {a.phone && a.phone !== '-' && (
                            <span className="text-[11px] font-normal text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-indigo-600" /> {a.phone.replace(/^'/, '')}
                            </span>
                          )}
                        </p>
                        <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                          Username: <span className="text-indigo-600 font-bold">{a.username}</span> | Password: <span className="text-slate-700 font-bold">{a.password ? a.password.replace(/^'/, '') : ''}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditAdminClick(a)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer" title="แก้ไข">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDeleteAdmin(a.username)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer" title="ลบ">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Workers */}
          {activeTab === 'workers' && (
            <div className="space-y-5">
              <form onSubmit={handleSaveWorker} className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  {editingWorkerUsername ? 'แก้ไขบัญชีช่างภาคสนาม' : 'เพิ่มทีมช่าง และกำหนดรหัสผ่าน'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ชื่อทีมช่าง *</label>
                    <input
                      type="text"
                      value={workerTeamNameInput}
                      onChange={(e) => setWorkerTeamNameInput(e.target.value)}
                      placeholder="เช่น ทีมช่างซ่อม 1"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ตำแหน่ง</label>
                    <input
                      type="text"
                      value={workerPositionInput}
                      onChange={(e) => setWorkerPositionInput(e.target.value)}
                      placeholder="เช่น ช่างตระเวนสาย"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">เบอร์โทร</label>
                    <input
                      type="text"
                      value={workerPhoneInput}
                      onChange={(e) => setWorkerPhoneInput(e.target.value)}
                      placeholder="เช่น 0812345678"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Username *</label>
                    <input
                      type="text"
                      disabled={!!editingWorkerUsername}
                      value={workerUsernameInput}
                      onChange={(e) => setWorkerUsernameInput(e.target.value)}
                      placeholder="เช่น team1"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 font-medium disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Password *</label>
                    <input
                      type="text"
                      value={workerPasswordInput}
                      onChange={(e) => setWorkerPasswordInput(e.target.value)}
                      placeholder="เช่น 123"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {editingWorkerUsername && (
                    <button
                      type="button"
                      onClick={resetWorkerForm}
                      className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs cursor-pointer">
                    {editingWorkerUsername ? 'บันทึกแก้ไข' : '+ เพิ่มทีมช่าง'}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">บัญชีทีมช่างใน Google Sheets ({workerAccounts.length})</p>
                {workerAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีข้อมูลทีมช่างใน Google Sheets</p>
                ) : (
                  workerAccounts.map((w) => (
                    <div key={w.username || w.teamName} className="flex justify-between items-center bg-white border border-slate-200 px-4 py-3 rounded-2xl text-xs shadow-xs">
                      <div>
                        <p className="font-bold text-slate-800 flex items-center gap-2">
                          <span>{w.teamName}</span>
                          {w.position && w.position !== '-' && (
                            <span className="text-[11px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <Briefcase className="w-3 h-3 inline mr-0.5" /> {w.position}
                            </span>
                          )}
                          {w.phone && w.phone !== '-' && (
                            <span className="text-[11px] font-normal text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600" /> {w.phone.replace(/^'/, '')}
                            </span>
                          )}
                        </p>
                        <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                          Username: <span className="text-emerald-700 font-bold">{w.username}</span> | Password: <span className="text-slate-700 font-bold">{w.password ? w.password.replace(/^'/, '') : ''}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditWorkerClick(w)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer" title="แก้ไข">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDeleteWorkerAccount(w.username, w.teamName)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer" title="ลบ">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ตั้งค่าผู้ลงนามเอกสาร (เชื่อมกับตาราง DocumentSigners บน Google Sheets) */}
          {activeTab === 'documents' && (
            <div className="space-y-5">
              {isLoadingSigners ? (
                <div className="flex justify-center items-center py-12 text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                  <span>กำลังโหลดข้อมูลผู้ลงนามจาก Google Sheets...</span>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSaveSigner} className="bg-amber-50/60 border border-amber-100 p-4 rounded-2xl space-y-3">
                    <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-amber-600" />
                      {editingSignerId ? 'แก้ไขรายชื่อผู้ลงนาม' : 'เพิ่มรายชื่อคณะกรรมการ / ผู้บริหาร สำหรับลงนามในเอกสาร'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">หมวดส่วนลงนาม *</label>
                        <select
                          value={signerCategory}
                          onChange={(e) => setSignerCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none shadow-xs"
                        >
                          <option value="committeeCheck">1. คณะกรรมการตรวจสอบท่อ และอุปกรณ์เดิม</option>
                          <option value="committeeReceive">2. คณะกรรมการตรวจรับพัสดุ</option>
                          <option value="managers">3. หัวหน้างานบริการฯ และ ผู้จัดการ</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">ชื่อ - สกุล *</label>
                        <input
                          type="text"
                          value={signerNameInput}
                          onChange={(e) => setSignerNameInput(e.target.value)}
                          placeholder="เช่น นายใหม่ ผูกมิตร"
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">ตำแหน่ง *</label>
                        <input
                          type="text"
                          value={signerPositionInput}
                          onChange={(e) => setSignerPositionInput(e.target.value)}
                          placeholder="เช่น ประธานฯ / กรรมการฯ"
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      {editingSignerId && (
                        <button
                          type="button"
                          onClick={resetSignerForm}
                          className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      )}
                      <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs cursor-pointer">
                        {editingSignerId ? 'บันทึกการแก้ไข' : '+ เพิ่มรายชื่อ'}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-4">
                    {/* ส่วนที่ 1: คณะกรรมการตรวจสอบท่อ และอุปกรณ์เดิม */}
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                        1. คณะกรรมการตรวจสอบท่อ และอุปกรณ์เดิม ({signersData.committeeCheck?.length || 0} คน)
                      </h4>
                      <div className="space-y-1.5">
                        {(!signersData.committeeCheck || signersData.committeeCheck.length === 0) ? (
                          <p className="text-[11px] text-slate-400 italic">ยังไม่มีข้อมูล</p>
                        ) : (
                          signersData.committeeCheck.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-xs border border-slate-100">
                              <div>
                                <span className="font-bold text-slate-800">{item.name}</span>
                                <span className="ml-2 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold">{item.position}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleEditSignerClick('committeeCheck', item)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer" title="แก้ไข">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteSigner('committeeCheck', item.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer" title="ลบ">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* ส่วนที่ 2: คณะกรรมการตรวจรับพัสดุ */}
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                        2. คณะกรรมการตรวจรับพัสดุ ({signersData.committeeReceive?.length || 0} คน)
                      </h4>
                      <div className="space-y-1.5">
                        {(!signersData.committeeReceive || signersData.committeeReceive.length === 0) ? (
                          <p className="text-[11px] text-slate-400 italic">ยังไม่มีข้อมูล</p>
                        ) : (
                          signersData.committeeReceive.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-xs border border-slate-100">
                              <div>
                                <span className="font-bold text-slate-800">{item.name}</span>
                                <span className="ml-2 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold">{item.position}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleEditSignerClick('committeeReceive', item)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer" title="แก้ไข">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteSigner('committeeReceive', item.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer" title="ลบ">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* ส่วนที่ 3: หัวหน้างานบริการฯ และ ผู้จัดการ */}
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                        3. หัวหน้างานบริการฯ และ ผู้จัดการ ({signersData.managers?.length || 0} คน)
                      </h4>
                      <div className="space-y-1.5">
                        {(!signersData.managers || signersData.managers.length === 0) ? (
                          <p className="text-[11px] text-slate-400 italic">ยังไม่มีข้อมูล</p>
                        ) : (
                          signersData.managers.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-xs border border-slate-100">
                              <div>
                                <span className="font-bold text-slate-800">{item.name}</span>
                                <span className="ml-2 text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-semibold">{item.position}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleEditSignerClick('managers', item)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer" title="แก้ไข">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteSigner('managers', item.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer" title="ลบ">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
