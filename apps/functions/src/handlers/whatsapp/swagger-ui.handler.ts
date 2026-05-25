import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";

/**
 * Lambda handler que sirve la interfaz Swagger UI para la documentación
 * del webhook de WhatsApp.
 *
 * - GET /webhooks/docs → Sirve la página HTML con Swagger UI (CDN)
 * - GET /webhooks/docs/spec → Sirve el archivo OpenAPI YAML inline
 *
 * No requiere autenticación. Es documentación pública del endpoint.
 */
export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const path = event.rawPath;

  if (path.endsWith("/spec")) {
    return serveSpec();
  }

  return serveSwaggerUI(event);
}

function serveSwaggerUI(
  event: APIGatewayProxyEventV2
): APIGatewayProxyResultV2 {
  const stage = event.requestContext?.stage;
  const basePath = stage && stage !== "$default" ? `/${stage}` : "";
  const specUrl = `${basePath}/webhooks/docs/spec`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MultiBotsAgent - WhatsApp Webhooks API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    #swagger-ui { max-width: 1200px; margin: 0 auto; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "${specUrl}",
      dom_id: "#swagger-ui",
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset
      ],
      layout: "BaseLayout",
      deepLinking: true,
    });
  </script>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  };
}

function serveSpec(): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/yaml",
      "Access-Control-Allow-Origin": "*",
    },
    body: OPENAPI_SPEC,
  };
}

/**
 * Especificación OpenAPI inline.
 * Fuente: docs/openapi/webhooks.yaml
 */
const OPENAPI_SPEC = `openapi: 3.0.3
info:
  title: MultiBotsAgent - WhatsApp Webhooks API
  version: 1.0.0
  description: |
    API de webhooks para la integración con WhatsApp Cloud API (Meta).
    Este documento describe el endpoint de verificación del webhook que Meta utiliza
    para confirmar la propiedad del endpoint al configurar o suscribir un WABA.
  contact:
    name: MultiBotsAgent Team

servers:
  - url: https://api.example.com
    description: Producción
  - url: https://api-dev.example.com
    description: Desarrollo

paths:
  /webhooks/whatsapp:
    get:
      operationId: verifyWhatsAppWebhook
      summary: Verificación de Webhook de WhatsApp
      description: |
        Endpoint de verificación utilizado por Meta para confirmar que el webhook está
        correctamente configurado. Meta envía una solicitud GET con un challenge token,
        y la plataforma debe responder con el valor del challenge para completar la verificación.
      tags:
        - WhatsApp Webhooks
      parameters:
        - name: hub.mode
          in: query
          required: true
          description: Modo de la solicitud. Meta siempre envía "subscribe" para verificación de webhooks.
          schema:
            type: string
            enum:
              - subscribe
          example: subscribe
        - name: hub.verify_token
          in: query
          required: true
          description: Token de verificación configurado en la app de Meta.
          schema:
            type: string
          example: my_secure_verify_token_123
        - name: hub.challenge
          in: query
          required: true
          description: Valor aleatorio generado por Meta que la plataforma debe devolver como body de la respuesta.
          schema:
            type: string
          example: "1158201444"
      responses:
        "200":
          description: Verificación exitosa. Se devuelve el valor del challenge en texto plano.
          content:
            text/plain:
              schema:
                type: string
              example: "1158201444"
        "400":
          description: Parámetros requeridos faltantes en la solicitud.
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                required:
                  - error
              example:
                error: "Missing required parameters"
        "403":
          description: Token de verificación inválido o hub.mode incorrecto.
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                required:
                  - error
              example:
                error: "Forbidden"
        "500":
          description: Error interno del servidor.
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                required:
                  - error
              example:
                error: "Internal server error"
`;
