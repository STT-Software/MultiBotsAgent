import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { IAgentRepository } from '@multibotagents/db';
import type { Agent } from '@multibotagents/types';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { CreateAgentDto } from './dto/create-agent.dto';

/**
 * Servicio NestJS encargado de orquestar la lógica de negocio y validación
 * de la personalidad de los agentes, garantizando el aislamiento por empresa.
 */
@Injectable()
export class AgentsService {
  constructor(
    @Inject('AGENT_REPO') private readonly agentRepository: IAgentRepository,
  ) {}

  /**
   * Obtiene todos los agentes pertenecientes a la empresa indicada.
   */
  async getAgentsByCompany(companyId: string): Promise<Agent[]> {
    return this.agentRepository.findByCompanyId(companyId);
  }

  /**
   * Obtiene la configuración completa de un agente si pertenece a la empresa indicada.
   */
  async getAgent(id: string, companyId: string): Promise<Agent> {
    const agent = await this.agentRepository.findById(id);
    if (!agent) {
      throw new NotFoundException('Agente no encontrado');
    }

    if (agent.companyId !== companyId) {
      throw new ForbiddenException('No tienes permisos sobre este agente');
    }

    return agent;
  }

  /**
   * Crea un nuevo agente inicializado por defecto para la empresa.
   */
  async createAgent(companyId: string, dto: CreateAgentDto): Promise<Agent> {
    const defaultAgent: Omit<Agent, 'id'> = {
      companyId,
      nombre: dto.nombre.trim(),
      tipo: dto.tipo,
      estado: 'borrador',
      instrucciones: 'Eres un asistente útil.',
      relevanceThreshold: 0.5,
      topK: 3,
      maxResponseLength: 500,
      memoryWindow: 10,
      welcomeMessage: '',
      noInfoMessage: 'Disculpa, no poseo información al respecto en este momento.',
      errorMessage: 'Ocurrió un error inesperado al procesar tu solicitud.',
      language: 'es',
      failedAttemptsBeforeEscalation: 3,
      personality: {
        name: dto.nombre.trim(),
        tone: 'profesional',
        restrictions: [],
        instructions: 'Eres un asistente útil.',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.agentRepository.create(defaultAgent);
  }

  /**
   * Actualiza la configuración y personalidad de un agente de forma atómica.
   */
  async updateAgent(id: string, companyId: string, dto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.agentRepository.findById(id);
    if (!agent) {
      throw new NotFoundException('Agente no encontrado');
    }

    if (agent.companyId !== companyId) {
      throw new ForbiddenException('No tienes permisos sobre este agente');
    }

    const updatedData: Partial<Agent> = {};
    if (dto.nombre !== undefined) updatedData.nombre = dto.nombre;
    if (dto.language !== undefined) updatedData.language = dto.language;
    
    // Permitir explícitamente guardar un welcomeMessage vacío/nulo si se desea deshabilitar
    if (dto.welcomeMessage !== undefined) {
      updatedData.welcomeMessage = dto.welcomeMessage;
    }

    if (dto.personality !== undefined) {
      updatedData.personality = {
        name: dto.personality.name,
        tone: dto.personality.tone,
        restrictions: dto.personality.restrictions,
        instructions: dto.personality.instructions,
      };
    }

    return this.agentRepository.update(id, updatedData);
  }

  /**
   * Elimina un agente validando los permisos de empresa.
   */
  async deleteAgent(id: string, companyId: string): Promise<boolean> {
    const agent = await this.agentRepository.findById(id);
    if (!agent) {
      throw new NotFoundException('Agente no encontrado');
    }

    if (agent.companyId !== companyId) {
      throw new ForbiddenException('No tienes permisos sobre este agente');
    }

    return this.agentRepository.delete(id);
  }
}

