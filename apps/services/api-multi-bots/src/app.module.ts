import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RagEngineModule } from "./modules/rag-engine/rag-engine.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";

@Module({
  imports: [HealthModule, AuthModule, RagEngineModule, KnowledgeModule],
})
export class AppModule {}
