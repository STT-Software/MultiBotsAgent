import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SQSEvent } from "aws-lambda";
import { handler } from "../sender.handler";
import { decryptToken } from "@multibotagents/core";

// Mock @multibotagents/core
vi.mock("@multibotagents/core", () => ({
  decryptToken: vi.fn(),
}));

// Mock repositories
const mockFindById = vi.fn();
const mockCreateLog = vi.fn();

vi.mock("@multibotagents/db", () => {
  return {
    ChannelRepository: vi.fn().mockImplementation(() => ({
      findById: mockFindById,
    })),
    MessageLogRepository: vi.fn().mockImplementation(() => ({
      create: mockCreateLog,
    })),
  };
});

vi.mock("mongodb", () => {
  const mockDb = {
    collection: vi.fn(),
  };
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue(mockDb),
  };
  return {
    MongoClient: vi.fn().mockImplementation(() => mockClient),
    ObjectId: class {
      toHexString() {
        return "mock-object-id-hex";
      }
    },
  };
});

function createSqsEvent(body: string): SQSEvent {
  return {
    Records: [
      {
        messageId: "sqs-msg-456",
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

describe("sender handler", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    process.env = {
      ...originalEnv,
      MONGODB_URI: "mongodb://mock-uri",
      ENCRYPTION_KEY: "test-encryption-key",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("should decrypt token, send text messages to Meta, and log success status in Mongo", async () => {
    mockFindById.mockResolvedValue({
      id: "chan-123",
      encryptedToken: "encrypted-meta-token",
      provider: "whatsapp",
    });
    vi.mocked(decryptToken).mockReturnValue("decrypted-meta-token");

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        messages: [{ id: "wamid.sent-by-meta-123" }],
      }),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const payload = JSON.stringify({
      channelId: "chan-123",
      phoneNumberId: "phone-id-abc",
      recipientPhone: "54911223344",
      conversationId: "whatsapp_54911223344",
      messages: [{ type: "text", content: "Hola cliente" }],
    });

    const event = createSqsEvent(payload);
    await expect(handler(event)).resolves.not.toThrow();

    // Verification
    expect(mockFindById).toHaveBeenCalledWith("chan-123");
    expect(decryptToken).toHaveBeenCalledWith("encrypted-meta-token", "test-encryption-key");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/phone-id-abc/messages",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Authorization": "Bearer decrypted-meta-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: "54911223344",
          type: "text",
          text: {
            preview_url: false,
            body: "Hola cliente",
          },
        }),
      })
    );

    // Logging verification
    expect(mockCreateLog).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: "chan-123",
        conversationId: "whatsapp_54911223344",
        direction: "outgoing",
        waMessageId: "wamid.sent-by-meta-123",
        content: "Hola cliente",
        status: "sent",
      })
    );
  });

  it("should throw error and log failed status if Meta returns error status", async () => {
    mockFindById.mockResolvedValue({
      id: "chan-123",
      encryptedToken: "encrypted-meta-token",
      provider: "whatsapp",
    });
    vi.mocked(decryptToken).mockReturnValue("decrypted-meta-token");

    const mockResponse = {
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: vi.fn().mockResolvedValue({
        error: { code: 100, message: "Invalid Phone Number" },
      }),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const payload = JSON.stringify({
      channelId: "chan-123",
      phoneNumberId: "phone-id-abc",
      recipientPhone: "invalid-phone",
      conversationId: "whatsapp_invalid",
      messages: [{ type: "text", content: "Hola" }],
    });

    const event = createSqsEvent(payload);
    await expect(handler(event)).rejects.toThrow("Fallo en el envío a Meta: Invalid Phone Number (código 100)");

    expect(mockCreateLog).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: "chan-123",
        conversationId: "whatsapp_invalid",
        direction: "outgoing",
        status: "failed",
        errorCode: 100,
        errorMessage: "Invalid Phone Number",
      })
    );
  });
});
