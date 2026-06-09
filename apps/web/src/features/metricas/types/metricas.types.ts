// ─── Períodos y filtros ───────────────────────────────────────────────────────

export type MetricPeriod = '24h' | '7d' | '30d';
export type AgentTypeFilter = 'todos' | 'rag' | 'cotizador' | 'agendamiento';

// ─── WebSocket — Contrato del servidor (espejo de LiveMetricUpdate backend) ───

export interface LiveMetricUpdate {
  companyId: string;
  agentId: string;
  agentType: 'rag' | 'cotizador' | 'agendamiento';
  eventType: string;
  timestamp: string; // ISO string
  todayCounters: {
    conversationsResolved: number;
    conversationsActive: number;
    escalationsOpen: number;
  };
}

// ─── Estado del hook WebSocket ────────────────────────────────────────────────

export interface FeedItem {
  id: string; // crypto.randomUUID() — key de React
  eventType: string;
  agentType: 'rag' | 'cotizador' | 'agendamiento';
  timestamp: Date;
}

export interface MetricasLiveState {
  status: 'connecting' | 'connected' | 'reconnecting' | 'error';
  counters: {
    conversationsResolved: number;
    conversationsActive: number;
    escalationsOpen: number;
  };
  feed: FeedItem[]; // máximo 10 ítems
}

// ─── REST — Espejo de GeneralMetricsDto del backend ──────────────────────────

export interface GeneralMetricsResponse {
  period: MetricPeriod;
  totalConversations: number;
  resolutionRate: number;     // 0-1
  totalEscalations: number;
  escalationRate: number;     // 0-1
  topTopics: { topic: string; count: number }[];
  avgEscalationResolutionMinutes: number;
}

// ─── REST — Espejo de AgentMetricsDto del backend ────────────────────────────

export interface AgentMetricsResponse {
  agentType: 'rag' | 'cotizador' | 'agendamiento';
  period: MetricPeriod;
  successRate: number;        // 0-1
  // RAG
  noAnswerCount?: number;
  topTopics?: { topic: string; count: number }[];
  // Cotizador
  topProducts?: { productId: string; count: number }[];
  ordersConfirmed?: number;
  ordersAbandoned?: number;
  conversionRate?: number;    // 0-1
  // Agendamiento
  appointmentsScheduled?: number;
  appointmentsCancelled?: number;
  appointmentsRescheduled?: number;
  peakHours?: { hour: number; count: number }[];
}
