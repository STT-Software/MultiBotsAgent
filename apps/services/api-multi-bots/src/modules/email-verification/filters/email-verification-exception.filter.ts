import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  TokenInvalidError,
  TokenExpiredError,
  TokenAlreadyUsedError,
  AlreadyVerifiedError,
  ResendCooldownError,
} from '@multibotagents/core/email-verification';
import { EmailVerificationErrorCode } from '@multibotagents/types';

/**
 * Filtro de excepciones para el módulo de email-verification.
 * Mapea errores de dominio a respuestas HTTP consistentes.
 *
 * Validates: Requirements 4.5, 4.6, 4.7, 4.8, 5.6
 */
@Catch()
export class EmailVerificationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(EmailVerificationExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof TokenInvalidError) {
      response.status(400).json({
        error: EmailVerificationErrorCode.TOKEN_INVALID,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof TokenAlreadyUsedError) {
      response.status(400).json({
        error: EmailVerificationErrorCode.TOKEN_ALREADY_USED,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof TokenExpiredError) {
      response.status(400).json({
        error: EmailVerificationErrorCode.TOKEN_EXPIRED,
        message: 'El link expiró',
        userId: exception.userId,
      });
      return;
    }

    if (exception instanceof AlreadyVerifiedError) {
      response.status(400).json({
        error: EmailVerificationErrorCode.ALREADY_VERIFIED,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof ResendCooldownError) {
      response
        .setHeader('Retry-After', String(exception.retryAfterSeconds))
        .status(429)
        .json({
          error: EmailVerificationErrorCode.RESEND_COOLDOWN,
          message: exception.message,
          retryAfter: exception.retryAfterSeconds,
        });
      return;
    }

    // Unknown errors → 500 without exposing details
    this.logger.error(
      'Unexpected error in email-verification module',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    });
  }
}
