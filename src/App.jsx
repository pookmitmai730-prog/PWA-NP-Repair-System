import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsOverview from './components/StatsOverview';
import TrackingSearch from './components/TrackingSearch';
import CreateJobModal from './components/CreateJobModal';
import JobList from './components/JobPipeline';
import FieldWorkerPortal from './components/FieldWorkerPortal';
import ReportsView from './components/ReportsView';
import RolePortal from './components/RolePortal';
import AdminManagementModal from './components/AdminManagementModal';
import { archiveCompletedJobToSheets } from './services/sheetsApi';
import { subscribeToJobs, saveJobToFirebase, updateJobStatusInFirebase } from './services/firebase';
import { LayoutDashboard, Smartphone, BarChart3, LogOut, Shield, UserCheck } from 'lucide-react';

export default function App() {
  // 🔒 State การล็อกอินและเลือกสิทธิ์ (Role)
  // 'portal' | 'public' | 'admin' | 'worker'
  const [userRole, setUserRole] = useState(localStorage.getItem('pwa_user_role') || 'portal');
  const [activeWorkerTeam, setActiveWorkerTeam] = useState(localStorage.getItem('pwa_worker_team') || '');

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'reports', 'field'
  const [jobs, setJobs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminManageOpen, setIsAdminManageOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // บัญชีแอดมินในระบบ
  const [adminUsers, setAdminUsers] = useState(() => {
    const saved = localStorage.getItem('pwa_admin_users');
    return saved ? JSON.parse(saved) : [];
  });

  // บัญชีช่างภาคสนามในระบบ
  const [workerAccounts, setWorkerAccounts] = useState(() => {
    const saved = localStorage.getItem('pwa_worker_accounts');
    return saved ? JSON.parse(saved) : [
      { id: 'w1', teamName: 'ทีมช่างซ่อม 1', username: 'team1', password: '123' },
      { id: 'w2', teamName: 'ทีมช่างซ่อม 2', username: 'team2', password: '123' },
    ];
  });

  // รายชื่อทีมช่าง
  const [teams, setTeams] = useState(() => {
    const saved = localStorage.getItem('pwa_repair_teams');
    return saved ? JSON.parse(saved) : [
      { name: 'ทีมช่างซ่อม 1', phone: '0811111111' },
      { name: 'ทีมช่างซ่อม 2', phone: '0822222222' },
      { name: 'ทีมช่างซ่อม 3', phone: '0833333333' }
    ];
  });

  // ฟังก์ชันจัดการ Admin / Worker Accounts
  const handleAddAdmin = (newAdmin) => {
    const updated = [...adminUsers, newAdmin];
    setAdminUsers(updated);
    localStorage.setItem('pwa_admin_users', JSON.stringify(updated));
  };

  const handleEditAdmin = (id, updatedAdmin) => {
    const updated = adminUsers.map(a => a.id === id ? { ...a, ...updatedAdmin } : a);
    setAdminUsers(updated);
    localStorage.setItem('pwa_admin_users', JSON.stringify(updated));
  };

  const handleDeleteAdmin = (id) => {
    const updated = adminUsers.filter(a => a.id !== id);
    setAdminUsers(updated);
    localStorage.setItem('pwa_admin_users', JSON.stringify(updated));
  };

  const handleAddWorkerAccount = (newWorker) => {
    const updated = [...workerAccounts, newWorker];
    setWorkerAccounts(updated);
    localStorage.setItem('pwa_worker_accounts', JSON.stringify(updated));
  };

  const handleEditWorkerAccount = (id, updatedWorker) => {
    const updated = workerAccounts.map(w => w.id === id ? { ...w, ...updatedWorker } : w);
    setWorkerAccounts(updated);
    localStorage.setItem('pwa_worker_accounts', JSON.stringify(updated));
  };

  const handleDeleteWorkerAccount = (id) => {
    const updated = workerAccounts.filter(w => w.id !== id);
    setWorkerAccounts(updated);
    localStorage.setItem('pwa_worker_accounts', JSON.stringify(updated));
  };

  const handleAddTeam = (newTeam) => {
    if (teams.some(t => t.name === newTeam.name)) {
      alert("มีชื่อทีมนี้ในระบบแล้ว");
      return;
    }
    const updated = [...teams, newTeam];
    setTeams(updated);
    localStorage.setItem('pwa_repair_teams', JSON.stringify(updated));
  };

  const handleEditTeam = (oldName, updatedTeam) => {
    const updated = teams.map(t => t.name === oldName ? updatedTeam : t);
    setTeams(updated);
    localStorage.setItem('pwa_repair_teams', JSON.stringify(updated));
  };

  const handleDeleteTeam = (teamName) => {
    const updated = teams.filter(t => t.name !== teamName);
    setTeams(updated);
    localStorage.setItem('pwa_repair_teams', JSON.stringify(updated));
  };

  // ล็อกอินและออกจากระบบ
  const handleAdminLogin = () => {
    setUserRole('admin');
    localStorage.setItem('pwa_user_role', 'admin');
    setCurrentView('dashboard');
  };

  const handleWorkerLogin = (teamName) => {
    setUserRole('worker');
    setActiveWorkerTeam(teamName);
    localStorage.setItem('pwa_user_role', 'worker');
    localStorage.setItem('pwa_worker_team', teamName);
  };

  const handleLogout = () => {
    setUserRole('portal');
    setActiveWorkerTeam('');
    localStorage.removeItem('pwa_user_role');
    localStorage.removeItem('pwa_worker_team');
  };

  // ดึงข้อมูล Real-time จาก Firebase
  useEffect(() => {
    const unsubscribe = subscribeToJobs((jobList) => {
      setJobs(jobList);
    });
    return () => unsubscribe();
  }, []);

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'PENDING').length,
    inProgress: jobs.filter(j => j.status === 'DISPATCHED' || j.status === 'IN_PROGRESS').length,
    completed: jobs.filter(j => j.status === 'COMPLETED').length,
  };

  const handleCreateJob = async (newJobData) => {
    const jobId = newJobData.receivedNo || `S${Date.now()}`;
    
    const fullJob = {
      id: jobId,
      ...newJobData,
      receivedNo: jobId,
      status: 'PENDING',
      technician: 'ยังไม่ระบุทีมช่าง',
      urgency: 'ปกติ',
      createdAt: newJobData.receivedAt || new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    try {
      await saveJobToFirebase(fullJob);
      alert(`บันทึกใบรับแจ้งเรียบร้อยแล้ว! เลขที่รับแจ้ง: ${jobId}`);
    } catch (err) {
      console.error("Firebase Save Error:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Firebase");
    }
  };

  const handleStatusChange = async (jobId, newStatus, extraData = {}) => {
    const currentJob = jobs.find(j => j.id === jobId || j.receivedNo === jobId);
    if (!currentJob) return;

    const assignedTechnician = extraData.technician || (newStatus !== 'PENDING' 
      ? (currentJob.technician && !currentJob.technician.includes('ยังไม่ระบุ') 
          ? currentJob.technician 
          : (teams[0] ? `${teams[0].name} (${teams[0].phone})` : 'ทีมช่าง กปภ.')) 
      : currentJob.technician);

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedData = {
      ...currentJob,
      ...extraData,
      status: newStatus,
      technician: assignedTechnician,
      urgency: extraData.urgency || currentJob.urgency || 'ปกติ',
      dispatchedAt: newStatus === 'DISPATCHED' ? (extraData.dispatchedAt || currentJob.dispatchedAt || nowStr) : (currentJob.dispatchedAt || ''),
      inProgressAt: newStatus === 'IN_PROGRESS' ? (extraData.inProgressAt || currentJob.inProgressAt || nowStr) : (currentJob.inProgressAt || ''),
      completedAt: newStatus === 'COMPLETED' ? (extraData.completedAt || nowStr) : (currentJob.completedAt || ''),
      updatedAt: nowStr
    };

    try {
      await updateJobStatusInFirebase(currentJob.id || currentJob.receivedNo, updatedData);
      setJobs(prevJobs => prevJobs.map(j => (j.id === currentJob.id || j.receivedNo === currentJob.receivedNo ? updatedData : j)));

      if (newStatus === 'COMPLETED') {
        const res = await archiveCompletedJobToSheets(updatedData);
        console.log("Sheets Archive Result:", res.message);
      }
    } catch (err) {
      console.error("Error changing job status:", err);
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
    for (let job of completedJobs) {
      await archiveCompletedJobToSheets(job);
    }
    setTimeout(() => {
      setIsSyncing(false);
      alert(`ซิงค์ข้อมูลเคสที่ปิดแล้ว (${completedJobs.length} รายการ) ลง Google Sheets เรียบร้อย!`);
    }, 1000);
  };

  // 1. ถ้ายังไม่ได้เลือกสิทธิ์ ให้แสดงหน้า Role Portal
  if (userRole === 'portal') {
    return (
      <RolePortal 
        onSelectRole={(role) => setUserRole(role)}
        adminUsers={adminUsers}
        workerAccounts={workerAccounts}
        onAdminLogin={handleAdminLogin}
        onWorkerLogin={handleWorkerLogin}
      />
    );
  }

  // 2. ถ้าเป็นประชาชนทั่วไป (Public Track Only)
  if (userRole === 'public') {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans">
        <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm tracking-wide text-cyan-400">PWA EXPRESS TRACKING</span>
            <span className="text-xs text-slate-400 hidden sm:inline">| กปภ.สาขานครพนม</span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" /> กลับหน้าหลัก
          </button>
        </div>
        <main className="max-w-4xl mx-auto p-4 sm:p-8 pt-10">
          <TrackingSearch jobs={jobs} />
        </main>
      </div>
    );
  }

  // 3. ถ้าเป็นช่างภาคสนาม (Worker Only)
  if (userRole === 'worker') {
    return (
      <div className="min-h-screen bg-slate-100 font-sans">
        <div className="bg-slate-900 text-white p-2 text-xs flex justify-between items-center px-4">
          <span className="font-bold text-emerald-400">ระบบเจ้าหน้าที่ภาคสนาม: {activeWorkerTeam}</span>
          <button onClick={handleLogout} className="text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer">
            <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
          </button>
        </div>
        <FieldWorkerPortal 
          jobs={jobs} 
          onUpdateJobStatus={handleStatusChange} 
          teams={teams.map(t => t.name)}
        />
      </div>
    );
  }

  // 4. ถ้าเป็น Admin (เข้าถึงได้ทั้งหมดทั้ง 3 ส่วน)
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Switcher Bar สิทธิ์ Admin */}
      <div className="bg-slate-900 text-white py-2 px-4 text-xs flex flex-wrap justify-between items-center border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
            <Shield className="w-3 h-3" /> ADMIN
          </span>
          <span className="font-bold text-slate-200">สิทธิ์ผู้ดูแลระบบ (เข้าถึงได้ทุกส่วน)</span>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              currentView === 'dashboard' ? 'bg-blue-600 font-bold text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> <span>ศูนย์ควบคุม</span>
          </button>

          <button 
            onClick={() => setCurrentView('reports')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              currentView === 'reports' ? 'bg-indigo-600 font-bold text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> <span>รายงาน</span>
          </button>

          <button 
            onClick={() => setCurrentView('field')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              currentView === 'field' ? 'bg-emerald-600 font-bold text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> <span>จำลองหน้าช่าง</span>
          </button>

          <button 
            onClick={() => setIsAdminManageOpen(true)}
            className="bg-indigo-950 border border-indigo-700 hover:bg-indigo-900 text-indigo-300 font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
          >
            <UserCheck className="w-3.5 h-3.5" /> ตั้งค่าแอดมิน/ช่าง
          </button>

          <button 
            onClick={handleLogout}
            className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
            title="ออกจากระบบ"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {currentView === 'dashboard' && (
        <>
          <Navbar 
            onOpenModal={() => setIsModalOpen(true)} 
            onSyncSheets={handleManualSync}
            isSyncing={isSyncing}
          />

          <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <StatsOverview stats={stats} />
            <TrackingSearch jobs={jobs} />
            <JobList 
              jobs={jobs} 
              onStatusChange={handleStatusChange} 
              teams={teams}
              onAddTeam={handleAddTeam}
              onEditTeam={handleEditTeam}
              onDeleteTeam={handleDeleteTeam}
            />
          </main>
        </>
      )}

      {currentView === 'reports' && (
        <ReportsView jobs={jobs} />
      )}

      {currentView === 'field' && (
        <FieldWorkerPortal 
          jobs={jobs} 
          onUpdateJobStatus={handleStatusChange} 
          teams={teams.map(t => t.name)}
        />
      )}

      <CreateJobModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateJob}
      />

      <AdminManagementModal 
        isOpen={isAdminManageOpen}
        onClose={() => setIsAdminManageOpen(false)}
        adminUsers={adminUsers}
        onAddAdmin={handleAddAdmin}
        onEditAdmin={handleEditAdmin}
        onDeleteAdmin={handleDeleteAdmin}
        workerAccounts={workerAccounts}
        onAddWorkerAccount={handleAddWorkerAccount}
        onEditWorkerAccount={handleEditWorkerAccount}
        onDeleteWorkerAccount={handleDeleteWorkerAccount}
        teams={teams}
      />
    </div>
  );
}