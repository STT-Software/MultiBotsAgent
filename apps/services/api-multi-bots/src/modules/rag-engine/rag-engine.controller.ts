import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiParam } from "@nestjs/swagger";
import { RagEngineService } from "./rag-engine.service";
import { ProcessQueryDto } from "./dto/process-query.dto";
import { AgentNotFoundException, InvalidInputException } from "./exceptions/rag-engine.exceptions";
import type { RagProcessOutput } from "@multibotagents/types";

@ApiTags("RAG Engine")
@Controller("internal/agents")
export class RagEngineController {
  private readonly logger = new Logger(RagEngineController.name);

  constructor(private readonly ragEngineService: RagEngineService) {}

  @Post(":agentId/process")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Procesar consulta con el motor RAG (Interno)",
    description: `
Endpoint interno invocado por Lambdas (ej: WhatsApp incoming processor).
Recibe la consulta del usuario, ejecuta la búsqueda en base de conocimiento,
genera la respuesta con el LLM y la devuelve.
    `,
  })
  @ApiParam({
    name: "agentId",
    description: "ID del agente que procesará la consulta",
    example: "683da2f1e4b0a1c2d3e4f5a6",
  })
  @ApiBody({
    type: ProcessQueryDto,
  })
  @ApiResponse({
    status: 200,
    description: "Consulta procesada exitosamente. Retorna la respuesta generada por el RAG.",
    schema: {
      type: "object",
      properties: {
        conversationId: { type: "string", example: "whatsapp_+5491122334455" },
        messages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", example: "text" },
              content: { type: "string", example: "Nuestros planes van desde $10 USD al mes." },
            },
          },
        },
        escalated: { type: "boolean", example: false },
        escalationReason: { type: "string", example: "low_relevance" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Entrada inválida o parámetros incompletos." })
  @ApiResponse({ status: 404, description: "Agente no encontrado o inactivo." })
  @ApiResponse({ status: 500, description: "Error interno en el motor RAG." })
  async process(
    @Param("agentId") agentId: string,
    @Body() dto: ProcessQueryDto
  ): Promise<RagProcessOutput> {
    this.logger.log(`Received internal process request for agent ${agentId}`);

    try {
      return await this.ragEngineService.processQuery({
        agentId,
        conversationId: dto.conversationId,
        userMessage: dto.userMessage || "",
        timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
        channelId: dto.channelId,
        messageType: dto.messageType as any,
        mediaId: dto.mediaId,
        mimeType: dto.mimeType,
      });
    } catch (error: unknown) {
      this.logger.error(`Error processing RAG query for agentId=${agentId}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof AgentNotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof InvalidInputException) {
        throw new BadRequestException(error.message);
      }

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : "Internal RAG engine error"
      );
    }
  }
}
