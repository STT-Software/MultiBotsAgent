import { ArgumentsHost, BadRequestException, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

/**
 * Filtro global que normaliza los errores de parsing del body (JSON malformado)
 * al formato de dominio `{ error: { code, message } }`.
 *
 * ## Contexto (OBS-01)
 * Cuando el body-parser de Express recibe un JSON inválido, NestJS lo convierte
 * en un `BadRequestException` con el cuerpo nativo `{ statusCode, message, error }`.
 * Ese error se lanza ANTES de que NestJS resuelva el controlador, por lo que NO
 * lo capturan los filtros a nivel de método/clase (`@UseFilters`) — solo un filtro
 * global registrado en el bootstrap llega a verlo.
 *
 * Este filtro detecta específicamente el error de parsing (por el patrón del mensaje
 * que produce `JSON.parse`) y lo reformatea. Cualquier otra excepción se delega al
 * comportamiento por defecto de NestJS vía `super.catch`, de modo que NO se altera
 * el formato de error del resto de endpoints/módulos.
 */
const JSON_PARSE_PATTERNS = [
  'Unexpected token',
  'Unexpected end of JSON',
  'Expected property name',
  'in JSON at position',
  'is not valid JSON',
  'Unexpected non-whitespace',
  'Unterminated string in JSON',
];

@Catch()
export class JsonParseExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (this.isJsonParseError(exception)) {
      const response = host.switchToHttp().getResponse<Response>();
      response.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'El cuerpo de la petición no es un JSON válido.',
        },
      });
      return;
    }

    super.catch(exception, host);
  }

  /**
   * Identifica el `BadRequestException` originado por un body JSON malformado.
   * Los errores de validación (class-validator) traen `message` como array, por lo
   * que quedan excluidos; solo aplica cuando el mensaje es un string de parsing.
   */
  private isJsonParseError(exception: unknown): boolean {
    if (!(exception instanceof BadRequestException)) {
      return false;
    }

    const res = exception.getResponse();
    const message =
      typeof res === 'string'
        ? res
        : typeof res === 'object' && res !== null && 'message' in res
          ? (res as { message: unknown }).message
          : undefined;

    if (typeof message !== 'string') {
      return false;
    }

    return JSON_PARSE_PATTERNS.some((pattern) => message.includes(pattern));
  }
}
