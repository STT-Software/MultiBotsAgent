/**
 * Excepciones personalizadas del dominio RAG Engine.
 * Valida: Requisitos 1.2, 1.3
 */

export class AgentNotFoundException extends Error {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundException';
  }
}

export class AgentInactiveException extends Error {
  constructor(agentId: string) {
    super(`Agent is inactive: ${agentId}`);
    this.name = 'AgentInactiveException';
  }
}

export class InvalidInputException extends Error {
  constructor(field: string, reason: string) {
    super(`Invalid input - ${field}: ${reason}`);
    this.name = 'InvalidInputException';
  }
}

export class RagProcessingException extends Error {
  constructor(stage: string, cause: Error) {
    super(`RAG processing failed at ${stage}: ${cause.message}`);
    this.name = 'RagProcessingException';
    this.cause = cause;
  }
}
