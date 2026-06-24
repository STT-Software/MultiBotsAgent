import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import type { KnowledgeSource } from '@multibotagents/types';

import { KnowledgeService } from './knowledge.service';
import { UploadFileDto, CreateTextContentDto } from './dto';

/**
 * Interface local para el archivo subido vía Multer.
 * Se define aquí porque @types/multer no está instalado en el proyecto.
 */
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Controlador HTTP para la gestión de la base de conocimiento.
 * Expone endpoints para carga de archivos, creación de contenido textual,
 * eliminación, re-procesamiento y consulta de estado.
 *
 * Los errores de dominio (BadRequest, NotFound, PayloadTooLarge) son lanzados
 * por el servicio y propagados automáticamente por NestJS como respuestas HTTP.
 *
 * Valida: Requisitos 1.1–1.7, 2.1–2.5, 8.1–8.6, 9.1–9.4, 10.1–10.3
 */
@ApiTags('knowledge')
@Controller('knowledge')
export class KnowledgeController {
  private readonly logger = new Logger(KnowledgeController.name);

  constructor(private readonly knowledgeService: KnowledgeService) {}

  /**
   * Sube un archivo a la base de conocimiento de un agente.
   * Acepta multipart/form-data con el archivo y metadata asociada.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo a subir (PDF, TXT o MD) con metadata asociada.',
    schema: {
      type: 'object',
      required: ['file', 'agentId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo a subir (máximo 10 MB). Formatos: .pdf, .txt, .md',
        },
        agentId: {
          type: 'string',
          description: 'ID del agente al que se asocia el archivo.',
          example: '507f1f77bcf86cd799439011',
        },
        title: {
          type: 'string',
          description: 'Título descriptivo del documento (opcional).',
          example: 'Manual de usuario v2',
        },
        category: {
          type: 'string',
          description: 'Categoría del documento (opcional).',
          example: 'manuales',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Subir archivo a la base de conocimiento',
    description:
      'Sube un archivo (PDF, TXT o MD) asociado a un agente. ' +
      'El archivo se valida, almacena en S3 y se dispara el procesamiento asíncrono ' +
      '(extracción → chunking → embeddings → almacenamiento vectorial). ' +
      'Retorna inmediatamente el registro KnowledgeSource con estado "processing".',
  })
  @ApiResponse({
    status: 201,
    description: 'Archivo subido exitosamente. Procesamiento iniciado.',
  })
  @ApiResponse({
    status: 400,
    description: 'Formato no soportado o datos inválidos.',
  })
  @ApiResponse({
    status: 404,
    description: 'Agente no encontrado.',
  })
  @ApiResponse({
    status: 413,
    description: 'El archivo excede el tamaño máximo de 10 MB.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor.',
  })
  async uploadFile(
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadFileDto,
  ): Promise<KnowledgeSource> {
    this.logger.log('Solicitud de carga de archivo recibida', {
      agentId: dto.agentId,
      filename: file?.originalname,
      size: file?.size,
    });

    // TODO: Extraer companyId del contexto de autenticación cuando esté disponible.
    // Por ahora se usa un valor placeholder hasta integrar con el módulo de auth.
    const companyId = 'default-company';

    return this.knowledgeService.uploadFile(
      dto.agentId,
      companyId,
      file.buffer,
      file.originalname,
      { title: dto.title, category: dto.category },
    );
  }

  /**
   * Crea contenido textual directamente en la base de conocimiento.
   * Permite agregar información sin necesidad de subir un archivo.
   */
  @Post('text')
  @ApiOperation({
    summary: 'Crear contenido textual en la base de conocimiento',
    description:
      'Crea un registro de contenido textual asociado a un agente. ' +
      'El texto se almacena como archivo Markdown en S3 y se dispara el procesamiento asíncrono. ' +
      'Retorna inmediatamente el registro KnowledgeSource con estado "processing".',
  })
  @ApiResponse({
    status: 201,
    description: 'Contenido textual creado exitosamente. Procesamiento iniciado.',
  })
  @ApiResponse({
    status: 400,
    description: 'Contenido vacío o datos inválidos.',
  })
  @ApiResponse({
    status: 404,
    description: 'Agente no encontrado.',
  })
  @ApiResponse({
    status: 413,
    description: 'El contenido excede el tamaño máximo de 10 MB.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor.',
  })
  async createTextContent(
    @Body() dto: CreateTextContentDto,
  ): Promise<KnowledgeSource> {
    this.logger.log('Solicitud de creación de contenido textual recibida', {
      agentId: dto.agentId,
      title: dto.title,
    });

    // TODO: Extraer companyId del contexto de autenticación cuando esté disponible.
    const companyId = 'default-company';

    return this.knowledgeService.createTextContent(
      dto.agentId,
      companyId,
      dto.title,
      dto.content,
    );
  }

  /**
   * Elimina una fuente de conocimiento y todos sus recursos asociados.
   * Elimina fragmentos, archivo S3 y registro en MongoDB.
   */
  @Delete(':sourceId')
  @ApiOperation({
    summary: 'Eliminar fuente de conocimiento',
    description:
      'Elimina una fuente de conocimiento junto con todos sus fragmentos vectoriales ' +
      'y el archivo original en S3. La operación es irreversible.',
  })
  @ApiParam({
    name: 'sourceId',
    description: 'Identificador único de la fuente de conocimiento.',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Fuente eliminada exitosamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Fuente de conocimiento no encontrada.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor.',
  })
  async deleteSource(@Param('sourceId') sourceId: string): Promise<void> {
    this.logger.log('Solicitud de eliminación recibida', { sourceId });
    await this.knowledgeService.deleteSource(sourceId);
  }

  /**
   * Re-procesa una fuente de conocimiento existente.
   * Elimina fragmentos actuales y dispara un nuevo ciclo de indexación.
   */
  @Post(':sourceId/reprocess')
  @ApiOperation({
    summary: 'Re-procesar fuente de conocimiento',
    description:
      'Elimina los fragmentos existentes y re-ejecuta el pipeline de indexación ' +
      'completo (extracción → chunking → embeddings → almacenamiento) usando el archivo original en S3.',
  })
  @ApiParam({
    name: 'sourceId',
    description: 'Identificador único de la fuente de conocimiento a re-procesar.',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Re-procesamiento iniciado exitosamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Fuente de conocimiento no encontrada o sin archivo en S3.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor.',
  })
  async reprocessSource(
    @Param('sourceId') sourceId: string,
  ): Promise<KnowledgeSource> {
    this.logger.log('Solicitud de re-procesamiento recibida', { sourceId });
    return this.knowledgeService.reprocessSource(sourceId);
  }

  /**
   * Retorna todas las fuentes de conocimiento de un agente.
   */
  @Get('agent/:agentId')
  @ApiOperation({
    summary: 'Listar fuentes de conocimiento por agente',
    description:
      'Retorna todas las fuentes de conocimiento asociadas a un agente, ' +
      'incluyendo estado, progreso, cantidad de fragmentos y metadata.',
  })
  @ApiParam({
    name: 'agentId',
    description: 'Identificador del agente.',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de fuentes de conocimiento del agente.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor.',
  })
  async getSourcesByAgent(
    @Param('agentId') agentId: string,
  ): Promise<KnowledgeSource[]> {
    return this.knowledgeService.getSourcesByAgent(agentId);
  }

  /**
   * Retorna el estado de una fuente de conocimiento específica.
   * Incluye detección de timeout: si lleva > 5 min en "processing", se marca como "failed".
   */
  @Get(':sourceId')
  @ApiOperation({
    summary: 'Consultar estado de una fuente de conocimiento',
    description:
      'Retorna el estado actual de una fuente de conocimiento, incluyendo progreso ' +
      'del procesamiento y razón de error si aplica. Si la fuente lleva más de 5 minutos ' +
      'en estado "processing", se marca automáticamente como "failed" por timeout.',
  })
  @ApiParam({
    name: 'sourceId',
    description: 'Identificador único de la fuente de conocimiento.',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la fuente de conocimiento.',
  })
  @ApiResponse({
    status: 404,
    description: 'Fuente de conocimiento no encontrada.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor.',
  })
  async getSourceStatus(
    @Param('sourceId') sourceId: string,
  ): Promise<KnowledgeSource> {
    return this.knowledgeService.getSourceStatus(sourceId);
  }
}
