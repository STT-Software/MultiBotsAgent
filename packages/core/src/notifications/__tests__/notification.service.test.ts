import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../notification.service';
import { EmailTemplate } from '@multibotagents/types';
import type { IEmailQueueRepository, IUserRepository } from '../notification.service';
import type { INotificationsWsEmitter } from '../ports/notifications-ws-emitter.interface';

describe('NotificationService', () => {
  let emailQueueRepository: IEmailQueueRepository;
  let userRepository: IUserRepository;
  let wsEmitter: INotificationsWsEmitter;
  let service: NotificationService;

  beforeEach(() => {
    emailQueueRepository = {
      enqueue: vi.fn().mockResolvedValue({ id: 'email-id-123' }),
    };

    userRepository = {
      findOperatorsByCompany: vi.fn().mockResolvedValue([
        { email: 'operador1@empresa.com' },
        { email: 'operador2@empresa.com' },
      ]),
    };

    wsEmitter = {
      emitirAlerta: vi.fn(),
    };

    service = new NotificationService({
      emailQueueRepository,
      userRepository,
      wsEmitter,
      frontendDomain: 'http://localhost:3000',
    });
  });

  it('debería emitir alerta por WebSocket y encolar correos para los operadores al notificar escalamiento', async () => {
    const params = {
      companyId: 'company-123',
      conversationId: 'whatsapp_123456789',
      agentName: 'Asistente RAG',
      reason: 'El cliente solicitó hablar con un asesor.',
    };

    await service.notificarEscalamiento(params);

    // 1. Verificar WebSocket emit
    expect(wsEmitter.emitirAlerta).toHaveBeenCalledWith(
      'company-123',
      'notification.new',
      expect.objectContaining({
        conversationId: 'whatsapp_123456789',
        agentName: 'Asistente RAG',
        reason: 'El cliente solicitó hablar con un asesor.',
        timestamp: expect.any(String),
      })
    );

    // 2. Verificar consulta de operadores
    expect(userRepository.findOperatorsByCompany).toHaveBeenCalledWith('company-123');

    // 3. Verificar encolado de emails
    expect(emailQueueRepository.enqueue).toHaveBeenCalledTimes(2);
    expect(emailQueueRepository.enqueue).toHaveBeenNthCalledWith(1, {
      to: 'operador1@empresa.com',
      template: EmailTemplate.ESCALATION_ALERT,
      payload: expect.objectContaining({
        username: 'operador1',
        conversationId: 'whatsapp_123456789',
        agentName: 'Asistente RAG',
        reason: 'El cliente solicitó hablar con un asesor.',
        url: 'http://localhost:3000/inbox?conversationId=whatsapp_123456789',
      }),
    });
  });

  it('debería degradarse de manera silenciosa si la cola de email o usuarios falla', async () => {
    const params = {
      companyId: 'company-123',
      conversationId: 'whatsapp_123456789',
      agentName: 'Asistente RAG',
      reason: 'El cliente solicitó hablar con un asesor.',
    };

    // Hacer que el repositorio de usuarios falle
    userRepository.findOperatorsByCompany = vi.fn().mockRejectedValue(new Error('DB Error'));

    // No debería propagar el error y fallar la llamada para no interrumpir el flujo principal del bot
    await expect(service.notificarEscalamiento(params)).resolves.not.toThrow();

    // Sin embargo, sí debió haber notificado por WebSocket
    expect(wsEmitter.emitirAlerta).toHaveBeenCalledTimes(1);
    expect(emailQueueRepository.enqueue).not.toHaveBeenCalled();
  });
});
