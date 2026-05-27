/**
 * Interfaces de escalamiento del Motor de Agente RAG.
 * Definen el contrato para emisión de eventos de escalamiento a humano.
 *
 * Valida: Requisitos 12.4, 12.5, 13.1
 */

import { EscalationReason } from "../enums/rag-engine.enums";

// ─── Escalation Emitter ──────────────────────────────────────────────────────

/**
 * Interface agnóstica para emisión de eventos de escalamiento.
 * La implementación concreta usa NestJS EventEmitter2.
 *
 * Valida: Requisito 12.5
 */
export interface EscalationEmitter {
  emit(event: EscalationEvent): Promise<boolean>;
}

// ─── Escalation Event ────────────────────────────────────────────────────────

/**
 * Evento emitido cuando el motor detecta necesidad de escalamiento a humano.
 * Contiene toda la información necesaria para que el sistema de escalamiento
 * gestione la transferencia.
 *
 * Valida: Requisitos 12.5, 13.1
 */
export interface EscalationEvent {
  conversationId: string;
  agentId: string;
  companyId: string;
  reason: EscalationReason;
  lastContext: string; // Máximo 500 caracteres
  timestamp: Date;
}
