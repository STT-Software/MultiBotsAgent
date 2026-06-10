'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { AuthStore } from '@/lib/auth';
import type { FeedItem, LiveMetricUpdate, MetricasLiveState } from '../types/metricas.types';

const BACKOFF_SEQUENCE = [1000, 2000, 4000, 8000, 16000, 30000]; // ms
const MAX_RETRIES = 10;

const INITIAL_STATE: MetricasLiveState = {
  status: 'connecting',
  counters: {
    conversationsResolved: 0,
    conversationsActive: 0,
    escalationsOpen: 0,
  },
  feed: [],
};

/**
 * Hook que abre una conexión WebSocket al namespace /metricas del backend.
 *
 * Notas de implementación:
 * - El WS va directo al backend (NEXT_PUBLIC_API_URL) sin pasar por Next.js,
 *   porque los rewrites de Next.js no trasladan WebSocket upgrades.
 * - El error "WebSocket closed before connection established" en desarrollo
 *   es normal: React Strict Mode invoca el cleanup/remount. El socket se
 *   reconecta en el segundo montaje y funciona correctamente.
 * - autoConnect: false + connect manual permite que el cleanup cierre limpio.
 */
export function useMetricasWs(): MetricasLiveState {
  const [state, setState] = useState<MetricasLiveState>(INITIAL_STATE);
  const retryCountRef = useRef(0);
  const timeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef     = useRef<Socket | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const token  = AuthStore.getToken() ?? '';

    // Si ya hay un socket activo (Strict Mode re-mount), desconectarlo primero
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(`${apiUrl}/metricas`, {
      query:       { token },
      transports:  ['polling', 'websocket'],
      autoConnect: false,
      reconnection: false, // gestionamos reconexión manualmente con backoff
    });

    socketRef.current = socket;

    function clearBackoffTimeout() {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    socket.on('connect', () => {
      clearBackoffTimeout();
      retryCountRef.current = 0;
      socket.emit('subscribe');
      setState((prev) => ({ ...prev, status: 'connected' }));
    });

    socket.on('metrics.live_update', (data: LiveMetricUpdate) => {
      const feedItem: FeedItem = {
        id:        crypto.randomUUID(),
        eventType: data.eventType,
        agentType: data.agentType,
        timestamp: new Date(data.timestamp),
      };

      setState((prev) => ({
        ...prev,
        counters: { ...data.todayCounters },
        feed:     [feedItem, ...prev.feed].slice(0, 10),
      }));
    });

    socket.on('disconnect', () => {
      const retryCount = retryCountRef.current;

      if (retryCount >= MAX_RETRIES) {
        setState((prev) => ({ ...prev, status: 'error' }));
        return;
      }

      setState((prev) => ({ ...prev, status: 'reconnecting' }));

      const delay = BACKOFF_SEQUENCE[Math.min(retryCount, BACKOFF_SEQUENCE.length - 1)];
      retryCountRef.current = retryCount + 1;

      timeoutRef.current = setTimeout(() => {
        if (socketRef.current === socket) {
          socket.connect();
        }
      }, delay);
    });

    socket.connect();

    return () => {
      clearBackoffTimeout();
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, []); // Solo al montar

  return state;
}
