import { Injectable, Inject, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import type { IAuditLogRepository, AuditLogDocument } from "@multibotagents/db";
import type { AuditLogPayload } from "@multibotagents/types";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject("AUDIT_LOG_REPO")
    private readonly auditRepo: IAuditLogRepository
  ) {}

  /**
   * Listener asíncrono para eventos de auditoría del sistema.
   * Se dispara automáticamente cuando cualquier servicio emite "audit.create".
   */
  @OnEvent("audit.create")
  async handleAuditCreate(payload: AuditLogPayload) {
    try {
      this.logger.log(`Registrando acción de auditoría: ${payload.action} por ${payload.userEmail}`);
      await this.auditRepo.create({
        ...payload,
        timestamp: payload.timestamp || new Date(),
      });
    } catch (err) {
      this.logger.error(`Error al persistir log de auditoría: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Recupera logs de auditoría paginados para una empresa.
   */
  async findRecentPaginated(
    companyId: string,
    page: number,
    limit: number
  ): Promise<{ data: AuditLogDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.auditRepo.findPaginated(companyId, limit, skip),
      this.auditRepo.countByCompany(companyId),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
