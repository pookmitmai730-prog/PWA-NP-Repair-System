import React, { useState } from 'react';
import { 
  Shield, 
  Smartphone, 
  Trash2, 
  Edit2, 
  X, 
  KeyRound, 
  UserCheck, 
  ShieldAlert 
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
  // Navigation State ('admins' สำหรับจัดการแอดมิน, 'workers' สำหรับจัดการช่างภาคสนาม)
  const [activeTab, setActiveTab] = useState('admins');

  // Form State: Admin Account Management
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminNameInput, setAdminNameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [editingAdminId, setEditingAdminId] = useState(null);

  // Form State: Field Worker Account Management
  const [workerTeamNameInput, setWorkerTeamNameInput] = useState('');
  const [workerUsernameInput, setWorkerUsernameInput] = useState('');
  const [workerPasswordInput, setWorkerPasswordInput] = useState('');
  const [editingWorkerId, setEditingWorkerId] = useState(null);

  if (!isOpen) return null;

  // --- Handlers: Admin Actions ---
  const handleSaveAdmin = (e) => {
    e.preventDefault();
    if (!adminUsernameInput.trim() || !adminNameInput.trim() || !adminPasswordInput.trim()) return;

    if (editingAdminId) {
      onEditAdmin(editingAdminId, { 
        username: adminUsernameInput.trim(), 
        name: adminNameInput.trim(), 
        password: adminPasswordInput.trim() 
      });
      setEditingAdminId(null);
    } else {
      onAddAdmin({ 
        id: `admin_${Date.now()}`, 
        username: adminUsernameInput.trim(), 
        name: adminNameInput.trim(), 
        password: adminPasswordInput.trim() 
      });
    }

    resetAdminForm();
  };

  const handleEditAdminClick = (admin) => {
    setEditingAdminId(admin.id);
    setAdminUsernameInput(admin.username || '');
    setAdminNameInput(admin.name);
    setAdminPasswordInput(admin.password);
  };

  const resetAdminForm = () => {
    setEditingAdminId(null);
    setAdminUsernameInput('');
    setAdminNameInput('');
    setAdminPasswordInput('');
  };

  // --- Handlers: Field Worker Actions ---
  const handleSaveWorker = (e) => {
    e.preventDefault();
    if (!workerTeamNameInput.trim() || !workerUsernameInput.trim() || !workerPasswordInput.trim()) return;

    if (editingWorkerId) {
      onEditWorkerAccount(editingWorkerId, { 
        teamName: workerTeamNameInput.trim(), 
        username: workerUsernameInput.trim(), 
        password: workerPasswordInput.trim() 
      });
      setEditingWorkerId(null);
    } else {
      onAddWorkerAccount({ 
        id: `worker_${Date.now()}`, 
        teamName: workerTeamNameInput.trim(), 
        username: workerUsernameInput.trim(), 
        password: workerPasswordInput.trim() 
      });
    }

    resetWorkerForm();
  };

  const handleEditWorkerClick = (worker) => {
    setEditingWorkerId(worker.id);
    setWorkerTeamNameInput(worker.teamName);
    setWorkerUsernameInput(worker.username);
    setWorkerPasswordInput(worker.password);
  };

  const resetWorkerForm = () => {
    setEditingWorkerId(null);
    setWorkerTeamNameInput('');
    setWorkerUsernameInput('');
    setWorkerPasswordInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">ตั้งค่าผู้ใช้งานและสิทธิ์ในระบบ</h3>
              <p className="text-xs text-slate-400">จัดการบัญชีผู้ดูแลระบบ (Admin) และสิทธิ์การใช้งานช่างภาคสนาม</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-2 gap-2 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'admins' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>จัดการผู้ดูแลระบบ (Admins)</span>
          </button>

          <button
            onClick={() => setActiveTab('workers')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'workers' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>กำหนดสิทธิ์ช่างภาคสนาม (Workers)</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* TAB 1: Admin Management */}
          {activeTab === 'admins' && (
            <div className="space-y-5">
              <form onSubmit={handleSaveAdmin} className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  {editingAdminId ? 'แก้ไขข้อมูลบัญชีแอดมิน' : 'เพิ่มสิทธิ์บัญชีผู้ดูแลระบบ (Admin) ใหม่'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username) *</label>
                    <input
                      type="text"
                      value={adminUsernameInput}
                      onChange={(e) => setAdminUsernameInput(e.target.value)}
                      placeholder="เช่น admin1"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ชื่อ/ตำแหน่งแอดมิน *</label>
                    <input
                      type="text"
                      value={adminNameInput}
                      onChange={(e) => setAdminNameInput(e.target.value)}
                      placeholder="เช่น ผอ.สมชาย"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">รหัสผ่าน (Password) *</label>
                    <input
                      type="text"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="เช่น 1234"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {editingAdminId && (
                    <button
                      type="button"
                      onClick={resetAdminForm}
                      className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer">
                    {editingAdminId ? 'บันทึกการแก้ไข' : '+ เพิ่มแอดมินใหม่'}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">รายชื่อแอดมินในระบบ ({adminUsers.length + 1})</p>
                
                {/* Default System Admin Card */}
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-xs">
                  <div>
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-500" /> Default Admin (รหัสตั้งต้นระบบ)
                    </p>
                    <p className="text-slate-500 font-mono text-[11px]">Password: 1234</p>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    ระบบหลัก
                  </span>
                </div>

                {/* Custom Admin List */}
                {adminUsers.map((a) => (
                  <div key={a.id} className="flex justify-between items-center bg-white border border-slate-200 px-4 py-3 rounded-2xl text-xs shadow-xs">
                    <div>
                      <p className="font-bold text-slate-800">{a.name} <span className="text-slate-400 font-normal">({a.username})</span></p>
                      <p className="text-slate-500 font-mono text-[11px]">Username: <span className="text-indigo-600 font-bold">{a.username}</span> | Password: <span className="text-slate-700 font-bold">{a.password}</span></p>
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
                        onClick={() => onDeleteAdmin(a.id)} 
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Field Worker Management */}
          {activeTab === 'workers' && (
            <div className="space-y-5">
              <form onSubmit={handleSaveWorker} className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  {editingWorkerId ? 'แก้ไขบัญชีช่างภาคสนาม' : 'เพิ่มชื่อหัวหน้าทีมและสร้าง Username/Password'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ชื่อหัวหน้าทีม / ทีมช่าง *</label>
                    <input
                      type="text"
                      value={workerTeamNameInput}
                      onChange={(e) => setWorkerTeamNameInput(e.target.value)}
                      placeholder="เช่น ทีมช่างซ่อม 1 (หัวหน้าสมชาย)"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username) *</label>
                    <input
                      type="text"
                      value={workerUsernameInput}
                      onChange={(e) => setWorkerUsernameInput(e.target.value)}
                      placeholder="เช่น team1"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">รหัสผ่าน (Password) *</label>
                    <input
                      type="text"
                      value={workerPasswordInput}
                      onChange={(e) => setWorkerPasswordInput(e.target.value)}
                      placeholder="เช่น 123"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {editingWorkerId && (
                    <button
                      type="button"
                      onClick={resetWorkerForm}
                      className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer">
                    {editingWorkerId ? 'บันทึกการแก้ไข' : '+ เพิ่มบัญชีช่างใหม่'}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">บัญชีเข้าใช้งานของช่างภาคสนาม ({workerAccounts.length})</p>
                {workerAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีการเพิ่มบัญชีช่างภาคสนาม</p>
                ) : (
                  workerAccounts.map((w) => (
                    <div key={w.id} className="flex justify-between items-center bg-white border border-slate-200 px-4 py-3 rounded-2xl text-xs shadow-xs">
                      <div>
                        <p className="font-bold text-slate-800">{w.teamName}</p>
                        <p className="text-slate-500 font-mono text-[11px]">
                          Username: <span className="text-emerald-700 font-bold">{w.username}</span> | Password: <span className="text-slate-700 font-bold">{w.password}</span>
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
                          onClick={() => onDeleteWorkerAccount(w.id)} 
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
