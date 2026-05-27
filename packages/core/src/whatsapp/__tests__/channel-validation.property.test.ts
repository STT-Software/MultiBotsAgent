import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  checkPhoneNumberUniqueness,
  type ExistingChannel,
} from "../channel-validation";
import type { ChannelStatus } from "@multibotagents/types";

/**
 * Feature: embedded-signup, Property 2: Validación de unicidad de número de teléfono
 *
 * Para cualquier phoneNumberId, agentId, y conjunto de canales existentes con
 * distintas combinaciones de status y agentId, la función checkPhoneNumberUniqueness debe:
 * - Retornar `{ allowed: false, reason: "already_connected_other_agent" }` si existe un canal
 *   con ese phoneNumberId en estado "connected" o "partially_connected" asociado a un agentId diferente.
 * - Retornar `{ allowed: false, reason: "already_connected_same_agent" }` si existe un canal
 *   con ese phoneNumberId en estado "connected" asociado al mismo agentId.
 * - Retornar `{ allowed: true, action: "update" }` si existe un canal con ese phoneNumberId
 *   en estado "requires_reconnection" asociado al mismo agentId.
 * - Retornar `{ allowed: true, action: "create" }` si no existe ningún canal activo con ese phoneNumberId.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 */
describe("checkPhoneNumberUniqueness — Property Tests", () => {
  // --- Generators ---

  const channelStatuses: ChannelStatus[] = [
    "connected",
    "disconnected",
    "requires_reconnection",
    "partially_connected",
  ];

  const channelStatusArb = fc.constantFrom(...channelStatuses);

  const phoneNumberIdArb = fc.string({ minLength: 1, maxLength: 30 });
  const agentIdArb = fc.string({ minLength: 1, maxLength: 30 });
  const channelIdArb = fc.string({ minLength: 1, maxLength: 30 });

  const existingChannelArb = (agentIdGen: fc.Arbitrary<string>) =>
    fc.record({
      id: channelIdArb,
      agentId: agentIdGen,
      status: channelStatusArb,
    });

  /**
   * Rule 1: Retorna "already_connected_other_agent" si existe un canal con
   * status "connected" o "partially_connected" asociado a un agentId diferente.
   */
  describe("Property 2.1: Canal conectado a otro agente bloquea la conexión", () => {
    it("retorna already_connected_other_agent cuando existe canal connected/partially_connected de otro agente", () => {
      fc.assert(
        fc.property(
          phoneNumberIdArb,
          agentIdArb,
          agentIdArb.filter((id) => id.length > 0),
          fc.constantFrom("connected" as ChannelStatus, "partially_connected" as ChannelStatus),
          fc.array(existingChannelArb(agentIdArb), { maxLength: 5 }),
          (phoneNumberId, agentId, otherAgentBase, activeStatus, extraChannels) => {
            // Ensure otherAgentId is different from agentId
            const otherAgentId = agentId === otherAgentBase
              ? otherAgentBase + "_other"
              : otherAgentBase;

            const blockingChannel: ExistingChannel = {
              id: "blocking-channel",
              agentId: otherAgentId,
              status: activeStatus,
            };

            // Place the blocking channel among other arbitrary channels
            const existingChannels = [...extraChannels, blockingChannel];

            const result = checkPhoneNumberUniqueness(
              phoneNumberId,
              agentId,
              existingChannels,
            );

            expect(result).toEqual({
              allowed: false,
              reason: "already_connected_other_agent",
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Rule 2: Retorna "already_connected_same_agent" si existe un canal con
   * status "connected" asociado al mismo agentId.
   */
  describe("Property 2.2: Canal connected del mismo agente bloquea la conexión", () => {
    it("retorna already_connected_same_agent cuando existe canal connected del mismo agente (sin canales de otro agente activos)", () => {
      fc.assert(
        fc.property(
          phoneNumberIdArb,
          agentIdArb,
          channelIdArb,
          fc.array(
            fc.record({
              id: channelIdArb,
              agentId: agentIdArb,
              // Only disconnected or requires_reconnection for other agents to avoid Rule 1 triggering
              status: fc.constantFrom("disconnected" as ChannelStatus, "requires_reconnection" as ChannelStatus),
            }),
            { maxLength: 5 },
          ),
          (phoneNumberId, agentId, channelId, extraChannels) => {
            const connectedSameAgent: ExistingChannel = {
              id: channelId,
              agentId,
              status: "connected",
            };

            // Filter extra channels to ensure no connected/partially_connected from other agent
            const safeExtras = extraChannels.filter(
              (ch) =>
                ch.agentId === agentId ||
                (ch.status !== "connected" && ch.status !== "partially_connected"),
            );

            const existingChannels = [...safeExtras, connectedSameAgent];

            const result = checkPhoneNumberUniqueness(
              phoneNumberId,
              agentId,
              existingChannels,
            );

            expect(result).toEqual({
              allowed: false,
              reason: "already_connected_same_agent",
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Rule 3: Retorna "allowed: true, action: update" si existe un canal con
   * status "requires_reconnection" asociado al mismo agentId (y no hay canales
   * activos de otro agente ni connected del mismo agente).
   */
  describe("Property 2.3: Canal requires_reconnection del mismo agente permite update", () => {
    it("retorna allowed con action update cuando existe canal requires_reconnection del mismo agente", () => {
      fc.assert(
        fc.property(
          phoneNumberIdArb,
          agentIdArb,
          channelIdArb,
          fc.array(
            fc.record({
              id: channelIdArb,
              agentId: agentIdArb,
              status: fc.constant("disconnected" as ChannelStatus),
            }),
            { maxLength: 5 },
          ),
          (phoneNumberId, agentId, channelId, extraChannels) => {
            const reconnectionChannel: ExistingChannel = {
              id: channelId,
              agentId,
              status: "requires_reconnection",
            };

            // Only include disconnected channels to avoid triggering Rule 1 or Rule 2
            const safeExtras = extraChannels.filter(
              (ch) => ch.status === "disconnected",
            );

            const existingChannels = [...safeExtras, reconnectionChannel];

            const result = checkPhoneNumberUniqueness(
              phoneNumberId,
              agentId,
              existingChannels,
            );

            expect(result).toEqual({
              allowed: true,
              action: "update",
              existingChannelId: channelId,
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Rule 4: Retorna "allowed: true, action: create" si no existe ningún canal
   * activo con ese phoneNumberId (no hay connected/partially_connected de otro
   * agente, no hay connected del mismo agente, no hay requires_reconnection del
   * mismo agente).
   */
  describe("Property 2.4: Sin canal activo permite crear", () => {
    it("retorna allowed con action create cuando no hay canales activos relevantes", () => {
      fc.assert(
        fc.property(
          phoneNumberIdArb,
          agentIdArb,
          fc.array(
            fc.record({
              id: channelIdArb,
              agentId: agentIdArb,
              status: channelStatusArb,
            }),
            { maxLength: 10 },
          ),
          (phoneNumberId, agentId, channels) => {
            // Filter to only keep channels that don't trigger Rules 1, 2, or 3
            const safeChannels = channels.filter((ch) => {
              // Remove connected/partially_connected from other agent (Rule 1)
              if (
                ch.agentId !== agentId &&
                (ch.status === "connected" || ch.status === "partially_connected")
              ) {
                return false;
              }
              // Remove connected from same agent (Rule 2)
              if (ch.agentId === agentId && ch.status === "connected") {
                return false;
              }
              // Remove requires_reconnection from same agent (Rule 3)
              if (ch.agentId === agentId && ch.status === "requires_reconnection") {
                return false;
              }
              return true;
            });

            const result = checkPhoneNumberUniqueness(
              phoneNumberId,
              agentId,
              safeChannels,
            );

            expect(result).toEqual({
              allowed: true,
              action: "create",
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it("retorna allowed con action create cuando la lista de canales está vacía", () => {
      fc.assert(
        fc.property(
          phoneNumberIdArb,
          agentIdArb,
          (phoneNumberId, agentId) => {
            const result = checkPhoneNumberUniqueness(
              phoneNumberId,
              agentId,
              [],
            );

            expect(result).toEqual({
              allowed: true,
              action: "create",
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Priority verification: Rule 1 takes precedence over all other rules.
   * Even if conditions for Rules 2, 3, or 4 are met, Rule 1 wins.
   */
  describe("Property 2.5: Prioridad — Rule 1 prevalece sobre Rules 2, 3, 4", () => {
    it("Rule 1 prevalece incluso cuando también se cumple Rule 3 (requires_reconnection del mismo agente)", () => {
      fc.assert(
        fc.property(
          phoneNumberIdArb,
          agentIdArb,
          agentIdArb,
          fc.constantFrom("connected" as ChannelStatus, "partially_connected" as ChannelStatus),
          (phoneNumberId, agentId, otherAgentBase, activeStatus) => {
            const otherAgentId = agentId === otherAgentBase
              ? otherAgentBase + "_other"
              : otherAgentBase;

            const existingChannels: ExistingChannel[] = [
              { id: "ch-reconnect", agentId, status: "requires_reconnection" },
              { id: "ch-blocking", agentId: otherAgentId, status: activeStatus },
            ];

            const result = checkPhoneNumberUniqueness(
              phoneNumberId,
              agentId,
              existingChannels,
            );

            expect(result).toEqual({
              allowed: false,
              reason: "already_connected_other_agent",
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
