import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type {
  IEscalatedConversationRepository,
  IChannelRepository,
  EscalatedConversation,
  EscalatedConversationMessage,
} from '@multibotagents/db';
import type { SendMessageDto } from './dto';
import type { OutgoingMessageEvent } from '@multibotagents/types';

@Injectable()
export class EscalamientoService {
  private readonly logger = new Logger(EscalamientoService.name);

  constructor(
    @Inject('ESCALATED_CONVERSATION_REPO')
    private readonly repo: IEscalatedConversationRepository,
    @Inject('CHANNEL_REPO')
    private readonly channelRepo: IChannelRepository,
    @Inject('SQS_CLIENT')
    private readonly sqsClient: SQSClient,
  ) {
    this.logger.log('EscalamientoService initialized');
  }

  async getConversations(companyId: string, status: string): Promise<EscalatedConversation[]> {
    return this.repo.findByCompanyAndStatus(companyId, status);
  }

  async getConversationById(companyId: string, id: string): Promise<EscalatedConversation> {
    const conversation = await this.repo.findById(companyId, id);
    if (!conversation) {
      throw new NotFoundException(`Conversación ${id} no encontrada`);
    }
    return conversation;
  }

  async getPendingCount(companyId: string): Promise<number> {
    return this.repo.countByStatus(companyId, 'escalated');
  }

  async sendMessage(
    companyId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<EscalatedConversationMessage> {
    // Verificar que la conversación existe y pertenece a la empresa
    const conversation = await this.repo.findById(companyId, conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversación ${conversationId} no encontrada`);
    }

    // Verificar que la conversación está escalada (no se puede enviar a resueltas)
    if (conversation.status !== 'escalated') {
      throw new BadRequestException('No se puede enviar mensajes a una conversación resuelta');
    }

    // Validar que archivos tengan fileUrl
    if ((dto.type === 'image' || dto.type === 'file') && !dto.fileUrl) {
      throw new BadRequestException('fileUrl es requerido para mensajes de tipo image o file');
    }

    // Crear el mensaje
    const message = await this.repo.addMessage(companyId, conversationId, {
      sender: 'operator',
      content: dto.content,
      timestamp: new Date(),
      type: dto.type,
      status: 'sent',
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      fileMimeType: dto.fileMimeType,
    });

    // Si es una conversación semilla/mock, no enviamos mensaje real a WhatsApp
    if (conversation.isSeeded || !ObjectId.isValid(conversation.agentId)) {
      this.logger.log(`Conversación semilla detectada (${conversationId}), omitiendo envío real a WhatsApp.`);
      return message;
    }

    const outgoingQueueUrl = process.env.WHATSAPP_OUTGOING_QUEUE_URL;
    if (!outgoingQueueUrl) {
      this.logger.warn('WHATSAPP_OUTGOING_QUEUE_URL no está configurada, omitiendo envío de mensaje a Meta');
      return message;
    }

    try {
      const channel = await this.channelRepo.findByAgentId(conversation.agentId);
      if (!channel) {
        this.logger.warn(`No se encontró un canal activo configurado para el agente ${conversation.agentId}`);
        return message;
      }

      const recipientPhone = conversation.userId.replace('whatsapp_', '');

      const outgoingEvent: OutgoingMessageEvent = {
        channelId: channel.id,
        phoneNumberId: channel.phoneNumberId,
        recipientPhone,
        conversationId: conversation.userId,
        messages: [
          {
            type: dto.type === 'file' ? 'document' : (dto.type as any),
            content: dto.content,
          },
        ],
        escalated: true,
      };

      await this.sqsClient.send(
        new SendMessageCommand({
          QueueUrl: outgoingQueueUrl,
          MessageBody: JSON.stringify(outgoingEvent),
        })
      );

      this.logger.log(`Mensaje de operador enviado a SQS para ${recipientPhone}`);
    } catch (err) {
      this.logger.error(`Error enviando mensaje de operador a SQS: ${err instanceof Error ? err.message : String(err)}`);
    }

    return message;
  }

  async resolveConversation(companyId: string, conversationId: string): Promise<void> {
    // Verificar que la conversación existe y pertenece a la empresa
    const conversation = await this.repo.findById(companyId, conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversación ${conversationId} no encontrada`);
    }

    // Verificar que la conversación está escalada
    if (conversation.status !== 'escalated') {
      throw new BadRequestException('La conversación ya está resuelta');
    }

    await this.repo.updateStatus(companyId, conversationId, 'resolved', new Date());
  }

  async seed(companyId: string): Promise<EscalatedConversation[]> {
    // Verificar si ya existen conversaciones de seed
    const existing = await this.repo.findSeeded(companyId);
    if (existing.length > 0) {
      this.logger.log(`Seed already exists for company ${companyId}, returning existing`);
      return existing;
    }

    const now = new Date();
    const companyObjectId = new ObjectId(companyId);

    const seedData = [
      {
        companyId: companyObjectId,
        userId: '+57 310 456 7890',
        agentId: 'agt-1',
        agentName: 'Asistente Ventas',
        agentType: 'rag' as const,
        status: 'escalated' as const,
        escalationType: 'explicit' as const,
        escalatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        reason: 'El usuario solicitó hablar con un humano directamente.',
        messages: [
          { sender: 'user' as const, content: 'Hola, necesito información sobre el plan empresarial', timestamp: new Date(now.getTime() - 2.5 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: '¡Hola! Con gusto te ayudo. El plan empresarial incluye hasta 10 agentes, soporte prioritario y acceso a la API completa. ¿Te gustaría conocer los precios?', timestamp: new Date(now.getTime() - 2.49 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'user' as const, content: 'Sí, pero también necesito saber si tienen descuento por volumen para más de 50 usuarios', timestamp: new Date(now.getTime() - 2.4 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'Para descuentos por volumen necesitaría consultar con el equipo comercial. ¿Puedo ayudarte con algo más mientras tanto?', timestamp: new Date(now.getTime() - 2.39 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'user' as const, content: 'No, prefiero hablar con alguien directamente. ¿Me puedes pasar con un asesor?', timestamp: new Date(now.getTime() - 2.1 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.', timestamp: new Date(now.getTime() - 2.09 * 60 * 60 * 1000), type: 'text' as const },
        ],
        isSeeded: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        companyId: companyObjectId,
        userId: 'María García',
        agentId: 'agt-2',
        agentName: 'Cotizador Express',
        agentType: 'cotizador' as const,
        status: 'escalated' as const,
        escalationType: 'agent_detected' as const,
        escalatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        reason: 'El agente no tiene información sobre el producto solicitado.',
        messages: [
          { sender: 'user' as const, content: 'Necesito una cotización para el servicio de instalación de paneles solares', timestamp: new Date(now.getTime() - 3.5 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'Puedo ayudarte con cotizaciones. ¿Podrías indicarme el área en metros cuadrados?', timestamp: new Date(now.getTime() - 3.49 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'user' as const, content: 'Son 200m2 en una bodega industrial en Medellín', timestamp: new Date(now.getTime() - 3.4 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'No cuento con información de precios para instalaciones industriales de paneles solares. Este producto no está en mi catálogo actual.', timestamp: new Date(now.getTime() - 3.39 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.', timestamp: new Date(now.getTime() - 3.38 * 60 * 60 * 1000), type: 'text' as const },
        ],
        isSeeded: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        companyId: companyObjectId,
        userId: '+57 315 789 0123',
        agentId: 'agt-3',
        agentName: 'Agenda Citas',
        agentType: 'agendamiento' as const,
        status: 'escalated' as const,
        escalationType: 'explicit' as const,
        escalatedAt: new Date(now.getTime() - 0.5 * 60 * 60 * 1000),
        reason: 'El usuario pidió explícitamente hablar con un humano.',
        messages: [
          { sender: 'user' as const, content: 'Quiero agendar una cita para mañana a las 3pm', timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'Revisando disponibilidad... Mañana a las 3pm no hay horarios disponibles. ¿Te sirve a las 4pm o 5pm?', timestamp: new Date(now.getTime() - 0.99 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'user' as const, content: 'No, necesito que sea a las 3. ¿No pueden hacer una excepción?', timestamp: new Date(now.getTime() - 0.8 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'Lamentablemente no puedo modificar la disponibilidad del calendario. Solo puedo ofrecerte los horarios disponibles.', timestamp: new Date(now.getTime() - 0.79 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'user' as const, content: 'Pásame con un humano por favor, necesito resolver esto', timestamp: new Date(now.getTime() - 0.6 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.', timestamp: new Date(now.getTime() - 0.59 * 60 * 60 * 1000), type: 'text' as const },
        ],
        isSeeded: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        companyId: companyObjectId,
        userId: 'Carlos Rodríguez',
        agentId: 'agt-1',
        agentName: 'Asistente Ventas',
        agentType: 'rag' as const,
        status: 'escalated' as const,
        escalationType: 'agent_detected' as const,
        escalatedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        reason: 'El agente detectó un loop sin resolución tras múltiples intentos.',
        messages: [
          { sender: 'user' as const, content: '¿Cómo configuro la integración con Salesforce?', timestamp: new Date(now.getTime() - 5.5 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'Para integrar con Salesforce, ve a Configuración > Integraciones > Salesforce y sigue los pasos.', timestamp: new Date(now.getTime() - 5.49 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'user' as const, content: 'Ya hice eso pero me da un error de autenticación OAuth', timestamp: new Date(now.getTime() - 5.4 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'Verifica que las credenciales de la app conectada en Salesforce estén correctas y que el callback URL sea el correcto.', timestamp: new Date(now.getTime() - 5.39 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'user' as const, content: 'Ya verifiqué todo y sigue sin funcionar. El error dice \'invalid_grant\'', timestamp: new Date(now.getTime() - 5.3 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'El error \'invalid_grant\' puede deberse a un token expirado. Intenta revocar el acceso y volver a autorizar.', timestamp: new Date(now.getTime() - 5.29 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'user' as const, content: 'Ya lo hice 3 veces y sigue igual', timestamp: new Date(now.getTime() - 5.2 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'Entiendo que has intentado varias soluciones sin éxito. Este caso requiere revisión técnica especializada.', timestamp: new Date(now.getTime() - 5.19 * 60 * 60 * 1000), type: 'text' as const },
          { sender: 'agent' as const, content: 'Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.', timestamp: new Date(now.getTime() - 5.18 * 60 * 60 * 1000), type: 'text' as const },
        ],
        isSeeded: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const results: EscalatedConversation[] = [];
    for (const data of seedData) {
      const messagesWithIds = data.messages.map((m) => ({
        ...m,
        _id: new ObjectId(),
      }));
      const conversation = await this.repo.create({
        ...data,
        messages: messagesWithIds,
      } as any);
      results.push(conversation);
    }

    this.logger.log(`Seeded ${results.length} conversations for company ${companyId}`);
    return results;
  }
}
