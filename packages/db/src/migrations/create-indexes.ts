/**
 * Migration Script — Creación de índices MongoDB.
 *
 * Crea todos los índices definidos en los esquemas de la aplicación.
 * Ejecutar con: `pnpm --filter @multibotagents/db migrate`
 *
 * Requiere la variable de entorno MONGODB_URI configurada.
 *
 * Índices creados:
 * - users: email (unique, case-insensitive), companyId
 * - refreshTokens: token (unique), userId+revoked, expiresAt (TTL)
 * - verifyTokens: token (unique), expiresAt (TTL), userId+type
 * - emailQueue: status+nextRetryAt, createdAt
 * - companies: status+deletionReqDate
 */

import { MongoClient } from "mongodb";
import {
  USERS_COLLECTION,
  USERS_INDEXES,
  REFRESH_TOKENS_COLLECTION,
  REFRESH_TOKENS_INDEXES,
  VERIFY_TOKENS_COLLECTION,
  VERIFY_TOKENS_INDEXES,
  EMAIL_QUEUE_COLLECTION,
  EMAIL_QUEUE_INDEXES,
  COMPANIES_COLLECTION,
  COMPANIES_INDEXES,
  RATE_LIMITS_COLLECTION,
  RATE_LIMITS_INDEXES,
  CHANNELS_COLLECTION,
  CHANNELS_INDEXES,
  AGENTS_COLLECTION,
  AGENTS_INDEXES,
} from "../schemas";

interface IndexDefinition {
  readonly key: Record<string, number>;
  readonly name: string;
  readonly unique?: boolean;
  readonly collation?: { locale: string; strength: number };
  readonly expireAfterSeconds?: number;
  readonly partialFilterExpression?: Record<string, unknown>;
}

async function createIndexes(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    // Define collection-index pairs
    const collections: Array<{
      name: string;
      indexes: readonly IndexDefinition[];
    }> = [
      { name: USERS_COLLECTION, indexes: USERS_INDEXES as unknown as IndexDefinition[] },
      { name: REFRESH_TOKENS_COLLECTION, indexes: REFRESH_TOKENS_INDEXES as unknown as IndexDefinition[] },
      { name: VERIFY_TOKENS_COLLECTION, indexes: VERIFY_TOKENS_INDEXES as unknown as IndexDefinition[] },
      { name: EMAIL_QUEUE_COLLECTION, indexes: EMAIL_QUEUE_INDEXES as unknown as IndexDefinition[] },
      { name: COMPANIES_COLLECTION, indexes: COMPANIES_INDEXES as unknown as IndexDefinition[] },
      { name: RATE_LIMITS_COLLECTION, indexes: RATE_LIMITS_INDEXES as unknown as IndexDefinition[] },
      { name: CHANNELS_COLLECTION, indexes: CHANNELS_INDEXES as unknown as IndexDefinition[] },
      { name: AGENTS_COLLECTION, indexes: AGENTS_INDEXES as unknown as IndexDefinition[] },
    ];

    for (const { name, indexes } of collections) {
      console.log(`\n📦 Collection: ${name}`);
      const collection = db.collection(name);

      for (const indexDef of indexes) {
        const options: Record<string, unknown> = { name: indexDef.name };

        if (indexDef.unique) {
          options.unique = true;
        }

        if (indexDef.collation) {
          options.collation = indexDef.collation;
        }

        if (indexDef.expireAfterSeconds !== undefined) {
          options.expireAfterSeconds = indexDef.expireAfterSeconds;
        }

        if (indexDef.partialFilterExpression) {
          options.partialFilterExpression = indexDef.partialFilterExpression;
        }

        try {
          await collection.createIndex(indexDef.key, options);
          console.log(`  ✅ Index "${indexDef.name}" created`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          // Index already exists with same options — not an error
          if (message.includes("already exists")) {
            console.log(`  ⚠️  Index "${indexDef.name}" already exists (skipped)`);
          } else {
            console.error(`  ❌ Failed to create index "${indexDef.name}": ${message}`);
            throw error;
          }
        }
      }
    }

    console.log("\n🎉 All indexes created successfully!");
  } finally {
    await client.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

createIndexes().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
