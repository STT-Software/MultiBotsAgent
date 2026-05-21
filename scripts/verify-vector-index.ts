/**
 * Script de verificación del índice vectorSearch en MongoDB Atlas.
 *
 * Verifica que el índice `knowledge_vector_index` existe en la colección
 * `knowledge_fragments` y que su configuración es correcta:
 * - Tipo: vectorSearch
 * - Campo embedding: vector de 1024 dimensiones con similitud coseno
 * - Campo agentId: filtro para aislamiento entre agentes
 *
 * Uso:
 *   MONGODB_URI=<uri> npx tsx scripts/verify-vector-index.ts
 *   pnpm --filter @multibotagents/db run verify-vector-index
 *
 * Exit codes:
 *   0 — Índice existe y está correctamente configurado
 *   1 — Índice falta o tiene configuración incorrecta
 *
 * Valida: Requisito 6.3
 */

import { MongoClient } from "mongodb";

// ─── Configuración esperada del índice ───────────────────────────────────────

const EXPECTED_INDEX_NAME = "knowledge_vector_index";
const EXPECTED_COLLECTION = "knowledge_fragments";
const EXPECTED_DIMENSIONS = 1024;
const EXPECTED_SIMILARITY = "cosine";
const EXPECTED_VECTOR_PATH = "embedding";
const EXPECTED_FILTER_PATH = "agentId";

// ─── Interfaces para tipado del resultado de listSearchIndexes ───────────────

interface VectorFieldDefinition {
  type: string;
  path: string;
  numDimensions?: number;
  similarity?: string;
}

interface SearchIndexDefinition {
  name: string;
  type?: string;
  latestDefinition?: {
    fields?: VectorFieldDefinition[];
  };
}

// ─── Función principal ───────────────────────────────────────────────────────

async function verifyVectorIndex(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ La variable de entorno MONGODB_URI no está configurada.");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Conectado a MongoDB Atlas");

    const db = client.db();
    const collection = db.collection(EXPECTED_COLLECTION);

    // Listar índices de búsqueda (Atlas Search / vectorSearch)
    console.log(`\n🔍 Buscando índice "${EXPECTED_INDEX_NAME}" en colección "${EXPECTED_COLLECTION}"...`);

    const searchIndexes: SearchIndexDefinition[] = [];

    try {
      const cursor = collection.listSearchIndexes(EXPECTED_INDEX_NAME);
      for await (const index of cursor) {
        searchIndexes.push(index as SearchIndexDefinition);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error al listar índices de búsqueda: ${message}`);
      console.error("   Asegúrate de estar conectado a un cluster MongoDB Atlas con soporte para Atlas Search.");
      process.exit(1);
    }

    // Verificar existencia del índice
    if (searchIndexes.length === 0) {
      console.error(`❌ El índice "${EXPECTED_INDEX_NAME}" NO existe en la colección "${EXPECTED_COLLECTION}".`);
      console.error("   Créalo desde la UI de Atlas o la API de Atlas Admin con la siguiente configuración:");
      console.error(JSON.stringify(getExpectedConfig(), null, 2));
      process.exit(1);
    }

    const index = searchIndexes[0];
    console.log(`✅ Índice "${EXPECTED_INDEX_NAME}" encontrado`);

    // Verificar tipo vectorSearch
    if (index.type && index.type !== "vectorSearch") {
      console.error(`❌ El índice tiene tipo "${index.type}", se esperaba "vectorSearch".`);
      process.exit(1);
    }
    console.log("✅ Tipo: vectorSearch");

    // Verificar campos de la definición
    const fields = index.latestDefinition?.fields;

    if (!fields || fields.length === 0) {
      console.error("❌ El índice no tiene campos definidos en latestDefinition.fields.");
      console.error("   Configuración esperada:");
      console.error(JSON.stringify(getExpectedConfig(), null, 2));
      process.exit(1);
    }

    // Verificar campo vector (embedding)
    const vectorField = fields.find(
      (f) => f.type === "vector" && f.path === EXPECTED_VECTOR_PATH
    );

    if (!vectorField) {
      console.error(`❌ No se encontró un campo vector con path "${EXPECTED_VECTOR_PATH}".`);
      console.error("   Campos encontrados:", JSON.stringify(fields, null, 2));
      process.exit(1);
    }

    // Verificar dimensiones
    if (vectorField.numDimensions !== EXPECTED_DIMENSIONS) {
      console.error(
        `❌ El campo embedding tiene ${vectorField.numDimensions} dimensiones, se esperaban ${EXPECTED_DIMENSIONS}.`
      );
      process.exit(1);
    }
    console.log(`✅ Dimensiones: ${EXPECTED_DIMENSIONS}`);

    // Verificar similitud
    if (vectorField.similarity !== EXPECTED_SIMILARITY) {
      console.error(
        `❌ El campo embedding usa similitud "${vectorField.similarity}", se esperaba "${EXPECTED_SIMILARITY}".`
      );
      process.exit(1);
    }
    console.log(`✅ Similitud: ${EXPECTED_SIMILARITY}`);

    // Verificar campo filtro (agentId)
    const filterField = fields.find(
      (f) => f.type === "filter" && f.path === EXPECTED_FILTER_PATH
    );

    if (!filterField) {
      console.error(`❌ No se encontró un campo filter con path "${EXPECTED_FILTER_PATH}".`);
      console.error("   Campos encontrados:", JSON.stringify(fields, null, 2));
      process.exit(1);
    }
    console.log(`✅ Filtro por: ${EXPECTED_FILTER_PATH}`);

    // Todo OK
    console.log("\n🎉 El índice vectorSearch está correctamente configurado.");
    process.exit(0);
  } finally {
    await client.close();
  }
}

// ─── Helper: configuración esperada para mensajes de error ───────────────────

function getExpectedConfig() {
  return {
    name: EXPECTED_INDEX_NAME,
    type: "vectorSearch",
    fields: [
      {
        path: EXPECTED_VECTOR_PATH,
        type: "vector",
        numDimensions: EXPECTED_DIMENSIONS,
        similarity: EXPECTED_SIMILARITY,
      },
      {
        path: EXPECTED_FILTER_PATH,
        type: "filter",
      },
    ],
  };
}

// ─── Ejecución ───────────────────────────────────────────────────────────────

verifyVectorIndex().catch((error) => {
  console.error("❌ Error inesperado:", error);
  process.exit(1);
});
