import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  CompanyNotFoundError,
  InvalidProfileDataError,
  InvalidContentTypeError,
  LogoUploadError,
  CompanyProfileErrorCode,
} from '@multibotagents/core';

/**
 * Filtro de excepciones centralizado para el módulo de perfil de empresa.
 * Mapea errores de dominio a respuestas HTTP consistentes con formato:
 * { error: { code, message, fields? } }
 */
@Catch()
export class CompanyProfileExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CompanyProfileExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(body);
      return;
    }

    if (exception instanceof CompanyNotFoundError) {
      response.status(404).json({
        error: {
          code: CompanyProfileErrorCode.COMPANY_NOT_FOUND,
          message: exception.message,
        },
      });
      return;
    }

    if (exception instanceof InvalidProfileDataError) {
      response.status(400).json({
        error: {
          code: CompanyProfileErrorCode.INVALID_PROFILE_DATA,
          message: exception.message,
          fields: exception.fields,
        },
      });
      return;
    }

    if (exception instanceof InvalidContentTypeError) {
      response.status(400).json({
        error: {
          code: CompanyProfileErrorCode.INVALID_CONTENT_TYPE,
          message: exception.message,
        },
      });
      return;
    }

    if (exception instanceof LogoUploadError) {
      response.status(500).json({
        error: {
          code: CompanyProfileErrorCode.LOGO_UPLOAD_ERROR,
          message: exception.message,
        },
      });
      return;
    }

    // Unknown errors → 500 without exposing details
    this.logger.error(
      'Unexpected error in company-profile module',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
      },
    });
  }
}
