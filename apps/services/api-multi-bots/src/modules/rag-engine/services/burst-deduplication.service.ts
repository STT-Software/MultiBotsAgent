import { Injectable } from '@nestjs/common';
import { RAG_DEFAULTS } from '../constants/timeouts';

/**
 * Estructura interna para mantener el estado de un buffer de mensajes en ráfaga.
 */
interface PendingBuffer {
  messages: string[];
  timer: ReturnType<typeof setTimeout>;
  firstTimestamp: Date;
  resolve: (value: string) => void;
}

/**
 * Servicio de deduplicación de mensajes en ráfaga.
 * Agrupa mensajes del mismo usuario/conversación dentro de una ventana temporal configurable.
 *
 * - Ventana configurable: 1-10 segundos (default 3)
 * - Máximo acumulado: 10 segundos desde primer mensaje
 * - Máximo mensajes por grupo: 10
 * - Separador: salto de línea entre mensajes
 * - Reinicia timer al recibir nuevo mensaje (respetando máximo acumulado)
 *
 * Valida: Requisitos 11.1, 11.2, 11.3, 11.4, 11.5
 */
@Injectable()
export class BurstDeduplicationService {
  private pendingMessages: Map<string, PendingBuffer> = new Map();

  /**
   * Agrupa mensajes del mismo usuario/conversación dentro de la Burst_Window.
   *
   * - El primer llamador recibe una Promise que se resuelve cuando la ventana cierra.
   * - Los llamadores subsiguientes dentro de la ventana reciben null (mensaje buffered).
   * - La ventana se cierra cuando: el timer expira, se alcanzan 10 mensajes,
   *   o se supera el máximo acumulado de 10 segundos desde el primer mensaje.
   *
   * @param conversationId - Identificador de la conversación
   * @param message - Mensaje del usuario
   * @param burstWindow - Ventana de agrupación en segundos (1-10, default 3)
   * @returns Promise<string> con el input concatenado (primer llamador) o null (subsiguientes)
   */
  async bufferMessage(
    conversationId: string,
    message: string,
    burstWindow: number,
  ): Promise<string | null> {
    const clampedWindow = Math.max(1, Math.min(10, burstWindow));
    const existing = this.pendingMessages.get(conversationId);

    if (!existing) {
      // Primer mensaje: crear buffer y retornar Promise que se resuelve al cerrar ventana
      return new Promise<string>((resolve) => {
        const timer = setTimeout(() => {
          this.closeWindow(conversationId);
        }, clampedWindow * 1000);

        this.pendingMessages.set(conversationId, {
          messages: [message],
          timer,
          firstTimestamp: new Date(),
          resolve,
        });
      });
    }

    // Mensaje subsiguiente: agregar al buffer existente
    existing.messages.push(message);

    // Si se alcanza el máximo de mensajes: cerrar ventana inmediatamente
    if (existing.messages.length >= RAG_DEFAULTS.MAX_BURST_MESSAGES) {
      this.closeWindow(conversationId);
      return null;
    }

    // Reiniciar timer respetando el máximo acumulado de 10 segundos
    clearTimeout(existing.timer);

    const elapsedMs = Date.now() - existing.firstTimestamp.getTime();
    const maxTotalMs = RAG_DEFAULTS.MAX_BURST_TOTAL_SECONDS * 1000;
    const remainingMs = maxTotalMs - elapsedMs;

    if (remainingMs <= 0) {
      // Ya se superó el máximo acumulado: cerrar ventana
      this.closeWindow(conversationId);
      return null;
    }

    // Nuevo timer: el menor entre la ventana configurada y el tiempo restante
    const nextTimerMs = Math.min(clampedWindow * 1000, remainingMs);
    existing.timer = setTimeout(() => {
      this.closeWindow(conversationId);
    }, nextTimerMs);

    return null;
  }

  /**
   * Fuerza el cierre de la ventana para una conversación.
   * Retorna los mensajes acumulados concatenados y limpia el buffer.
   *
   * @param conversationId - Identificador de la conversación
   * @returns Mensajes concatenados con salto de línea, o null si no hay buffer activo
   */
  flush(conversationId: string): string | null {
    const pending = this.pendingMessages.get(conversationId);

    if (!pending) {
      return null;
    }

    clearTimeout(pending.timer);
    const concatenated = pending.messages.join('\n');
    const { resolve } = pending;
    this.pendingMessages.delete(conversationId);

    // Resolver la Promise del primer llamador
    resolve(concatenated);

    return concatenated;
  }

  /**
   * Cierra la ventana de agrupación para una conversación.
   * Resuelve la Promise del primer llamador con los mensajes concatenados.
   */
  private closeWindow(conversationId: string): void {
    const pending = this.pendingMessages.get(conversationId);

    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    const concatenated = pending.messages.join('\n');
    this.pendingMessages.delete(conversationId);
    pending.resolve(concatenated);
  }
}
