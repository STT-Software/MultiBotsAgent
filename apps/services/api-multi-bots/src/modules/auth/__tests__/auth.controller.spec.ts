import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from '../auth.controller';
import { RegisterNestService } from '../register.service';
import {
  ValidationError,
  CaptchaError,
  DuplicateEmailError,
  ConcurrencyConflictError,
} from '@multibotagents/types';
import type { RegisterDto, RegisterResult } from '@multibotagents/types';

describe('AuthController', () => {
  let controller: AuthController;
  let registerService: { register: ReturnType<typeof vi.fn> };
  let mockResponse: {
    cookie: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };

  const validDto: RegisterDto = {
    companyName: 'Test Company',
    email: 'test@example.com',
    password: 'Password1',
    country: 'CO',
    category: 'sales' as any,
    size: '2-5' as any,
  };

  const successResult: RegisterResult = {
    accessToken: 'jwt-access-token',
    refreshToken: 'refresh-token-hex',
    user: { id: 'user-1', email: 'test@example.com', emailVerified: false },
    company: { id: 'company-1', name: 'Test Company' },
  };

  beforeEach(() => {
    registerService = { register: vi.fn() };
    controller = new AuthController(registerService as unknown as RegisterNestService);

    mockResponse = {
      cookie: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it('should return 201 with tokens and set cookie on success', async () => {
    registerService.register.mockResolvedValue(successResult);

    const result = await controller.register(validDto, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token-hex',
      {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/auth/refresh',
        maxAge: 604800000,
      },
    );
    expect(result).toEqual({
      accessToken: 'jwt-access-token',
      user: { id: 'user-1', email: 'test@example.com', emailVerified: false },
      company: { id: 'company-1', name: 'Test Company' },
    });
  });

  it('should return 409 on duplicate email', async () => {
    registerService.register.mockRejectedValue(
      new DuplicateEmailError('test@example.com'),
    );

    const result = await controller.register(validDto, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(result).toEqual({
      error: 'Ya existe una cuenta con este email. ¿Deseas iniciar sesión?',
    });
  });

  it('should return 403 on CAPTCHA failure', async () => {
    registerService.register.mockRejectedValue(new CaptchaError());

    const result = await controller.register(validDto, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(result).toEqual({
      error: 'El challenge de seguridad no fue superado. Intenta nuevamente.',
    });
  });

  it('should return 400 with field details on validation error', async () => {
    registerService.register.mockRejectedValue(
      new ValidationError({
        email: 'Formato de email inválido',
        password: 'Mínimo 8 caracteres',
      }),
    );

    const result = await controller.register(validDto, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(result).toEqual({
      error: 'Datos de registro inválidos',
      fields: {
        email: 'Formato de email inválido',
        password: 'Mínimo 8 caracteres',
      },
    });
  });

  it('should return 500 without internal details on unexpected error', async () => {
    registerService.register.mockRejectedValue(
      new Error('MongoDB connection failed: mongodb+srv://admin:secret@cluster.net'),
    );

    const result = await controller.register(validDto, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(result).toEqual({ error: 'Error interno del servidor' });
    // Should NOT expose internal details
    expect(JSON.stringify(result)).not.toContain('MongoDB');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('should return 409 on concurrency conflict', async () => {
    registerService.register.mockRejectedValue(new ConcurrencyConflictError());

    const result = await controller.register(validDto, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(result).toEqual({
      error: 'Ya existe una cuenta con este email',
    });
  });
});
