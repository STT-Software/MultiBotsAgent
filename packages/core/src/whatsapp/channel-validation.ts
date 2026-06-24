import type { ChannelStatus } from "@multibotagents/types";

/**
 * Representa un canal existente en la base de datos para la verificación de unicidad.
 */
export interface ExistingChannel {
  id: string;
  agentId: string;
  status: ChannelStatus;
}

/**
 * Resultado de la verificación de unicidad de un número de teléfono.
 *
 * - `{ allowed: true, action: "create" }` — No existe canal activo, se puede crear uno nuevo.
 * - `{ allowed: true, action: "update", existingChannelId }` — Existe canal en requires_reconnection del mismo agente, se actualiza.
 * - `{ allowed: false, reason: "already_connected_other_agent" }` — Número conectado a otro agente.
 * - `{ allowed: false, reason: "already_connected_same_agent" }` — Número ya conectado al mismo agente.
 */
export type UniquenessCheckResult =
  | { allowed: true; action: "create" }
  | { allowed: true; action: "update"; existingChannelId: string }
  | { allowed: false; reason: "already_connected_other_agent" }
  | { allowed: false; reason: "already_connected_same_agent" };

/**
 * Determina si un phoneNumberId puede ser conectado a un agente.
 *
 * Función pura: recibe el estado actual de canales existentes con ese phoneNumberId
 * y retorna la decisión de unicidad.
 *
 * Reglas de decisión (evaluadas en orden de prioridad):
 * 1. Si existe un canal "connected" o "partially_connected" de OTRO agente → no permitido.
 * 2. Si existe un canal "connected" del MISMO agente → no permitido (ya conectado).
 * 3. Si existe un canal "requires_reconnection" del MISMO agente → permitido, actualizar.
 * 4. Si no existe canal activo → permitido, crear nuevo.
 *
 * @param phoneNumberId - Identificador del número de teléfono de Meta.
 * @param agentId - Identificador del agente al que se quiere conectar.
 * @param existingChannels - Canales existentes con ese phoneNumberId.
 * @returns Resultado de la verificación de unicidad.
 */
export function checkPhoneNumberUniqueness(
  _phoneNumberId: string,
  agentId: string,
  existingChannels: ExistingChannel[],
): UniquenessCheckResult {
  // Rule 1: Check if connected/partially_connected to a DIFFERENT agent
  const connectedToOtherAgent = existingChannels.find(
    (channel) =>
      channel.agentId !== agentId &&
      (channel.status === "connected" || channel.status === "partially_connected"),
  );

  if (connectedToOtherAgent) {
    return { allowed: false, reason: "already_connected_other_agent" };
  }

  // Rule 2: Check if connected or partially_connected to the SAME agent -> allow update
  const connectedToSameAgent = existingChannels.find(
    (channel) =>
      channel.agentId === agentId &&
      (channel.status === "connected" || channel.status === "partially_connected"),
  );

  if (connectedToSameAgent) {
    return { allowed: true, action: "update", existingChannelId: connectedToSameAgent.id };
  }

  // Rule 3: Check if requires_reconnection for the SAME agent
  const requiresReconnection = existingChannels.find(
    (channel) =>
      channel.agentId === agentId && channel.status === "requires_reconnection",
  );

  if (requiresReconnection) {
    return { allowed: true, action: "update", existingChannelId: requiresReconnection.id };
  }

  // Rule 4: No active channel exists — free to create
  return { allowed: true, action: "create" };
}
