import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RagEngineModule } from "./modules/rag-engine/rag-engine.module";

@Module({
  imports: [HealthModule, AuthModule, RagEngineModule],
})
export class AppModule {}
