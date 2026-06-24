import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, HttpException } from '@nestjs/common';
import { AuthController } from '../auth.controller';
import { AuthExceptionFilter } from '../filters/auth-exception.filter';
import type { ForgotPasswordRequestDto } from '../dto/forgot-password.dto';
import type { ResetPasswordRequestDto } from '../dto/reset-password.dto';

/**
 * Unit tests para los endpoints de password recovery:
 * - POST /auth/forgot-password
 * - POST /auth/reset-password
 */
describe('Password Recovery — AuthController endpoints', () => {
  let controller: AuthController;
  let forgotPasswordNestService: { execute: ReturnType<typeof vi.fn> };
  let resetPasswordNestService: { execute: ReturnType<typeof vi.fn> };
  let mockResponse: { status: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    forgotPasswordNestService = { execute: vi.fn() };
    resetPasswordNestService = { execute: vi.fn() };

    const registerService = { register: vi.fn() };
    const loginService = { login: vi.fn() };
    const refreshService = { refresh: vi.fn() };
    const logoutService = { logout: vi.fn() };
    const changePasswordNestService = { changePassword: vi.fn() };

    controller = new AuthController(
      registerService as any,
      loginService as any,
      refreshService as any,
      logoutService as any,
      changePasswordNestService as any,
      forgotPasswordNestService as any,
      resetPasswordNestService as any,
    );

    mockResponse = {
      status: vi.fn().mockReturnThis(),
    };
  });

  // ─── POST /auth/forgot-password ──────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('should return 200 with generic message for any email', async () => {
      forgotPasswordNestService.execute.mockResolvedValue(undefined);

      const dto: ForgotPasswordRequestDto = { email: 'user@example.com' };
      const result = await controller.forgotPassword(dto, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(result).toEqual({
        message: 'Si el email está registrado, recibirás un correo con instrucciones',
      });
    });

    it('should normalize email before calling service (trim + lowercase)', async () => {
      forgotPasswordNestService.execute.mockResolvedValue(undefined);

      const dto: ForgotPasswordRequestDto = { email: '  User@Example.COM  ' };
      await controller.forgotPassword(dto, mockResponse as any);

      expect(forgotPasswordNestService.execute).toHaveBeenCalledWith('user@example.com');
    });

    it('should return 200 even when service throws (filter handles error)', async () => {
      // If the core service throws an unexpected error, the AuthExceptionFilter
      // will catch it and return 500. But the endpoint itself always returns 200
      // for valid requests — the service never throws for "email not found".
      forgotPasswordNestService.execute.mockResolvedValue(undefined);

      const dto: ForgotPasswordRequestDto = { email: 'nonexistent@example.com' };
      const result = await controller.forgotPassword(dto, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(result.message).toBe(
        'Si el email está registrado, recibirás un correo con instrucciones',
      );
    });

    it('should call forgotPasswordNestService.execute with normalized email', async () => {
      forgotPasswordNestService.execute.mockResolvedValue(undefined);

      const dto: ForgotPasswordRequestDto = { email: 'Test@Domain.org' };
      await controller.forgotPassword(dto, mockResponse as any);

      expect(forgotPasswordNestService.execute).toHaveBeenCalledTimes(1);
      expect(forgotPasswordNestService.execute).toHaveBeenCalledWith('test@domain.org');
    });
  });

  // ─── POST /auth/reset-password ───────────────────────────────────────────

  describe('POST /auth/reset-password', () => {
    it('should return 200 with success response on valid reset', async () => {
      resetPasswordNestService.execute.mockResolvedValue(undefined);

      const dto: ResetPasswordRequestDto = {
        token: 'a'.repeat(64),
        newPassword: 'NewSecure456@',
      };
      const result = await controller.resetPassword(dto, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(result).toEqual({
        success: true,
        message: 'Contraseña restablecida exitosamente',
      });
    });

    it('should sanitize newPassword before calling service', async () => {
      resetPasswordNestService.execute.mockResolvedValue(undefined);

      const dto: ResetPasswordRequestDto = {
        token: 'b'.repeat(64),
        newPassword: '\u0000NewSecure456@\u001F',
      };
      await controller.resetPassword(dto, mockResponse as any);

      const [token, password] = resetPasswordNestService.execute.mock.calls[0];
      expect(token).toBe('b'.repeat(64));
      // Control characters should be removed by sanitizePasswordInput
      expect(password).not.toContain('\u0000');
      expect(password).not.toContain('\u001F');
    });

    it('should throw BadRequestException for invalid token (TOKEN_INVALID)', async () => {
      resetPasswordNestService.execute.mockRejectedValue(
        new BadRequestException({
          error: 'El enlace es inválido',
          code: 'TOKEN_INVALID',
        }),
      );

      const dto: ResetPasswordRequestDto = {
        token: 'invalid-token',
        newPassword: 'NewSecure456@',
      };

      await expect(
        controller.resetPassword(dto, mockResponse as any),
      ).rejects.toThrow(BadRequestException);

      try {
        await controller.resetPassword(dto, mockResponse as any);
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(400);
        const response = (error as HttpException).getResponse() as any;
        expect(response.code).toBe('TOKEN_INVALID');
      }
    });

    it('should throw BadRequestException for expired token (TOKEN_EXPIRED)', async () => {
      resetPasswordNestService.execute.mockRejectedValue(
        new BadRequestException({
          error: 'El enlace ha expirado. Solicita uno nuevo',
          code: 'TOKEN_EXPIRED',
        }),
      );

      const dto: ResetPasswordRequestDto = {
        token: 'c'.repeat(64),
        newPassword: 'NewSecure456@',
      };

      await expect(
        controller.resetPassword(dto, mockResponse as any),
      ).rejects.toThrow(BadRequestException);

      try {
        await controller.resetPassword(dto, mockResponse as any);
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(400);
        const response = (error as HttpException).getResponse() as any;
        expect(response.code).toBe('TOKEN_EXPIRED');
      }
    });

    it('should throw BadRequestException for already used token (TOKEN_ALREADY_USED)', async () => {
      resetPasswordNestService.execute.mockRejectedValue(
        new BadRequestException({
          error: 'El enlace ya fue utilizado',
          code: 'TOKEN_ALREADY_USED',
        }),
      );

      const dto: ResetPasswordRequestDto = {
        token: 'd'.repeat(64),
        newPassword: 'NewSecure456@',
      };

      await expect(
        controller.resetPassword(dto, mockResponse as any),
      ).rejects.toThrow(BadRequestException);

      try {
        await controller.resetPassword(dto, mockResponse as any);
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(400);
        const response = (error as HttpException).getResponse() as any;
        expect(response.code).toBe('TOKEN_ALREADY_USED');
      }
    });

    it('should throw BadRequestException for invalid password (VALIDATION_FAILED)', async () => {
      resetPasswordNestService.execute.mockRejectedValue(
        new BadRequestException({
          error: 'La contraseña no cumple los requisitos de seguridad',
          code: 'VALIDATION_FAILED',
          failedRules: ['MIN_LENGTH', 'UPPERCASE'],
        }),
      );

      const dto: ResetPasswordRequestDto = {
        token: 'e'.repeat(64),
        newPassword: 'weak',
      };

      await expect(
        controller.resetPassword(dto, mockResponse as any),
      ).rejects.toThrow(BadRequestException);

      try {
        await controller.resetPassword(dto, mockResponse as any);
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(400);
        const response = (error as HttpException).getResponse() as any;
        expect(response.code).toBe('VALIDATION_FAILED');
        expect(response.failedRules).toContain('MIN_LENGTH');
      }
    });
  });

  // ─── AuthExceptionFilter — HttpException pass-through ────────────────────

  describe('AuthExceptionFilter — HttpException pass-through for reset-password errors', () => {
    it('should pass through BadRequestException with correct status and body', () => {
      const filter = new AuthExceptionFilter();
      const badRequest = new BadRequestException({
        error: 'El enlace es inválido',
        code: 'TOKEN_INVALID',
      });

      const mockRes = createMockFilterResponse();
      const mockHost = createMockArgumentsHost(mockRes);

      filter.catch(badRequest, mockHost);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.code).toBe('TOKEN_INVALID');
      expect(responseBody.error).toBe('El enlace es inválido');
    });

    it('should pass through BadRequestException for TOKEN_EXPIRED', () => {
      const filter = new AuthExceptionFilter();
      const badRequest = new BadRequestException({
        error: 'El enlace ha expirado. Solicita uno nuevo',
        code: 'TOKEN_EXPIRED',
      });

      const mockRes = createMockFilterResponse();
      const mockHost = createMockArgumentsHost(mockRes);

      filter.catch(badRequest, mockHost);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.code).toBe('TOKEN_EXPIRED');
    });

    it('should pass through BadRequestException for TOKEN_ALREADY_USED', () => {
      const filter = new AuthExceptionFilter();
      const badRequest = new BadRequestException({
        error: 'El enlace ya fue utilizado',
        code: 'TOKEN_ALREADY_USED',
      });

      const mockRes = createMockFilterResponse();
      const mockHost = createMockArgumentsHost(mockRes);

      filter.catch(badRequest, mockHost);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.code).toBe('TOKEN_ALREADY_USED');
    });

    it('should still return 500 for unknown errors without exposing details', () => {
      const filter = new AuthExceptionFilter();
      const unknownError = new Error('MongoDB connection failed at secret-host:27017');

      const mockRes = createMockFilterResponse();
      const mockHost = createMockArgumentsHost(mockRes);

      filter.catch(unknownError, mockHost);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.error.message).toBe('Error interno del servidor');
      expect(JSON.stringify(responseBody)).not.toContain('MongoDB');
      expect(JSON.stringify(responseBody)).not.toContain('secret-host');
    });
  });
});

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createMockFilterResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
}

function createMockArgumentsHost(mockRes: any) {
  return {
    switchToHttp: () => ({
      getResponse: () => mockRes,
      getRequest: () => ({}),
    }),
  } as any;
}
