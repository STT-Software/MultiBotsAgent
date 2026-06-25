import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Controller,
  Post,
  Body,
  Module,
  BadRequestException,
} from '@nestjs/common';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { JsonParseExceptionFilter } from '../json-parse-exception.filter';

@Controller('t')
class ProbeController {
  @Post('echo')
  echo(@Body() body: unknown) {
    return { ok: true, body };
  }

  // BadRequestException de dominio normal → debe pasar intacto (no daño colateral)
  @Post('normal-400')
  normal400() {
    throw new BadRequestException('Algún error de negocio');
  }

  // BadRequestException con message tipo array → debe pasar intacto
  // (simula el shape de un error de class-validator sin depender del ValidationPipe)
  @Post('array-400')
  array400() {
    throw new BadRequestException(['name must be a string', 'name should not be empty']);
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('JsonParseExceptionFilter (OBS-01)', () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    app = await NestFactory.create(ProbeModule, { logger: false });
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new JsonParseExceptionFilter(httpAdapterHost.httpAdapter));
    await app.listen(0);
    url = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reformatea el body JSON malformado al formato de dominio { error: { code, message } }', async () => {
    const res = await fetch(`${url}/t/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ esto no es json',
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'El cuerpo de la petición no es un JSON válido.',
      },
    });
    // No debe filtrar el formato nativo de NestJS
    expect(json).not.toHaveProperty('statusCode');
    expect(json).not.toHaveProperty('message');
  });

  it('NO altera un BadRequestException de dominio normal (sin daño colateral)', async () => {
    const res = await fetch(`${url}/t/normal-400`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    // Formato nativo NestJS preservado
    expect(json).toMatchObject({
      statusCode: 400,
      message: 'Algún error de negocio',
      error: 'Bad Request',
    });
  });

  it('NO altera un BadRequestException con message tipo array (estilo class-validator)', async () => {
    const res = await fetch(`${url}/t/array-400`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as { statusCode: number; message: unknown };
    // Formato nativo NestJS preservado, message sigue siendo array
    expect(json).toHaveProperty('statusCode', 400);
    expect(Array.isArray(json.message)).toBe(true);
  });
});
