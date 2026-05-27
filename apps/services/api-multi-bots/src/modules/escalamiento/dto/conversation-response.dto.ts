import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationMessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() sender!: 'user' | 'agent' | 'operator';
  @ApiProperty() content!: string;
  @ApiProperty() timestamp!: string;
  @ApiProperty() type!: 'text' | 'image' | 'file';
  @ApiPropertyOptional() status?: 'sending' | 'sent' | 'pending' | 'failed';
  @ApiPropertyOptional() fileUrl?: string;
  @ApiPropertyOptional() fileName?: string;
  @ApiPropertyOptional() fileSize?: number;
  @ApiPropertyOptional() fileMimeType?: string;
}

export class ConversationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiPropertyOptional() userAvatar?: string;
  @ApiProperty() agentId!: string;
  @ApiProperty() agentName!: string;
  @ApiProperty() agentType!: 'rag' | 'cotizador' | 'agendamiento';
  @ApiProperty() status!: 'escalated' | 'resolved' | 'unassigned';
  @ApiProperty() escalationType!: 'explicit' | 'agent_detected';
  @ApiProperty() escalatedAt!: string;
  @ApiPropertyOptional() resolvedAt?: string;
  @ApiProperty() reason!: string;
  @ApiProperty({ type: [ConversationMessageResponseDto] })
  messages!: ConversationMessageResponseDto[];
}

export class ConversationsListResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  data!: ConversationResponseDto[];

  @ApiProperty() pendingCount!: number;
}

export class PendingCountResponseDto {
  @ApiProperty() count!: number;
}
