import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ResetPasswordService,
  ResetTokenInvalidError,
  ResetTokenExpiredError,
  ResetTokenAlreadyUsedError,
  ResetPasswordValidationError,
} from '@multibotagents/core';
import type {
  UserRepository,
  VerifyTokenRepository,
} from '@multibotagents/db';
import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Servicio NestJS que envuelve la lógica de core para restablecimiento
 * de contraseña con token (reset password).
 *
 * Maneja la inyección de dependencias de NestJS, logging estructurado
 * y traducción de errores de dominio a excepciones HTTP.
 */
@Injectable()
export class ResetPasswordNestService {
  private readonly coreService: ResetPasswordService;
  private readonly logger = new Logger(ResetPasswordNestService.name);

  constructor(
    @Inject('USER_REPO') userRepository: UserRepository,
    @Inject('VERIFY_TOKEN_REPO') verifyTokenRepository: VerifyTokenRepository,
  ) {
    this.coreService = new ResetPasswordService({
      userRepository,
      verifyTokenRepository,
    });

    this.logger.log('ResetPasswordNestService initialized successfully');
  }

  /**
   * Ejecuta el flujo de restablecimiento de contraseña con token.
   *
   * @param token - Token de reset recibido por email
   * @param newPassword - Nueva contraseña deseada (ya sanitizada)
   * @throws {BadRequestException} Si el token es inválido/expirado/usado o la contraseña no cumple requisitos
   * @throws {InternalServerErrorException} Para errores inesperados
   */
  async execute(token: string, newPassword: string): Promise<void> {
    try {
      await this.coreService.execute(token, newPassword);
    } catch (error) {
      this.logError(error);
      throw this.translateError(error);
    }
  }

  /**
   * Registra el error en formato JSON estructurado.
   */
  private logError(error: unknown): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Error desconocido',
    };

    if (
      error instanceof ResetTokenInvalidError ||
      error instanceof ResetTokenExpiredError ||
      error instanceof ResetTokenAlreadyUsedError ||
      error instanceof ResetPasswordValidationError
    ) {
      this.logger.warn(errorLog);
    } else {
      this.logger.error(errorLog);
    }
  }

  /**
   * Traduce errores tipados de core a excepciones HTTP de NestJS.
   */
  private translateError(error: unknown): HttpException {
    if (error instanceof ResetTokenInvalidError) {
      return new BadRequestException({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof ResetTokenExpiredError) {
      return new BadRequestException({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof ResetTokenAlreadyUsedError) {
      return new BadRequestException({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof ResetPasswordValidationError) {
      const failedRules = error.validationResult.rules
        .filter((r) => !r.passed)
        .map((r) => r.rule);

      return new BadRequestException({
        error: error.message,
        code: error.code,
        failedRules,
      });
    }

    // Unknown errors → 500 without exposing internal details
    return new InternalServerErrorException({
      error: 'Error interno del servidor',
      code: 'SERVER_ERROR',
    });
  }
}
