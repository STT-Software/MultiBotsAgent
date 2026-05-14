import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ChangePasswordService,
  PasswordService,
} from '@multibotagents/core';
import type {
  IChangePasswordUserRepository,
  ChangePasswordUser,
} from '@multibotagents/core';
import type { UserRepository, RateLimitRepository } from '@multibotagents/db';
import {
  InvalidCurrentPasswordError,
  SameAsCurrentError,
  PasswordValidationError,
  UserNotFoundError,
  RateLimitExceededError,
  ChangePasswordError,
} from '@multibotagents/core';
import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Adaptador que envuelve UserRepository para cumplir con la interfaz
 * IChangePasswordUserRepository requerida por el servicio de core.
 */
class ChangePasswordUserAdapter implements IChangePasswordUserRepository {
  constructor(private readonly repo: UserRepository) {}

  async findById(userId: string): Promise<ChangePasswordUser | null> {
    const user = await this.repo.findById(userId);
    if (!user) return null;
    return { id: user.id, passwordHash: user.passwordHash };
  }

  async updatePasswordHash(userId: string, newHash: string): Promise<boolean> {
    return this.repo.updatePasswordHash(userId, newHash);
  }
}

/**
 * Servicio NestJS que envuelve la lógica de core para cambio de contraseña.
 * Maneja la inyección de dependencias de NestJS, logging estructurado
 * y traducción de errores de dominio a excepciones HTTP.
 */
@Injectable()
export class ChangePasswordNestService {
  private readonly coreService: ChangePasswordService;
  private readonly logger = new Logger(ChangePasswordNestService.name);

  constructor(
    @Inject('USER_REPO') userRepository: UserRepository,
    @Inject('RATE_LIMIT_REPO') rateLimitRepository: RateLimitRepository,
  ) {
    const passwordService = new PasswordService();
    const userAdapter = new ChangePasswordUserAdapter(userRepository);

    this.coreService = new ChangePasswordService({
      userRepository: userAdapter,
      passwordService,
      rateLimitRepository,
    });

    this.logger.log('ChangePasswordService initialized successfully');
  }

  /**
   * Ejecuta el flujo de cambio de contraseña.
   *
   * @param userId - ID del usuario autenticado (extraído del JWT)
   * @param currentPassword - Contraseña actual proporcionada
   * @param newPassword - Nueva contraseña deseada
   * @throws {BadRequestException} Si la contraseña actual es incorrecta, la nueva no cumple requisitos, o es igual a la actual
   * @throws {HttpException} Con status 429 si se excedió el rate limit
   * @throws {InternalServerErrorException} Para errores inesperados
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    try {
      await this.coreService.execute(userId, currentPassword, newPassword);
    } catch (error) {
      this.logError(userId, error);
      throw this.translateError(error);
    }
  }

  /**
   * Registra el error en formato JSON estructurado.
   * Nunca incluye contraseñas en texto plano.
   */
  private logError(userId: string, error: unknown): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      userId,
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Error desconocido',
    };

    if (error instanceof ChangePasswordError && error.statusCode < 500) {
      this.logger.warn(errorLog);
    } else {
      this.logger.error(errorLog);
    }
  }

  /**
   * Traduce errores tipados de core a excepciones HTTP de NestJS.
   */
  private translateError(error: unknown): HttpException {
    if (error instanceof InvalidCurrentPasswordError) {
      return new BadRequestException({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof SameAsCurrentError) {
      return new BadRequestException({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof PasswordValidationError) {
      const failedRules = error.validationResult.rules
        .filter((r) => !r.passed)
        .map((r) => r.rule);

      return new BadRequestException({
        error: error.message,
        code: error.code,
        failedRules,
      });
    }

    if (error instanceof UserNotFoundError) {
      return new BadRequestException({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof RateLimitExceededError) {
      return new HttpException(
        {
          error: error.message,
          code: error.code,
          retryAfterSeconds: error.retryAfterSeconds,
        },
        429,
      );
    }

    // Unknown errors → 500 without exposing internal details
    return new InternalServerErrorException({
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR',
    });
  }
}
