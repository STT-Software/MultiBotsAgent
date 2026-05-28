import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logLevels: any[] = ['log', 'error', 'warn'];
  if (
    process.env.LOG_LEVEL === 'debug' ||
    process.env.STAGE === 'dev' ||
    process.env.NODE_ENV !== 'production'
  ) {
    logLevels.push('debug', 'verbose');
  }

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });

  // ─── CORS ────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_DOMAIN || 'http://localhost:3000',
    credentials: true,
  });

  // ─── Swagger / OpenAPI Configuration ─────────────────────────────────────

  const config = new DocumentBuilder()
    .setTitle('MultiBotAgents API')
    .setDescription(
      `
## Descripción

API REST para la plataforma **MultiBotAgents** — sistema multiagente gestionado por WhatsApp para automatizar operaciones empresariales (RAG, cotización, agendamiento).

## Autenticación

La API usa **JWT Bearer tokens** (HS256) con refresh token rotativo:
- El **Access Token** (30 min) se envía en el header \`Authorization: Bearer <token>\`
- El **Refresh Token** (7 días) se maneja como cookie \`httpOnly; Secure; SameSite=Strict\` en \`/auth/refresh\`

## Rate Limiting

El endpoint de login aplica rate limiting:
- **Por IP**: 5 intentos fallidos/minuto → bloqueo 5 minutos
- **Por email**: 10 intentos fallidos/10 minutos → bloqueo 15 minutos

## Sesión Única

Solo se permite una sesión activa por usuario. Al iniciar sesión en un nuevo dispositivo, la sesión anterior se invalida automáticamente.

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
        description: 'Access Token JWT (HS256, 30 min). Obtenido de POST /auth/register o POST /auth/login',
      },
      'access-token',
    )
    .addCookieAuth(
      'refreshToken',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'Refresh Token httpOnly cookie (7 días). Se setea automáticamente en registro/login.',
      },
    )
    .addTag('Auth', 'Registro, login, refresh y logout de usuarios')
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
