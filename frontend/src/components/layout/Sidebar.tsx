'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { WsStatus } from '@/store/useStore';

const NAV_LINKS = [
  { href: '/digital-twin', label: 'Digital Twin' },
  { href: '/map', label: 'Map' },
  { href: '/usage', label: 'Water Usage' },
  { href: '/rainfall', label: 'Rainfall' },
  { href: '/harvesting', label: 'Harvesting' },
  { href: '/quality', label: 'Water Quality' },
  { href: '/agriculture', label: 'Agricultural' },
];

const STATUS_COLORS: Record<WsStatus, string> = {
  connected: 'bg-green-400',
  connecting: 'bg-yellow-400 animate-pulse',
  disconnected: 'bg-red-500 animate-pulse',
};

const STATUS_LABELS: Record<WsStatus, string> = {
  connected: 'Live',
  connecting: 'Connecting…',
  disconnected: 'Reconnecting…',
};

interface SidebarProps {
  alertCount?: number;
  wsStatus?: WsStatus;
  onAcknowledgeAlerts?: () => void;
}

export function Sidebar({ alertCount = 0, wsStatus = 'connecting', onAcknowledgeAlerts }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col py-6 px-4 gap-2 shrink-0">
      <div className="mb-4">
        <h1 className="text-lg font-bold tracking-tight text-blue-400">Poseidon</h1>
        <p className="text-xs text-gray-400">Smart Water Hub</p>
      </div>

      {/* WS connection status */}
      <div className="flex items-center gap-2 px-1 mb-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[wsStatus]}`} />
        <span className="text-xs text-gray-400">{STATUS_LABELS[wsStatus]}</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {alertCount > 0 && (
        <div className="mt-auto pt-4 border-t border-gray-700 flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/40 text-red-300 text-sm">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold shrink-0">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
            <span>Unacknowledged</span>
          </div>
          {onAcknowledgeAlerts && (
            <button
              onClick={onAcknowledgeAlerts}
              className="text-xs text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-800 transition-colors text-left"
            >
              ✓ Acknowledge all
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
