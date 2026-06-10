import { Module } from "@nestjs/common";
import { MongoClient } from "mongodb";
import { AuditLogRepository, CompanyRepository } from "@multibotagents/db";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Module({
  controllers: [AuditController],
  providers: [
    // ─── MongoDB Client ────────────────────────────────────────────────────────
    {
      provide: "AUDIT_MONGO_CLIENT",
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI es requerida para AuditModule");
        return new MongoClient(uri);
      },
    },

    // ─── Repositorios ──────────────────────────────────────────────────────────
    {
      provide: "AUDIT_LOG_REPO",
      useFactory: (client: MongoClient) => new AuditLogRepository(client.db()),
      inject: ["AUDIT_MONGO_CLIENT"],
    },
    {
      provide: "COMPANY_REPO",
      useFactory: (client: MongoClient) => new CompanyRepository(client.db()),
      inject: ["AUDIT_MONGO_CLIENT"],
    },

    // ─── Servicios ─────────────────────────────────────────────────────────────
    AuditService,
    JwtAuthGuard,
  ],
  exports: [AuditService],
})
export class AuditModule {}
