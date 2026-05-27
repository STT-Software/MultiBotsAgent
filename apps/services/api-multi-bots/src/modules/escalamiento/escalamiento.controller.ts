import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EscalamientoService } from './escalamiento.service';
import {
  ConversationResponseDto,
  ConversationsListResponseDto,
  PendingCountResponseDto,
} from './dto';

@ApiTags('Escalamiento')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('escalamiento')
export class EscalamientoController {
  constructor(private readonly escalamientoService: EscalamientoService) {}

  // ─── GET /api/escalamiento/conversations ─────────────────────────────────

  @Get('conversations')
  @ApiOperation({
    summary: 'Listar conversaciones escaladas',
    description: 'Retorna conversaciones filtradas por status, ordenadas por escalatedAt ASC.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['escalated', 'resolved', 'unassigned'] })
  @ApiResponse({ status: 200, type: ConversationsListResponseDto })
  async getConversations(
    @Req() req: Request,
    @Query('status') status: string = 'escalated',
  ) {
    const { companyId } = (req as any).user;
    const data = await this.escalamientoService.getConversations(companyId, status);
    const pendingCount = await this.escalamientoService.getPendingCount(companyId);
    return { data, pendingCount };
  }

  // ─── GET /api/escalamiento/conversations/:id ─────────────────────────────

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Obtener detalle de conversación',
    description: 'Retorna una conversación con su historial completo de mensajes.',
  })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada.' })
  async getConversationById(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const { companyId } = (req as any).user;
    return this.escalamientoService.getConversationById(companyId, id);
  }

  // ─── GET /api/escalamiento/pending-count ─────────────────────────────────

  @Get('pending-count')
  @ApiOperation({
    summary: 'Obtener contador de conversaciones pendientes',
    description: 'Retorna el número de conversaciones con status escalated.',
  })
  @ApiResponse({ status: 200, type: PendingCountResponseDto })
  async getPendingCount(@Req() req: Request) {
    const { companyId } = (req as any).user;
    const count = await this.escalamientoService.getPendingCount(companyId);
    return { count };
  }
}
