import { ChatBedrockConverse } from '@langchain/aws';
import { HumanMessage } from '@langchain/core/messages';

const modelsToTest = [
  'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  'global.anthropic.claude-haiku-4-5-20251001-v1:0',
  'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'global.anthropic.claude-sonnet-4-20250514-v1:0',
  'us.amazon.nova-lite-v1:0',
  'us.amazon.nova-pro-v1:0',
];

async function testModel(modelId: string) {
  console.log(`Testing model via Langchain ChatBedrockConverse: ${modelId}...`);
  try {
    const model = new ChatBedrockConverse({
      model: modelId,
      region: 'us-east-1',
      maxRetries: 0,
    });
    const response = await model.invoke([new HumanMessage('Hello, respond with one word.')]);
    console.log(`✅ Success with ${modelId}:`, response.content);
  } catch (err: any) {
    console.log(`❌ Failed with ${modelId}: ${err.name || err.constructor.name} - ${err.message}`);
  }
}

async function main() {
  for (const model of modelsToTest) {
    await testModel(model);
  }
}

main();
