'use client';

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  warning?: boolean;
}

export function KPICard({ label, value, unit, warning = false }: KPICardProps) {
  return (
    <div
      className={`rounded-xl border p-4 bg-white shadow-sm flex flex-col gap-1 ${
        warning ? 'border-red-500 bg-red-50' : 'border-gray-200'
      }`}
    >
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${warning ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {warning && (
        <span className="text-xs text-red-500 font-medium">⚠ Warning</span>
      )}
    </div>
  );
}
