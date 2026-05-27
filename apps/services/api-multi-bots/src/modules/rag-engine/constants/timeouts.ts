/**
 * Constantes de timeout para el módulo RAG Engine.
 * Cada valor define el tiempo máximo de espera o reintentos para servicios externos.
 *
 * Valida: Requisitos 10.1, 11.1, 11.2, 11.5, 12.1, 12.7, 14.1, 14.2, 14.3
 */

/**
 * Timeouts y configuración de reintentos para servicios externos del motor RAG.
 * Garantiza que ninguna operación bloquee indefinidamente el flujo de procesamiento.
 */
export const RAG_TIMEOUTS = {
  /** Timeout para consultas al servicio de memoria conversacional (ms). Req 14.3 */
  MEMORY_SERVICE: 3_000,

  /** Timeout para búsqueda vectorial en la base de conocimiento (ms). Req 14.2 */
  VECTOR_SEARCH: 10_000,

  /** Timeout para el proceso de re-ranking de fragmentos (ms). Req 14.2 */
  RE_RANKING: 10_000,

  /** Timeout para la generación de respuesta del LLM (ms). Req 14.1 */
  LLM_GENERATION: 30_000,

  /** Número de reintentos permitidos para el LLM antes de escalar. Req 14.1 */
  LLM_RETRY_COUNT: 1,

  /** Tiempo máximo para persistencia no bloqueante de mensajes (ms). Req 8.2 */
  MEMORY_PERSIST_MAX: 500,

  /** Reintentos para persistir la respuesta del asistente. Req 8.4 */
  MEMORY_PERSIST_RETRIES: 2,
} as const;

/**
 * Valores por defecto para configuración del motor RAG.
 * Se usan cuando el AgentConfig no especifica un valor personalizado.
 */
export const RAG_DEFAULTS = {
  /** Segundos antes de enviar acknowledgment al usuario (2-15). Req 10.1 */
  ACKNOWLEDGMENT_THRESHOLD: 5,

  /** Segundos de ventana para agrupar mensajes en ráfaga (1-10). Req 11.1 */
  BURST_WINDOW: 3,

  /** Minutos antes de retomar conversación escalada sin atención (5-60). Req 12.7 */
  ESCALATION_TIMEOUT: 15,

  /** Intentos fallidos consecutivos antes de ofrecer escalamiento (1-10). Req 12.1 */
  FAILED_ATTEMPTS: 3,

  /** Máximo de mensajes permitidos en un grupo de ráfaga. Req 11.5 */
  MAX_BURST_MESSAGES: 10,

  /** Máximo de segundos acumulados desde el primer mensaje de la ráfaga. Req 11.2 */
  MAX_BURST_TOTAL_SECONDS: 10,
} as const;
