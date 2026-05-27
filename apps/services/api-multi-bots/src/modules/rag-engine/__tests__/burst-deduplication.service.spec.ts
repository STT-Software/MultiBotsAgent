import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { BurstDeduplicationService } from '../services/burst-deduplication.service';

/**
 * Property 14: Burst deduplication preserves message order
 *
 * For any N messages (2-10) buffered in the same conversation, the output
 * SHALL be the concatenation of all messages in chronological order,
 * separated by newline characters, producing exactly one response per group.
 * At 10 messages the window SHALL close automatically.
 *
 * **Validates: Requirements 11.1, 11.3, 11.4**
 */

// Generators
const messageArb = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0 && !s.includes('\n'));
const messagesUnder10Arb = fc.array(messageArb, { minLength: 2, maxLength: 9 });
const messages10Arb = fc.array(messageArb, { minLength: 10, maxLength: 10 });
const burstWindowArb = fc.integer({ min: 1, max: 10 });
const conversationIdArb = fc.uuid();

describe('Feature: rag-agent-engine, Property 14: Burst deduplication preserves message order', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flush() returns all messages concatenated with newline in chronological order (< 10 messages)', () => {
    fc.assert(
      fc.property(
        messagesUnder10Arb,
        burstWindowArb,
        conversationIdArb,
        (messages: string[], burstWindow: number, conversationId: string) => {
          const service = new BurstDeduplicationService();

          // Buffer first message (starts the window)
          service.bufferMessage(conversationId, messages[0], burstWindow);

          // Buffer subsequent messages (all < 10 so no auto-close)
          for (let i = 1; i < messages.length; i++) {
            service.bufferMessage(conversationId, messages[i], burstWindow);
          }

          // Flush to get the concatenated result
          const result = service.flush(conversationId);

          // Verify: result is all messages joined with newline in order
          expect(result).toBe(messages.join('\n'));
        },
      ),
      { numRuns: 20 },
    );
  });

  it('first caller gets the concatenated result when window closes via flush (< 10 messages)', async () => {
    await fc.assert(
      fc.asyncProperty(
        messagesUnder10Arb,
        burstWindowArb,
        conversationIdArb,
        async (messages: string[], burstWindow: number, conversationId: string) => {
          const service = new BurstDeduplicationService();

          // First bufferMessage returns a Promise that resolves when window closes
          const firstPromise = service.bufferMessage(conversationId, messages[0], burstWindow);

          // Buffer subsequent messages (all return null)
          for (let i = 1; i < messages.length; i++) {
            service.bufferMessage(conversationId, messages[i], burstWindow);
          }

          // Flush closes the window and resolves the first caller's Promise
          service.flush(conversationId);

          // The first caller's Promise should resolve with the concatenated string
          const resolved = await firstPromise;
          expect(resolved).toBe(messages.join('\n'));
        },
      ),
      { numRuns: 20 },
    );
  });

  it('subsequent callers get null (message buffered, not processed)', async () => {
    await fc.assert(
      fc.asyncProperty(
        messagesUnder10Arb,
        burstWindowArb,
        conversationIdArb,
        async (messages: string[], burstWindow: number, conversationId: string) => {
          const service = new BurstDeduplicationService();

          // First message starts the buffer (returns a Promise, not null)
          service.bufferMessage(conversationId, messages[0], burstWindow);

          // All subsequent messages should return null
          for (let i = 1; i < messages.length; i++) {
            const result = await service.bufferMessage(conversationId, messages[i], burstWindow);
            expect(result).toBeNull();
          }

          // Cleanup: flush to resolve pending first promise
          service.flush(conversationId);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('at 10 messages the window closes automatically', async () => {
    await fc.assert(
      fc.asyncProperty(
        messages10Arb,
        burstWindowArb,
        conversationIdArb,
        async (messages: string[], burstWindow: number, conversationId: string) => {
          const service = new BurstDeduplicationService();

          // First message starts the buffer and returns a Promise
          const firstPromise = service.bufferMessage(conversationId, messages[0], burstWindow);

          // Buffer messages 2 through 9 (indices 1-8)
          for (let i = 1; i < 9; i++) {
            const result = await service.bufferMessage(conversationId, messages[i], burstWindow);
            expect(result).toBeNull();
          }

          // The 10th message (index 9) triggers window close
          const lastResult = await service.bufferMessage(conversationId, messages[9], burstWindow);
          expect(lastResult).toBeNull();

          // The first caller's Promise should resolve with all 10 messages concatenated
          const resolved = await firstPromise;
          expect(resolved).toBe(messages.join('\n'));

          // After auto-close, flush returns null (no pending buffer)
          const flushResult = service.flush(conversationId);
          expect(flushResult).toBeNull();
        },
      ),
      { numRuns: 20 },
    );
  });

  it('messages are separated by newline in the output (< 10 messages)', () => {
    fc.assert(
      fc.property(
        messagesUnder10Arb,
        burstWindowArb,
        conversationIdArb,
        (messages: string[], burstWindow: number, conversationId: string) => {
          const service = new BurstDeduplicationService();

          // Buffer all messages
          service.bufferMessage(conversationId, messages[0], burstWindow);
          for (let i = 1; i < messages.length; i++) {
            service.bufferMessage(conversationId, messages[i], burstWindow);
          }

          // Flush and verify newline separation
          const result = service.flush(conversationId)!;

          // The result should contain exactly N-1 newlines for N messages
          const parts = result.split('\n');
          expect(parts.length).toBe(messages.length);

          // Each part should match the original message in order
          for (let i = 0; i < messages.length; i++) {
            expect(parts[i]).toBe(messages[i]);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('exactly one response is produced per group (< 10 messages)', () => {
    fc.assert(
      fc.property(
        messagesUnder10Arb,
        burstWindowArb,
        conversationIdArb,
        (messages: string[], burstWindow: number, conversationId: string) => {
          const service = new BurstDeduplicationService();

          // Buffer all messages
          service.bufferMessage(conversationId, messages[0], burstWindow);
          for (let i = 1; i < messages.length; i++) {
            service.bufferMessage(conversationId, messages[i], burstWindow);
          }

          // First flush produces the concatenated result
          const firstFlush = service.flush(conversationId);
          expect(firstFlush).not.toBeNull();

          // Second flush returns null (no more pending messages)
          const secondFlush = service.flush(conversationId);
          expect(secondFlush).toBeNull();
        },
      ),
      { numRuns: 20 },
    );
  });
});
