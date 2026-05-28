import { Injectable, Logger } from '@nestjs/common';
import { ChatBedrockConverse } from '@langchain/aws';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  type BaseMessage,
} from '@langchain/core/messages';

import type {
  LlmPrompt,
  LlmProvider,
  LlmResponse,
  HistoryMessage,
} from '@multibotagents/types';

/**
 * Implementación de LlmProvider usando LangChain + AWS Bedrock (ChatBedrockConverse).
 * Encapsula la comunicación con AWS Bedrock detrás de la interface LlmProvider.
 *
 * Valida: Requisitos 6.1, 10.2
 */
@Injectable()
export class BedrockLlmProvider implements LlmProvider {
  private readonly logger = new Logger(BedrockLlmProvider.name);
  private readonly model: ChatBedrockConverse;

  private readonly timeoutMs: number;

  constructor() {
    const modelId =
      process.env.BEDROCK_MODEL_ID ||
      'minimax.minimax-m2.5';
    const region = process.env.AWS_REGION || 'us-east-1';
    this.timeoutMs = Number(process.env.BEDROCK_TIMEOUT_MS) || 30000;

    this.model = new ChatBedrockConverse({
      model: modelId,
      region,
      maxRetries: 2,
    });

    this.logger.log(
      `BedrockLlmProvider initialized with model=${modelId}, region=${region}, timeout=${this.timeoutMs}ms`,
    );
  }

  async generate(prompt: LlmPrompt): Promise<LlmResponse> {
    const messages = this.buildMessages(prompt);

    try {
      this.logger.log(`Invoking Bedrock LLM with ${messages.length} messages. User message: "${prompt.userMessage}"`);
      this.logger.debug('Invoking Bedrock LLM', {
        messageCount: messages.length,
        maxResponseLength: prompt.maxResponseLength,
      });

      const response = await this.model.invoke(messages, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const content =
        typeof response.content === 'string'
          ? response.content
          : Array.isArray(response.content)
            ? response.content
                .filter(
                  (block): block is { type: 'text'; text: string } =>
                    typeof block === 'object' &&
                    block !== null &&
                    'type' in block &&
                    block.type === 'text',
                )
                .map((block) => block.text)
                .join('')
            : '';

      const tokensUsed = this.extractTokenUsage(response);
      const finishReason = this.extractFinishReason(response);

      this.logger.log(`Bedrock LLM response received. Tokens: ${tokensUsed}. Content: "${content}"`);
      this.logger.debug('Bedrock LLM response received', {
        contentLength: content.length,
        tokensUsed,
        finishReason,
      });

      return {
        content,
        tokensUsed,
        finishReason,
      };
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  /**
   * Converts LlmPrompt into LangChain message format.
   */
  private buildMessages(prompt: LlmPrompt): BaseMessage[] {
    const messages: BaseMessage[] = [];

    // System message with personality, context, and constraints
    const systemContent = this.buildSystemContent(prompt);
    messages.push(new SystemMessage(systemContent));

    // History messages
    for (const msg of prompt.history) {
      messages.push(this.toBaseMessage(msg));
    }

    // User message
    messages.push(new HumanMessage(prompt.userMessage));

    return messages;
  }

  /**
   * Builds the system message content combining system prompt, context, and constraints.
   */
  private buildSystemContent(prompt: LlmPrompt): string {
    const parts: string[] = [prompt.systemPrompt];

    if (prompt.context) {
      parts.push(`\n\n--- CONTEXTO ---\n${prompt.context}`);
    }

    parts.push(
      `\n\nRestriction: Your response must not exceed ${prompt.maxResponseLength} characters.`,
    );

    return parts.join('');
  }

  /**
   * Converts a HistoryMessage to the appropriate LangChain BaseMessage.
   */
  private toBaseMessage(msg: HistoryMessage): BaseMessage {
    if (msg.role === 'user') {
      return new HumanMessage(msg.content);
    }
    return new AIMessage(msg.content);
  }

  /**
   * Extracts total token usage from the LLM response metadata.
   */
  private extractTokenUsage(
    response: Awaited<ReturnType<ChatBedrockConverse['invoke']>>,
  ): number {
    const usage = response.usage_metadata;
    if (usage) {
      return (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);
    }
    return 0;
  }

  /**
   * Extracts the finish reason from the LLM response.
   */
  private extractFinishReason(
    response: Awaited<ReturnType<ChatBedrockConverse['invoke']>>,
  ): LlmResponse['finishReason'] {
    const stopReason =
      response.response_metadata?.stopReason ??
      response.response_metadata?.stop_reason;

    if (stopReason === 'max_tokens') {
      return 'length';
    }
    if (stopReason === 'end_turn' || stopReason === 'stop') {
      return 'stop';
    }
    return 'stop';
  }

  /**
   * Handles errors from Bedrock invocation, classifying them appropriately.
   * Always throws — the orchestrator catches and handles gracefully.
   */
  private handleError(error: unknown): never {
    const err = error instanceof Error ? error : new Error(String(error));
    const errorName = err.name || '';
    const errorMessage = err.message || '';

    // Timeout errors
    if (
      errorName === 'TimeoutError' ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ESOCKETTIMEDOUT')
    ) {
      this.logger.error('Bedrock LLM timeout', {
        error: errorMessage,
      });
      throw new Error(
        `LLM timeout: The model did not respond within the configured time limit`,
      );
    }

    // Throttling errors
    if (
      errorMessage.includes('ThrottlingException') ||
      errorMessage.includes('TooManyRequestsException') ||
      errorMessage.includes('Rate exceeded')
    ) {
      this.logger.error('Bedrock LLM throttled', {
        error: errorMessage,
      });
      throw new Error(
        `LLM throttled: Too many requests to the model service`,
      );
    }

    // Service unavailable
    if (
      errorMessage.includes('ServiceUnavailableException') ||
      errorMessage.includes('InternalServerException') ||
      errorMessage.includes('503') ||
      errorMessage.includes('500')
    ) {
      this.logger.error('Bedrock LLM service unavailable', {
        error: errorMessage,
      });
      throw new Error(
        `LLM service unavailable: The model service is temporarily unavailable`,
      );
    }

    // Model not found or access denied
    if (
      errorMessage.includes('AccessDeniedException') ||
      errorMessage.includes('ResourceNotFoundException') ||
      errorMessage.includes('ValidationException')
    ) {
      this.logger.error('Bedrock LLM configuration error', {
        error: errorMessage,
      });
      throw new Error(
        `LLM configuration error: ${errorMessage}`,
      );
    }

    // Generic/unknown error
    this.logger.error('Bedrock LLM unexpected error', {
      error: errorMessage,
      stack: err.stack,
    });
    throw new Error(`LLM error: ${errorMessage}`);
  }
}
