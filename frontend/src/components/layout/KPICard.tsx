'use client';

import { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
  warning?: boolean; // Legacy support
  icon?: ReactNode;
}

export function KPICard({ label, value, unit, status, warning = false, icon }: KPICardProps) {
  const currentStatus = status || (warning ? 'critical' : 'normal');

  const statusStyles = {
    normal: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    warning: 'border-amber-200 bg-amber-50 text-amber-600',
    critical: 'border-rose-200 bg-rose-50 text-rose-600',
  };

  const borderStyle = {
    normal: 'border-emerald-200',
    warning: 'border-amber-200',
    critical: 'border-rose-200',
  };

  const bgStyle = {
    normal: 'bg-emerald-50',
    warning: 'bg-amber-50',
    critical: 'bg-rose-50',
  };

  const textStyle = {
    normal: 'text-emerald-600',
    warning: 'text-amber-600',
    critical: 'text-rose-600',
  };

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm flex flex-col gap-1 transition-colors ${
        currentStatus === 'normal' ? 'border-slate-200 bg-white' : `${borderStyle[currentStatus]} ${bgStyle[currentStatus]}`
      }`}
    >
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
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
