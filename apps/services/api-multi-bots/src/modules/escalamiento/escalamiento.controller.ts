import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EscalamientoService } from './escalamiento.service';
import { EscalamientoStorageService } from './escalamiento-storage.service';
import {
  ConversationResponseDto,
  ConversationsListResponseDto,
  ConversationMessageResponseDto,
  PendingCountResponseDto,
  SendMessageDto,
  UploadUrlRequestDto,
  UploadUrlResponseDto,
} from './dto';

@ApiTags('Escalamiento')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('escalamiento')
export class EscalamientoController {
  constructor(
    private readonly escalamientoService: EscalamientoService,
    private readonly storageService: EscalamientoStorageService,
  ) {}

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

  // ─── POST /api/escalamiento/conversations/:id/messages ───────────────────

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Enviar mensaje del operador',
    description: 'Envía un mensaje (texto, imagen o archivo) a una conversación escalada.',
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: 201, type: ConversationMessageResponseDto })
  @ApiResponse({ status: 400, description: 'Conversación resuelta o datos inválidos.' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada.' })
  async sendMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const { companyId } = (req as any).user;
    return this.escalamientoService.sendMessage(companyId, id, dto);
  }

  // ─── PATCH /api/escalamiento/conversations/:id/resolve ───────────────────

  @Patch('conversations/:id/resolve')
  @ApiOperation({
    summary: 'Resolver conversación',
    description: 'Marca la conversación como resuelta. El control vuelve al agente.',
  })
  @ApiResponse({ status: 200, description: 'Conversación resuelta exitosamente.' })
  @ApiResponse({ status: 400, description: 'La conversación ya está resuelta.' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada.' })
  async resolveConversation(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const { companyId } = (req as any).user;
    await this.escalamientoService.resolveConversation(companyId, id);
    return { success: true };
  }

  // ─── POST /api/escalamiento/conversations/:id/upload-url ─────────────────

  @Post('conversations/:id/upload-url')
  @ApiOperation({
    summary: 'Obtener presigned URL para subir archivo',
    description: 'Genera una presigned URL de S3 para subir un archivo directamente desde el frontend.',
  })
  @ApiBody({ type: UploadUrlRequestDto })
  @ApiResponse({ status: 201, type: UploadUrlResponseDto })
  @ApiResponse({ status: 400, description: 'Tipo de archivo no permitido.' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada.' })
  async getUploadUrl(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UploadUrlRequestDto,
  ) {
    const { companyId } = (req as any).user;
    // Verificar que la conversación existe
    await this.escalamientoService.getConversationById(companyId, id);
    return this.storageService.generateUploadUrl(companyId, id, dto.fileName, dto.contentType);
  }
}
