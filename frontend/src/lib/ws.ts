'use client';

import { z } from 'zod';
import { useStore, type WsStatus } from '@/store/useStore';
import type { WsMessage } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001';
const TARGET_FPS = 10;
const FLUSH_INTERVAL_MS = Math.floor(1000 / TARGET_FPS);

const wsMessageSchema = z.union([
  z.object({
    channel: z.enum(['rainfall', 'tanks', 'quality', 'irrigation', 'usage', 'alerts', 'system_state', 'system_control']),
    data: z.unknown(),
  }),
  z.object({
    type: z.enum(['rainfall', 'tanks', 'quality', 'irrigation', 'usage', 'alerts', 'system_state', 'system_control']),
    payload: z.unknown(),
  }),
]);

type ChannelCallback = (payload: unknown) => void;

const channelListeners = new Map<string, Set<ChannelCallback>>();
const statusListeners = new Set<(status: WsStatus) => void>();

let subscriberCount = 0;
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let retryAttempt = 0;
let status: WsStatus = 'connecting';
const queue: WsMessage<unknown>[] = [];

function emitStatus(nextStatus: WsStatus): void {
  status = nextStatus;
  useStore.getState().setWsStatus(nextStatus);
  statusListeners.forEach((cb) => cb(nextStatus));
}

function scheduleReconnect(): void {
  if (subscriberCount === 0 || reconnectTimer) return;
  const delay = Math.min(1000 * 2 ** retryAttempt, 30000);
  retryAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function applyChaos(message: any): any[] {
  return [message];
}

function flushQueue(): void {
  if (queue.length === 0) return;

  const batch = queue.splice(0, queue.length);
  for (const message of batch) {
    useStore.getState().ingestMessage(message);
    const channel = 'channel' in message ? (message as any).channel : (message as any).type;
    const data = 'data' in message ? (message as any).data : (message as any).payload;
    channelListeners.get(channel)?.forEach((callback) => callback(data));
  }
}

function connect(): void {
  if (socket || subscriberCount === 0) return;

  emitStatus('connecting');
  socket = new WebSocket(WS_URL);

  if (!flushTimer) {
    flushTimer = setInterval(flushQueue, FLUSH_INTERVAL_MS);
  }

  socket.onopen = () => {
    retryAttempt = 0;
    emitStatus('connected');
  };

  socket.onmessage = (event) => {
    try {
      const parsed = wsMessageSchema.safeParse(JSON.parse(event.data));
      if (!parsed.success) return;

      const jitterDelayMs = useStore.getState().chaos.enabled
        ? Math.floor(Math.random() * 250 * useStore.getState().chaos.intensity)
        : 0;

      const candidates = applyChaos(parsed.data as WsMessage<unknown>);
      if (jitterDelayMs > 0) {
        setTimeout(() => {
          queue.push(...candidates);
        }, jitterDelayMs);
      } else {
        queue.push(...candidates);
      }
    } catch {
      // Ignore malformed messages.
    }
  };

  socket.onclose = () => {
    socket = null;
    emitStatus('disconnected');
    scheduleReconnect();
  };

  socket.onerror = () => {
    socket?.close();
  };
}

function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  queue.length = 0;
  socket?.close();
  socket = null;
}

export function subscribeToChannel(channel: string, callback: ChannelCallback): () => void {
  if (!channelListeners.has(channel)) {
    channelListeners.set(channel, new Set<ChannelCallback>());
  }
  channelListeners.get(channel)?.add(callback);

  return () => {
    channelListeners.get(channel)?.delete(callback);
  };
}

export function attachRealtimeSync(onStatusChange: (status: WsStatus) => void): () => void {
  subscriberCount += 1;
  statusListeners.add(onStatusChange);
  onStatusChange(status);
  connect();

  return () => {
    subscriberCount -= 1;
    statusListeners.delete(onStatusChange);
    if (subscriberCount <= 0) {
      disconnect();
    }
  };
}
