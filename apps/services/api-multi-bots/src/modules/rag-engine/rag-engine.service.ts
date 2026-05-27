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
import { RAG_DEFAULTS } from './constants/timeouts';
import { AgentNotFoundException, InvalidInputException } from './exceptions/rag-engine.exceptions';
import { AcknowledgmentService } from './services/acknowledgment.service';
import { BurstDeduplicationService } from './services/burst-deduplication.service';
import { EscalationDetectionService } from './services/escalation-detection.service';
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
    private readonly promptBuilder: PromptBuilderService,
    private readonly reRankingService: ReRankingService,
    private readonly responseFormatter: ResponseFormatterService,
    private readonly burstDeduplication: BurstDeduplicationService,
    private readonly acknowledgmentService: AcknowledgmentService,
    private readonly escalationDetection: EscalationDetectionService,
  ) {}

  /**
   * Punto de entrada para mensajes individuales.
   * Pasa por deduplicación de ráfaga antes de procesar.
   * Si el mensaje es buffered (dentro de la ventana), retorna null.
   * Si la ventana cierra, invoca processQuery con el input concatenado.
   *
   * Valida: Requisitos 11.1, 11.2, 11.3, 11.4, 11.5
   */
  async receiveMessage(input: RagProcessInput): Promise<RagProcessOutput | null> {
    this.logger.log('Receiving message', {
      agentId: input.agentId,
      conversationId: input.conversationId,
    });

    // Obtener burstWindow de la configuración del agente (graceful degradation)
    let burstWindow: number = RAG_DEFAULTS.BURST_WINDOW;
    try {
      const config = await this.agentConfigProvider.getConfig(input.agentId);
      burstWindow = config.burstWindow ?? RAG_DEFAULTS.BURST_WINDOW;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('Could not retrieve agent config for burst window, using default', {
        agentId: input.agentId,
        error: errorMessage,
        defaultBurstWindow: RAG_DEFAULTS.BURST_WINDOW,
      });
    }

    // Pasar mensaje por BurstDeduplicationService
    const result = await this.burstDeduplication.bufferMessage(
      input.conversationId,
      input.userMessage,
      burstWindow,
    );

    // Si retorna null: mensaje buffered, esperar más mensajes
    if (result === null) {
      this.logger.debug('Message buffered, waiting for more messages', {
        conversationId: input.conversationId,
      });
      return null;
    }

    // Si retorna string: invocar processQuery con input concatenado
    this.logger.debug('Burst window closed, processing concatenated input', {
      conversationId: input.conversationId,
      concatenatedLength: result.length,
    });

    const concatenatedInput: RagProcessInput = {
      ...input,
      userMessage: result,
    };

    return this.processQuery(concatenatedInput);
  }

  /**
   * Procesa una consulta RAG completa.
   * Orquesta: validación → config → acknowledgment race → historial → búsqueda → filtrado → re-ranking → prompt → LLM → persistencia → respuesta
   *
   * Integra AcknowledgmentService: si el procesamiento no completa antes del threshold,
   * se emite un acknowledgment parcial al usuario (máximo 1 por ciclo).
   *
   * Valida: Requisitos 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
   */
  async processQuery(input: RagProcessInput): Promise<RagProcessOutput> {
    this.logger.log('Processing query', {
      agentId: input.agentId,
      conversationId: input.conversationId,
    });

    // 1. Validate input (antes del race — falla rápido)
    this.validateInput(input);

    // 2. Get agent config (antes del race — necesario para threshold)
    const config = await this.getAgentConfig(input.agentId);
    this.logger.debug('Agent config retrieved', { agentId: config.agentId });

    // 3. Check conversation status (graceful degradation: assume 'active' on failure)
    let conversationStatus: string = 'active';
    try {
      conversationStatus = await this.memoryService.getConversationStatus(input.conversationId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to get conversation status, assuming active', {
        conversationId: input.conversationId,
        error: errorMessage,
      });
    }
    if (conversationStatus === 'escalated') {
      this.logger.log('Conversation is escalated, persisting message and returning human-attended response', {
        conversationId: input.conversationId,
      });
      // Persist user message for context when conversation resumes
      try {
        await this.memoryService.saveMessage(input.conversationId, {
          role: MessageRole.USER,
          content: input.userMessage,
          timestamp: input.timestamp,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn('Failed to persist message for escalated conversation', {
          conversationId: input.conversationId,
          error: errorMessage,
        });
      }
      // Return "being attended by human" message
      return {
        conversationId: input.conversationId,
        messages: [{ type: ResponseType.TEXT, content: config.escalationTransitionMessage || 'Estás siendo atendido por un agente humano.' }],
        escalated: true,
        escalationReason: undefined,
      };
    }

    // 4. Envolver procesamiento principal con acknowledgment race
    const processingLogic = async (): Promise<RagProcessOutput> => {
      return this.executeProcessingPipeline(input, config);
    };

    const result = await this.acknowledgmentService.raceWithProcessing(
      processingLogic(),
      {
        threshold: config.acknowledgmentThreshold ?? RAG_DEFAULTS.ACKNOWLEDGMENT_THRESHOLD,
        message: config.acknowledgmentMessage ?? 'Dame un momento, estoy buscando esa información...',
      },
      (ackMessage) => {
        this.logger.log('Acknowledgment sent', {
          conversationId: input.conversationId,
          message: ackMessage,
        });
      },
    );

    return result;
  }

  /**
   * Pipeline de procesamiento principal del flujo RAG.
   * Ejecuta: historial → búsqueda → filtrado → re-ranking → prompt → LLM → persistencia → respuesta
   */
  private async executeProcessingPipeline(
    input: RagProcessInput,
    config: AgentConfig,
  ): Promise<RagProcessOutput> {
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
      this.logger.warn('Knowledge base is empty for agent', {
        agentId: input.agentId,
        conversationId: input.conversationId,
        stage: 'vector_search',
      });
      return this.handleNoInfoWithEscalation(input, config);
    }

    // 7. Filter by threshold
    const filteredFragments = filterByThreshold(searchResults, config.relevanceThreshold);
    this.logger.debug('Threshold filtering completed', {
      totalResults: searchResults.length,
      filteredCount: filteredFragments.length,
      threshold: config.relevanceThreshold,
    });

    // 8. Handle no fragments above threshold (Req 3.4)
    if (filteredFragments.length === 0) {
      this.logger.warn('No fragments above relevance threshold', {
        agentId: input.agentId,
        conversationId: input.conversationId,
        threshold: config.relevanceThreshold,
        scores: searchResults.map((r) => r.score),
        userMessage: input.userMessage,
        stage: 'threshold_filtering',
      });
      return this.handleNoInfoWithEscalation(input, config);
    }

    // 9. Re-ranking (graceful degradation)
    const validatedFragments = await this.performReRanking(filteredFragments, input.userMessage);

    // 10. Handle re-ranking rejection
    if (validatedFragments.length === 0) {
      this.logger.warn('Re-ranking rejected all fragments', {
        agentId: input.agentId,
        conversationId: input.conversationId,
        originalCount: filteredFragments.length,
        userMessage: input.userMessage,
        stage: 're_ranking',
      });
      return this.handleNoInfoWithEscalation(input, config);
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
      this.logger.debug('LLM response received', {
        tokensUsed: llmResponse.tokensUsed,
        finishReason: llmResponse.finishReason,
      });

      // 13.1 Evaluate escalation after successful LLM response
      const escalationCheck = await this.escalationDetection.evaluateResponse(
        input.conversationId,
        llmResponse,
        input.userMessage,
        config,
      );
      if (escalationCheck && escalationCheck.escalated) {
        this.logger.log('Escalation triggered after LLM response evaluation', {
          conversationId: input.conversationId,
          reason: escalationCheck.reason,
        });
        return {
          conversationId: input.conversationId,
          messages: [{ type: ResponseType.TEXT, content: escalationCheck.transitionMessage }],
          escalated: true,
          escalationReason: escalationCheck.reason,
        };
      }
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
   * Records the no-info attempt via EscalationDetectionService.
   * If escalation threshold is reached, returns the transition message.
   * Otherwise, returns the standard noInfoMessage.
   *
   * Valida: Requisitos 12.1, 13.1
   */
  private async handleNoInfoWithEscalation(input: RagProcessInput, config: AgentConfig): Promise<RagProcessOutput> {
    try {
      const escalationResult = await this.escalationDetection.recordNoInfoAttempt(
        input.conversationId,
        config,
      );

      if (escalationResult && escalationResult.escalated) {
        this.logger.log('Escalation triggered by failed attempts threshold', {
          conversationId: input.conversationId,
          reason: escalationResult.reason,
        });
        return {
          conversationId: input.conversationId,
          messages: [{ type: ResponseType.TEXT, content: escalationResult.transitionMessage }],
          escalated: true,
          escalationReason: escalationResult.reason,
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('EscalationDetection failed during no-info handling, continuing with no-info response', {
        conversationId: input.conversationId,
        error: errorMessage,
      });
    }

    return this.buildNoInfoResponse(input, config);
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
