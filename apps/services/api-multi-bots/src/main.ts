import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Swagger / OpenAPI Configuration ─────────────────────────────────────

  const config = new DocumentBuilder()
    .setTitle('MultiBotAgents API')
    .setDescription(
      `
## Descripción

API REST para la plataforma **MultiBotAgents** — sistema multiagente gestionado por WhatsApp para automatizar operaciones empresariales (RAG, cotización, agendamiento).

## Autenticación

La API usa **JWT Bearer tokens** para autenticación:
- El **Access Token** (30 min) se envía en el header \`Authorization: Bearer <token>\`
- El **Refresh Token** (7 días) se maneja como cookie httpOnly en \`/auth/refresh\`

## Entornos

| Entorno | URL |
|---------|-----|
| Desarrollo local | \`http://localhost:3001\` |
| Stage dev | Configurado por SST |
| Producción | Configurado por SST |

## Convenciones

- Todos los endpoints retornan JSON
- Los errores siguen el formato \`{ error: string, fields?: Record<string, string> }\`
- Los timestamps usan formato ISO 8601
- Los IDs son ObjectId de MongoDB (24 caracteres hex)
      `.trim(),
    )
    .setVersion('1.0.0')
    .setContact(
      'STT Software',
      'https://github.com/STT-Software',
      'dev@stt-software.com',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access Token JWT obtenido del endpoint POST /auth/register o POST /auth/login',
      },
      'access-token',
    )
    .addCookieAuth(
      'refreshToken',
      {
        type: 'apiKey',
        in: 'cookie',
        description: 'Refresh Token httpOnly cookie (7 días). Se setea automáticamente en registro/login.',
      },
    )
    .addTag('Auth', 'Endpoints de autenticación: registro, login, refresh, logout')
    .addServer('http://localhost:3001', 'Desarrollo local')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'MultiBotAgents API — Docs',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
  });

  // ─── Start Server ────────────────────────────────────────────────────────

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 MultiBotAgents API running on port ${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
