import { Inject, Injectable, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { filterByThreshold } from '@multibotagents/core';
import { EscalatedConversationRepository } from '@multibotagents/db';
import {
  EscalationReason,
  MessageRole,
  ResponseType,
} from '@multibotagents/types';
import type { MetricEventPayload } from '@multibotagents/types';
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
} from '@langchain/core/messages';

import {
  RAG_AGENT_CONFIG_SERVICE,
  RAG_LLM_PROVIDER,
  RAG_MEMORY_SERVICE,
  RAG_VECTOR_SEARCH,
} from './constants/injection-tokens';
import { AgentNotFoundException, AgentInactiveException, InvalidInputException } from './exceptions/rag-engine.exceptions';
import { PromptBuilderService } from './services/prompt-builder.service';
import { ReRankingService } from './services/re-ranking.service';
import { ResponseFormatterService } from './services/response-formatter.service';
import { BookingsService } from '../bookings/bookings.service';
import { OrdersService } from '../orders/orders.service';

import type {
  AgentConfig,
  AgentConfigProvider,
  HistoryMessage,
  LlmPrompt,
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
    @Inject('ESCALATED_CONVERSATION_REPO') private readonly escalatedRepo: EscalatedConversationRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly bookingsService: BookingsService,
    private readonly ordersService: OrdersService,
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
    let config: AgentConfig;
    try {
      config = await this.getAgentConfig(input.agentId);
    } catch (error: unknown) {
      if (error instanceof AgentInactiveException) {
        this.logger.log(`Agent ${input.agentId} is inactive/borrador. Bypassing processing and returning empty response.`);
        return {
          conversationId: input.conversationId,
          messages: [],
          escalated: false,
        };
      }
      throw error;
    }
    this.logger.debug('Agent config retrieved', { agentId: config.agentId });

    // 2.5 Check if conversation is already escalated
    const activeEscalation = await this.escalatedRepo.findByUserIdAndStatus(
      config.companyId,
      input.conversationId,
      'escalated',
    );

    if (activeEscalation) {
      this.logger.log('Conversation is already escalated, saving user message to escalation log and bypassing RAG', {
        agentId: input.agentId,
        conversationId: input.conversationId,
        escalationId: activeEscalation.id,
      });

      // Save user message to the escalated conversation log
      await this.escalatedRepo.addMessage(config.companyId, activeEscalation.id, {
        sender: 'user',
        content: input.userMessage,
        timestamp: input.timestamp,
        type: 'text',
      });

      // Also persist to history memory
      try {
        if (typeof this.memoryService.addMessage === 'function') {
          await this.memoryService.addMessage(input.conversationId, {
            type: 'human',
            content: input.userMessage,
            timestamp: input.timestamp,
            isEscalated: true,
          });
        } else {
          await this.memoryService.saveMessage(input.conversationId, {
            role: MessageRole.USER,
            content: input.userMessage,
            timestamp: input.timestamp,
          });
        }
      } catch (err: unknown) {
        this.logger.warn('Failed to save message to history memory, continuing', {
          conversationId: input.conversationId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Return empty messages to prevent automated replies
      return {
        conversationId: input.conversationId,
        messages: [],
        escalated: true,
      };
    }

    // 3. Retrieve history (graceful degradation)
    const history = await this.retrieveHistory(input.conversationId, config.memoryWindow);

    // 4. Check if new session (graceful degradation)
    const isNewSession = await this.checkIsNewSession(input.conversationId);

    // 5. Vector search
    this.logger.log(`Executing vector search for query: "${input.userMessage}" (topK: ${config.topK})`);
    const searchResults = await this.vectorSearch.search(input.agentId, input.userMessage, config.topK);
    this.logger.log(`Vector search completed. Found ${searchResults.length} candidate fragments: ` + 
      JSON.stringify(searchResults.map(r => ({ id: r.fragmentId, score: r.score, snippet: r.content.substring(0, 60) + '...' }))));

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
    this.logger.log(`Threshold filtering: ${filteredFragments.length}/${searchResults.length} fragments passed threshold of ${config.relevanceThreshold}`);

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
    this.logger.log(`Re-ranking completed. ${validatedFragments.length}/${filteredFragments.length} fragments validated for context.`);

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

    // 11.5 Quick check for explicit human escalation (safety net for LLM disobedience)
    const lowerMessage = input.userMessage.toLowerCase();
    const escalationKeywords = ['asesor', 'humano', 'operador', 'representante', 'hablar con alguien', 'soporte'];
    if (escalationKeywords.some(kw => lowerMessage.includes(kw))) {
      this.logger.warn('Explicit human escalation keyword detected, bypassing LLM', {
        agentId: input.agentId,
        conversationId: input.conversationId,
        userMessage: input.userMessage,
      });
      return this.buildNoInfoResponse(input, config, history, 'explicit');
    }

    // 12. Invoke LLM
    let llmContent: string;
    try {
      if (config.tipo === 'agendamiento' || config.tipo === 'cotizador') {
        this.logger.debug(`Invoking ${config.tipo} agent with tools`);
        llmContent = await this.executeAgentWithTools(config, prompt, input);
      } else {
        this.logger.debug('Invoking standard LLM');
        const llmResponse = await this.llmProvider.generate(prompt);
        llmContent = llmResponse.content;
      }

      // 13. Handle empty LLM response
      if (!llmContent || llmContent.trim().length === 0) {
        this.logger.error('LLM returned empty response', {
          agentId: input.agentId,
          conversationId: input.conversationId,
          stage: 'llm_invocation',
        });
        return this.buildErrorResponse(input, config, history);
      }

      const cleanContent = llmContent.trim().toUpperCase();
      if (cleanContent === 'TRANSFER' || cleanContent.includes('TRANSFER')) {
        this.logger.warn('LLM determined user wants human transfer, initiating escalation', {
          agentId: input.agentId,
          conversationId: input.conversationId,
          stage: 'llm_invocation',
        });
        return this.buildNoInfoResponse(input, config, history, 'explicit');
      }

      if (cleanContent === 'NO_INFO' || cleanContent.includes('NO_INFO')) {
        this.logger.warn('LLM determined no information was available, returning noInfoMessage', {
          agentId: input.agentId,
          conversationId: input.conversationId,
          stage: 'llm_invocation',
        });
        return this.buildNoInfoResponse(input, config, history, 'agent_detected');
      }

      this.logger.debug('LLM response received');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('LLM invocation failed', {
        agentId: input.agentId,
        conversationId: input.conversationId,
        error: errorMessage,
        stage: 'llm_invocation',
      });
      return this.buildErrorResponse(input, config, history);
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
      if (error instanceof AgentNotFoundException || error instanceof AgentInactiveException) {
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
  private async buildNoInfoResponse(
    input: RagProcessInput,
    config: AgentConfig,
    history: HistoryMessage[],
    escalationType: 'explicit' | 'agent_detected' = 'agent_detected',
  ): Promise<RagProcessOutput> {
    const escalatedAt = new Date();
    const responseContent = escalationType === 'explicit'
      ? 'Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.'
      : config.noInfoMessage;

    try {
      const messages: any[] = history.map((h) => ({
        _id: new ObjectId(),
        sender: h.role === MessageRole.USER ? 'user' : 'agent',
        content: h.content,
        timestamp: h.timestamp,
        type: 'text',
      }));

      messages.push({
        _id: new ObjectId(),
        sender: 'user',
        content: input.userMessage,
        timestamp: input.timestamp,
        type: 'text',
      });

      messages.push({
        _id: new ObjectId(),
        sender: 'agent',
        content: responseContent,
        timestamp: escalatedAt,
        type: 'text',
      });

      await this.escalatedRepo.create({
        companyId: new ObjectId(config.companyId),
        userId: input.conversationId,
        agentId: config.agentId,
        agentName: config.personality?.name || 'Agente RAG',
        agentType: 'rag',
        status: 'escalated',
        escalationType,
        escalatedAt,
        reason: escalationType === 'explicit'
          ? 'El usuario solicitó hablar con un humano directamente.'
          : 'El agente no tiene información sobre el producto solicitado.',
        messages,
        createdAt: escalatedAt,
        updatedAt: escalatedAt,
      });

      // Emitir métrica de escalamiento abierto (fire-and-forget)
      this.eventEmitter.emit('metric.event', {
        companyId: config.companyId,
        agentId: config.agentId,
        agentType: 'rag',
        eventType: 'escalation.opened',
        timestamp: escalatedAt,
        metadata: {
          reason: escalationType === 'explicit'
            ? 'El usuario solicitó hablar con un humano directamente.'
            : 'El agente no tiene información sobre el producto solicitado.',
          escalationType,
        },
      } satisfies MetricEventPayload);

      // Guardar también en la memoria general
      await this.memoryService.saveMessage(input.conversationId, {
        role: MessageRole.USER,
        content: input.userMessage,
        timestamp: input.timestamp,
      });
      await this.memoryService.saveMessage(input.conversationId, {
        role: MessageRole.ASSISTANT,
        content: responseContent,
        timestamp: escalatedAt,
      });
    } catch (err: unknown) {
      this.logger.error('Failed to create escalated conversation document on low relevance', {
        conversationId: input.conversationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      conversationId: input.conversationId,
      messages: [{ type: ResponseType.TEXT, content: responseContent }],
      escalated: true,
      escalationReason: EscalationReason.LOW_RELEVANCE,
    };
  }

  /**
   * Builds an error response with escalation for LLM unavailability.
   */
  private async buildErrorResponse(
    input: RagProcessInput,
    config: AgentConfig,
    history: HistoryMessage[],
  ): Promise<RagProcessOutput> {
    const escalatedAt = new Date();
    const responseContent = config.errorMessage;

    try {
      const messages: any[] = history.map((h) => ({
        _id: new ObjectId(),
        sender: h.role === MessageRole.USER ? 'user' : 'agent',
        content: h.content,
        timestamp: h.timestamp,
        type: 'text',
      }));

      messages.push({
        _id: new ObjectId(),
        sender: 'user',
        content: input.userMessage,
        timestamp: input.timestamp,
        type: 'text',
      });

      messages.push({
        _id: new ObjectId(),
        sender: 'agent',
        content: responseContent,
        timestamp: escalatedAt,
        type: 'text',
      });

      await this.escalatedRepo.create({
        companyId: new ObjectId(config.companyId),
        userId: input.conversationId,
        agentId: config.agentId,
        agentName: config.personality?.name || 'Agente RAG',
        agentType: 'rag',
        status: 'escalated',
        escalationType: 'agent_detected',
        escalatedAt,
        reason: 'Error al invocar o procesar el modelo de lenguaje.',
        messages,
        createdAt: escalatedAt,
        updatedAt: escalatedAt,
      });

      // Emitir métrica de escalamiento abierto por error de LLM (fire-and-forget)
      this.eventEmitter.emit('metric.event', {
        companyId: config.companyId,
        agentId: config.agentId,
        agentType: 'rag',
        eventType: 'escalation.opened',
        timestamp: escalatedAt,
        metadata: {
          reason: 'Error al invocar o procesar el modelo de lenguaje.',
          escalationType: 'agent_detected',
        },
      } satisfies MetricEventPayload);

      // Guardar también en la memoria general
      await this.memoryService.saveMessage(input.conversationId, {
        role: MessageRole.USER,
        content: input.userMessage,
        timestamp: input.timestamp,
      });
      await this.memoryService.saveMessage(input.conversationId, {
        role: MessageRole.ASSISTANT,
        content: responseContent,
        timestamp: escalatedAt,
      });
    } catch (err: unknown) {
      this.logger.error('Failed to create escalated conversation document on error', {
        conversationId: input.conversationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      conversationId: input.conversationId,
      messages: [{ type: ResponseType.TEXT, content: responseContent }],
      escalated: true,
      escalationReason: EscalationReason.LLM_UNAVAILABLE,
    };
  }

  /**
   * Ejecuta el flujo del LLM para agentes de agendamiento con soporte de herramientas (Tools).
   */
  private async executeAgentWithTools(
    config: AgentConfig,
    prompt: LlmPrompt,
    _input: RagProcessInput,
  ): Promise<string> {
    const rawModel = typeof this.llmProvider.getModel === 'function' ? this.llmProvider.getModel() : null;
    if (!rawModel) {
      this.logger.error('El proveedor de LLM no expone el modelo LangChain crudo');
      throw new Error('Soporte de herramientas no configurado en el LLM');
    }

    let tools: any[] = [];

    if (config.tipo === 'agendamiento') {
      const checkAvailabilityTool = new DynamicStructuredTool({
        name: 'check_availability',
        description:
          'Consulta los horarios/slots de 30 minutos disponibles para una fecha específica (YYYY-MM-DD). Retorna un array de strings con las horas disponibles (ej: ["09:00", "09:30"]).',
        schema: z.object({
          date: z.string().describe('Fecha en formato YYYY-MM-DD del día a consultar.'),
          timeOfDay: z.enum(['morning', 'afternoon', 'any']).optional().describe('Preferencia de jornada de disponibilidad.'),
        }),
        func: async ({ date, timeOfDay }) => {
          try {
            const slots = await this.bookingsService.checkAvailability(
              config.agentId,
              date,
              timeOfDay || 'any',
            );
            return JSON.stringify({ success: true, date, availableSlots: slots });
          } catch (err: any) {
            return JSON.stringify({ success: false, error: err.message || String(err) });
          }
        },
      });

      const bookAppointmentTool = new DynamicStructuredTool({
        name: 'book_appointment',
        description: 'Reserva una cita para un cliente en una fecha y hora específica.',
        schema: z.object({
          dateTime: z
            .string()
            .describe(
              'Fecha y hora de inicio de la cita en formato ISO 8601 (ej. YYYY-MM-DDTHH:mm:ss). Debe ser uno de los slots disponibles.',
            ),
          customerName: z.string().describe('Nombre completo del cliente.'),
          customerPhone: z.string().describe('Teléfono de contacto del cliente.'),
          customerEmail: z.string().optional().describe('Correo electrónico del cliente.'),
          notes: z.string().optional().describe('Notas o comentarios adicionales de la cita.'),
        }),
        func: async ({ dateTime, customerName, customerPhone, customerEmail, notes }) => {
          try {
            const booking = await this.bookingsService.createBooking(config.companyId, {
              agentId: config.agentId,
              dateTime,
              customerName,
              customerPhone,
              customerEmail,
              notes,
            });
            return JSON.stringify({ success: true, booking });
          } catch (err: any) {
            return JSON.stringify({ success: false, error: err.message || String(err) });
          }
        },
      });

      tools = [checkAvailabilityTool, bookAppointmentTool];
    } else if (config.tipo === 'cotizador') {
      const listProductsTool = new DynamicStructuredTool({
        name: 'list_products',
        description: 'Busca productos o consulta el catálogo del agente cotizador. Puedes pasar términos de búsqueda para encontrar productos específicos.',
        schema: z.object({
          query: z.string().optional().describe('Término de búsqueda para filtrar productos o vacío para ver general.'),
        }),
        func: async ({ query }) => {
          try {
            const results = await this.vectorSearch.search(config.agentId, query || 'productos', 10);
            return JSON.stringify({
              success: true,
              products: results.map(r => r.content),
            });
          } catch (err: any) {
            return JSON.stringify({ success: false, error: err.message || String(err) });
          }
        },
      });

      const createOrderTool = new DynamicStructuredTool({
        name: 'create_order',
        description: 'Crea un nuevo pedido o cotización para el cliente con los ítems y precios especificados.',
        schema: z.object({
          customerName: z.string().describe('Nombre completo del cliente.'),
          customerPhone: z.string().describe('Teléfono de WhatsApp del cliente.'),
          customerEmail: z.string().email().describe('Correo electrónico del cliente.'),
          customerAddress: z.string().describe('Dirección física de entrega del cliente.'),
          items: z.array(
            z.object({
              nombre: z.string().describe('Nombre del producto o servicio.'),
              cantidad: z.number().describe('Cantidad ordenada.'),
              precioUnitario: z.number().describe('Precio unitario del producto.'),
            })
          ).describe('Lista de productos o ítems agregados al pedido.'),
          notes: z.string().optional().describe('Notas o comentarios adicionales del pedido.'),
        }),
        func: async ({ customerName, customerPhone, customerEmail, customerAddress, items, notes }) => {
          try {
            const total = items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
            const order = await this.ordersService.createOrder(config.companyId, {
              agentId: config.agentId,
              customerName,
              customerPhone,
              customerEmail,
              customerAddress,
              items: items.map(item => ({
                nombre: item.nombre,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                subtotal: item.cantidad * item.precioUnitario,
              })),
              total,
              status: 'pending_confirmation',
              notes,
            });
            return JSON.stringify({ success: true, order });
          } catch (err: any) {
            return JSON.stringify({ success: false, error: err.message || String(err) });
          }
        },
      });

      const getOrderStatusTool = new DynamicStructuredTool({
        name: 'get_order_status',
        description: 'Obtiene el estado de un pedido específico por su ID.',
        schema: z.object({
          orderId: z.string().describe('ID único del pedido a consultar.'),
        }),
        func: async ({ orderId }) => {
          try {
            const order = await this.ordersService.getOrder(orderId, config.companyId);
            return JSON.stringify({
              success: true,
              orderId: order.id,
              status: order.status,
              customerName: order.customerName,
              total: order.total,
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
            });
          } catch (err: any) {
            return JSON.stringify({ success: false, error: err.message || String(err) });
          }
        },
      });

      const cancelOrderTool = new DynamicStructuredTool({
        name: 'cancel_order',
        description: 'Cancela un pedido existente usando su ID.',
        schema: z.object({
          orderId: z.string().describe('ID único del pedido a cancelar.'),
        }),
        func: async ({ orderId }) => {
          try {
            const order = await this.ordersService.cancelOrder(orderId, config.companyId);
            return JSON.stringify({ success: true, order });
          } catch (err: any) {
            return JSON.stringify({ success: false, error: err.message || String(err) });
          }
        },
      });

      tools = [listProductsTool, createOrderTool, getOrderStatusTool, cancelOrderTool];
    }

    const modelWithTools = rawModel.bindTools(tools);

    // Construcción de mensajes para el LLM
    const messages: any[] = [];

    // System prompt con contexto inyectado
    const systemPromptParts = [prompt.systemPrompt];
    if (prompt.context) {
      systemPromptParts.push(`\n\n--- CONTEXTO ---\n${prompt.context}`);
    }
    systemPromptParts.push(`\n\nRestriction: Your response must not exceed ${prompt.maxResponseLength} characters.`);

    // Inyectar contexto temporal local del agente
    const timezone = config.timezone || 'America/Bogota';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('es-CO', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'long',
    });
    const localTimeStr = formatter.format(now);
    systemPromptParts.push(`\n\nFecha y hora actual del sistema (huso horario ${timezone}): ${localTimeStr}.`);

    messages.push(new SystemMessage(systemPromptParts.join('')));

    // Historial conversacional
    for (const msg of prompt.history) {
      if (msg.role === 'user') {
        messages.push(new HumanMessage(msg.content));
      } else {
        messages.push(new AIMessage(msg.content));
      }
    }

    // Mensaje de usuario actual
    messages.push(new HumanMessage(prompt.userMessage));

    this.logger.log(`Iniciando ejecución de agente de agendamiento. Mensaje usuario: "${prompt.userMessage}"`);

    let response = await modelWithTools.invoke(messages);
    let loopCount = 0;

    while (loopCount < 5) {
      const toolCalls = response.tool_calls || [];
      if (toolCalls.length === 0) {
        break;
      }

      loopCount++;
      messages.push(response);

      for (const toolCall of toolCalls) {
        const targetTool = tools.find((t) => t.name === toolCall.name);
        if (targetTool) {
          this.logger.log(`Llamando herramienta ${toolCall.name} con argumentos: ${JSON.stringify(toolCall.args)}`);
          const result = await (targetTool as any).invoke(toolCall.args);
          let contentStr = '';
          if (result && typeof result === 'object' && 'content' in result) {
            contentStr = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
          } else {
            contentStr = typeof result === 'string' ? result : JSON.stringify(result);
          }
          messages.push(
            new ToolMessage({
              content: contentStr,
              tool_call_id: toolCall.id!,
            }),
          );
        } else {
          messages.push(
            new ToolMessage({
              content: `Error: herramienta ${toolCall.name} no encontrada`,
              tool_call_id: toolCall.id!,
            }),
          );
        }
      }

      response = await modelWithTools.invoke(messages);
    }

    const finalContent =
      typeof response.content === 'string'
        ? response.content
        : Array.isArray(response.content)
          ? response.content.map((b: any) => b.text || '').join('')
          : '';

    return finalContent;
  }
}
