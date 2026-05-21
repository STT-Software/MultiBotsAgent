import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  InvalidCredentialsError,
  RateLimitExceededError,
  CompanyPendingDeletionError,
  CompanyInactiveError,
  SessionReplacedError,
  TokenExpiredError,
  AuthErrorCode,
} from '@multibotagents/types';

/**
 * Filtro de excepciones centralizado para el módulo de autenticación.
 * Mapea errores de dominio a respuestas HTTP consistentes con formato:
 * { error: { code, message } }
 *
 * También pasa a través las HttpException ya traducidas por los servicios
 * NestJS (e.g., BadRequestException de ResetPasswordNestService).
 */
@Catch()
export class AuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof InvalidCredentialsError) {
      response.status(401).json({
        error: {
          code: AuthErrorCode.INVALID_CREDENTIALS,
          message: exception.message,
        },
      });
      return;
    }

    if (exception instanceof RateLimitExceededError) {
      response
        .setHeader('Retry-After', String(exception.retryAfterSeconds))
        .status(429)
        .json({
          error: {
            code: AuthErrorCode.RATE_LIMIT_EXCEEDED,
            message: exception.message,
          },
        });
      return;
    }

    if (exception instanceof CompanyPendingDeletionError) {
      response.status(403).json({
        error: {
          code: AuthErrorCode.COMPANY_PENDING_DELETION,
          message: exception.message,
          deletionDate: exception.deletionDate.toISOString(),
        },
      });
      return;
    }

    if (exception instanceof CompanyInactiveError) {
      response.status(403).json({
        error: {
          code: AuthErrorCode.COMPANY_INACTIVE,
          message: exception.message,
        },
      });
      return;
    }

    if (exception instanceof SessionReplacedError) {
      response.status(401).json({
        error: {
          code: AuthErrorCode.SESSION_REPLACED,
          message: exception.message,
        },
      });
      return;
    }

    if (exception instanceof TokenExpiredError) {
      response.status(401).json({
        error: {
          code: AuthErrorCode.TOKEN_EXPIRED,
          message: exception.message,
        },
      });
      return;
    }

    // Pass through HttpExceptions already translated by NestJS services
    // (e.g., BadRequestException from ResetPasswordNestService.translateError)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(body);
      return;
    }

    // Unknown errors → 500 without exposing details
    this.logger.error(
      'Unexpected error in auth module',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(500).json({
      error: {
        code: AuthErrorCode.INTERNAL_ERROR,
        message: 'Error interno del servidor',
      },
    });
  }
}
