import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://multibotagents:QmNkfUu6y8N0YTm1@devmultibot.e8kn1og.mongodb.net/multibotagents?retryWrites=true&w=majority&appName=DevMultiBot";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('multibotagents');
    
    console.log("=== CONVERSACIONES ESCALADAS ===");
    const escaladas = await db.collection('escalated_conversations').find().sort({ createdAt: -1 }).limit(5).toArray();
    
    if (escaladas.length === 0) {
      console.log("No hay conversaciones escaladas recientes en la DB.");
    } else {
      for (const conv of escaladas) {
        console.log(`- ID: ${conv._id}`);
        console.log(`  Usuario (Tel): ${conv.userId}`);
        console.log(`  Estado: ${conv.status}`);
        console.log(`  Motivo Escalado: ${conv.escalationReason}`);
        console.log(`  Creado: ${conv.createdAt}`);
        console.log(`  Mensajes: ${conv.messages?.length || 0}`);
      }
    }
    
    console.log("\n=== ÚLTIMOS LOGS DE MENSAJES ===");
    const logs = await db.collection('message_logs').find().sort({ receivedAt: -1 }).limit(5).toArray();
    for (const log of logs) {
        console.log(`- Mensaje ID: ${log.waMessageId} | De: ${log.from}`);
        console.log(`  Estado: ${log.status} | Recibido: ${log.receivedAt}`);
        if (log.errorDetails) {
            console.log(`  Error:`, log.errorDetails);
        }
    }

  } catch (err) {
    console.error("Error general:", err);
  } finally {
    await client.close();
  }
}

run();
