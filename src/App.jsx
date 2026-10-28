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
import { 
  subscribeToJobs, 
  saveJobToFirebase, 
  updateJobStatusInFirebase, 
  subscribeToSystemConfig, 
  saveSystemConfigToFirebase 
} from './services/firebase';
import { LayoutDashboard, Smartphone, BarChart3, LogOut, Shield, UserCheck } from 'lucide-react';

export default function App() {
  const [userRole, setUserRole] = useState(localStorage.getItem('pwa_user_role') || 'portal');
  const [activeWorkerTeam, setActiveWorkerTeam] = useState(localStorage.getItem('pwa_worker_team') || '');

  const [currentView, setCurrentView] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminManageOpen, setIsAdminManageOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // ☁️ ข้อมูลการตั้งค่าระบบ (ซิงค์ผ่าน Firebase Realtime Database)
  const [adminUsers, setAdminUsers] = useState([]);
  const [workerAccounts, setWorkerAccounts] = useState([
    { id: 'w1', teamName: 'ทีมช่างซ่อม 1', phone: '0811111111', username: 'team1', password: '123' },
    { id: 'w2', teamName: 'ทีมช่างซ่อม 2', phone: '0822222222', username: 'team2', password: '123' },
  ]);
  const [teams, setTeams] = useState([
    { name: 'ทีมช่างซ่อม 1', phone: '0811111111' },
    { name: 'ทีมช่างซ่อม 2', phone: '0822222222' },
  ]);

  // 1. ดึงข้อมูลงานซ่อมและ Config จาก Firebase แบบ Real-time
  useEffect(() => {
    const unsubscribeJobs = subscribeToJobs((jobList) => {
      setJobs(jobList);
    });

    const unsubscribeConfig = subscribeToSystemConfig((config) => {
      if (config) {
        if (config.adminUsers) setAdminUsers(config.adminUsers);
        if (config.workerAccounts) setWorkerAccounts(config.workerAccounts);
        if (config.teams) setTeams(config.teams);
      }
    });

    return () => {
      unsubscribeJobs();
      unsubscribeConfig();
    };
  }, []);

  // ฟังก์ชันกลางบันทึก Config ทั้งหมดขึ้น Firebase
  const updateFirebaseConfig = async (newAdmins, newWorkers, newTeams) => {
    const configPayload = {
      adminUsers: newAdmins,
      workerAccounts: newWorkers,
      teams: newTeams
    };
    try {
      await saveSystemConfigToFirebase(configPayload);
    } catch (err) {
      console.error("Error saving config to Firebase:", err);
    }
  };

  // จัดการ Admin
  const handleAddAdmin = (newAdmin) => {
    const updated = [...adminUsers, newAdmin];
    setAdminUsers(updated);
    updateFirebaseConfig(updated, workerAccounts, teams);
  };

  const handleEditAdmin = (id, updatedAdmin) => {
    const updated = adminUsers.map(a => a.id === id ? { ...a, ...updatedAdmin } : a);
    setAdminUsers(updated);
    updateFirebaseConfig(updated, workerAccounts, teams);
  };

  const handleDeleteAdmin = (id) => {
    const updated = adminUsers.filter(a => a.id !== id);
    setAdminUsers(updated);
    updateFirebaseConfig(updated, workerAccounts, teams);
  };

  // จัดการบัญชีช่าง
  const handleAddWorkerAccount = (newWorker) => {
    const updated = [...workerAccounts, newWorker];
    setWorkerAccounts(updated);
    
    let updatedTeams = [...teams];
    if (newWorker.teamName && !teams.some(t => t.name === newWorker.teamName)) {
      updatedTeams = [...teams, { name: newWorker.teamName, phone: newWorker.phone || '-' }];
      setTeams(updatedTeams);
    }

    updateFirebaseConfig(adminUsers, updated, updatedTeams);
  };

  const handleEditWorkerAccount = (id, updatedWorker) => {
    const updated = workerAccounts.map(w => w.id === id ? { ...w, ...updatedWorker } : w);
    setWorkerAccounts(updated);
    
    let updatedTeams = [...teams];
    if (updatedWorker.teamName && !teams.some(t => t.name === updatedWorker.teamName)) {
      updatedTeams = [...teams, { name: updatedWorker.teamName, phone: updatedWorker.phone || '-' }];
      setTeams(updatedTeams);
    }

    updateFirebaseConfig(adminUsers, updated, updatedTeams);
  };

  const handleDeleteWorkerAccount = (id) => {
    const updated = workerAccounts.filter(w => w.id !== id);
    setWorkerAccounts(updated);
    updateFirebaseConfig(adminUsers, updated, teams);
  };

  // Login & Logout Handlers
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

  // Logout หลักสำหรับปุ่มส่วนบน
  const handleLogout = () => {
    setUserRole('portal');
    setActiveWorkerTeam('');
    localStorage.removeItem('pwa_user_role');
    localStorage.removeItem('pwa_worker_team');
    setCurrentView('dashboard');
  };

  // Logout เฉพาะสำหรับหน้าช่างภาคสนาม
  const handleWorkerLogout = () => {
    setActiveWorkerTeam('');
    setUserRole('portal');
    localStorage.removeItem('pwa_user_role');
    localStorage.removeItem('pwa_worker_team');
  };

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
          : (workerAccounts[0] ? `${workerAccounts[0].teamName} (${workerAccounts[0].phone || '-'})` : 'ทีมช่าง กปภ.')) 
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

  // 1. หน้า Portal เลือกสิทธิ์
  if (userRole === 'portal') {
    return (
      <RolePortal 
        onSelectRole={(role) => setUserRole(role)}
        adminUsers={adminUsers}
        workerAccounts={workerAccounts}
        onAdminLogin={handleAdminLogin}
        onWorkerLogin={handleWorkerLogin}
        jobs={jobs}
      />
    );
  }

  // 2. หน้าประชาชนทั่วไป
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

  // 3. หน้าช่างภาคสนาม
  if (userRole === 'worker') {
    return (
      <div className="min-h-screen bg-slate-100 font-sans">
        <FieldWorkerPortal 
          jobs={jobs} 
          onUpdateJobStatus={handleStatusChange} 
          teams={workerAccounts.map(w => w.teamName)}
          onLogout={handleWorkerLogout}
        />
      </div>
    );
  }

  // 4. หน้า Admin หลัก
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
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
              workerAccounts={workerAccounts}
            />
          </main>
        </>
      )}

      {/* 🟢 แก้ไขจุดนี้: ส่ง currentUser={{ role: userRole }} เข้าไปยัง ReportsView */}
      {currentView === 'reports' && (
        <ReportsView jobs={jobs} currentUser={{ role: userRole }} />
      )}

      {currentView === 'field' && (
        <FieldWorkerPortal 
          jobs={jobs} 
          onUpdateJobStatus={handleStatusChange} 
          teams={workerAccounts.map(w => w.teamName)}
          onLogout={handleWorkerLogout}
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
      />
    </div>
  );
}
