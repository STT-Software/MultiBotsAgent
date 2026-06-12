import {
  Controller,
  Post,
  Get,
  Req,
  Query,
  Param,
  UseGuards,
  ForbiddenException,
  GatewayTimeoutException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { AgentType } from '@multibotagents/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricasSeedService } from './metricas-seed.service';
import { MetricasGeneralesService } from './metricas-generales.service';
import { MetricasPorAgenteService } from './metricas-por-agente.service';
import { SeedCreatedResponseDto, SeedSkippedResponseDto } from './dto/seed-response.dto';
import { GeneralMetricsDto } from './dto/general-metrics.dto';
import { AgentMetricsDto } from './dto/agent-metrics.dto';
import { PeriodQueryDto } from './dto/period-query.dto';

const VALID_AGENT_TYPES: AgentType[] = ['rag', 'cotizador', 'agendamiento'];

@ApiTags('Métricas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('metricas')
export class MetricasController {
  constructor(
    private readonly seedService: MetricasSeedService,
    private readonly metricasGeneralesService: MetricasGeneralesService,
    private readonly metricasPorAgenteService: MetricasPorAgenteService,
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

  /**
   * GET /api/metricas/recientes?limit=10
   *
   * Retorna los eventos recientes de la empresa del usuario autenticado.
   */
  @Get('recientes')
  @ApiOperation({
    summary: 'Obtener eventos recientes de la empresa',
    description:
      'Retorna los últimos eventos registrados para la empresa del JWT.',
  })
  async getRecentEvents(
    @Query('limit') limit: string = '10',
    @Req() req: Request,
  ) {
    const { companyId } = (req as any).user;
    const limitNum = parseInt(limit, 10) || 10;
    return this.metricasGeneralesService.getRecentEvents(companyId, limitNum);
  }

  /**
   * GET /api/metricas/agente/:agentId?period=7d
   *
   * Retorna las métricas del agente específico identificado por agentId.
   * Detecta el agentType automáticamente desde los eventos almacenados.
   * Si el agente no tiene eventos, retorna DTO vacío con successRate: 0.
   */
  @Get('agente/:agentId')
  @ApiOperation({
    summary: 'Métricas de un agente específico',
    description:
      'Detecta el tipo de agente automáticamente y retorna sus métricas específicas. ' +
      'companyId proviene del JWT — no puede acceder a agentes de otras empresas.',
  })
  @ApiOkResponse({ type: AgentMetricsDto })
  @ApiResponse({ status: 400, description: "Período inválido." })
  @ApiResponse({ status: 504, description: 'Consulta tardó más de 5 segundos.' })
  async getByAgent(
    @Param('agentId') agentId: string,
    @Query() query: PeriodQueryDto,
    @Req() req: Request,
  ): Promise<AgentMetricsDto> {
    const { companyId } = (req as any).user;
    const period = query.period ?? '7d';
    const timeoutMs = parseInt(process.env.METRICS_QUERY_TIMEOUT_MS ?? '5000', 10);

    return Promise.race([
      this.metricasPorAgenteService.getByAgentId(companyId, agentId, period),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new GatewayTimeoutException('Consulta de métricas tardó demasiado. Intente nuevamente.')),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * GET /api/metricas/tipo/:agentType?period=7d
   *
   * Retorna las métricas agregadas de todos los agentes de un tipo en la empresa.
   * agentType debe ser: rag | cotizador | agendamiento.
   */
  @Get('tipo/:agentType')
  @ApiOperation({
    summary: 'Métricas agregadas de todos los agentes de un tipo',
    description:
      'Agrega métricas de todos los agentes del tipo indicado para la empresa del JWT. ' +
      "agentType debe ser 'rag', 'cotizador' o 'agendamiento'.",
  })
  @ApiOkResponse({ type: AgentMetricsDto })
  @ApiResponse({ status: 400, description: "agentType o period inválido." })
  @ApiResponse({ status: 504, description: 'Consulta tardó más de 5 segundos.' })
  async getByAgentType(
    @Param('agentType') agentType: string,
    @Query() query: PeriodQueryDto,
    @Req() req: Request,
  ): Promise<AgentMetricsDto> {
    if (!VALID_AGENT_TYPES.includes(agentType as AgentType)) {
      throw new BadRequestException("agentType debe ser 'rag', 'cotizador' o 'agendamiento'");
    }

    const { companyId } = (req as any).user;
    const period = query.period ?? '7d';
    const timeoutMs = parseInt(process.env.METRICS_QUERY_TIMEOUT_MS ?? '5000', 10);

    return Promise.race([
      this.metricasPorAgenteService.getByAgentType(companyId, agentType as AgentType, period),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new GatewayTimeoutException('Consulta de métricas tardó demasiado. Intente nuevamente.')),
          timeoutMs,
        ),
      ),
    ]);
  }
}
