import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentsService } from '../agents.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

describe('AgentsService', () => {
  let service: AgentsService;
  let mockAgentRepository: any;

  beforeEach(() => {
    mockAgentRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    };
    service = new AgentsService(mockAgentRepository);
  });

  describe('getAgent', () => {
    it('should throw NotFoundException if agent does not exist', async () => {
      mockAgentRepository.findById.mockResolvedValue(null);

      await expect(
        service.getAgent(new ObjectId().toHexString(), new ObjectId().toHexString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if agent belongs to another company', async () => {
      const agentId = new ObjectId().toHexString();
      const companyId = new ObjectId().toHexString();
      const otherCompanyId = new ObjectId().toHexString();

      mockAgentRepository.findById.mockResolvedValue({
        id: agentId,
        companyId: otherCompanyId,
        nombre: 'Agente Extraño',
      });

      await expect(service.getAgent(agentId, companyId)).rejects.toThrow(ForbiddenException);
    });

    it('should return agent if found and ownership matches', async () => {
      const agentId = new ObjectId().toHexString();
      const companyId = new ObjectId().toHexString();
      const agentDoc = {
        id: agentId,
        companyId,
        nombre: 'Mi Agente',
      };

      mockAgentRepository.findById.mockResolvedValue(agentDoc);

      const result = await service.getAgent(agentId, companyId);
      expect(result).toEqual(agentDoc);
    });
  });

  describe('updateAgent', () => {
    it('should throw NotFoundException if agent does not exist for update', async () => {
      mockAgentRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateAgent(
          new ObjectId().toHexString(),
          new ObjectId().toHexString(),
          { nombre: 'Nuevo Nombre' },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if agent to update belongs to another company', async () => {
      const agentId = new ObjectId().toHexString();
      const companyId = new ObjectId().toHexString();
      const otherCompanyId = new ObjectId().toHexString();

      mockAgentRepository.findById.mockResolvedValue({
        id: agentId,
        companyId: otherCompanyId,
      });

      await expect(
        service.updateAgent(agentId, companyId, { nombre: 'Nuevo Nombre' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update and return the updated agent', async () => {
      const agentId = new ObjectId().toHexString();
      const companyId = new ObjectId().toHexString();
      const existingAgent = {
        id: agentId,
        companyId,
        nombre: 'Viejo Nombre',
        personality: {
          name: 'Viejo Bot',
          tone: 'casual',
          restrictions: [],
          instructions: 'Saluda',
        },
      };

      mockAgentRepository.findById.mockResolvedValue(existingAgent);
      mockAgentRepository.update.mockResolvedValue({
        ...existingAgent,
        nombre: 'Nuevo Nombre',
        personality: {
          name: 'Nuevo Bot',
          tone: 'formal',
          restrictions: ['no spam'],
          instructions: 'Saluda formalmente',
        },
      });

      const updateDto = {
        nombre: 'Nuevo Nombre',
        personality: {
          name: 'Nuevo Bot',
          tone: 'formal',
          restrictions: ['no spam'],
          instructions: 'Saluda formalmente',
        },
      };

      const result = await service.updateAgent(agentId, companyId, updateDto);

      expect(mockAgentRepository.update).toHaveBeenCalledWith(agentId, {
        nombre: 'Nuevo Nombre',
        personality: {
          name: 'Nuevo Bot',
          tone: 'formal',
          restrictions: ['no spam'],
          instructions: 'Saluda formalmente',
        },
      });
      expect(result.nombre).toBe('Nuevo Nombre');
      expect(result.personality.tone).toBe('formal');
    });
  });
});
