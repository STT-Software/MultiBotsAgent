import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import type { CreateExampleDto } from "@multibotagents/types";
import { validateCreateExample } from "@multibotagents/core";
import { parseBody, successResponse, errorResponse } from "../../shared/error-handler";
import { logger } from "../../shared/logger";

/**
 * Handler de ejemplo — Crear un recurso.
 * TypeScript nativo, sin framework. SST apunta a este archivo como entry point.
 *
 * En infra/src/apis/: handler: "apps/functions/src/handlers/example/create.handler"
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const dto = parseBody<CreateExampleDto>(event.body ?? null);

    const errors = validateCreateExample(dto);
    if (errors.length > 0) {
      return errorResponse(errors.join(", "), 400);
    }

    logger.info("Creando recurso de ejemplo", { dto });

    // TODO: Usar Repository<T> para persistir en BD
    const created = {
      id: crypto.randomUUID(),
      ...dto,
      createdAt: new Date().toISOString(),
    };

    return successResponse(created, 201);
  } catch (error) {
    logger.error("Error creando recurso", error);
    return errorResponse("Error interno del servidor", 500);
  }
};
