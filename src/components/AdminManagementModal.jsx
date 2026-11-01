import React, { useState } from 'react';
import { 
  Shield, 
  Smartphone, 
  Trash2, 
  Edit2, 
  X, 
  KeyRound, 
  UserCheck, 
  ShieldAlert,
  Phone,
  Briefcase
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
  onDeleteWorkerAccount
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
    // แก้ไขเงื่อนไขให้เช็กจาก workerUsernameInput และ workerPasswordInput (และแก้ชื่อทีมให้ดึงจาก username หรือค่าเริ่มต้นถ้าไม่ได้แยกช่อง)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">จัดการสิทธิ์ผู้ใช้งาน (Google Sheets DB)</h3>
              <p className="text-xs text-slate-400">จัดการตาราง AdminUsers และ Teams ใน Google Sheets</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-2 gap-2 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'admins' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>จัดการแอดมิน (AdminUsers)</span>
          </button>

          <button
            onClick={() => setActiveTab('workers')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'workers' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>จัดการช่างภาคสนาม (Teams)</span>
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
                      placeholder="เช่น 1234 หรือเบอร์โทร"
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
                        <button 
                          onClick={() => handleEditAdminClick(a)} 
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteAdmin(a.username)} 
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="ลบ"
                        >
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
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ชื่อทีมช่าง (teamName) *</label>
                    <input
                      type="text"
                      value={workerTeamNameInput}
                      onChange={(e) => setWorkerTeamNameInput(e.target.value)}
                      placeholder="เช่น ทีมช่างซ่อม 1"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ตำแหน่ง (position)</label>
                    <input
                      type="text"
                      value={workerPositionInput}
                      onChange={(e) => setWorkerPositionInput(e.target.value)}
                      placeholder="เช่น ช่างตระเวนสาย"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">เบอร์โทร (phone)</label>
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
                      placeholder="เช่น 123 หรือเบอร์โทร"
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
                        <button 
                          onClick={() => handleEditWorkerClick(w)} 
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteWorkerAccount(w.username, w.teamName)} 
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
