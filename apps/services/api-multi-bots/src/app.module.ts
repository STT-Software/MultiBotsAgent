import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { EmailVerificationModule } from "./modules/email-verification/email-verification.module";
import { CompanyProfileModule } from "./modules/company-profile/company-profile.module";
import { ChannelsModule } from "./modules/channels/channels.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";
import { RagEngineModule } from "./modules/rag-engine/rag-engine.module";
import { EscalamientoModule } from "./modules/escalamiento/escalamiento.module";
import { AgentsModule } from "./modules/agents/agents.module";
import { MetricasModule } from "./modules/metricas/metricas.module";
import { EmailVerifiedGuard } from "./modules/email-verification/guards/email-verified.guard";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    HealthModule,
    AuthModule,
    EmailVerificationModule,
    CompanyProfileModule,
    ChannelsModule,
    KnowledgeModule,
    RagEngineModule,
    EscalamientoModule,
    AgentsModule,
    MetricasModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: EmailVerifiedGuard,
    },
  ],
})
export class AppModule {}
