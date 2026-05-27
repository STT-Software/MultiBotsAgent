import { describe, it, expect } from "vitest";
import {
  checkPhoneNumberUniqueness,
  type ExistingChannel,
} from "../channel-validation";

describe("checkPhoneNumberUniqueness", () => {
  const phoneNumberId = "1234567890";
  const agentId = "agent-001";
  const otherAgentId = "agent-002";

  describe("Rule 1: connected/partially_connected to a DIFFERENT agent", () => {
    it("returns already_connected_other_agent when channel is connected to another agent", () => {
      const existingChannels: ExistingChannel[] = [
        { id: "ch-1", agentId: otherAgentId, status: "connected" },
      ];

      const result = checkPhoneNumberUniqueness(phoneNumberId, agentId, existingChannels);

      expect(result).toEqual({
        allowed: false,
        reason: "already_connected_other_agent",
      });
    });

    it("returns already_connected_other_agent when channel is partially_connected to another agent", () => {
      const existingChannels: ExistingChannel[] = [
        { id: "ch-1", agentId: otherAgentId, status: "partially_connected" },
      ];

      const result = checkPhoneNumberUniqueness(phoneNumberId, agentId, existingChannels);

      expect(result).toEqual({
        allowed: false,
        reason: "already_connected_other_agent",
      });
    });
  });

  describe("Rule 2: connected to the SAME agent", () => {
    it("returns already_connected_same_agent when channel is connected to the same agent", () => {
      const existingChannels: ExistingChannel[] = [
        { id: "ch-1", agentId, status: "connected" },
      ];

      const result = checkPhoneNumberUniqueness(phoneNumberId, agentId, existingChannels);

      expect(result).toEqual({
        allowed: false,
        reason: "already_connected_same_agent",
      });
    });
  });

  describe("Rule 3: requires_reconnection for the SAME agent", () => {
    it("returns allowed with update action when channel requires reconnection for same agent", () => {
      const existingChannels: ExistingChannel[] = [
        { id: "ch-1", agentId, status: "requires_reconnection" },
      ];

      const result = checkPhoneNumberUniqueness(phoneNumberId, agentId, existingChannels);

      expect(result).toEqual({
        allowed: true,
        action: "update",
        existingChannelId: "ch-1",
      });
    });
  });

  describe("Rule 4: no active channel exists", () => {
    it("returns allowed with create action when no channels exist", () => {
      const existingChannels: ExistingChannel[] = [];

      const result = checkPhoneNumberUniqueness(phoneNumberId, agentId, existingChannels);

      expect(result).toEqual({
        allowed: true,
        action: "create",
      });
    });

    it("returns allowed with create action when only disconnected channels exist", () => {
      const existingChannels: ExistingChannel[] = [
        { id: "ch-1", agentId: otherAgentId, status: "disconnected" },
        { id: "ch-2", agentId, status: "disconnected" },
      ];

      const result = checkPhoneNumberUniqueness(phoneNumberId, agentId, existingChannels);

      expect(result).toEqual({
        allowed: true,
        action: "create",
      });
    });

    it("returns allowed with create action when requires_reconnection exists for a different agent", () => {
      const existingChannels: ExistingChannel[] = [
        { id: "ch-1", agentId: otherAgentId, status: "requires_reconnection" },
      ];

      const result = checkPhoneNumberUniqueness(phoneNumberId, agentId, existingChannels);

      expect(result).toEqual({
        allowed: true,
        action: "create",
      });
    });
  });

  describe("Priority: Rule 1 takes precedence over Rule 3", () => {
    it("returns already_connected_other_agent even if same agent has requires_reconnection", () => {
      const existingChannels: ExistingChannel[] = [
        { id: "ch-1", agentId, status: "requires_reconnection" },
        { id: "ch-2", agentId: otherAgentId, status: "connected" },
      ];

      const result = checkPhoneNumberUniqueness(phoneNumberId, agentId, existingChannels);

      expect(result).toEqual({
        allowed: false,
        reason: "already_connected_other_agent",
      });
    });
  });

  describe("Edge cases", () => {
    it("handles partially_connected for same agent as connected (Rule 1 does not apply, but partially_connected same agent is not Rule 2)", () => {
      // partially_connected for the same agent is not explicitly covered by Rule 2 (only "connected")
      // It should fall through to Rule 3 or Rule 4
      const existingChannels: ExistingChannel[] = [
        { id: "ch-1", agentId, status: "partially_connected" },
      ];

      // partially_connected same agent: Rule 1 doesn't match (same agent), Rule 2 doesn't match (not "connected")
      // Rule 3 doesn't match (not "requires_reconnection"), so Rule 4 applies → create
      const result = checkPhoneNumberUniqueness(phoneNumberId, agentId, existingChannels);

      expect(result).toEqual({
        allowed: true,
        action: "create",
      });
    });
  });
});
