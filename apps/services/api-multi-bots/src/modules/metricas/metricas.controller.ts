import {
  Controller,
  Post,
  Get,
  Req,
  Query,
  UseGuards,
  ForbiddenException,
  GatewayTimeoutException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricasSeedService } from './metricas-seed.service';
import { MetricasGeneralesService } from './metricas-generales.service';
import { SeedCreatedResponseDto, SeedSkippedResponseDto } from './dto/seed-response.dto';
import { GeneralMetricsDto } from './dto/general-metrics.dto';
import { PeriodQueryDto } from './dto/period-query.dto';

@ApiTags('Métricas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('metricas')
export class MetricasController {
  constructor(
    private readonly seedService: MetricasSeedService,
    private readonly metricasGeneralesService: MetricasGeneralesService,
  ) {}

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

  /**
   * GET /api/metricas/generales?period=7d
   *
   * Retorna las métricas generales de la empresa del usuario autenticado
   * para el período especificado (24h, 7d o 30d). Default: 7d.
   *
   * El companyId se extrae exclusivamente del JWT — nunca del request.
   * Si la query tarda más de METRICS_QUERY_TIMEOUT_MS (default 5000ms), retorna 504.
   */
  @Get('generales')
  @ApiOperation({
    summary: 'Obtener métricas generales de la empresa',
    description:
      'Calcula conversaciones totales, tasas de resolución y escalamiento, ' +
      'top temas RAG y tiempo promedio de resolución de escalamientos. ' +
      'Filtrado por empresa del JWT. Si no hay datos retorna ceros (nunca 404).',
  })
  @ApiOkResponse({ type: GeneralMetricsDto, description: 'Métricas calculadas correctamente.' })
  @ApiResponse({ status: 400, description: "Período inválido. Debe ser '24h', '7d' o '30d'." })
  @ApiResponse({ status: 504, description: 'Consulta tardó más de 5 segundos.' })
  async getGeneralMetrics(
    @Query() query: PeriodQueryDto,
    @Req() req: Request,
  ): Promise<GeneralMetricsDto> {
    const { companyId } = (req as any).user;
    const period = query.period ?? '7d';
    const timeoutMs = parseInt(process.env.METRICS_QUERY_TIMEOUT_MS ?? '5000', 10);

    const result = await Promise.race([
      this.metricasGeneralesService.getGeneralMetrics(companyId, period),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new GatewayTimeoutException(
                'Consulta de métricas tardó demasiado. Intente nuevamente.',
              ),
            ),
          timeoutMs,
        ),
      ),
    ]);

    return result;
  }
}
