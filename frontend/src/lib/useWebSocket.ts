'use client';

import { useCallback, useEffect, useState } from 'react';
import { attachRealtimeSync, subscribeToChannel } from '@/lib/ws';
import { useStore, type WsStatus } from '@/store/useStore';

type ChannelCallback = (data: unknown) => void;

const currentStatus = useStore.getState().wsStatus;

export function useWebSocket() {
  const [status, setLocalStatus] = useState<WsStatus>(currentStatus);

  useEffect(() => {
    return attachRealtimeSync(setLocalStatus);
  }, []);

  const subscribe = useCallback((channel: string, callback: ChannelCallback) => {
    return subscribeToChannel(channel, callback);
  }, []);

  return { subscribe, status };
}
