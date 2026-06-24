import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuditService } from "./audit.service";
import type { AuditLogDocument } from "@multibotagents/db";

@ApiTags("Auditoria")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("auditoria")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Obtener historial de auditoría de cambios de la empresa",
    description: "Recupera la lista de eventos administrativos de configuración y de sistema paginados.",
  })
  @ApiQuery({ name: "page", required: false, example: 1, description: "Número de página (1-indexed)" })
  @ApiQuery({ name: "limit", required: false, example: 10, description: "Elementos por página" })
  @ApiResponse({
    status: 200,
    description: "Logs de auditoría recuperados con éxito.",
  })
  @ApiResponse({ status: 401, description: "Token JWT no proporcionado o inválido." })
  @ApiResponse({ status: 500, description: "Error interno del servidor." })
  async getAuditLogs(
    @Req() req: Request,
    @Query("page", new ParseIntPipe({ optional: true })) page = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 10
  ): Promise<{ data: AuditLogDocument[]; total: number; page: number; totalPages: number }> {
    const { companyId } = (req as any).user;
    return this.auditService.findRecentPaginated(companyId, page, limit);
  }
}
