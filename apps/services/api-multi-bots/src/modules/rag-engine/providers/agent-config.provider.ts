import { Injectable } from '@nestjs/common';
import { AgentNotFoundException } from '../exceptions/rag-engine.exceptions';

import type { AgentConfig, AgentConfigProvider } from '@multibotagents/types';

/**
 * Placeholder implementation of AgentConfigProvider.
 * Will be replaced with a real implementation that queries the database.
 *
 * Valida: Requisito 1.4
 */
@Injectable()
export class PlaceholderAgentConfigProvider implements AgentConfigProvider {
  async getConfig(agentId: string): Promise<AgentConfig> {
    // Placeholder: will be replaced with real DB lookup
    throw new AgentNotFoundException(agentId);
  }
}
