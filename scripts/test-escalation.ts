import { BedrockLlmProvider } from '../apps/services/api-multi-bots/src/modules/rag-engine/providers/bedrock-llm.provider';
import { buildFullPrompt } from '../packages/core/src/rag-engine/prompt-building';
import { AgentConfig, HistoryMessage } from '../packages/types/src';

async function test() {
  const provider = new BedrockLlmProvider('us.amazon.nova-lite-v1:0', 'us-east-1');
  
  const config: AgentConfig = {
    agentId: 'test',
    companyId: 'test',
    name: 'Asesor',
    personality: {
      name: 'Asesor',
      tone: 'profesional',
      restrictions: [],
      instructions: ''
    },
    language: 'es',
    welcomeMessage: 'Hola',
    noInfoMessage: 'No tengo info',
    errorMessage: 'Error',
    relevanceThreshold: 0.5,
    topK: 3,
    memoryWindow: 5,
    maxResponseLength: 500,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prompt = buildFullPrompt({
    config,
    fragments: [
      {
        id: '1',
        content: 'Para hablar con un humano, por favor visite nuestra página web en www.ejemplo.com o llame al 123456.',
        score: 0.9,
        metadata: {}
      }
    ],
    history: [],
    userMessage: 'Quiero hablar con un asesor humano por favor, transfiéreme'
  });

  console.log("=== ENVIANDO PROMPT AL LLM ===");
  console.log(prompt.systemPrompt);
  
  const response = await provider.generate(prompt);
  console.log("\n=== RESPUESTA DEL LLM ===");
  console.log(response.content);
}

test().catch(console.error);
