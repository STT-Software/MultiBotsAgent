import { Module } from "@nestjs/common";
import { MongoClient } from "mongodb";
import {
  CompanyRepository,
  IntegrationRepository,
  OAuthStateRepository,
  type IOAuthStateRepository,
} from "@multibotagents/db";
import { OAuthStateService } from "@multibotagents/core";
import type { IOAuthStateStore } from "@multibotagents/core";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { GoogleDriveAdapter } from "./providers";

/**
 * Módulo de Gestión de Integraciones Externas (SL13).
 *
 * Slice 1: conexión OAuth de Google Drive end-to-end. Cablea los repositorios
 * de `integrations` y `oauthStates`, el servicio de `state` (lógica pura de
 * core) y el adaptador de Google Drive.
 */
@Module({
  controllers: [IntegrationsController],
  providers: [
    // ─── Cliente MongoDB ──────────────────────────────────────────────────────
    {
      provide: "INTEGRATIONS_MONGO_CLIENT",
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI es requerida para IntegrationsModule");
        return new MongoClient(uri);
      },
    },

    // ─── Repositorios ─────────────────────────────────────────────────────────
    {
      provide: "COMPANY_REPO",
      useFactory: (client: MongoClient) => new CompanyRepository(client.db()),
      inject: ["INTEGRATIONS_MONGO_CLIENT"],
    },
    {
      provide: "INTEGRATION_REPO",
      useFactory: (client: MongoClient) => new IntegrationRepository(client.db()),
      inject: ["INTEGRATIONS_MONGO_CLIENT"],
    },
    {
      provide: "OAUTH_STATE_REPO",
      useFactory: (client: MongoClient) => new OAuthStateRepository(client.db()),
      inject: ["INTEGRATIONS_MONGO_CLIENT"],
    },

    // ─── Servicio de `state` (core) ───────────────────────────────────────────
    {
      provide: OAuthStateService,
      useFactory: (stateRepo: IOAuthStateRepository) => {
        const secrets = (process.env.JWT_SECRETS || "")
          .split(",")
          .filter(Boolean);
        if (secrets.length === 0) {
          throw new Error("JWT_SECRETS es requerida para firmar el state OAuth");
        }

        // Adapta el repositorio MongoDB al puerto IOAuthStateStore de core.
        const store: IOAuthStateStore = {
          persist: (input) => stateRepo.create(input),
          consume: (jti) => stateRepo.consume(jti),
        };

        return new OAuthStateService({ config: { secret: secrets[0] }, store });
      },
      inject: ["OAUTH_STATE_REPO"],
    },

    // ─── Adaptadores y servicios ──────────────────────────────────────────────
    GoogleDriveAdapter,
    IntegrationsService,
    JwtAuthGuard,
  ],
})
export class IntegrationsModule {}
