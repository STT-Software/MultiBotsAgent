/**
 * Property-Based Test para EmailWorkerService — Propiedad 11: Construcción de URL de verificación.
 *
 * Feature: email-verification, Property 11: Construcción de URL de verificación
 *
 * Para cualquier dominio de frontend válido y token de verificación de 64 caracteres hex,
 * la URL construida sigue exactamente el formato `{dominio}/verify-email?token={token}`
 * y tiene una longitud menor o igual a 2048 caracteres.
 *
 * **Validates: Requirements 9.5, 9.7**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { EmailQueueItem } from '@multibotagents/types';
import { EmailTemplate, EmailQueueStatus } from '@multibotagents/types';
import { EmailWorkerService } from '../email-worker.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Genera un dominio válido con protocolo https:// y un host alfanumérico (3-50 chars). */
const validDomainArb = fc
  .stringMatching(/^[a-z0-9]{3,50}$/)
  .map((host) => `https://${host}.com`);

/** Genera un token hex de exactamente 64 caracteres. */
const validTokenArb = fc.stringMatching(/^[0-9a-f]{64}$/);

/** Crea un EmailQueueItem mínimo con el token en el payload. */
function createEmailQueueItem(token: string, username?: string): EmailQueueItem {
  const payload: Record<string, unknown> = { token };
  if (username !== undefined) {
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

/** Crea una instancia mínima de EmailWorkerService con el dominio dado. */
function createWorkerService(frontendDomain: string): EmailWorkerService {
  return new EmailWorkerService({
    emailQueueRepository: {} as any,
    emailSender: {} as any,
    logger: { info: () => {}, error: () => {}, warn: () => {} },
    config: {
      batchSize: 50,
      retryDelays: [60000, 300000, 900000],
      maxRetries: 3,
      frontendDomain,
      stuckTimeoutMs: 5 * 60 * 1000,
      fromEmail: "test@example.com",
      fromName: "Test",
    },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Feature: email-verification, Property 11: Construcción de URL de verificación', () => {
  it('Para cualquier dominio válido y token hex de 64 chars, la URL sigue el formato {dominio}/verify-email?token={token}', () => {
    fc.assert(
      fc.property(validDomainArb, validTokenArb, (domain, token) => {
        const service = createWorkerService(domain);
        const item = createEmailQueueItem(token);

        const mergeFields = service.buildMergeFields(item);
        const url = mergeFields.verification_url;

        // La URL debe seguir exactamente el formato esperado
        const expectedUrl = `${domain}/verify-email?token=${token}`;
        expect(url).toBe(expectedUrl);
      }),
      { numRuns: 100 },
    );
  });

  it('Para cualquier dominio válido y token hex de 64 chars, la URL tiene longitud <= 2048', () => {
    fc.assert(
      fc.property(validDomainArb, validTokenArb, (domain, token) => {
        const service = createWorkerService(domain);
        const item = createEmailQueueItem(token);

        const mergeFields = service.buildMergeFields(item);
        const url = mergeFields.verification_url;

        // Con dominios razonables (max ~60 chars) + /verify-email?token= (20 chars) + token (64 chars)
        // la URL no debe exceder 2048 caracteres
        expect(url.length).toBeLessThanOrEqual(2048);
      }),
      { numRuns: 100 },
    );
  });
});
