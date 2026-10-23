import React from 'react';
import { FileText, Clock, Truck, CheckCircle2 } from 'lucide-react';

export default function StatsOverview({ stats }) {
  const cards = [
    {
      label: 'งานทั้งหมดวันนี้',
      value: stats.total,
      textColor: 'text-slate-800',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      icon: FileText
    },
    {
      label: 'รอดำเนินการ / รับเรื่อง',
      value: stats.pending,
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      icon: Clock
    },
    {
      label: 'กำลังดำเนินการซ่อม',
      value: stats.inProgress,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      icon: Truck
    },
    {
      label: 'ปิดงานสำเร็จแล้ว',
      value: stats.completed,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-600',
      iconColor: 'text-emerald-600',
      icon: CheckCircle2
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
            <div>
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.textColor}`}>{card.value}</p>
            </div>
            <div className={`p-3 rounded-xl ${card.bgColor} ${card.iconColor}`}>
              <IconComponent className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}