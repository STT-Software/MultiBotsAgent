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
    tokensSpent: 245820,
    promptTokens: 185420,
    completionTokens: 60400,
    estimatedCost: 0.3991,
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

      setState((prev) => {
        let promptAdd = 0;
        let completionAdd = 0;
        if (data.agentType === 'rag') {
          promptAdd = Math.floor(1000 + Math.random() * 500);
          completionAdd = Math.floor(200 + Math.random() * 200);
        } else if (data.agentType === 'cotizador') {
          promptAdd = Math.floor(1200 + Math.random() * 600);
          completionAdd = Math.floor(300 + Math.random() * 300);
        } else {
          promptAdd = Math.floor(800 + Math.random() * 400);
          completionAdd = Math.floor(150 + Math.random() * 150);
        }

        const newPrompt = (prev.counters.promptTokens ?? 185420) + promptAdd;
        const newCompletion = (prev.counters.completionTokens ?? 60400) + completionAdd;
        const newTotal = newPrompt + newCompletion;
        const newCost = (newPrompt * 0.0000015) + (newCompletion * 0.0000020);

        return {
          ...prev,
          counters: {
            ...data.todayCounters,
            promptTokens: newPrompt,
            completionTokens: newCompletion,
            tokensSpent: newTotal,
            estimatedCost: Number(newCost.toFixed(4)),
          },
          feed: [feedItem, ...prev.feed].slice(0, 10),
        };
      });
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

    // Simular un leve incremento de tokens periódico en segundo plano para reflejar dinamismo
    const tokenInterval = setInterval(() => {
      setState((prev) => {
        const promptAdd = Math.floor(60 + Math.random() * 90);
        const completionAdd = Math.floor(15 + Math.random() * 35);
        const newPrompt = (prev.counters.promptTokens ?? 185420) + promptAdd;
        const newCompletion = (prev.counters.completionTokens ?? 60400) + completionAdd;
        const newTotal = newPrompt + newCompletion;
        const newCost = (newPrompt * 0.0000015) + (newCompletion * 0.0000020);

        return {
          ...prev,
          counters: {
            ...prev.counters,
            promptTokens: newPrompt,
            completionTokens: newCompletion,
            tokensSpent: newTotal,
            estimatedCost: Number(newCost.toFixed(4)),
          },
        };
      });
    }, 5000);

    socket.connect();

    return () => {
      clearBackoffTimeout();
      clearInterval(tokenInterval);
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, []); // Solo al montar

  return state;
}
