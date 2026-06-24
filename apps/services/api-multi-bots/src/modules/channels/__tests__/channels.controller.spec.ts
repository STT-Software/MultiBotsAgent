import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ChannelsController } from '../channels.controller';
import { ObjectId } from 'mongodb';
import { ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('ChannelsController', () => {
  let controller: ChannelsController;
  let mockMongoDb: any;
  let mockCollection: any;
  let mockConnectWhatsAppService: any;
  let mockMongoClient: any;

  beforeEach(async () => {
    mockCollection = {
      findOne: vi.fn(),
    };
    mockMongoDb = {
      collection: vi.fn().mockReturnValue(mockCollection),
    };
    mockMongoClient = {
      db: vi.fn().mockReturnValue(mockMongoDb),
    };

    mockConnectWhatsAppService = {
      execute: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChannelsController],
      providers: [
        {
          provide: 'MONGO_CLIENT',
          useValue: mockMongoClient,
        },
        {
          provide: 'CONNECT_WHATSAPP_SERVICE',
          useValue: mockConnectWhatsAppService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: vi.fn(() => true) })
    .compile();

    controller = module.get<ChannelsController>(ChannelsController);
  });

  describe('connect', () => {
    const mockReq = {
      user: {
        companyId: new ObjectId().toHexString(),
      },
    } as unknown as Request;

    const mockDto = {
      agentId: new ObjectId().toHexString(),
      wabaId: '1234567890',
      phoneNumberId: '0987654321',
      tokenCode: 'AQBx...',
    };

    it('should connect whatsapp channel successfully', async () => {
      // Mock agent exists and belongs to company
      mockCollection.findOne.mockResolvedValue({ _id: new ObjectId(mockDto.agentId), companyId: new ObjectId((mockReq as any).user.companyId) });

      mockConnectWhatsAppService.execute.mockResolvedValue({
        channelId: 'channel-1',
        status: 'connected',
        phoneNumberId: mockDto.phoneNumberId,
        displayName: 'Test Channel',
      });

      const result = await controller.connect(mockDto, mockReq);

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: new ObjectId(mockDto.agentId),
        companyId: new ObjectId((mockReq as any).user.companyId as string),
      });

      expect(mockConnectWhatsAppService.execute).toHaveBeenCalledWith({
        agentId: mockDto.agentId,
        wabaId: mockDto.wabaId,
        phoneNumberId: mockDto.phoneNumberId,
        tokenCode: mockDto.tokenCode,
        companyId: (mockReq as any).user.companyId,
      });

      expect(result).toEqual({
        channelId: 'channel-1',
        status: 'connected',
        phoneNumberId: mockDto.phoneNumberId,
        displayName: 'Test Channel',
      });
    });

    it('should throw ForbiddenException if agentId does not belong to company', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      await expect(controller.connect(mockDto, mockReq)).rejects.toThrow(ForbiddenException);
      expect(mockConnectWhatsAppService.execute).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if agentId is not valid ObjectId', async () => {
      const invalidDto = { ...mockDto, agentId: 'invalid-id' };
      
      await expect(controller.connect(invalidDto, mockReq)).rejects.toThrow(ForbiddenException);
      expect(mockCollection.findOne).not.toHaveBeenCalled();
      expect(mockConnectWhatsAppService.execute).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    const mockReq = {
      user: {
        companyId: new ObjectId().toHexString(),
      },
    } as unknown as Request;

    it('should disconnect channel successfully', async () => {
      const channelId = new ObjectId().toHexString();
      const agentId = new ObjectId().toHexString();

      // Mock findOne para retornar primero el canal y luego el agente
      mockCollection.findOne
        .mockResolvedValueOnce({
          _id: new ObjectId(channelId),
          agentId: new ObjectId(agentId),
          companyId: new ObjectId((mockReq as any).user.companyId),
        })
        .mockResolvedValueOnce({
          _id: new ObjectId(agentId),
          companyId: new ObjectId((mockReq as any).user.companyId),
        });

      mockCollection.deleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });

      const result = await controller.disconnect(channelId, mockReq);

      expect(result).toEqual({ success: true });
      expect(mockCollection.findOne).toHaveBeenNthCalledWith(1, {
        _id: new ObjectId(channelId),
      });
      expect(mockCollection.findOne).toHaveBeenNthCalledWith(2, {
        _id: new ObjectId(agentId),
        companyId: new ObjectId((mockReq as any).user.companyId),
      });
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({
        _id: new ObjectId(channelId),
      });
    });

    it('should throw ForbiddenException if channel does not exist', async () => {
      const channelId = new ObjectId().toHexString();
      mockCollection.findOne.mockResolvedValue(null);

      await expect(controller.disconnect(channelId, mockReq)).rejects.toThrow(ForbiddenException);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(channelId) });
    });
  });
});
