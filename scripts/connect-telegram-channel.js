const { MongoClient, ObjectId } = require("mongodb");
const { encryptToken } = require("../packages/core/src/whatsapp/token-encryption");
const dotenv = require("dotenv");

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

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(`
Uso:
  pnpm exec node scripts/connect-telegram-channel.js <agentId> <botToken> [webhookUrl]

Ejemplo:
  pnpm exec node scripts/connect-telegram-channel.js 6a1ef61f86fd3367b8c7aded 8974457272:AAF2-ITfvHiD8hw3zggK-nqossYaDiU5G3A https://3167139d7a9544.lhr.life
    `);
    process.exit(1);
  }

  const [agentId, botToken, cmdWebhookUrl] = args;
  const webhookUrl = cmdWebhookUrl || process.env.WEBHOOK_URL;

  console.log("⚙️  Conectando a la API de Telegram para validar el botToken...");
  let botUsername = "";
  let botFirstName = "";

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const description = errorData.description || `HTTP ${response.status}`;
      throw new Error(`Token de Telegram inválido: ${description}`);
    }

    const data = await response.json();
    if (data.ok && data.result) {
      botUsername = data.result.username;
      botFirstName = data.result.first_name;
      console.log(`🤖 Bot validado correctamente: @${botUsername} (${botFirstName})`);
    } else {
      throw new Error("Respuesta inválida de la API de Telegram.");
    }
  } catch (error) {
    console.error(`❌ Error validando el botToken de Telegram: ${error.message}`);
    process.exit(1);
  }

  console.log("⚙️  Conectando a MongoDB...");
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  console.log(`🔍 Buscando agente con ID: ${agentId}...`);
  let objectAgentId;
  try {
    objectAgentId = new ObjectId(agentId);
  } catch {
    console.error("❌ El agentId provisto no es un ObjectId de Mongo válido.");
    await client.close();
    process.exit(1);
  }

  const agent = await db.collection("agents").findOne({ _id: objectAgentId });
  if (!agent) {
    console.error(`❌ Agente con ID ${agentId} no encontrado en la base de datos.`);
    await client.close();
    process.exit(1);
  }

  let companyId = agent.companyId;
  if (!companyId) {
    console.warn("⚠️  El agente no tiene una compañía asociada. Buscando la primera compañía disponible...");
    const firstCompany = await db.collection("companies").findOne({});
    if (firstCompany) {
      companyId = firstCompany._id;
      console.log(`👉 Asociando a compañía existente: ${companyId.toHexString()}`);
    } else {
      console.error("❌ No se encontró ninguna compañía en la base de datos para asociar el canal.");
      await client.close();
      process.exit(1);
    }
  }

  console.log("🔒 Cifrando token de Telegram...");
  const encryptedToken = encryptToken(botToken, encryptionKey);

  console.log("🔍 Buscando si ya existe un canal de Telegram para este agente...");
  const existing = await db.collection("channels").findOne({
    agentId: objectAgentId,
    provider: "telegram"
  });

  const now = new Date();
  let channelId;

  if (existing) {
    channelId = existing._id;
    console.log(`\n🔄 Canal de Telegram existente encontrado (ID: ${channelId.toHexString()}). Actualizando credenciales...`);
    await db.collection("channels").updateOne(
      { _id: channelId },
      {
        $set: {
          encryptedToken,
          status: "connected",
          displayName: botFirstName,
          telegramBotUsername: botUsername,
          companyId: new ObjectId(companyId),
          updatedAt: now,
        },
      }
    );
    console.log("✅ Canal actualizado con éxito!");
  } else {
    console.log("\n➕ Creando nuevo registro de canal de Telegram...");
    const doc = {
      companyId: new ObjectId(companyId),
      agentId: objectAgentId,
      provider: "telegram",
      status: "connected",
      telegramBotUsername: botUsername,
      encryptedToken,
      displayName: botFirstName,
      connectedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("channels").insertOne(doc);
    channelId = result.insertedId;
    console.log(`✅ Canal creado con éxito! ID: ${channelId.toHexString()}`);
  }

  if (webhookUrl) {
    const tgWebhookUrl = `${webhookUrl}/api/channels/telegram/webhook/${channelId.toHexString()}`;
    console.log(`\n🌐 Configurando webhook en Telegram a: ${tgWebhookUrl}...`);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${tgWebhookUrl}`);
      const result = await response.json();
      if (result.ok) {
        console.log("✅ Webhook de Telegram configurado con éxito!");
      } else {
        console.warn(`⚠️ Telegram retornó error al configurar webhook: ${result.description}`);
      }
    } catch (e) {
      console.warn(`⚠️ No se pudo configurar el webhook automáticamente: ${e.message}`);
    }
  } else {
    console.log("\n💡 Nota: No se configuró webhook porque no se definió WEBHOOK_URL ni se pasó como argumento.");
    console.log(`La URL esperada del webhook de Telegram es: /api/channels/telegram/webhook/${channelId.toHexString()}`);
  }

  await client.close();
}

run().catch((err) => {
  console.error("❌ Error inesperado:", err);
  process.exit(1);
});
