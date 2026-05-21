/**
 * Property-Based Test para EmailWorkerService — Propiedad 12: Email de envío incluye merge fields requeridos.
 *
 * Feature: email-verification, Property 12: Email de envío incluye merge fields requeridos
 *
 * Para cualquier documento de la cola con template `verification`, cuando el worker construye
 * la solicitud de envío a Elastic Email, el payload incluye las variables merge: `username`
 * (string no vacío) y `verification_url` (URL válida con formato correcto). Si el payload
 * no contiene nombre de usuario, usa "Usuario" como fallback.
 *
 * **Validates: Requirements 9.4, 9.6, 10.2**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { EmailQueueItem } from '@multibotagents/types';
import { EmailTemplate, EmailQueueStatus } from '@multibotagents/types';
import { EmailWorkerService } from '../email-worker.service';

// ─── Constants ───────────────────────────────────────────────────────────────

const FRONTEND_DOMAIN = 'https://app.example.com';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Genera un token hex de exactamente 64 caracteres (fast-check v4 API). */
const validTokenArb = fc.string({
  minLength: 64,
  maxLength: 64,
  unit: fc.constantFrom(...'0123456789abcdef'.split('')),
});

/** Genera un username no vacío (alfanumérico con espacios). */
const nonEmptyUsernameArb = fc
  .string({
    minLength: 1,
    maxLength: 100,
    unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')),
  })
  .filter((s) => s.trim().length > 0);

/** Genera un username vacío o nulo/undefined. */
const emptyUsernameArb = fc.constantFrom('', null, undefined);

/** Crea un EmailQueueItem con template verification y payload configurable. */
function createEmailQueueItem(
  token: string,
  username?: string | null,
): EmailQueueItem {
  const payload: Record<string, unknown> = { token };
  if (username !== undefined && username !== null) {
    payload.username = username;
  }
  return {
    id: 'test-id',
    to: 'user@example.com',
    template: EmailTemplate.VERIFICATION,
    payload,
    status: EmailQueueStatus.PENDING,
    attempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Crea una instancia de EmailWorkerService con configuración de test. */
function createWorkerService(): EmailWorkerService {
  return new EmailWorkerService({
    emailQueueRepository: {} as any,
    emailSender: {} as any,
    logger: { info: () => {}, error: () => {}, warn: () => {} },
    config: {
      frontendDomain: FRONTEND_DOMAIN,
      batchSize: 50,
      retryDelays: [60000, 300000, 900000],
      maxRetries: 3,
      stuckTimeoutMs: 300000,
      fromEmail: "test@example.com",
      fromName: "Test",
    },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EmailWorkerService — Property 12: Email de envío incluye merge fields requeridos', () => {
  const service = createWorkerService();

  it('Property A: Para cualquier item con username no vacío, merge fields contiene ese username', () => {
    fc.assert(
      fc.property(validTokenArb, nonEmptyUsernameArb, (token, username) => {
        const item = createEmailQueueItem(token, username);
        const mergeFields = service.buildMergeFields(item);

        // El merge field username debe ser exactamente el proporcionado
        expect(mergeFields.username).toBe(username);
        // Debe ser no vacío
        expect(mergeFields.username.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('Property B: Para cualquier item con username vacío/null/undefined, merge fields usa "Usuario" como fallback', () => {
    fc.assert(
      fc.property(validTokenArb, emptyUsernameArb, (token, username) => {
        const item = createEmailQueueItem(token, username);
        const mergeFields = service.buildMergeFields(item);

        // Debe usar el fallback "Usuario"
        expect(mergeFields.username).toBe('Usuario');
      }),
      { numRuns: 100 },
    );
  });

  it('Property C: Para cualquier item, verification_url sigue el formato {frontendDomain}/verify-email?token={token} y es no vacío', () => {
    fc.assert(
      fc.property(validTokenArb, (token) => {
        const item = createEmailQueueItem(token, 'TestUser');
        const mergeFields = service.buildMergeFields(item);

        const url = mergeFields.verification_url;

        // Debe ser no vacío
        expect(url.length).toBeGreaterThan(0);

        // Debe seguir el formato exacto
        const expectedUrl = `${FRONTEND_DOMAIN}/verify-email?token=${token}`;
        expect(url).toBe(expectedUrl);

        // Verificar que comienza con el dominio del frontend
        expect(url.startsWith(FRONTEND_DOMAIN)).toBe(true);

        // Verificar que contiene el path y token correctos
        expect(url).toContain('/verify-email?token=');
        expect(url.endsWith(token)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
