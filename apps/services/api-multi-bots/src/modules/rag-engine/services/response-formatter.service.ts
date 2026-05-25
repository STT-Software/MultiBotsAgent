import { Injectable } from '@nestjs/common';
import { ResponseMessage, ResponseType } from '@multibotagents/types';

/**
 * Servicio de formateo de respuesta del LLM.
 * Formatea la respuesta cruda del LLM como array de ResponseMessage
 * y aplica truncamiento por maxResponseLength.
 *
 * Valida: Requisitos 6.2, 6.4
 */
@Injectable()
export class ResponseFormatterService {
  /**
   * Formatea la respuesta del LLM en un array de ResponseMessage.
   * Aplica truncamiento si el contenido excede maxResponseLength.
   *
   * @param content - Contenido crudo de la respuesta del LLM
   * @param maxResponseLength - Longitud máxima permitida para el contenido
   * @returns Array de ResponseMessage formateados
   */
  format(content: string, maxResponseLength: number): ResponseMessage[] {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const truncatedContent =
      content.length > maxResponseLength
        ? content.substring(0, maxResponseLength)
        : content;

    return [{ type: ResponseType.TEXT, content: truncatedContent }];
  }
}
