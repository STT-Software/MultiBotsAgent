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
 * - Usa la URL directa del backend (NEXT_PUBLIC_API_URL) para el WS,
 *   ya que Next.js rewrites no manejan WebSocket upgrades.
 * - Soporta React Strict Mode en desarrollo con un flag de montado.
 * - Implementa reconexión con backoff exponencial.
 */
export function useMetricasWs(): MetricasLiveState {
  const [state, setState] = useState<MetricasLiveState>(INITIAL_STATE);
  const retryCountRef = useRef(0);
  const timeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef     = useRef<Socket | null>(null);
  const mountedRef    = useRef(false); // protege contra el double-invoke de Strict Mode

  useEffect(() => {
    // Strict Mode en dev invoca el cleanup antes de re-montar.
    // Si el socket ya existe (segunda ejecución), no volvemos a crear uno.
    if (mountedRef.current) return;
    mountedRef.current = true;

    // El WS va directo al backend — los rewrites de Next.js no manejan upgrades WS.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const token  = AuthStore.getToken() ?? '';

    const socket = io(`${apiUrl}/metricas`, {
      query:       { token },
      transports:  ['websocket'],
      autoConnect: false,
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
        if (socketRef.current) socketRef.current.connect();
      }, delay);
    });

    socket.connect();

    return () => {
      clearBackoffTimeout();
      mountedRef.current = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Solo al montar

  return state;
}
