import type {
  VerifyWebhookParams,
  VerifyWebhookResult,
} from "@multibotagents/types";

/**
 * Valida una solicitud de verificación de webhook de Meta.
 * Función pura: sin side effects, sin dependencias de AWS.
 *
 * Orden de validación:
 * 1. configuredToken presente y no vacío → 500 si ausente
 * 2. mode === "subscribe" (case-sensitive) → 403 si no coincide
 * 3. verifyToken y challenge presentes → 403 si ausentes
 * 4. verifyToken === configuredToken (comparación directa) → 403 si no coincide
 * 5. Retorna éxito con el challenge como body
 */
export function verifyWebhook(params: VerifyWebhookParams): VerifyWebhookResult {
  const { mode, verifyToken, challenge, configuredToken } = params;

  // 1. Validar que configuredToken esté presente y no vacío
  if (!configuredToken) {
    return { success: false, statusCode: 500, body: "" };
  }

  // 2. Validar que mode === "subscribe" (case-sensitive)
  if (mode !== "subscribe") {
    return { success: false, statusCode: 403, body: "" };
  }

  // 3. Validar que verifyToken y challenge estén presentes
  if (!verifyToken || !challenge) {
    return { success: false, statusCode: 403, body: "" };
  }

  // 4. Comparar verifyToken === configuredToken (sin trim, sin lowercase)
  if (verifyToken !== configuredToken) {
    return { success: false, statusCode: 403, body: "" };
  }

  // 5. Verificación exitosa
  return { success: true, statusCode: 200, body: challenge };
}
