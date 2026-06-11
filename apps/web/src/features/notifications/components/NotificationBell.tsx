'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '../context/NotificationsContext';

/**
 * Componente interactivo de campana de notificaciones.
 * Muestra las alertas de escalamiento en tiempo real, permite marcarlas como leídas o descartarlas,
 * y redirige al operador al inbox de la conversación específica.
 */
export function NotificationBell() {
  const { unreadCount, notifications, markAllAsRead, removeNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Cerrar popover al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleNotificationClick = (conversationId: string, id: string) => {
    removeNotification(id);
    setOpen(false);
    
    // Normalizar ID de conversación para URL de redirección
    const cleanId = conversationId.replace('whatsapp_', '');
    router.push(`/inbox?conversationId=${cleanId}`);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#bbcabe] opacity-80 transition-all hover:bg-[#2f3731] hover:text-emerald-400 hover:opacity-100"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Campana de notificaciones"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        )}
      </button>

      {/* Popover de notificaciones */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-[#3c4a41] bg-[#1a2420] py-2 shadow-xl shadow-black/50 z-50">
          <div className="flex items-center justify-between border-b border-[#3c4a41]/60 px-4 pb-2 pt-1">
            <h3 className="text-xs font-semibold text-[#dde5dc]">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Check className="h-3 w-3" />
                Marcar leídas
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="h-8 w-8 text-[#bbcabe]/35 mb-2" strokeWidth={1} />
                <p className="text-xs text-[#bbcabe]/60">Sin notificaciones pendientes</p>
              </div>
            ) : (
              <div className="divide-y divide-[#3c4a41]/40">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[#2f3731] ${
                      !n.read ? 'bg-[#242c27]/40' : ''
                    }`}
                    onClick={() => handleNotificationClick(n.conversationId, n.id)}
                  >
                    <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1.5 text-emerald-400 group-hover:bg-emerald-500/20">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-xs font-medium text-[#dde5dc] truncate">
                        Conversación Escalada
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#bbcabe] leading-normal line-clamp-2">
                        El agente <strong className="text-emerald-400">{n.agentName}</strong> escaló una conversación. Motivo: {n.reason}
                      </p>
                      <span className="mt-1 block text-[10px] text-[#bbcabe]/50">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Botón para descartar/eliminar individualmente */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(n.id);
                      }}
                      className="absolute top-3 right-3 text-[#bbcabe]/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded"
                      aria-label="Descartar notificación"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
