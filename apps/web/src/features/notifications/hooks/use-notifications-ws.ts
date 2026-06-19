'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { AuthStore } from '@/lib/auth';

const BACKOFF_SEQUENCE = [1000, 2000, 4000, 8000, 16000, 30000]; // ms
const MAX_RETRIES = 10;

export interface NotificationItem {
  id: string;
  type?: 'escalation' | 'booking';
  conversationId?: string;
  bookingId?: string;
  customerName?: string;
  agentName: string;
  reason?: string;
  dateTime?: Date;
  timestamp: Date;
  read: boolean;
}

export interface NotificationsState {
  status: 'connecting' | 'connected' | 'reconnecting' | 'error';
  unreadCount: number;
  notifications: NotificationItem[];
}

const INITIAL_STATE: NotificationsState = {
  status: 'connecting',
  unreadCount: 0,
  notifications: [],
};

/**
 * Hook de React para conectar con el WebSocket Gateway de notificaciones.
 * Maneja el estado de notificaciones recibidas en tiempo real y la reconexión con backoff.
 */
export function useNotificationsWs() {
  const [state, setState] = useState<NotificationsState>(INITIAL_STATE);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const markAllAsRead = () => {
    setState((prev) => ({
      ...prev,
      unreadCount: 0,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  };

  const removeNotification = (id: string) => {
    setState((prev) => {
      const target = prev.notifications.find((n) => n.id === id);
      const isUnread = target && !target.read;
      return {
        ...prev,
        unreadCount: isUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
        notifications: prev.notifications.filter((n) => n.id !== id),
      };
    });
  };

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const token = AuthStore.getToken() ?? '';

    // Si ya existe un socket activo, limpiarlo
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    /**
     * Estrategia de conexión:
     * - Local: directo a localhost:3001 con WebSocket nativo (baja latencia)
     * - Deploy: vía proxy de Next.js rewrites (HTTPS, solo polling)
     *   → Evita Mixed Content al usar el mismo dominio de CloudFront
     */
    const isLocal = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');
    const socketUrl = isLocal ? `${apiUrl}/notifications` : '/notifications';
    const transports: ('websocket' | 'polling')[] = isLocal
      ? ['websocket', 'polling']
      : ['polling'];

    const socket = io(socketUrl, {
      query: { token },
      transports,
      autoConnect: false,
      reconnection: false, // Control manual
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

    socket.on('notification.new', (data: {
      type?: 'escalation' | 'booking';
      conversationId?: string;
      bookingId?: string;
      customerName?: string;
      agentName: string;
      reason?: string;
      dateTime?: string;
      timestamp: string;
    }) => {
      const newNotification: NotificationItem = {
        id: crypto.randomUUID(),
        type: data.type || 'escalation',
        conversationId: data.conversationId,
        bookingId: data.bookingId,
        customerName: data.customerName,
        agentName: data.agentName,
        reason: data.reason,
        dateTime: data.dateTime ? new Date(data.dateTime) : undefined,
        timestamp: new Date(data.timestamp),
        read: false,
      };

      setState((prev) => ({
        ...prev,
        unreadCount: prev.unreadCount + 1,
        notifications: [newNotification, ...prev.notifications].slice(0, 20),
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
  }, []);

  return {
    ...state,
    markAllAsRead,
    removeNotification,
  };
}
