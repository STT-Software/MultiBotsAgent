import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { EmailVerificationModule } from "./modules/email-verification/email-verification.module";
import { CompanyProfileModule } from "./modules/company-profile/company-profile.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";
import { RagEngineModule } from "./modules/rag-engine/rag-engine.module";
import { EmailVerifiedGuard } from "./modules/email-verification/guards/email-verified.guard";

@Module({
  imports: [
    HealthModule,
    AuthModule,
    EmailVerificationModule,
    CompanyProfileModule,
    KnowledgeModule,
    RagEngineModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: EmailVerifiedGuard,
    },
  ],
})
export class AppModule {}
