import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SQSEvent } from "aws-lambda";
import { handler } from "../incoming-processor.handler";
import { SQSClient } from "@aws-sdk/client-sqs";

vi.mock("@aws-sdk/client-sqs", () => {
  const mockSend = vi.fn();
  return {
    SQSClient: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    SendMessageCommand: vi.fn(),
  };
});

function createSqsEvent(body: string): SQSEvent {
  return {
    Records: [
      {
        messageId: "sqs-msg-123",
        receiptHandle: "handle",
        body,
        attributes: {} as any,
        messageAttributes: {},
        md5OfBody: "md5",
        eventSource: "aws:sqs",
        eventSourceARN: "arn",
        awsRegion: "us-east-1",
      },
    ],
  };
}

describe("incoming-processor handler", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    process.env = {
      ...originalEnv,
      SERVICES_API_URL: "https://api.example.com",
      WHATSAPP_OUTGOING_QUEUE_URL: "https://sqs.us-east-1.amazonaws.com/outgoing-queue",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("should successfully call NestJS RAG API and enqueue response to SQS", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        messages: [{ type: "text", content: "Hola, ¿en qué puedo ayudarte?" }],
        escalated: false,
      }),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const incomingPayload = JSON.stringify({
      agentId: "agent-123",
      conversationId: "whatsapp_54911223344",
      messageText: "Hola",
      timestamp: "2024-01-01T00:00:00.000Z",
      channelId: "chan-123",
      phoneNumberId: "phone-id-123",
      senderPhoneNumber: "54911223344",
      messageId: "wamid.123",
    });

    const event = createSqsEvent(incomingPayload);
    await expect(handler(event)).resolves.not.toThrow();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/internal/agents/agent-123/process",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          conversationId: "whatsapp_54911223344",
          userMessage: "Hola",
          timestamp: "2024-01-01T00:00:00.000Z",
          channelId: "chan-123",
        }),
      })
    );

    const sqsMock = new SQSClient({});
    expect(sqsMock.send).toHaveBeenCalled();
  });

  it("should do nothing if NestJS returns empty messages array", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        messages: [],
        escalated: false,
      }),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const incomingPayload = JSON.stringify({
      agentId: "agent-123",
      conversationId: "whatsapp_54911223344",
      messageText: "Hola",
      timestamp: "2024-01-01T00:00:00.000Z",
      channelId: "chan-123",
      phoneNumberId: "phone-id-123",
      senderPhoneNumber: "54911223344",
      messageId: "wamid.123",
    });

    const event = createSqsEvent(incomingPayload);
    await expect(handler(event)).resolves.not.toThrow();

    const sqsMock = new SQSClient({});
    expect(sqsMock.send).not.toHaveBeenCalled();
  });

  it("should throw error if NestJS response is not ok", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: vi.fn().mockResolvedValue("Failed to connect RAG db"),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const incomingPayload = JSON.stringify({
      agentId: "agent-123",
      conversationId: "whatsapp_54911223344",
      messageText: "Hola",
      timestamp: "2024-01-01T00:00:00.000Z",
      channelId: "chan-123",
      phoneNumberId: "phone-id-123",
      senderPhoneNumber: "54911223344",
      messageId: "wamid.123",
    });

    const event = createSqsEvent(incomingPayload);
    await expect(handler(event)).rejects.toThrow("Llamada fallida a NestJS (500): Failed to connect RAG db");
  });
});
