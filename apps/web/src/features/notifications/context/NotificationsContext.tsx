'use client';

import React, { createContext, useContext } from 'react';
import { useNotificationsWs } from '../hooks/use-notifications-ws';
import type { NotificationsState } from '../hooks/use-notifications-ws';

interface NotificationsContextType extends NotificationsState {
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

/**
 * Provider global para el feature de notificaciones.
 * Centraliza la conexión WebSocket de Socket.io para compartirla en toda la aplicación.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const notifications = useNotificationsWs();

  return (
    <NotificationsContext.Provider value={notifications}>
      {children}
    </NotificationsContext.Provider>
  );
}

/**
 * Hook para acceder de forma segura al contexto de notificaciones en cualquier componente.
 */
export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications debe ser usado dentro de un NotificationsProvider');
  }
  return context;
}
