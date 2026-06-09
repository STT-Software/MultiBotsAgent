const { MongoClient, ObjectId } = require("mongodb");
const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function deriveKeyBuffer(encryptionKey) {
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY es requerido");
  }
  let key;
  if (/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    key = Buffer.from(encryptionKey, "hex");
  } else {
    key = Buffer.from(encryptionKey, "base64");
  }
  if (key.length !== 32) {
    throw new Error(`La clave debe ser de 32 bytes (recibidos ${key.length})`);
  }
  return key;
}

function decryptToken(encrypted, encryptionKey) {
  if (!encrypted || !encrypted.ciphertext || !encrypted.iv || !encrypted.tag) {
    throw new Error("Estructura de token cifrado inválida");
  }
  const key = deriveKeyBuffer(encryptionKey);
  const iv = Buffer.from(encrypted.iv, "base64");
  const tag = Buffer.from(encrypted.tag, "base64");
  const ciphertext = Buffer.from(encrypted.ciphertext, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://multibotagents:QmNkfUu6y8N0YTm1@devmultibot.e8kn1og.mongodb.net/multibotagents?retryWrites=true&w=majority&appName=DevMultiBot';
  const encryptionKey = process.env.ENCRYPTION_KEY || '3ed6e4fd7998c01a9ae50a2decc63f21982ee0acb7375d394456b431d215510d';

  const args = process.argv.slice(2);
  const urlToSet = args[0]; // E.g., "https://gus512bt5g.execute-api.us-east-1.amazonaws.com"

  console.log("==================================================");
  console.log("🔍 INICIANDO DIAGNÓSTICO DE TELEGRAM");
  console.log("==================================================");
  console.log(`Base de Datos: ${mongoUri.replace(/:([^@]+)@/, ":******@")}`);
  console.log(`Clave de Encriptación: ${encryptionKey.substring(0, 8)}...`);

  if (urlToSet) {
    console.log(`\n➡️ URL base para registrar: "${urlToSet}"`);
  } else {
    console.log(`\n💡 Tip: Puedes pasar una URL para registrar el webhook: node scripts/diagnostico-telegram.js <tu_url_base>`);
  }

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db();

    // 1. Buscar canales de Telegram
    const channels = await db.collection("channels").find({ provider: "telegram" }).toArray();
    console.log(`\nFound ${channels.length} canales de Telegram en DB.`);

    if (channels.length === 0) {
      console.log("❌ No se encontraron canales de Telegram registrados.");
      return;
    }

    for (const channel of channels) {
      console.log("\n--------------------------------------------------");
      console.log(`📌 Canal ID: ${channel._id.toHexString()}`);
      console.log(`   Agente ID: ${channel.agentId}`);
      console.log(`   Nombre: ${channel.displayName}`);
      console.log(`   Username: @${channel.telegramBotUsername}`);
      console.log(`   Estado en DB: ${channel.status}`);

      try {
        const botToken = decryptToken(channel.encryptedToken, encryptionKey);
        console.log(`   🔓 Desencriptación de Token: EXITOSA (${botToken.substring(0, 6)}...${botToken.substring(botToken.length - 6)})`);

        // A. Si se proporcionó una URL, intentar registrarla directamente y mostrar la respuesta cruda de Telegram
        if (urlToSet) {
          const finalWebhookUrl = `${urlToSet.trim().replace(/\/$/, '')}/api/channels/telegram/webhook/${channel._id.toHexString()}`;
          console.log(`\n   📡 Registrando Webhook en Telegram con URL: "${finalWebhookUrl}"...`);
          
          const setResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(finalWebhookUrl)}`
          );
          const setData = await setResponse.json();
          console.log("   Respuesta de Telegram /setWebhook:", JSON.stringify(setData, null, 2));
        }

        // B. Validar Webhook contra Telegram
        console.log("\n   🌐 Llamando a Telegram /getWebhookInfo...");
        const getWhResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
        const getWhData = await getWhResponse.json();
        console.log("   Respuesta:", JSON.stringify(getWhData));

        if (getWhData.ok && getWhData.result) {
          const { url, has_custom_certificate, pending_update_count, last_error_date, last_error_message } = getWhData.result;
          console.log(`\n   Estadísticas del Webhook en Telegram:`);
          console.log(`   - URL Webhook: ${url ? url : "⚠️ NINGUNA (Polling activo o sin registrar)"}`);
          console.log(`   - Certificado personalizado: ${has_custom_certificate}`);
          console.log(`   - Mensajes pendientes: ${pending_update_count}`);
          if (last_error_message) {
            console.log(`   - ❌ Último Error: ${last_error_message}`);
            if (last_error_date) {
              console.log(`     Ocurrido: ${new Date(last_error_date * 1000).toLocaleString()}`);
            }
          }
        }
      } catch (err) {
        console.error(`   ❌ Error al procesar token/llamadas de Telegram: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("❌ Error de Conexión a DB:", err.message);
  } finally {
    await client.close();
    console.log("\n==================================================");
    console.log("🏁 DIAGNÓSTICO DE TELEGRAM COMPLETADO");
    console.log("==================================================");
  }
}

run();
