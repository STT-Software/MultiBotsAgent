import { createHmac, timingSafeEqual } from "crypto";

/**
 * Valida la firma HMAC SHA256 de las solicitudes entrantes de Meta.
 * Esto asegura que el webhook realmente provenga de los servidores de Meta.
 *
 * @param rawBody - El cuerpo crudo de la solicitud en formato string
 * @param signatureHeader - El valor del encabezado X-Hub-Signature-256 (ej: 'sha256=abcdef...')
 * @param appSecret - El App Secret de Meta configurado para la aplicación
 * @returns true si la firma es válida, false en caso contrario
 */
export function validateMetaSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  appSecret: string | undefined
): boolean {
  if (!signatureHeader || !appSecret || !rawBody) {
    return false;
  }

  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    return false;
  }

  const expectedSignature = parts[1];
  const hmac = createHmac("sha256", appSecret);
  hmac.update(rawBody);
  const actualSignature = hmac.digest("hex");

  const expectedBuf = Buffer.from(expectedSignature, "hex");
  const actualBuf = Buffer.from(actualSignature, "hex");

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, actualBuf);
}
