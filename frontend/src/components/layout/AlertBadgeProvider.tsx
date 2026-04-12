'use client';

import { useWebSocket } from '@/lib/useWebSocket';
import { Sidebar } from './Sidebar';
import { usePoseidonStore } from '@/store/usePoseidonStore';

export function AlertBadgeProvider() {
  const { status } = useWebSocket();
  const alertCount = usePoseidonStore((state) => state.alerts.length);
  const clearAlerts = usePoseidonStore((state) => state.clearAlerts);

  return (
    <Sidebar
      alertCount={alertCount}
      wsStatus={status}
      onAcknowledgeAlerts={alertCount > 0 ? clearAlerts : undefined}
    />
  );
}
