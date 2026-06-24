import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://multibotagents:QmNkfUu6y8N0YTm1@devmultibot.e8kn1og.mongodb.net/multibotagents?retryWrites=true&w=majority&appName=DevMultiBot";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('multibotagents');
    
    console.log("=== ÚLTIMOS LOGS DE MENSAJES ENTRANTES ===");
    const logs = await db.collection('messageLogs')
      .find({ direction: 'incoming' })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    logs.reverse();
    for (const log of logs) {
        console.log(`\n[${log.direction}] (${log.timestamp})`);
        console.log(`Contenido: ${log.content}`);
    }

  } catch (err) {
    console.error("Error general:", err);
  } finally {
    await client.close();
  }
}

run();
