import { Injectable } from '@nestjs/common';

/**
 * Servicio de acknowledgment con patrón race.
 * Implementa un timer que compite con el procesamiento principal:
 * si el procesamiento no completa antes del threshold, se emite un acknowledgment.
 * Máximo 1 acknowledgment por ciclo de procesamiento.
 *
 * Valida: Requisitos 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
@Injectable()
export class AcknowledgmentService {
  /**
   * Implementa el patrón race: timer vs procesamiento.
   * Si el procesamiento no completa antes del threshold, invoca onAcknowledgment.
   * Máximo 1 acknowledgment por ciclo.
   *
   * @param processingPromise - Promesa del procesamiento principal
   * @param config - Configuración con threshold (2-15 segundos) y mensaje de acknowledgment
   * @param onAcknowledgment - Callback invocado si el timer gana la carrera
   * @returns El resultado del procesamiento principal
   */
  async raceWithProcessing<T>(
    processingPromise: Promise<T>,
    config: { threshold: number; message: string },
    onAcknowledgment: (message: string) => void,
  ): Promise<T> {
    const TIMER_SENTINEL = Symbol('timer');
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let acknowledgmentSent = false;

    const timerPromise = new Promise<typeof TIMER_SENTINEL>((resolve) => {
      const thresholdMs = config.threshold * 1000;
      timerId = setTimeout(() => resolve(TIMER_SENTINEL), thresholdMs);
    });

    const winner = await Promise.race([processingPromise, timerPromise]);

    if (winner === TIMER_SENTINEL) {
      // El timer ganó: emitir acknowledgment (máximo 1 por ciclo)
      if (!acknowledgmentSent) {
        acknowledgmentSent = true;
        onAcknowledgment(config.message);
      }

      // Esperar a que el procesamiento complete y retornar su resultado
      const result = await processingPromise;

      return result;
    }

    // El procesamiento ganó: cancelar timer y retornar resultado directamente
    if (timerId !== null) {
      clearTimeout(timerId);
    }

    return winner as T;
  }
}
