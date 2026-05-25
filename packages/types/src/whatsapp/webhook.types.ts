/**
 * Tipos para el flujo de verificación del webhook de WhatsApp.
 *
 * Estos tipos definen el contrato entre el handler Lambda y la función
 * pura de validación en packages/core.
 */

/**
 * Parámetros de entrada para la función de verificación del webhook.
 * Todos los campos son opcionales porque provienen de query parameters
 * que pueden estar ausentes en la solicitud HTTP.
 */
export interface VerifyWebhookParams {
  mode: string | undefined;
  verifyToken: string | undefined;
  challenge: string | undefined;
  configuredToken: string | undefined;
}

/**
 * Resultado discriminado de la verificación del webhook.
 *
 * - 200: Verificación exitosa, body contiene el challenge.
 * - 400: Parámetros faltantes en la solicitud.
 * - 403: Token inválido o mode incorrecto.
 * - 500: Configuración ausente (token no configurado en el sistema).
 */
export type VerifyWebhookResult =
  | { success: true; statusCode: 200; body: string }
  | { success: false; statusCode: 400; body: string }
  | { success: false; statusCode: 403; body: string }
  | { success: false; statusCode: 500; body: string };
