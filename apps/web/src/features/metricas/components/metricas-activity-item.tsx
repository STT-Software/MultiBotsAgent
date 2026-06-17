import {
  MessageCircle,
  AlertTriangle,
  HelpCircle,
  Tag,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  UserPlus,
  UserCheck,
  Clock,
} from 'lucide-react';
import type { FeedItem } from '../types/metricas.types';

const EVENT_LABELS: Record<string, string> = {
  'conversation.completed':  'Conversación resuelta',
  'conversation.escalated':  'Conversación escalada',
  'rag.no_answer':            'Pregunta sin respuesta (RAG)',
  'rag.topic_identified':     'Tema identificado',
  'order.initiated':          'Cotización iniciada',
  'order.confirmed':          'Pedido confirmado',
  'order.abandoned':          'Pedido abandonado',
  'appointment.scheduled':    'Cita agendada',
  'appointment.cancelled':    'Cita cancelada',
  'appointment.rescheduled':  'Cita reprogramada',
  'escalation.opened':        'Escalamiento abierto',
  'escalation.resolved':      'Escalamiento resuelto',
  'escalation.timeout':       'Escalamiento por timeout',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EVENT_ICONS: Record<string, React.ComponentType<any>> = {
  'conversation.completed':  CheckCircle2,
  'conversation.escalated':  AlertTriangle,
  'rag.no_answer':            HelpCircle,
  'rag.topic_identified':     Tag,
  'order.initiated':          ShoppingCart,
  'order.confirmed':          CheckCircle2,
  'order.abandoned':          XCircle,
  'appointment.scheduled':    CalendarCheck,
  'appointment.cancelled':    CalendarX,
  'appointment.rescheduled':  CalendarClock,
  'escalation.opened':        UserPlus,
  'escalation.resolved':      UserCheck,
  'escalation.timeout':       Clock,
};

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'ahora mismo';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  return `hace ${Math.floor(diffH / 24)}d`;
}

interface MetricasActivityItemProps {
  item: FeedItem;
}

export function MetricasActivityItem({ item }: MetricasActivityItemProps) {
  const label = EVENT_LABELS[item.eventType] ?? item.eventType;
  const Icon = EVENT_ICONS[item.eventType] ?? MessageCircle;

  return (
    <div className="flex items-center gap-3 py-2">
      <Icon size={16} style={{ color: '#00bb7a', flexShrink: 0 }} aria-hidden="true" />
      <span className="flex-1 text-sm truncate" style={{ color: '#c8d8cc' }}>
        {label}
      </span>
      <span className="text-xs whitespace-nowrap" style={{ color: '#5a6b5e' }}>
        {relativeTime(item.timestamp)}
      </span>
    </div>
  );
}
