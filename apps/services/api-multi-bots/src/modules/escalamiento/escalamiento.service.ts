import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import type {
  IEscalatedConversationRepository,
  EscalatedConversation,
  EscalatedConversationMessage,
} from '@multibotagents/db';
import type { SendMessageDto } from './dto';

@Injectable()
export class EscalamientoService {
  private readonly logger = new Logger(EscalamientoService.name);

  constructor(
    @Inject('ESCALATED_CONVERSATION_REPO')
    private readonly repo: IEscalatedConversationRepository,
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
}
