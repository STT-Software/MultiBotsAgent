import {
  Controller,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricasSeedService } from './metricas-seed.service';
import { SeedCreatedResponseDto, SeedSkippedResponseDto } from './dto/seed-response.dto';

@ApiTags('Métricas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('metricas')
export class MetricasController {
  constructor(private readonly seedService: MetricasSeedService) {}

  /**
   * POST /api/metricas/seed
   *
   * Inserta 52 eventos de métricas de ejemplo para la empresa autenticada.
   * Solo disponible en entornos no productivos.
   * Idempotente: si ya existen eventos, retorna { skipped: true }.
   */
  @Post('seed')
  @ApiOperation({
    summary: 'Insertar eventos de métricas de ejemplo',
    description:
      'Crea 52 eventos de métricas variados para testing. Solo disponible con NODE_ENV !== "production". ' +
      'Idempotente: una segunda llamada retorna { skipped: true }.',
  })
  @ApiResponse({ status: 201, type: SeedCreatedResponseDto, description: 'Eventos insertados correctamente.' })
  @ApiResponse({ status: 201, type: SeedSkippedResponseDto, description: 'Ya existían eventos, no se duplicaron.' })
  @ApiResponse({ status: 403, description: 'No disponible en producción.' })
  async seed(@Req() req: Request) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('El endpoint de seed no está disponible en producción');
    }

    const { companyId } = (req as any).user;
    return this.seedService.seedForCompany(companyId);
  }
}
