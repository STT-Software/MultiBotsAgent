/**
 * Property-Based Test para EmailQueueRepository — Propiedad 3: Estructura del documento de cola de email.
 *
 * Feature: email-verification, Property 3: Estructura del documento de cola de email
 *
 * Verifica que para CUALQUIER email válido y token de verificación,
 * cuando el sistema encola un email de verificación, el documento retornado
 * contiene: to igual al email proporcionado, template igual a `verification`,
 * payload con token y url, status igual a `pending`, attempts igual a 0,
 * y nextRetryAt igual a null/undefined.
 *
 * **Validates: Requirements 2.1**
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { ObjectId } from 'mongodb';
import { EmailQueueRepository } from '@multibotagents/db';

describe('Feature: email-verification, Property 3: Estructura del documento de cola de email', () => {
  it('Para cualquier email y token válidos, el documento encolado contiene: to=email, template=verification, payload con token y url, status=pending, attempts=0, nextRetryAt=null', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generar emails válidos arbitrarios
        fc.emailAddress(),
        // Generar tokens hex de 64 caracteres (simula crypto.randomBytes(32).toString('hex'))
        fc.stringMatching(/^[0-9a-f]{64}$/),
        async (email, token) => {
          // Crear un ObjectId predecible para el insertedId mock
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
          const repository = new EmailQueueRepository(mockDb as any);

          // Construir URL de verificación como lo haría el servicio
          const verificationUrl = `https://app.example.com/verify-email?token=${token}`;

          // Ejecutar enqueue con datos de email de verificación
          const result = await repository.enqueue({
            to: email,
            template: 'verification' as any,
            payload: {
              token,
              url: verificationUrl,
            },
          });

          // 1. `to` debe ser igual al email proporcionado
          expect(result.to).toBe(email);

          // 2. `template` debe ser 'verification'
          expect(result.template).toBe('verification');

          // 3. `payload` debe contener token y url
          expect(result.payload).toBeDefined();
          expect(result.payload.token).toBe(token);
          expect(result.payload.url).toBe(verificationUrl);

          // 4. `status` debe ser 'pending'
          expect(result.status).toBe('pending');

          // 5. `attempts` debe ser 0
          expect(result.attempts).toBe(0);

          // 6. `nextRetryAt` debe ser null o undefined
          expect(result.nextRetryAt == null).toBe(true);

          // 7. Verificar que id está presente (del insertedId)
          expect(result.id).toBe(mockInsertedId.toHexString());

          // 8. Verificar que timestamps están presentes
          expect(result.createdAt).toBeInstanceOf(Date);
          expect(result.updatedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });
});
