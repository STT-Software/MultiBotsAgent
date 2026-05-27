/**
 * Tokens de inyección para el módulo RAG Engine.
 * Permiten inyectar interfaces abstractas sin depender de implementaciones concretas.
 *
 * Valida: Requisito 10.5
 */

export const RAG_LLM_PROVIDER = Symbol('RAG_LLM_PROVIDER');
export const RAG_VECTOR_SEARCH = Symbol('RAG_VECTOR_SEARCH');
export const RAG_MEMORY_SERVICE = Symbol('RAG_MEMORY_SERVICE');
export const RAG_AGENT_CONFIG_SERVICE = Symbol('RAG_AGENT_CONFIG_SERVICE');

/**
 * Token para inyectar el emisor de eventos de escalamiento.
 * Permite desacoplar la lógica de detección de escalamiento
 * del sistema concreto de emisión de eventos.
 *
 * Valida: Requisito 15.5
 */
export const RAG_ESCALATION_EMITTER = Symbol('RAG_ESCALATION_EMITTER');
