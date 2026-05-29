import { ApiProperty } from '@nestjs/swagger';

export class EscalationEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() conversationId!: string;
  @ApiProperty() agentId!: string;
  @ApiProperty() agentName!: string;
  @ApiProperty() escalationType!: 'explicit' | 'agent_detected';
  @ApiProperty() reason!: string;
  @ApiProperty() escalatedAt!: string;
  @ApiProperty() resolvedAt!: string;
  @ApiProperty() resolvedBy!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty() createdAt!: string;
}

export class EventsSummaryDto {
  @ApiProperty() todayCount!: number;
  @ApiProperty() avgDurationMinutes!: number;
}

export class EventsListResponseDto {
  @ApiProperty({ type: [EscalationEventResponseDto] })
  data!: EscalationEventResponseDto[];

  @ApiProperty({ type: EventsSummaryDto })
  summary!: EventsSummaryDto;
}
