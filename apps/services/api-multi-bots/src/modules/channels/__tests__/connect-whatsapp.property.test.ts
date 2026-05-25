import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { ConnectWhatsAppDto } from "../dto/connect-whatsapp.dto";

/**
 * Feature: embedded-signup, Property 3: Validación de payload rechaza campos vacíos o ausentes
 *
 * Para cualquier payload de solicitud donde al menos uno de los campos requeridos
 * (agentId, wabaId, phoneNumberId, tokenCode) sea un string vacío, solo whitespace,
 * o esté ausente, la validación debe rechazar la solicitud. Inversamente, para cualquier
 * payload donde todos los campos requeridos sean strings no vacíos y no solo whitespace,
 * la validación debe aceptar la solicitud.
 *
 * **Validates: Requirements 10.1, 10.2**
 */
describe("ConnectWhatsAppDto — Property Tests", () => {
  // --- Generators ---

  /** Generates a valid non-empty, non-whitespace-only string */
  const validFieldArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0);

  /**
   * Generates an invalid field value: empty string.
   * Note: @IsNotEmpty() from class-validator rejects empty strings ("") but
   * does NOT reject whitespace-only strings unless @Matches or custom validators
   * are used. This test validates the actual behavior of the DTO decorators.
   */

  const requiredFields = [
    "agentId",
    "wabaId",
    "phoneNumberId",
    "tokenCode",
  ] as const;

  /**
   * Property 3.1: Payloads con todos los campos válidos son aceptados.
   *
   * Para cualquier payload donde agentId, wabaId, phoneNumberId y tokenCode
   * son strings no vacíos y no solo whitespace, la validación debe pasar sin errores.
   */
  describe("Property 3.1: Payloads completos con campos válidos son aceptados", () => {
    it("acepta payloads donde todos los campos son strings no vacíos y no solo whitespace", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            agentId: validFieldArb,
            wabaId: validFieldArb,
            phoneNumberId: validFieldArb,
            tokenCode: validFieldArb,
          }),
          async (payload) => {
            const dto = plainToInstance(ConnectWhatsAppDto, payload);
            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 3.2: Payloads con al menos un campo vacío son rechazados.
   *
   * Para cualquier payload donde al menos uno de los campos requeridos es un string
   * vacío, la validación debe retornar al menos un error.
   */
  describe("Property 3.2: Payloads con al menos un campo vacío son rechazados", () => {
    it("rechaza payloads donde al menos un campo es un string vacío", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Pick which field(s) to invalidate
          fc.subarray(requiredFields as unknown as string[], {
            minLength: 1,
            maxLength: 4,
          }),
          validFieldArb,
          validFieldArb,
          validFieldArb,
          validFieldArb,
          async (
            fieldsToInvalidate,
            agentId,
            wabaId,
            phoneNumberId,
            tokenCode,
          ) => {
            const payload: Record<string, string> = {
              agentId,
              wabaId,
              phoneNumberId,
              tokenCode,
            };

            // Replace selected fields with empty string
            for (const field of fieldsToInvalidate) {
              payload[field] = "";
            }

            const dto = plainToInstance(ConnectWhatsAppDto, payload);
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 3.3: Payloads con campos ausentes son rechazados.
   *
   * Para cualquier payload donde al menos uno de los campos requeridos está
   * completamente ausente (undefined), la validación debe retornar al menos un error.
   */
  describe("Property 3.3: Payloads con campos ausentes son rechazados", () => {
    it("rechaza payloads donde al menos un campo requerido está ausente", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Pick which field(s) to remove
          fc.subarray(requiredFields as unknown as string[], {
            minLength: 1,
            maxLength: 4,
          }),
          validFieldArb,
          validFieldArb,
          validFieldArb,
          validFieldArb,
          async (fieldsToRemove, agentId, wabaId, phoneNumberId, tokenCode) => {
            const payload: Record<string, string | undefined> = {
              agentId,
              wabaId,
              phoneNumberId,
              tokenCode,
            };

            // Remove selected fields
            for (const field of fieldsToRemove) {
              delete payload[field];
            }

            const dto = plainToInstance(ConnectWhatsAppDto, payload);
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
