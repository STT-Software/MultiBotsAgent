import { MongoClient, ObjectId } from "mongodb";
import { encryptToken } from "../packages/core/src/whatsapp/token-encryption";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!mongoUri) {
    console.error("❌ MONGODB_URI no está definido en las variables de entorno.");
    process.exit(1);
  }
  if (!encryptionKey) {
    console.error("❌ ENCRYPTION_KEY no está definido en las variables de entorno.");
    process.exit(1);
  }

  // Argumentos de línea de comandos:
  // pnpm tsx scripts/connect-test-channel.ts <agentId> <companyId> <wabaId> <phoneNumberId> <businessToken> <displayName>
  const args = process.argv.slice(2);
  if (args.length < 6) {
    console.log(`
Uso:
  pnpm tsx scripts/connect-test-channel.ts <agentId> <companyId> <wabaId> <phoneNumberId> <businessToken> <displayName>

Ejemplo:
  pnpm tsx scripts/connect-test-channel.ts 607f1f77bcf86cd799439011 607f1f77bcf86cd799439022 123456789012345 987654321098765 EAAG... "Mi Numero Prueba"
    `);
    process.exit(1);
  }

  const [agentId, companyId, wabaId, phoneNumberId, businessToken, displayName] = args;

  console.log("⚙️  Conectando a MongoDB...");
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  const channelsCol = db.collection("channels");

  console.log("🔒 Cifrando token de WhatsApp...");
  const encryptedToken = encryptToken(businessToken, encryptionKey);

  console.log("🔍 Buscando si ya existe un canal conectado...");
  const existing = await channelsCol.findOne({ phoneNumberId });

  const now = new Date();

  if (existing) {
    console.log(`🔄 Canal existente encontrado (${existing._id.toHexString()}). Actualizando credenciales...`);
    await channelsCol.updateOne(
      { _id: existing._id },
      {
        $set: {
          encryptedToken,
          status: "connected",
          displayName,
          wabaId,
          agentId: new ObjectId(agentId),
          companyId: new ObjectId(companyId),
          updatedAt: now,
          connectedAt: now,
        },
      }
    );
    console.log("✅ Canal actualizado con éxito!");
  } else {
    console.log("➕ Creando nuevo registro de canal...");
    const doc = {
      companyId: new ObjectId(companyId),
      agentId: new ObjectId(agentId),
      provider: "whatsapp",
      status: "connected",
      phoneNumberId,
      wabaId,
      encryptedToken,
      displayName,
      connectedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await channelsCol.insertOne(doc);
    console.log(`✅ Canal creado con éxito! ID: ${result.insertedId.toHexString()}`);
  }

  await client.close();
}

run().catch((err) => {
  console.error("❌ Error ejecutando el script:", err);
  process.exit(1);
});
