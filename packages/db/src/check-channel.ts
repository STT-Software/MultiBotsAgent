import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://multibotagents:QmNkfUu6y8N0YTm1@devmultibot.e8kn1og.mongodb.net/multibotagents?retryWrites=true&w=majority&appName=DevMultiBot';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('multibotagents');
    const channels = await db.collection('channels').find({}).toArray();
    console.log('=== ALL CHANNELS ===');
    console.log(JSON.stringify(channels, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
