import React from 'react';
import { Wrench, Database, PlusCircle } from 'lucide-react';

export default function Navbar({ onOpenModal, onSyncSheets, isSyncing }) {
  return (
    <header className="bg-linear-to-r from-blue-700 via-blue-600 to-cyan-600 text-white shadow-lg sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
            <Wrench className="w-7 h-7 text-cyan-300" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">ระบบติดตามงานซ่อมท่อประปา</h1>
            <p className="text-xs text-blue-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Real-time Tracking & Hybrid Sync
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={onSyncSheets}
            disabled={isSyncing}
            className="hidden sm:flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl text-xs font-medium transition border border-white/20 active:scale-95 disabled:opacity-50"
            title="ซิงค์ประวัติเคสที่ปิดแล้วลง Google Sheets"
          >
            <Database className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'กำลังซync...' : 'ซิงค์ Google Sheets'}</span>
          </button>

          <button 
            onClick={onOpenModal}
            className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition transform active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            <span>รับเรื่องแจ้งซ่อม</span>
          </button>
        </div>
      </div>
    </header>
  );
}