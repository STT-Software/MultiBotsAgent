import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import type {
  IEscalatedConversationRepository,
  EscalatedConversation,
} from '@multibotagents/db';

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
}
