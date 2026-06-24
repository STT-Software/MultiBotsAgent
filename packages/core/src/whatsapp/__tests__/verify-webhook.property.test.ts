import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { verifyWebhook } from "../verify-webhook.service";

describe("verifyWebhook — Property Tests", () => {
  /**
   * Feature: webhook-verification, Property 2: Rechazo por token no coincidente
   *
   * Para cualquier par de strings (verifyToken, configuredToken) donde
   * verifyToken !== configuredToken (incluyendo variantes que difieren solo
   * en mayúsculas/minúsculas), cuando mode es "subscribe" y challenge está
   * presente, la función verifyWebhook SHALL retornar statusCode: 403 y el
   * body NO SHALL contener el valor de challenge.
   *
   * **Validates: Requirements 1.4, 2.3, 2.5**
   */
  describe("Property 2: Rechazo por token no coincidente", () => {
    it("retorna 403 cuando verifyToken !== configuredToken (tokens arbitrarios distintos)", () => {
      fc.assert(
        fc.property(
          fc
            .tuple(
              fc.string({ minLength: 1 }),
              fc.string({ minLength: 1 })
            )
            .filter(([a, b]) => a !== b),
          fc.string({ minLength: 1 }),
          ([verifyToken, configuredToken], challenge) => {
            const result = verifyWebhook({
              mode: "subscribe",
              verifyToken,
              challenge,
              configuredToken,
            });

            expect(result.statusCode).toBe(403);
            expect(result.body).not.toContain(challenge);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("retorna 403 cuando tokens difieren solo en case (case-sensitive)", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => s.toLowerCase() !== s.toUpperCase()),
          fc.string({ minLength: 1 }),
          (baseToken, challenge) => {
            const verifyToken = baseToken.toLowerCase();
            const configuredToken = baseToken.toUpperCase();

            // Solo ejecutar si realmente son distintos tras la transformación
            fc.pre(verifyToken !== configuredToken);

            const result = verifyWebhook({
              mode: "subscribe",
              verifyToken,
              challenge,
              configuredToken,
            });

            expect(result.statusCode).toBe(403);
            expect(result.body).not.toContain(challenge);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: webhook-verification, Property 3: Rechazo por entrada inválida
   *
   * Para cualquier invocación de verifyWebhook donde al menos una de estas
   * condiciones se cumple:
   *   (a) mode es undefined
   *   (b) mode es cualquier string distinto de "subscribe"
   *   (c) verifyToken es undefined
   *   (d) challenge es undefined
   * la función SHALL retornar statusCode: 403 y body vacío,
   * independientemente de los valores de los demás parámetros.
   *
   * **Validates: Requirements 1.5, 2.4, 4.2, 7.4**
   */
  describe("Property 3: Rechazo por entrada inválida", () => {
    const configuredToken = fc.string({ minLength: 1 });
    const anyToken = fc.option(fc.string(), { nil: undefined });
    const anyChallenge = fc.option(fc.string(), { nil: undefined });
    const invalidMode = fc.oneof(
      fc.constant(undefined),
      fc.string().filter((s) => s !== "subscribe")
    );

    it("retorna 403 cuando mode es undefined", () => {
      fc.assert(
        fc.property(
          configuredToken,
          anyToken,
          anyChallenge,
          (cfgToken, verifyToken, challenge) => {
            const result = verifyWebhook({
              mode: undefined,
              verifyToken,
              challenge,
              configuredToken: cfgToken,
            });

            expect(result.statusCode).toBe(403);
            expect(result.body).toBe("");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("retorna 403 cuando mode es distinto de 'subscribe'", () => {
      fc.assert(
        fc.property(
          configuredToken,
          fc.string().filter((s) => s !== "subscribe"),
          anyToken,
          anyChallenge,
          (cfgToken, mode, verifyToken, challenge) => {
            const result = verifyWebhook({
              mode,
              verifyToken,
              challenge,
              configuredToken: cfgToken,
            });

            expect(result.statusCode).toBe(403);
            expect(result.body).toBe("");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("retorna 403 cuando verifyToken es undefined", () => {
      fc.assert(
        fc.property(
          configuredToken,
          invalidMode.map((m) => m ?? "subscribe"),
          anyChallenge,
          (cfgToken, mode, challenge) => {
            const result = verifyWebhook({
              mode,
              verifyToken: undefined,
              challenge,
              configuredToken: cfgToken,
            });

            expect(result.statusCode).toBe(403);
            expect(result.body).toBe("");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("retorna 403 cuando challenge es undefined", () => {
      fc.assert(
        fc.property(
          configuredToken,
          invalidMode.map((m) => m ?? "subscribe"),
          anyToken,
          (cfgToken, mode, verifyToken) => {
            const result = verifyWebhook({
              mode,
              verifyToken,
              challenge: undefined,
              configuredToken: cfgToken,
            });

            expect(result.statusCode).toBe(403);
            expect(result.body).toBe("");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("retorna 403 para cualquier combinación con al menos un parámetro inválido", () => {
      // Generador que produce inputs donde al menos una condición de invalidez se cumple
      const invalidInput = fc.oneof(
        // (a) mode es undefined
        fc.record({
          mode: fc.constant(undefined),
          verifyToken: anyToken,
          challenge: anyChallenge,
          configuredToken,
        }),
        // (b) mode es distinto de "subscribe"
        fc.record({
          mode: fc.string().filter((s) => s !== "subscribe"),
          verifyToken: anyToken,
          challenge: anyChallenge,
          configuredToken,
        }),
        // (c) verifyToken es undefined (con mode válido)
        fc.record({
          mode: fc.constant("subscribe" as string | undefined),
          verifyToken: fc.constant(undefined),
          challenge: anyChallenge,
          configuredToken,
        }),
        // (d) challenge es undefined (con mode válido)
        fc.record({
          mode: fc.constant("subscribe" as string | undefined),
          verifyToken: anyToken,
          challenge: fc.constant(undefined),
          configuredToken,
        })
      );

      fc.assert(
        fc.property(invalidInput, (params) => {
          const result = verifyWebhook({
            mode: params.mode,
            verifyToken: params.verifyToken,
            challenge: params.challenge,
            configuredToken: params.configuredToken,
          });

          expect(result.statusCode).toBe(403);
          expect(result.body).toBe("");
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: webhook-verification, Property 5: No exposición del token configurado
   *
   * Para cualquier combinación de inputs y para cualquier resultado de
   * verifyWebhook, el campo body de la respuesta NUNCA SHALL contener el valor
   * de configuredToken (cuando configuredToken es un string no vacío de al menos
   * 1 carácter).
   *
   * **Validates: Requirements 5.4**
   */
  it("Property 5: No exposición del token configurado — body nunca contiene el valor de configuredToken", () => {
    fc.assert(
      fc.property(
        fc.option(fc.string(), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        fc.string({ minLength: 1 }),
        (mode, verifyToken, challenge, configuredToken) => {
          const result = verifyWebhook({
            mode,
            verifyToken,
            challenge,
            configuredToken,
          });

          expect(result.body).not.toContain(configuredToken);
        }
      ),
      { numRuns: 100 }
    );
  });
});
