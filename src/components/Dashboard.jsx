import React from 'react';
import { Wrench, Clock, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';

export default function Dashboard({ stats, jobs }) {
  return (
    <div className="space-y-6">
      {/* Cards สถิติภาพรวม */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">งานทั้งหมด</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">รอดำเนินการ</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">กำลังดำเนินการ / ซ่อม</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</h3>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">ปิดงานสำเร็จ</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* แบนเนอร์ต้อนรับหรือสรุปย่อ */}
      <div className="bg-linear-to-r from-blue-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-lg font-bold">การประปาส่วนภูมิภาค สาขาธาตุพนม</h2>
          <p className="text-xs text-slate-300">ระบบติดตามและบันทึกประวัติซ่อมบำรุงท่อประปาออนไลน์ (Archive & Real-time Sync)</p>
        </div>
        <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-xl backdrop-blur-md text-xs font-medium text-cyan-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          ระบบฐานข้อมูล Google Sheets พร้อมใช้งาน
        </div>
      </div>
    </div>
  );
}