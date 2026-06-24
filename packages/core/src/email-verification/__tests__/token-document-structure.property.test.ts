/**
 * Property-Based Test para VerifyTokenRepository — Propiedad 2: Estructura del documento de token.
 *
 * Feature: email-verification, Property 2: Estructura del documento de token
 *
 * Verifica que para CUALQUIER userId válido y timestamp de creación,
 * cuando el sistema crea un token de verificación, el documento retornado
 * contiene: userId igual al proporcionado, type igual a `email_verification`,
 * token de 64 caracteres hex, expiresAt exactamente 24 horas después de createdAt,
 * y usedAt igual a null/undefined.
 *
 * **Validates: Requirements 1.2**
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { ObjectId } from 'mongodb';
import { VerifyTokenRepository } from '@multibotagents/db';
import { VerifyTokenType } from '@multibotagents/types';

describe('VerifyTokenRepository — Property Tests', () => {
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  it('Property 2: Estructura del documento de token — createForUser retorna documento con campos correctos, expiresAt = createdAt + 24h y usedAt = null/undefined', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generar un ObjectId válido como userId (24 hex chars)
        fc.stringMatching(/^[0-9a-f]{24}$/),
        // Generar un token hex de 64 caracteres (simula lo que TokenService genera)
        fc.stringMatching(/^[0-9a-f]{64}$/),
        async (userId, token) => {
          // Crear un ObjectId válido para el insertedId mock
          const mockInsertedId = new ObjectId();

          // Mock de la colección MongoDB
          const mockCollection = {
            insertOne: vi.fn().mockResolvedValue({ insertedId: mockInsertedId }),
          };

          // Mock del Db que retorna la colección
          const mockDb = {
            collection: vi.fn().mockReturnValue(mockCollection),
          };

          // Crear instancia del repositorio con el mock
          const repository = new VerifyTokenRepository(mockDb as any);

          // Ejecutar createForUser y verificar la estructura del documento retornado
          const result = await repository.createForUser(userId, VerifyTokenType.EMAIL_VERIFICATION, token);

          // 1. userId debe ser igual al proporcionado
          expect(result.userId).toBe(userId);

          // 2. type debe ser 'email_verification'
          expect(result.type).toBe('email_verification');

          // 3. token debe ser el mismo hex de 64 caracteres proporcionado
          expect(result.token).toBe(token);
          expect(result.token).toMatch(/^[0-9a-f]{64}$/);

          // 4. expiresAt debe ser exactamente 24 horas después de createdAt
          const createdAtMs = result.createdAt.getTime();
          const expiresAtMs = result.expiresAt.getTime();
          expect(expiresAtMs - createdAtMs).toBe(TWENTY_FOUR_HOURS_MS);

          // 5. usedAt debe ser null o undefined (token no usado)
          expect(result.usedAt == null).toBe(true);

          // 6. Verificar que createdAt es una fecha válida
          expect(result.createdAt).toBeInstanceOf(Date);
          expect(result.expiresAt).toBeInstanceOf(Date);

          // 7. Verificar que id está presente (del insertedId)
          expect(result.id).toBe(mockInsertedId.toHexString());
        }
      ),
      { numRuns: 100 }
    );
  });
});
