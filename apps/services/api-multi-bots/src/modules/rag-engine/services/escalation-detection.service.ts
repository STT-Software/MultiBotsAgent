import { Inject, Injectable } from '@nestjs/common';

import {
  shouldEscalateByUncertainty,
  detectUserEscalationRequest,
} from '@multibotagents/core';
import {
  AgentConfig,
  EscalationEmitter,
  EscalationEvent,
  LlmResponse,
  MemoryService,
} from '@multibotagents/types';
import { EscalationReason } from '@multibotagents/types';

import {
  RAG_ESCALATION_EMITTER,
  RAG_MEMORY_SERVICE,
} from '../constants/injection-tokens';
import { RAG_DEFAULTS } from '../constants/timeouts';

/**
 * Resultado de la evaluación de escalamiento.
 * Indica si se escaló, la razón y el mensaje de transición para el usuario.
 *
 * Valida: Requisitos 12.4, 12.5
 */
export interface EscalationResult {
  escalated: boolean;
  reason: EscalationReason;
  transitionMessage: string;
}

/**
 * Patrones por defecto para detectar solicitudes explícitas de escalamiento
 * en el mensaje del usuario (idioma español).
 */
const DEFAULT_ESCALATION_PATTERNS = [
  'hablar con humano',
  'agente real',
  'persona real',
  'hablar con alguien',
  'quiero un humano',
  'operador',
  'asesor real',
];

/**
 * Servicio de detección y gestión de escalamiento a humano.
 * Detecta condiciones de escalamiento por: intentos fallidos consecutivos,
 * solicitud explícita del usuario e incertidumbre del LLM.
 * Gestiona el cambio de status de conversación y la emisión de eventos.
 *
 * Valida: Requisitos 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 13.1, 13.2, 13.3, 13.4
 */
@Injectable()
export class EscalationDetectionService {
  constructor(
    @Inject(RAG_MEMORY_SERVICE) private readonly memoryService: MemoryService,
    @Inject(RAG_ESCALATION_EMITTER) private readonly escalationEmitter: EscalationEmitter,
  ) {}

  /** Contador de intentos fallidos por conversación (en memoria). */
  private failedAttempts: Map<string, number> = new Map();

  /**
   * Registra un intento sin información suficiente.
   * Si se alcanza failedAttemptsBeforeEscalation, dispara escalamiento.
   *
   * @param conversationId - ID de la conversación
   * @param config - Configuración del agente con umbral de intentos
   * @returns EscalationResult si se escala, null si no
   *
   * Valida: Requisitos 12.1, 13.1
   */
  async recordNoInfoAttempt(
    conversationId: string,
    config: AgentConfig,
  ): Promise<EscalationResult | null> {
    const current = this.failedAttempts.get(conversationId) ?? 0;
    const updated = current + 1;
    this.failedAttempts.set(conversationId, updated);

    const threshold = config.failedAttemptsBeforeEscalation ?? RAG_DEFAULTS.FAILED_ATTEMPTS;

    if (updated >= threshold) {
      return this.performEscalation(
        conversationId,
        config,
        EscalationReason.FAILED_ATTEMPTS,
        `Intentos fallidos consecutivos: ${updated}`,
      );
    }

    return null;
  }

  /**
   * Evalúa si la respuesta del LLM o el mensaje del usuario indican
   * necesidad de escalamiento.
   * Detecta: incertidumbre del LLM y solicitud explícita del usuario.
   * Si no se detecta escalamiento, resetea el contador de intentos fallidos.
   *
   * @param conversationId - ID de la conversación
   * @param llmResponse - Respuesta del LLM con indicador de incertidumbre
   * @param userMessage - Mensaje original del usuario
   * @param config - Configuración del agente
   * @returns EscalationResult si se escala, null si no
   *
   * Valida: Requisitos 12.2, 12.3, 13.1
   */
  async evaluateResponse(
    conversationId: string,
    llmResponse: LlmResponse,
    userMessage: string,
    config: AgentConfig,
  ): Promise<EscalationResult | null> {
    // Detectar incertidumbre del LLM
    if (shouldEscalateByUncertainty(llmResponse)) {
      return this.performEscalation(
        conversationId,
        config,
        EscalationReason.LLM_UNCERTAINTY,
        userMessage.substring(0, 500),
      );
    }

    // Detectar solicitud explícita del usuario
    if (detectUserEscalationRequest(userMessage, DEFAULT_ESCALATION_PATTERNS)) {
      return this.performEscalation(
        conversationId,
        config,
        EscalationReason.USER_REQUEST,
        userMessage.substring(0, 500),
      );
    }

    // Respuesta exitosa: resetear contador de intentos fallidos
    this.resetFailedAttempts(conversationId);
    return null;
  }

  /**
   * Resetea el contador de intentos fallidos para una conversación.
   * Se invoca cuando hay una respuesta exitosa del LLM.
   *
   * @param conversationId - ID de la conversación
   *
   * Valida: Requisito 12.1
   */
  resetFailedAttempts(conversationId: string): void {
    this.failedAttempts.delete(conversationId);
  }

  /**
   * Ejecuta el escalamiento: cambia status de conversación, emite evento
   * e inicia timeout de retoma automática.
   * Si la emisión del evento falla, revierte el status a "active" (graceful degradation).
   *
   * @param conversationId - ID de la conversación
   * @param config - Configuración del agente
   * @param reason - Razón del escalamiento
   * @param lastContext - Último contexto relevante (máx 500 caracteres)
   * @returns EscalationResult con datos del escalamiento
   *
   * Valida: Requisitos 12.4, 12.5, 12.6, 12.7, 13.1, 13.2, 13.3
   */
  private async performEscalation(
    conversationId: string,
    config: AgentConfig,
    reason: EscalationReason,
    lastContext: string,
  ): Promise<EscalationResult> {
    // 1. Cambiar status de conversación a "escalated"
    await this.memoryService.updateConversationStatus(conversationId, 'escalated');

    // 2. Emitir EscalationEvent
    const event: EscalationEvent = {
      conversationId,
      agentId: config.agentId,
      companyId: config.companyId,
      reason,
      lastContext: lastContext.substring(0, 500),
      timestamp: new Date(),
    };

    const emitSuccess = await this.escalationEmitter.emit(event);

    // 3. Si emisión falla: revertir status a "active" (graceful degradation)
    if (!emitSuccess) {
      await this.memoryService.updateConversationStatus(conversationId, 'active');
      return {
        escalated: false,
        reason,
        transitionMessage: config.escalationOfferMessage,
      };
    }

    // 4. Iniciar timeout de escalamiento (configurable, default 15 min)
    const timeoutMinutes = config.escalationTimeout ?? RAG_DEFAULTS.ESCALATION_TIMEOUT;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    setTimeout(() => {
      void this.handleEscalationTimeout(conversationId, config);
    }, timeoutMs);

    // 5. Retornar resultado exitoso
    return {
      escalated: true,
      reason,
      transitionMessage: config.escalationTransitionMessage,
    };
  }

  /**
   * Callback del timeout de escalamiento.
   * Verifica si la conversación sigue escalada y la retoma automáticamente.
   *
   * @param conversationId - ID de la conversación
   * @param config - Configuración del agente
   *
   * Valida: Requisitos 12.7, 13.4
   */
  private async handleEscalationTimeout(
    conversationId: string,
    _config: AgentConfig,
  ): Promise<void> {
    // 1. Verificar que status sigue siendo "escalated"
    const currentStatus = await this.memoryService.getConversationStatus(conversationId);

    if (currentStatus === 'escalated') {
      // 2. Cambiar status a "active" para retomar la conversación
      await this.memoryService.updateConversationStatus(conversationId, 'active');
    }
  }
}
