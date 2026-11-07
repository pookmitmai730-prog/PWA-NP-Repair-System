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
import RepairCostForm from './components/RepairCostForm';
import { LayoutDashboard, Smartphone, BarChart3, LogOut, Shield, UserCheck, RefreshCw, Calculator } from 'lucide-react';

// 🌐 URL ของ Google Apps Script Web App
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydqD3x19rIfyttJPLhZung7NxIBh4LXetkGlZbhW4GmqLtJ-LI6HQ0vX-p_vrJ-QsH9w/exec";

export default function App() {
  const [userRole, setUserRole] = useState(localStorage.getItem('pwa_user_role') || 'portal');
  const [activeWorkerTeam, setActiveWorkerTeam] = useState(localStorage.getItem('pwa_worker_team') || '');

  // เปลี่ยน currentView ให้รองรับค่า 'repair_cost' สำหรับการแสดงผลเต็มหน้าจอ
  const [currentView, setCurrentView] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminManageOpen, setIsAdminManageOpen] = useState(false);

  // ☁️ บัญชีผู้ใช้งานและข้อมูลใบงานดึงตรงจาก Google Sheets 100%
  const [adminUsers, setAdminUsers] = useState([]);
  const [workerAccounts, setWorkerAccounts] = useState([]);

  // 🔄 ฟังก์ชันดึงข้อมูลใบงาน (Jobs) จาก Google Sheets (ชีต Jobs_Archive)
  const fetchJobsFromSheet = async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch(`${WEB_APP_URL}?action=get_jobs`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
      } else if (data && data.jobs) {
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error("Error fetching jobs from Google Sheets:", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchDataFromSheet = async () => {
    try {
      const adminRes = await fetch(`${WEB_APP_URL}?action=admins`);
      const adminData = await adminRes.json();
      if (Array.isArray(adminData)) setAdminUsers(adminData);

      const workerRes = await fetch(`${WEB_APP_URL}?action=teams`);
      const workerData = await workerRes.json();
      if (Array.isArray(workerData)) setWorkerAccounts(workerData);

      await fetchJobsFromSheet();
    } catch (err) {
      console.error("Error fetching data from Google Sheets:", err);
    }
  };

  useEffect(() => {
    fetchDataFromSheet();
  }, []);

  // 🛡️ จัดการบันทึก/ลบ Admins ใน Google Sheets
  const handleAddAdmin = async (newAdmin) => {
    try {
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "save_admin", data: newAdmin })
      });
      alert("บันทึกแอดมินลง Google Sheets เรียบร้อยแล้ว!");
      fetchDataFromSheet();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleEditAdmin = async (id, updatedAdmin) => {
    await handleAddAdmin(updatedAdmin);
  };

  const handleDeleteAdmin = async (username) => {
    if (window.confirm(`คุณต้องการลบแอดมิน "${username}" ใช่หรือไม่?`)) {
      try {
        await fetch(WEB_APP_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: "delete_admin", data: { username } })
        });
        alert("ลบแอดมินเรียบร้อยแล้ว!");
        fetchDataFromSheet();
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการลบ");
      }
    }
  };

  // 👥 จัดการบันทึก/ลบ Workers ใน Google Sheets
  const handleAddWorkerAccount = async (newWorker) => {
    try {
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "save_worker", data: newWorker })
      });
      alert("บันทึกทีมช่างลง Google Sheets เรียบร้อยแล้ว!");
      fetchDataFromSheet();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleEditWorkerAccount = async (id, updatedWorker) => {
    await handleAddWorkerAccount(updatedWorker);
  };

  const handleDeleteWorkerAccount = async (id, username, teamName) => {
    const targetName = teamName || username || id;
    if (window.confirm(`คุณต้องการลบบัญชีช่าง "${targetName}" ใช่หรือไม่?`)) {
      try {
        await fetch(WEB_APP_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: "delete_worker", 
            data: { username: username || targetName, teamName: teamName || targetName } 
          })
        });
        alert("ลบบัญชีช่างเรียบร้อยแล้ว!");
        fetchDataFromSheet();
      } catch (err) {
        console.error("Error deleting worker:", err);
        alert("เกิดข้อผิดพลาดในการลบ");
      }
    }
  };

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
    setCurrentView('dashboard');
  };

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => (j.Status || j.status) === 'PENDING').length,
    inProgress: jobs.filter(j => (j.Status || j.status) === 'DISPATCHED' || (j.Status || j.status) === 'IN_PROGRESS').length,
    completed: jobs.filter(j => (j.Status || j.status) === 'COMPLETED').length,
  };

  const handleCreateJob = async (newJobData) => {
    const jobId = newJobData.receivedNo || `S${Date.now()}`;
    const fullJob = {
      JobID: jobId,
      Timestamp: newJobData.receivedAt || new Date().toISOString().replace('T', ' ').substring(0, 16),
      ReporterName: newJobData.reporterName || '',
      Phone: newJobData.phone || '',
      Location: newJobData.location || '',
      IssueType: newJobData.complaintTopic || newJobData.issueType || '',
      PipeType: newJobData.pipeType || '',
      PipeSize: newJobData.pipeSize || '',
      Description: newJobData.notes || newJobData.description || '',
      Technician: 'ยังไม่ระบุทีมช่าง',
      Status: 'PENDING',
      BeforeImg: newJobData.beforeImg || '',
      InProgImg: newJobData.inProgImg || '',
      AfterImg: newJobData.afterImg || '',
      Notes: newJobData.notes || '',
      ClosedAt: ''
    };

    try {
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "save_job", data: fullJob })
      });
      alert(`บันทึกใบรับแจ้งเรียบร้อยแล้ว! เลขที่รับแจ้ง: ${jobId}`);
      setIsModalOpen(false);
      fetchJobsFromSheet();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleStatusChange = async (jobId, newStatus, extraData = {}) => {
    const currentJob = jobs.find(j => j.JobID === jobId || j.id === jobId || j.receivedNo === jobId);
    if (!currentJob) return;

    const assignedTechnician = extraData.technician || (newStatus !== 'PENDING' 
      ? (currentJob.Technician && !currentJob.Technician.includes('ยังไม่ระบุ') 
          ? currentJob.Technician 
          : (workerAccounts[0] ? `${workerAccounts[0].teamName}` : 'ทีมช่าง กปภ.')) 
      : currentJob.Technician);

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedData = {
      ...currentJob,
      ...extraData,
      JobID: currentJob.JobID || currentJob.id || jobId,
      Status: newStatus,
      Technician: assignedTechnician,
      ClosedAt: newStatus === 'COMPLETED' ? (extraData.completedAt || nowStr) : (currentJob.ClosedAt || '')
    };

    try {
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "update_job", data: updatedData })
      });
      fetchJobsFromSheet();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

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

  if (userRole === 'public') {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans">
        <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center max-w-7xl mx-auto">
          <span className="font-bold text-sm tracking-wide text-cyan-400">PWA EXPRESS TRACKING</span>
          <button onClick={handleLogout} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" /> กลับหน้าหลัก
          </button>
        </div>
        <main className="max-w-4xl mx-auto p-4 sm:p-8 pt-10">
          <TrackingSearch jobs={jobs} />
        </main>
      </div>
    );
  }

  if (userRole === 'worker') {
    return (
      <div className="min-h-screen bg-slate-100 font-sans">
        <FieldWorkerPortal 
          jobs={jobs} 
          onUpdateJobStatus={handleStatusChange} 
          teams={workerAccounts.map(w => w.teamName)}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="bg-slate-900 text-white py-2 px-4 text-xs flex flex-wrap justify-between items-center border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
            <Shield className="w-3 h-3" /> ADMIN
          </span>
          <span className="font-bold text-slate-200">สิทธิ์ผู้ดูแลระบบ (Google Sheets Database)</span>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <button onClick={fetchJobsFromSheet} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingJobs ? 'animate-spin' : ''}`} /> <span>รีเฟรช</span>
          </button>

          <button onClick={() => setCurrentView('dashboard')} className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${currentView === 'dashboard' ? 'bg-blue-600 font-bold text-white' : 'text-slate-400 hover:text-white'}`}>
            <LayoutDashboard className="w-3.5 h-3.5" /> <span>ศูนย์ควบคุม</span>
          </button>

          {/* 🌟 ปุ่ม "ฟอร์มจ้างซ่อม" เปลี่ยนเป็นเปลี่ยน View เป็น 'repair_cost' เพื่อแสดงผลเต็มหน้าจอทันที */}
          <button 
            onClick={() => setCurrentView('repair_cost')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${currentView === 'repair_cost' ? 'bg-emerald-600 font-bold text-white' : 'bg-emerald-600/80 hover:bg-emerald-600 text-white'}`}
            title="เปิดฟอร์มจ้างซ่อมแบบเต็มหน้าจอ"
          >
            <Calculator className="w-3.5 h-3.5" /> <span>ฟอร์มจ้างซ่อม</span>
          </button>

          <button onClick={() => setCurrentView('reports')} className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${currentView === 'reports' ? 'bg-indigo-600 font-bold text-white' : 'text-slate-400 hover:text-white'}`}>
            <BarChart3 className="w-3.5 h-3.5" /> <span>รายงาน</span>
          </button>

          <button onClick={() => setCurrentView('field')} className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${currentView === 'field' ? 'bg-emerald-600 font-bold text-white' : 'text-slate-400 hover:text-white'}`}>
            <Smartphone className="w-3.5 h-3.5" /> <span>จำลองหน้าช่าง</span>
          </button>

          <button onClick={() => setIsAdminManageOpen(true)} className="bg-indigo-950 border border-indigo-700 hover:bg-indigo-900 text-indigo-300 font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" /> ตั้งค่าแอดมิน/ช่าง
          </button>

          <button onClick={handleLogout} className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {currentView === 'dashboard' && (
        <>
          <Navbar onOpenModal={() => setIsModalOpen(true)} />
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

      {/* 🌟 หน้าจอแสดงผลแบบเต็มหน้าจอ เมื่อเลือก View เป็น 'repair_cost' */}
      {currentView === 'repair_cost' && (
        <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <h1 className="font-bold text-lg text-slate-800">ระบบฟอร์มควบคุมและประมาณการค่าซ่อมท่อ</h1>
              <p className="text-xs text-slate-500">การประปาส่วนภูมิภาคสาขานครพนม (แสดงผลแบบเต็มหน้าจอ)</p>
            </div>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              ← กลับหน้าศูนย์ควบคุม
            </button>
          </div>
          
          <RepairCostForm 
            jobs={jobs}
            onSubmitCost={async (costPayload) => {
              alert(`บันทึกข้อมูลจ้างเหมาซ่อมท่อสำเร็จ!\nยอดรวมสุทธิ: ฿${costPayload.grandTotal.toLocaleString()} บาท`);
              setCurrentView('dashboard');
            }}
          />
        </main>
      )}

      {currentView === 'reports' && <ReportsView jobs={jobs} />}

      {currentView === 'field' && (
        <FieldWorkerPortal 
          jobs={jobs} 
          onUpdateJobStatus={handleStatusChange} 
          teams={workerAccounts.map(w => w.teamName)}
          onLogout={handleLogout}
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
        onDeleteAdmin={(id, username) => handleDeleteAdmin(username)}
        workerAccounts={workerAccounts}
        onAddWorkerAccount={handleAddWorkerAccount}
        onEditWorkerAccount={handleEditWorkerAccount}
        onDeleteWorkerAccount={(id, username, teamName) => handleDeleteWorkerAccount(id, username, teamName)}
      />
    </div>
  );
}
