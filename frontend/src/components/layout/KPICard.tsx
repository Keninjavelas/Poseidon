'use client';

import { ReactNode } from 'react';

type KPICardProps = {
  label: string;
  value: string;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
  icon?: React.ReactNode;
  color?: string;
};

export function KPICard({ label, value, unit, status, icon, color }: KPICardProps) {
  const currentStatus = status || 'normal';

  const statusStyles = {
    normal: 'border-slate-200 bg-white',
    warning: 'border-amber-200 bg-amber-50',
    critical: 'border-rose-200 bg-rose-50',
  };

  const textStyle = {
    normal: 'text-slate-900',
    warning: 'text-amber-600',
    critical: 'text-rose-600',
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm flex flex-col gap-1 transition-colors ${statusStyles[currentStatus]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        {icon && <div className={color || 'text-white'}>{icon}</div>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${currentStatus === 'normal' ? 'text-slate-900' : textStyle[currentStatus]}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      {currentStatus !== 'normal' && (
        <span className={`text-xs font-medium ${textStyle[currentStatus]}`}>
          {currentStatus === 'critical' ? '⚠ Critical' : '⚠ Warning'}
        </span>
      )}
    </div>
  );
}
