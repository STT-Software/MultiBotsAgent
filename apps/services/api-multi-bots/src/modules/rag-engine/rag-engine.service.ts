import { Inject, Injectable, Logger } from '@nestjs/common';
import { filterByThreshold } from '@multibotagents/core';
import {
  EscalationReason,
  MessageRole,
  ResponseType,
} from '@multibotagents/types';

import {
  RAG_AGENT_CONFIG_SERVICE,
  RAG_LLM_PROVIDER,
  RAG_MEMORY_SERVICE,
  RAG_VECTOR_SEARCH,
} from './constants/injection-tokens';
import { AgentNotFoundException, InvalidInputException } from './exceptions/rag-engine.exceptions';
import { PromptBuilderService } from './services/prompt-builder.service';
import { ReRankingService } from './services/re-ranking.service';
import { ResponseFormatterService } from './services/response-formatter.service';

import type {
  AgentConfig,
  AgentConfigProvider,
  HistoryMessage,
  LlmProvider,
  MemoryService,
  RagProcessInput,
  RagProcessOutput,
  ResponseMessage,
  SearchResult,
  VectorSearchService,
} from '@multibotagents/types';

/**
 * Orquestador principal del flujo RAG.
 * Coordina validación, búsqueda vectorial, re-ranking, construcción de prompt,
 * invocación del LLM y persistencia de la interacción.
 *
 * Valida: Requisitos 10.1, 10.5
 */
@Injectable()
export class RagEngineService {
  private readonly logger = new Logger(RagEngineService.name);

  constructor(
    @Inject(RAG_LLM_PROVIDER) private readonly llmProvider: LlmProvider,
    @Inject(RAG_VECTOR_SEARCH) private readonly vectorSearch: VectorSearchService,
    @Inject(RAG_MEMORY_SERVICE) private readonly memoryService: MemoryService,
    @Inject(RAG_AGENT_CONFIG_SERVICE) private readonly agentConfigProvider: AgentConfigProvider,
    @Inject(PromptBuilderService) private readonly promptBuilder: PromptBuilderService,
    @Inject(ReRankingService) private readonly reRankingService: ReRankingService,
    @Inject(ResponseFormatterService) private readonly responseFormatter: ResponseFormatterService,
  ) {}

  /**
   * Procesa una consulta RAG completa.
   * Orquesta: validación → config → historial → búsqueda → filtrado → re-ranking → prompt → LLM → persistencia → respuesta
   */
  async processQuery(input: RagProcessInput): Promise<RagProcessOutput> {
    this.logger.log('Processing query', {
      agentId: input.agentId,
      conversationId: input.conversationId,
    });

    // 1. Validate input
    this.validateInput(input);

    // 2. Get agent config
    const config = await this.getAgentConfig(input.agentId);
    this.logger.debug('Agent config retrieved', { agentId: config.agentId });

    // 3. Retrieve history (graceful degradation)
    const history = await this.retrieveHistory(input.conversationId, config.memoryWindow);

    // 4. Check if new session (graceful degradation)
    const isNewSession = await this.checkIsNewSession(input.conversationId);

    // 5. Vector search
    this.logger.debug('Executing vector search', {
      agentId: input.agentId,
      topK: config.topK,
    });
    const searchResults = await this.vectorSearch.search(input.agentId, input.userMessage, config.topK);
    this.logger.debug('Vector search completed', {
      resultsCount: searchResults.length,
    });

    // 6. Handle empty knowledge base (Req 3.5)
    if (searchResults.length === 0) {
      this.logger.warn('Knowledge base is empty for agent, proceeding with empty context', {
        agentId: input.agentId,
        conversationId: input.conversationId,
        stage: 'vector_search',
      });
    }

    // 7. Filter by threshold
    const filteredFragments = filterByThreshold(searchResults, config.relevanceThreshold);
    this.logger.debug('Threshold filtering completed', {
      totalResults: searchResults.length,
      filteredCount: filteredFragments.length,
      threshold: config.relevanceThreshold,
    });

    // 8. Handle no fragments above threshold (Req 3.4)
    if (filteredFragments.length === 0 && searchResults.length > 0) {
      this.logger.warn('No fragments above relevance threshold, proceeding with empty context', {
        agentId: input.agentId,
        conversationId: input.conversationId,
        threshold: config.relevanceThreshold,
        scores: searchResults.map((r) => r.score),
        userMessage: input.userMessage,
        stage: 'threshold_filtering',
      });
    }

    // 9. Re-ranking (graceful degradation)
    const validatedFragments = await this.performReRanking(filteredFragments, input.userMessage);

    // 10. Handle re-ranking rejection
    if (validatedFragments.length === 0 && filteredFragments.length > 0) {
      this.logger.warn('Re-ranking rejected all fragments, proceeding with empty context', {
        agentId: input.agentId,
        conversationId: input.conversationId,
        originalCount: filteredFragments.length,
        userMessage: input.userMessage,
        stage: 're_ranking',
      });
    }

    // 11. Build prompt
    this.logger.debug('Building prompt', {
      fragmentCount: validatedFragments.length,
      historyCount: history.length,
    });
    const prompt = this.promptBuilder.buildPrompt({
      config,
      fragments: validatedFragments,
      history,
      userMessage: input.userMessage,
    });

    // 12. Invoke LLM
    let llmContent: string;
    try {
      this.logger.debug('Invoking LLM');
      const llmResponse = await this.llmProvider.generate(prompt);

      // 13. Handle empty LLM response
      if (!llmResponse.content || llmResponse.content.trim().length === 0) {
        this.logger.error('LLM returned empty response', {
          agentId: input.agentId,
          conversationId: input.conversationId,
          stage: 'llm_invocation',
        });
        return this.buildErrorResponse(input, config);
      }

      llmContent = llmResponse.content;

      // 13.5 Handle NO_INFO response from LLM
      const cleanContent = llmContent.trim().toUpperCase();
      if (cleanContent === 'NO_INFO' || cleanContent.includes('NO_INFO')) {
        this.logger.warn('LLM determined no information was available, returning noInfoMessage', {
          agentId: input.agentId,
          conversationId: input.conversationId,
          stage: 'llm_invocation',
        });
        return this.buildNoInfoResponse(input, config);
      }

      this.logger.debug('LLM response received', {
        tokensUsed: llmResponse.tokensUsed,
        finishReason: llmResponse.finishReason,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('LLM invocation failed', {
        agentId: input.agentId,
        conversationId: input.conversationId,
        error: errorMessage,
        stage: 'llm_invocation',
      });
      return this.buildErrorResponse(input, config);
    }

    // 14. Format response
    const responseMessages = this.responseFormatter.format(llmContent, config.maxResponseLength);

    // 15. Persist messages (graceful degradation)
    await this.persistMessages(input, responseMessages);

    // 16. Add welcome message if new session
    const messages = this.prependWelcomeMessage(responseMessages, isNewSession, config);

    // 17. Return RagProcessOutput
    this.logger.log('Query processed successfully', {
      agentId: input.agentId,
      conversationId: input.conversationId,
      messagesCount: messages.length,
    });

    return {
      conversationId: input.conversationId,
      messages,
      escalated: false,
    };
  }

  /**
   * Validates the input fields.
   * Throws InvalidInputException if userMessage is empty or whitespace.
   */
  private validateInput(input: RagProcessInput): void {
    if (!input.userMessage || input.userMessage.trim().length === 0) {
      throw new InvalidInputException('userMessage', 'Message cannot be empty or whitespace');
    }
  }

  /**
   * Retrieves agent configuration via the injected AgentConfigProvider.
   * Throws AgentNotFoundException if the agent is not found or inactive.
   */
  private async getAgentConfig(agentId: string): Promise<AgentConfig> {
    try {
      return await this.agentConfigProvider.getConfig(agentId);
    } catch (error: unknown) {
      if (error instanceof AgentNotFoundException) {
        throw error;
      }
      throw new AgentNotFoundException(agentId);
    }
  }

  /**
   * Retrieves conversation history with graceful degradation.
   * If MemoryService fails, logs warning and returns empty history.
   */
  private async retrieveHistory(conversationId: string, windowSize: number): Promise<HistoryMessage[]> {
    try {
      const history = await this.memoryService.getHistory(conversationId, windowSize);
      this.logger.debug('History retrieved', {
        conversationId,
        messagesCount: history.length,
      });
      return history;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('MemoryService unavailable, processing without history', {
        conversationId,
        error: errorMessage,
        stage: 'history_retrieval',
      });
      return [];
    }
  }

  /**
   * Checks if the conversation is a new session with graceful degradation.
   * If MemoryService fails, logs warning and assumes existing session.
   */
  private async checkIsNewSession(conversationId: string): Promise<boolean> {
    try {
      const isNew = await this.memoryService.isNewSession(conversationId);
      this.logger.debug('Session check completed', {
        conversationId,
        isNewSession: isNew,
      });
      return isNew;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('MemoryService unavailable for session check, assuming existing session', {
        conversationId,
        error: errorMessage,
        stage: 'session_check',
      });
      return false;
    }
  }

  /**
   * Performs re-ranking with graceful degradation.
   * If ReRankingService fails, logs warning and returns unvalidated fragments.
   */
  private async performReRanking(fragments: SearchResult[], userMessage: string): Promise<SearchResult[]> {
    try {
      const validated = await this.reRankingService.validate(fragments, userMessage);
      this.logger.debug('Re-ranking completed', {
        inputCount: fragments.length,
        validatedCount: validated.length,
      });
      return validated;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('ReRankingService failed, using unvalidated fragments', {
        error: errorMessage,
        fragmentCount: fragments.length,
        stage: 're_ranking',
      });
      return fragments;
    }
  }

  /**
   * Persists user and assistant messages with graceful degradation.
   * If MemoryService fails, logs error but does not interrupt the flow.
   */
  private async persistMessages(
    input: RagProcessInput,
    responseMessages: ResponseMessage[],
  ): Promise<void> {
    try {
      // Save user message
      await this.memoryService.saveMessage(input.conversationId, {
        role: MessageRole.USER,
        content: input.userMessage,
        timestamp: input.timestamp,
      });

      // Save assistant response
      const assistantContent = responseMessages.map((m) => m.content).join('\n');
      await this.memoryService.saveMessage(input.conversationId, {
        role: MessageRole.ASSISTANT,
        content: assistantContent,
        timestamp: new Date(),
      });

      this.logger.debug('Messages persisted', {
        conversationId: input.conversationId,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to persist messages, continuing with response', {
        conversationId: input.conversationId,
        agentId: input.agentId,
        error: errorMessage,
        stage: 'message_persistence',
      });
    }
  }

  /**
   * Prepends welcome message if it's a new session and config has welcomeMessage.
   */
  private prependWelcomeMessage(
    responseMessages: ResponseMessage[],
    isNewSession: boolean,
    config: AgentConfig,
  ): ResponseMessage[] {
    if (isNewSession && config.welcomeMessage) {
      const welcomeMsg: ResponseMessage = {
        type: ResponseType.TEXT,
        content: config.welcomeMessage,
      };
      return [welcomeMsg, ...responseMessages];
    }
    return responseMessages;
  }

  /**
   * Builds a no-info response with escalation for low relevance.
   */
  private buildNoInfoResponse(input: RagProcessInput, config: AgentConfig): RagProcessOutput {
    return {
      conversationId: input.conversationId,
      messages: [{ type: ResponseType.TEXT, content: config.noInfoMessage }],
      escalated: true,
      escalationReason: EscalationReason.LOW_RELEVANCE,
    };
  }

  /**
   * Builds an error response with escalation for LLM unavailability.
   */
  private buildErrorResponse(input: RagProcessInput, config: AgentConfig): RagProcessOutput {
    return {
      conversationId: input.conversationId,
      messages: [{ type: ResponseType.TEXT, content: config.errorMessage }],
      escalated: true,
      escalationReason: EscalationReason.LLM_UNAVAILABLE,
    };
  }
}
