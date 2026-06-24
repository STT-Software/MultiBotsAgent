import { Db, ObjectId } from "mongodb";
import type { IRateLimitRepository, RateLimitRecord } from "@multibotagents/types";
import {
  RATE_LIMITS_COLLECTION,
  type RateLimitDocument,
} from "../../schemas/rate-limit.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio RateLimitRecord. */
function toEntity(doc: RateLimitDocument): RateLimitRecord {
  return {
    id: doc._id.toHexString(),
    key: doc.key,
    attempts: doc.attempts,
    blockedUntil: doc.blockedUntil,
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class RateLimitRepository implements IRateLimitRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<RateLimitDocument>(RATE_LIMITS_COLLECTION);
  }

  /**
   * Busca un registro de rate limit por clave.
   * @param key - Clave del registro ("ip:<ip>" o "email:<email>")
   * @returns El registro encontrado o null si no existe
   */
  async findByKey(key: string): Promise<RateLimitRecord | null> {
    const doc = await this.collection.findOne({ key });
    return doc ? toEntity(doc) : null;
  }

  /**
   * Incrementa el contador de intentos para una clave (upsert atómico).
   * Si no existe, crea el registro con attempts=1.
   * Si alcanza maxAttempts, establece blockedUntil.
   * Actualiza expiresAt para mantener el TTL activo.
   */
  async upsertAttempt(
    key: string,
    windowMs: number,
    blockDurationMs: number,
    maxAttempts: number,
  ): Promise<RateLimitRecord> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowMs);

    // Upsert atómico: incrementa attempts y actualiza expiresAt
    const result = await this.collection.findOneAndUpdate(
      { key },
      {
        $inc: { attempts: 1 },
        $set: { expiresAt },
        $setOnInsert: {
          _id: new ObjectId(),
          key,
          blockedUntil: null,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!result) {
      throw new Error(`Failed to upsert rate limit record for key: ${key}`);
    }

    // Si alcanzó el umbral, establecer bloqueo
    if (result.attempts >= maxAttempts && !result.blockedUntil) {
      const blockedUntil = new Date(now.getTime() + blockDurationMs);
      const blockedExpiresAt = new Date(
        now.getTime() + blockDurationMs + windowMs,
      );

      const blocked = await this.collection.findOneAndUpdate(
        { key },
        { $set: { blockedUntil, expiresAt: blockedExpiresAt } },
        { returnDocument: "after" },
      );

      if (blocked) {
        return toEntity(blocked);
      }
    }

    return toEntity(result);
  }

  /**
   * Elimina el registro de rate limit para una clave.
   * Se usa para resetear el contador tras un login exitoso.
   */
  async resetByKey(key: string): Promise<void> {
    await this.collection.deleteOne({ key });
  }
}
