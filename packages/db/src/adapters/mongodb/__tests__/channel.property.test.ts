import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { ObjectId } from "mongodb";
import { ChannelRepository } from "../channel.repository";
import type { CreateChannelData } from "../../../interfaces";

// ─── Mock Helpers ────────────────────────────────────────────────────────────

function createMockCollection() {
  return {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  };
}

function createMockDb(collection: ReturnType<typeof createMockCollection>) {
  return {
    collection: vi.fn().mockReturnValue(collection),
  } as any;
}

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generates a valid 24-char hex string (valid ObjectId) */
const arbitraryObjectIdHex = fc
  .uint8Array({ minLength: 12, maxLength: 12 })
  .map((bytes) => Buffer.from(bytes).toString("hex"));

/** Generates a non-empty alphanumeric string (for IDs and names) */
const arbitraryNonEmptyString = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

/** Generates a valid ChannelStatus */
const arbitraryChannelStatus = fc.constantFrom(
  "connected" as const,
  "disconnected" as const,
  "requires_reconnection" as const,
  "partially_connected" as const,
);

/** Generates a valid EncryptedToken */
const arbitraryEncryptedToken = fc.record({
  ciphertext: fc.string({ minLength: 10, maxLength: 200 }),
  iv: fc.string({ minLength: 10, maxLength: 50 }),
  tag: fc.string({ minLength: 10, maxLength: 50 }),
});

/** Generates a valid CreateChannelData */
const arbitraryCreateChannelData: fc.Arbitrary<CreateChannelData> = fc.record({
  companyId: arbitraryObjectIdHex,
  agentId: arbitraryObjectIdHex,
  provider: fc.constant("whatsapp" as const),
  status: arbitraryChannelStatus,
  phoneNumberId: arbitraryNonEmptyString,
  wabaId: arbitraryNonEmptyString,
  encryptedToken: arbitraryEncryptedToken,
  displayName: arbitraryNonEmptyString,
  webhookOverrideUrl: fc.option(fc.webUrl(), { nil: undefined }),
  connectedAt: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe("ChannelRepository — Property Tests", () => {
  /**
   * Feature: embedded-signup, Property 4: El documento Channel creado contiene todos los campos requeridos
   *
   * Para cualquier conjunto válido de parámetros de conexión (companyId, agentId, wabaId,
   * phoneNumberId, token cifrado, displayName), el documento Channel resultante debe contener
   * todos los campos obligatorios (companyId, agentId, provider="whatsapp", status, phoneNumberId,
   * wabaId, encryptedToken con ciphertext/iv/tag, displayName, connectedAt, createdAt, updatedAt)
   * con tipos correctos y valores no nulos.
   *
   * **Validates: Requirements 7.1**
   */
  describe("Property 4: El documento Channel creado contiene todos los campos requeridos", () => {
    let mockCollection: ReturnType<typeof createMockCollection>;
    let repository: ChannelRepository;

    beforeEach(() => {
      mockCollection = createMockCollection();
      const mockDb = createMockDb(mockCollection);
      repository = new ChannelRepository(mockDb);
    });

    it("el Channel retornado contiene todos los campos obligatorios con tipos correctos", async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryCreateChannelData, async (data) => {
          const insertedId = new ObjectId();
          mockCollection.insertOne.mockResolvedValue({ insertedId });

          const channel = await repository.create(data);

          // id: string no vacío (hex del ObjectId generado)
          expect(typeof channel.id).toBe("string");
          expect(channel.id).toBe(insertedId.toHexString());
          expect(channel.id.length).toBeGreaterThan(0);

          // companyId: string no vacío
          expect(typeof channel.companyId).toBe("string");
          expect(channel.companyId.length).toBeGreaterThan(0);

          // agentId: string no vacío
          expect(typeof channel.agentId).toBe("string");
          expect(channel.agentId.length).toBeGreaterThan(0);

          // provider: exactamente "whatsapp"
          expect(channel.provider).toBe("whatsapp");

          // status: uno de los valores válidos
          expect(["connected", "disconnected", "requires_reconnection", "partially_connected"]).toContain(channel.status);

          // phoneNumberId: string no vacío
          expect(typeof channel.phoneNumberId).toBe("string");
          expect(channel.phoneNumberId.length).toBeGreaterThan(0);

          // wabaId: string no vacío
          expect(typeof channel.wabaId).toBe("string");
          expect(channel.wabaId.length).toBeGreaterThan(0);

          // encryptedToken: objeto con ciphertext, iv, tag (strings)
          expect(channel.encryptedToken).toBeDefined();
          expect(typeof channel.encryptedToken.ciphertext).toBe("string");
          expect(typeof channel.encryptedToken.iv).toBe("string");
          expect(typeof channel.encryptedToken.tag).toBe("string");

          // displayName: string no vacío
          expect(typeof channel.displayName).toBe("string");
          expect(channel.displayName.length).toBeGreaterThan(0);

          // connectedAt: Date instance
          expect(channel.connectedAt).toBeInstanceOf(Date);

          // createdAt: Date instance (auto-generated)
          expect(channel.createdAt).toBeInstanceOf(Date);

          // updatedAt: Date instance (auto-generated)
          expect(channel.updatedAt).toBeInstanceOf(Date);
        }),
        { numRuns: 100 },
      );
    });

    it("createdAt y updatedAt son generados automáticamente y son iguales al momento de creación", async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryCreateChannelData, async (data) => {
          const insertedId = new ObjectId();
          mockCollection.insertOne.mockResolvedValue({ insertedId });

          const channel = await repository.create(data);

          // createdAt y updatedAt deben ser iguales al crear
          expect(channel.createdAt).toEqual(channel.updatedAt);

          // Deben ser fechas recientes (no las del input connectedAt)
          const now = new Date();
          const fiveSecondsAgo = new Date(now.getTime() - 5000);
          expect(channel.createdAt.getTime()).toBeGreaterThanOrEqual(fiveSecondsAgo.getTime());
          expect(channel.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
        }),
        { numRuns: 100 },
      );
    });

    it("los valores del input se preservan correctamente en el Channel resultante", async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryCreateChannelData, async (data) => {
          const insertedId = new ObjectId();
          mockCollection.insertOne.mockResolvedValue({ insertedId });

          const channel = await repository.create(data);

          // Los ObjectId hex del input se preservan como strings hex en la entidad
          expect(channel.companyId).toBe(new ObjectId(data.companyId).toHexString());
          expect(channel.agentId).toBe(new ObjectId(data.agentId).toHexString());

          // Campos directos se preservan
          expect(channel.provider).toBe(data.provider);
          expect(channel.status).toBe(data.status);
          expect(channel.phoneNumberId).toBe(data.phoneNumberId);
          expect(channel.wabaId).toBe(data.wabaId);
          expect(channel.displayName).toBe(data.displayName);
          expect(channel.connectedAt).toEqual(data.connectedAt);

          // EncryptedToken se preserva completo
          expect(channel.encryptedToken.ciphertext).toBe(data.encryptedToken.ciphertext);
          expect(channel.encryptedToken.iv).toBe(data.encryptedToken.iv);
          expect(channel.encryptedToken.tag).toBe(data.encryptedToken.tag);
        }),
        { numRuns: 100 },
      );
    });
  });
});
