import { MongoClient } from "mongodb";
import { encryptToken } from "../packages/core/src/whatsapp/token-encryption";

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const businessToken = process.env.WHATSAPP_BUSINESS_TOKEN || "EAASyOIZCANAIBRhYIMZA7zQw2LGoAsrdpKHnFURMz3b50UwgOIotWV2yJsLJ5zfO0xUzL5pMt3NQcI97e6yA05GPEZAFlOvGGamZB4sjTC2pLC6A71CqQUFM0PErvc935Ir14M6NC7UIWog4HpVBg03WZCeqxnPZBFZA72oBR6ZAXPgUTnSELiZAJrDwbKBX1kNxBsu3kAjxi6skPI1XTHl3QnY6siZAvz13H9HQY2IeSHXK6L4ijH9ZBwhFUcsrEjwGUIHEZBBHkiPiVnSdOpHneWORMrmoXxmwXFulWQZDZD";

  if (!mongoUri) {
    console.error("❌ MONGODB_URI no está definido en las variables de entorno.");
    process.exit(1);
  }
  if (!encryptionKey) {
    console.error("❌ ENCRYPTION_KEY no está definido en las variables de entorno.");
    process.exit(1);
  }

  // IDs de los argumentos de línea de comandos opcionales o datos fijos
  const phoneNumberId = "1137730779422071";
  const wabaId = "1634171297635904";
  const phone = "+15556666784";
  const displayName = "Meta WhatsApp Test Number";

  console.log("⚙️  Conectando a MongoDB...");
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  console.log("➕ Creando nueva Empresa...");
  const now = new Date();
  const companyDoc = {
    name: "WhatsApp Test Company",
    country: "US",
    category: "technology",
    size: "6-10",
    phone: phone,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  const companyResult = await db.collection("companies").insertOne(companyDoc as any);
  const companyId = companyResult.insertedId;
  console.log(`✅ Empresa creada con éxito! ID: ${companyId.toHexString()}`);

  console.log("➕ Creando nuevo Agente...");
  const agentDoc = {
    companyId: companyId,
    nombre: "WhatsApp E2E RAG Agent",
    tipo: "rag",
    estado: "activo",
    instrucciones: "Eres un asistente virtual experto para nuestra empresa de pruebas. Responde de forma concisa y profesional.",
    relevanceThreshold: 0.5,
    topK: 3,
    maxResponseLength: 500,
    memoryWindow: 10,
    welcomeMessage: "¡Hola! Bienvenido al canal de pruebas de WhatsApp MultiBotAgents.",
    noInfoMessage: "Disculpa, no poseo información al respecto en este momento.",
    errorMessage: "Ocurrió un error inesperado al procesar tu solicitud.",
    language: "es",
    createdAt: now,
    updatedAt: now,
  };
  const agentResult = await db.collection("agents").insertOne(agentDoc as any);
  const agentId = agentResult.insertedId;
  console.log(`✅ Agente creado con éxito! ID: ${agentId.toHexString()}`);

  console.log("🔒 Cifrando token de WhatsApp...");
  const encryptedToken = encryptToken(businessToken, encryptionKey);

  console.log("🔍 Creando o actualizando registro de canal...");
  const channelDoc = {
    companyId: companyId,
    agentId: agentId,
    provider: "whatsapp" as const,
    status: "connected" as const,
    phoneNumberId,
    wabaId,
    encryptedToken,
    displayName,
    connectedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const existing = await db.collection("channels").findOne({ phoneNumberId });
  if (existing) {
    console.log(`🔄 Canal existente encontrado (${existing._id.toHexString()}). Actualizando canal...`);
    await db.collection("channels").updateOne(
      { _id: existing._id },
      { $set: channelDoc }
    );
    console.log(`✅ Canal actualizado con éxito! ID: ${existing._id.toHexString()}`);
  } else {
    const channelResult = await db.collection("channels").insertOne(channelDoc as any);
    console.log(`✅ Canal creado con éxito! ID: ${channelResult.insertedId.toHexString()}`);
  }

  await client.close();
  console.log("\n🚀 ¡Instalación completada exitosamente!");
  console.log(`Empresa ID: ${companyId.toHexString()}`);
  console.log(`Agente ID:  ${agentId.toHexString()}`);
  console.log(`Número:     ${phone}`);
}

run().catch((err) => {
  console.error("❌ Error ejecutando el script:", err);
  process.exit(1);
});
