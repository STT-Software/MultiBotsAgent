import { describe, it, expect, vi } from 'vitest';
import { BedrockLlmProvider } from '../bedrock-llm.provider';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { LlmPrompt } from '@multibotagents/types';

vi.mock('@langchain/aws', () => {
  return {
    ChatBedrockConverse: vi.fn().mockImplementation(() => {
      return {
        invoke: vi.fn(),
        region: 'us-east-1',
      };
    }),
  };
});

describe('BedrockLlmProvider - buildMessages and sanitizeMessages', () => {
  const provider = new BedrockLlmProvider();

  it('should format a basic prompt without history', () => {
    const prompt: LlmPrompt = {
      systemPrompt: 'System instructions',
      context: 'Context data',
      history: [],
      userMessage: 'Hello',
      maxResponseLength: 1000,
    };

    const messages = provider['buildMessages'](prompt);

    expect(messages).toHaveLength(2); // SystemMessage + HumanMessage
    expect(messages[0]).toBeInstanceOf(SystemMessage);
    expect(messages[0].content).toContain('System instructions');
    expect(messages[0].content).toContain('Context data');
    
    expect(messages[1]).toBeInstanceOf(HumanMessage);
    expect(messages[1].content).toBe('Hello');
  });

  it('should skip leading non-human (AI) messages from history', () => {
    const prompt: LlmPrompt = {
      systemPrompt: 'System instructions',
      context: '',
      history: [
        { role: 'assistant', content: 'Greeting from AI', timestamp: new Date() },
        { role: 'user', content: 'User reply', timestamp: new Date() },
        { role: 'assistant', content: 'AI reply', timestamp: new Date() },
      ],
      userMessage: 'Final user message',
      maxResponseLength: 1000,
    };

    const messages = provider['buildMessages'](prompt);

    // Should have: SystemMessage + HumanMessage("User reply") + AIMessage("AI reply") + HumanMessage("Final user message")
    expect(messages).toHaveLength(4);
    expect(messages[0]).toBeInstanceOf(SystemMessage);
    expect(messages[1]).toBeInstanceOf(HumanMessage);
    expect(messages[1].content).toBe('User reply');
    expect(messages[2]).toBeInstanceOf(AIMessage);
    expect(messages[2].content).toBe('AI reply');
    expect(messages[3]).toBeInstanceOf(HumanMessage);
    expect(messages[3].content).toBe('Final user message');
  });

  it('should merge consecutive Human messages', () => {
    const prompt: LlmPrompt = {
      systemPrompt: 'System instructions',
      context: '',
      history: [
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'user', content: 'Is anyone there?', timestamp: new Date() },
      ],
      userMessage: 'Final message',
      maxResponseLength: 1000,
    };

    const messages = provider['buildMessages'](prompt);

    // Raw input: [Human("Hello"), Human("Is anyone there?"), Human("Final message")]
    // Sanitized should be: [Human("Hello\nIs anyone there?\nFinal message")]
    expect(messages).toHaveLength(2); // SystemMessage + HumanMessage
    expect(messages[1]).toBeInstanceOf(HumanMessage);
    expect(messages[1].content).toBe('Hello\nIs anyone there?\nFinal message');
  });

  it('should merge consecutive AI messages', () => {
    const prompt: LlmPrompt = {
      systemPrompt: 'System instructions',
      context: '',
      history: [
        { role: 'user', content: 'User msg', timestamp: new Date() },
        { role: 'assistant', content: 'AI msg 1', timestamp: new Date() },
        { role: 'assistant', content: 'AI msg 2', timestamp: new Date() },
      ],
      userMessage: 'Final user message',
      maxResponseLength: 1000,
    };

    const messages = provider['buildMessages'](prompt);

    // Raw input: [Human("User msg"), AI("AI msg 1"), AI("AI msg 2"), Human("Final user message")]
    // Sanitized: [Human("User msg"), AI("AI msg 1\nAI msg 2"), Human("Final user message")]
    expect(messages).toHaveLength(4);
    expect(messages[1]).toBeInstanceOf(HumanMessage);
    expect(messages[2]).toBeInstanceOf(AIMessage);
    expect(messages[2].content).toBe('AI msg 1\nAI msg 2');
    expect(messages[3]).toBeInstanceOf(HumanMessage);
  });

  it('should merge image/multimodal messages with string messages', () => {
    const prompt: LlmPrompt = {
      systemPrompt: 'System instructions',
      context: '',
      history: [
        { role: 'user', content: 'Hello', timestamp: new Date() },
      ],
      userMessage: 'Check this image',
      image: {
        base64: 'abc',
        mimeType: 'image/jpeg',
      },
      maxResponseLength: 1000,
    };

    const messages = provider['buildMessages'](prompt);

    // Raw input: [Human("Hello"), HumanMessageWithImage]
    // Sanitized: [HumanMessageMerged]
    expect(messages).toHaveLength(2);
    expect(messages[1]).toBeInstanceOf(HumanMessage);
    expect(Array.isArray(messages[1].content)).toBe(true);
    const content = messages[1].content as any[];
    expect(content[0]).toEqual({ type: 'text', text: 'Hello' });
    expect(content[1]).toEqual({ type: 'text', text: 'Check this image' });
    expect(content[2].type).toBe('image_url');
  });
});
