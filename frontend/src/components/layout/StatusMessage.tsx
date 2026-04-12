'use client';

interface Props {
  type: 'loading' | 'error' | 'empty';
  message?: string;
}

export function StatusMessage({ type, message }: Props) {
  if (type === 'loading') {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
        <span className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        <span className="text-sm">{message ?? 'Loading data…'}</span>
      </div>
    );
  }
  if (type === 'error') {
    return (
      <div className="flex items-center justify-center h-40 text-red-400 text-sm gap-2">
        <span>⚠</span>
        <span>{message ?? 'Failed to load data. Is the backend running?'}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
      {message ?? 'No data yet — waiting for the simulator…'}
    </div>
  );
}
