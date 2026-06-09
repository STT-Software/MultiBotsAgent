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
 * Implementa reconexión con backoff exponencial.
 * Se desconecta limpiamente al desmontar el componente.
 */
export function useMetricasWs(): MetricasLiveState {
  const [state, setState] = useState<MetricasLiveState>(INITIAL_STATE);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
    const token = AuthStore.getToken() ?? '';

    const socket = io(`${apiUrl}/metricas`, {
      query: { token },
      transports: ['websocket'],
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
        id: crypto.randomUUID(),
        eventType: data.eventType,
        agentType: data.agentType,
        timestamp: new Date(data.timestamp),
      };

      setState((prev) => ({
        ...prev,
        counters: { ...data.todayCounters },
        feed: [feedItem, ...prev.feed].slice(0, 10),
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
        socket.connect();
      }, delay);
    });

    socket.connect();

    return () => {
      clearBackoffTimeout();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Solo al montar — el socket es persistente durante toda la sesión de la vista

  return state;
}
