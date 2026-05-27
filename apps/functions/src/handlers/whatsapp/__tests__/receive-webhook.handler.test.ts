import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "../receive-webhook.handler";
import { SQSClient } from "@aws-sdk/client-sqs";
import { validateMetaSignature } from "@multibotagents/core";

// Mock @aws-sdk/client-sqs
vi.mock("@aws-sdk/client-sqs", () => {
  const mockSend = vi.fn();
  return {
    SQSClient: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    SendMessageCommand: vi.fn(),
  };
});

// Mock @multibotagents/core
vi.mock("@multibotagents/core", () => ({
  validateMetaSignature: vi.fn(),
}));

// Mock repositories and mongo
const mockFindActiveByPhoneNumberId = vi.fn();
const mockFindByWaMessageId = vi.fn();
const mockCreateProcessed = vi.fn();

vi.mock("@multibotagents/db", () => {
  return {
    ChannelRepository: vi.fn().mockImplementation(() => ({
      findActiveByPhoneNumberId: mockFindActiveByPhoneNumberId,
    })),
    ProcessedMessageRepository: vi.fn().mockImplementation(() => ({
      findByWaMessageId: mockFindByWaMessageId,
      create: mockCreateProcessed,
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
  };
});

function createApiGatewayEvent(body: string, headers: Record<string, string> = {}): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "POST /webhooks/whatsapp",
    rawPath: "/webhooks/whatsapp",
    rawQueryString: "",
    headers,
    body,
    isBase64Encoded: false,
    requestContext: {} as any,
  };
}

describe("receive-webhook handler", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      MONGODB_URI: "mongodb://mock-uri",
      META_APP_SECRET: "test-secret",
      WHATSAPP_INCOMING_QUEUE_URL: "https://sqs.us-east-1.amazonaws.com/test-queue",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return 401 when Meta HMAC signature is invalid", async () => {
    vi.mocked(validateMetaSignature).mockReturnValue(false);

    const event = createApiGatewayEvent("{}", { "x-hub-signature-256": "invalid-sig" });
    const result: any = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toEqual({ error: "Unauthorized" });
  });

  it("should return 200 and ignore events that are not whatsapp_business_account", async () => {
    vi.mocked(validateMetaSignature).mockReturnValue(true);

    const payload = JSON.stringify({ object: "user", entry: [] });
    const event = createApiGatewayEvent(payload, { "x-hub-signature-256": "valid-sig" });
    const result: any = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ status: "ignored" });
  });

  it("should return 200 and silently ignore messages for inactive phone numbers", async () => {
    vi.mocked(validateMetaSignature).mockReturnValue(true);
    mockFindActiveByPhoneNumberId.mockResolvedValue(null);

    const payload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "inactive-phone-id" },
                messages: [
                  {
                    id: "wamid.123",
                    type: "text",
                    text: { body: "hola" },
                    from: "12345",
                    timestamp: "1700000000",
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const event = createApiGatewayEvent(payload, { "x-hub-signature-256": "valid-sig" });
    const result: any = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockFindActiveByPhoneNumberId).toHaveBeenCalledWith("inactive-phone-id");
    // SQS send should not have been called
    const sqsMock = new SQSClient({});
    expect(sqsMock.send).not.toHaveBeenCalled();
  });

  it("should process new valid text messages, store idempotency, and enqueue SQS", async () => {
    vi.mocked(validateMetaSignature).mockReturnValue(true);
    mockFindActiveByPhoneNumberId.mockResolvedValue({
      id: "chan-123",
      agentId: "agent-abc",
      companyId: "company-xyz",
      phoneNumberId: "phone-id-123",
    });
    mockFindByWaMessageId.mockResolvedValue(null); // Not duplicate

    const payload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "phone-id-123" },
                messages: [
                  {
                    id: "wamid.123",
                    type: "text",
                    text: { body: "Hola agente RAG" },
                    from: "54911223344",
                    timestamp: "1704067200", // 2024-01-01T00:00:00.000Z
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const event = createApiGatewayEvent(payload, { "x-hub-signature-256": "valid-sig" });
    const result: any = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ status: "success" });

    // Check idempotency record creation
    expect(mockCreateProcessed).toHaveBeenCalledWith(
      expect.objectContaining({
        waMessageId: "wamid.123",
      })
    );

    // Check SQS message sent
    const sqsMock = new SQSClient({});
    expect(sqsMock.send).toHaveBeenCalled();
  });

  it("should ignore duplicate messages already in ProcessedMessageRepository", async () => {
    vi.mocked(validateMetaSignature).mockReturnValue(true);
    mockFindActiveByPhoneNumberId.mockResolvedValue({
      id: "chan-123",
      agentId: "agent-abc",
      companyId: "company-xyz",
      phoneNumberId: "phone-id-123",
    });
    mockFindByWaMessageId.mockResolvedValue({ waMessageId: "wamid.123" }); // Duplicate

    const payload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "phone-id-123" },
                messages: [
                  {
                    id: "wamid.123",
                    type: "text",
                    text: { body: "Hola de nuevo" },
                    from: "54911223344",
                    timestamp: "1704067200",
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const event = createApiGatewayEvent(payload, { "x-hub-signature-256": "valid-sig" });
    const result: any = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockCreateProcessed).not.toHaveBeenCalled();

    const sqsMock = new SQSClient({});
    expect(sqsMock.send).not.toHaveBeenCalled();
  });

  it("should return 500 when database or connection throws unexpected error", async () => {
    vi.mocked(validateMetaSignature).mockReturnValue(true);
    mockFindActiveByPhoneNumberId.mockRejectedValue(new Error("DB Connection Lost"));

    const payload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "phone-id-123" },
                messages: [
                  {
                    id: "wamid.123",
                    type: "text",
                    text: { body: "hola" },
                    from: "123",
                    timestamp: "1700000",
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const event = createApiGatewayEvent(payload, { "x-hub-signature-256": "sig" });
    const result: any = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: "Internal server error" });
  });
});
