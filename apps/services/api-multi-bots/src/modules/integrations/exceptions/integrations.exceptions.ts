import type { IntegrationProvider, IntegrationStatus } from "@multibotagents/types";

/**
 * Excepciones de consumo de integraciones (SL13).
 *
 * Son errores **controlados** que los consumidores internos (SOL-06, SOL-04)
 * reciben al intentar usar una integración no disponible, en vez de una
 * excepción inesperada del sistema (R6.4). Cada una expone un `code` estable
 * para que el consumidor pueda ramificar (p. ej. escalar a humano).
 */

/** No existe ninguna integración del proveedor para la empresa. */
export class IntegrationNotFoundException extends Error {
  readonly code = "INTEGRATION_NOT_FOUND";

  constructor(
    public readonly companyId: string,
    public readonly provider: IntegrationProvider,
  ) {
    super(
      `No existe una integración de "${provider}" para la empresa ${companyId}.`,
    );
    this.name = "IntegrationNotFoundException";
  }
}

/**
 * La integración existe pero no está operativa (desconectada, requiere
 * reconexión o con permisos insuficientes). Lleva el `status` para que el
 * consumidor pueda distinguir el caso (p. ej. pedir reconexión).
 */
export class IntegrationNotConnectedException extends Error {
  readonly code = "INTEGRATION_NOT_CONNECTED";

  constructor(
    public readonly provider: IntegrationProvider,
    public readonly status: IntegrationStatus,
  ) {
    super(
      `La integración de "${provider}" no está disponible (estado: ${status}).`,
    );
    this.name = "IntegrationNotConnectedException";
  }
}
