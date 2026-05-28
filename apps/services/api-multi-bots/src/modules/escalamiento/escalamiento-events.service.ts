import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IEscalationEventRepository, EscalationEvent } from '@multibotagents/db';

export interface EventsSummary {
  todayCount: number;
  avgDurationMinutes: number;
}

export interface EventsResponse {
  data: EscalationEvent[];
  summary: EventsSummary;
}

@Injectable()
export class EscalamientoEventsService {
  private readonly logger = new Logger(EscalamientoEventsService.name);

  constructor(
    @Inject('ESCALATION_EVENT_REPO')
    private readonly eventRepo: IEscalationEventRepository,
  ) {
    this.logger.log('EscalamientoEventsService initialized');
  }

  async getEvents(
    companyId: string,
    options?: { limit?: number; today?: boolean },
  ): Promise<EventsResponse> {
    const [data, summary] = await Promise.all([
      this.eventRepo.findByCompany(companyId, options),
      this.eventRepo.getSummary(companyId),
    ]);

    return { data, summary };
  }
}
