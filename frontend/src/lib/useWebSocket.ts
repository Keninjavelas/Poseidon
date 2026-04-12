'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WsMessage } from '@/types';
import { usePoseidonStore } from '@/store/usePoseidonStore';

type ChannelCallback = (data: unknown) => void;
export type WsStatus = 'connecting' | 'connected' | 'disconnected';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001';

const channelListeners = new Map<string, Set<ChannelCallback>>();
const statusListeners = new Set<(status: WsStatus) => void>();
let sharedSocket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let subscriberCount = 0;
let currentStatus: WsStatus = 'connecting';
let retryAttempt = 0;

function setStatus(status: WsStatus) {
  currentStatus = status;
  usePoseidonStore.getState().setWsStatus(status);
  statusListeners.forEach((listener) => listener(status));
}

function connect() {
  if (sharedSocket || subscriberCount === 0) return;

  setStatus('connecting');
  const socket = new WebSocket(WS_URL);
  sharedSocket = socket;

  socket.onopen = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    retryAttempt = 0;
    setStatus('connected');
  };

  socket.onmessage = (event) => {
    try {
      const message: WsMessage<unknown> = JSON.parse(event.data);
      usePoseidonStore.getState().ingestMessage(message);
      channelListeners.get(message.channel)?.forEach((listener) => listener(message.data));
    } catch {
      // ignore malformed messages
    }
  };

  socket.onclose = () => {
    sharedSocket = null;
    setStatus('disconnected');
    if (subscriberCount > 0) {
      const delay = Math.min(1000 * 2 ** retryAttempt, 30000);
      retryAttempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    }
  };

  socket.onerror = () => {
    socket.close();
  };
}

export function useWebSocket() {
  const [status, setLocalStatus] = useState<WsStatus>(currentStatus);

  useEffect(() => {
    subscriberCount += 1;
    setLocalStatus(currentStatus);
    statusListeners.add(setLocalStatus);
    connect();

    return () => {
      subscriberCount -= 1;
      statusListeners.delete(setLocalStatus);
      if (subscriberCount === 0) {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        sharedSocket?.close();
        sharedSocket = null;
      }
    };
  }, []);

  const subscribe = useCallback((channel: string, callback: ChannelCallback) => {
    if (!channelListeners.has(channel)) {
      channelListeners.set(channel, new Set());
    }
    channelListeners.get(channel)!.add(callback);
    return () => {
      channelListeners.get(channel)?.delete(callback);
    };
  }, []);

  return { subscribe, status };
}
