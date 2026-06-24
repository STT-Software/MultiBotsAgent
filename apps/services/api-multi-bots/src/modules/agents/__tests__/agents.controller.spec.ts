import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentsController } from '../agents.controller';
import { AgentsService } from '../agents.service';
import { ObjectId } from 'mongodb';
import { Request } from 'express';

describe('AgentsController', () => {
  let controller: AgentsController;
  let mockAgentsService: any;

  beforeEach(() => {
    mockAgentsService = {
      getAgent: vi.fn(),
      updateAgent: vi.fn(),
    };

    // Instanciación manual del controlador para evitar problemas de metadatos de SWC en Vitest
    const mockEventEmitter = {
      emit: vi.fn(),
    };
    controller = new AgentsController(
      mockAgentsService as unknown as AgentsService,
      mockEventEmitter as any,
    );
  });

  describe('getAgent', () => {
    it('should call service.getAgent with route param id and req.user.companyId', async () => {
      const agentId = new ObjectId().toHexString();
      const companyId = new ObjectId().toHexString();
      const mockReq = {
        user: { companyId },
      } as unknown as Request;

      const mockResult = {
        id: agentId,
        companyId,
        nombre: 'Test Agent',
      };

      mockAgentsService.getAgent.mockResolvedValue(mockResult);

      const result = await controller.getAgent(agentId, mockReq);

      expect(mockAgentsService.getAgent).toHaveBeenCalledWith(agentId, companyId);
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateAgent', () => {
    it('should call service.updateAgent with params and dto', async () => {
      const agentId = new ObjectId().toHexString();
      const companyId = new ObjectId().toHexString();
      const mockReq = {
        user: { companyId },
      } as unknown as Request;

      const dto = {
        nombre: 'Updated Name',
        personality: {
          name: 'Sofía',
          tone: 'profesional',
          restrictions: ['no spam'],
          instructions: 'Ayuda',
        },
      };

      const mockResult = {
        id: agentId,
        companyId,
        ...dto,
      };

      mockAgentsService.updateAgent.mockResolvedValue(mockResult);

      const result = await controller.updateAgent(agentId, dto, mockReq);

      expect(mockAgentsService.updateAgent).toHaveBeenCalledWith(agentId, companyId, dto);
      expect(result).toEqual(mockResult);
    });
  });
});
