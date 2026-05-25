import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { encryptToken, decryptToken } from "../token-encryption";

describe("token-encryption — Property Tests", () => {
  /**
   * Feature: embedded-signup, Property 1: Round-trip de cifrado AES-256
   *
   * Para cualquier token de Business válido (string no vacío, 1-5000 chars) y
   * para cualquier clave de cifrado AES-256 válida (32 bytes), cifrar el token
   * con `encryptToken(token, key)` y luego descifrar el resultado con
   * `decryptToken(result, key)` debe producir exactamente el token original.
   *
   * **Validates: Requirements 7.2**
   */
  describe("Property 1: Round-trip de cifrado AES-256", () => {
    // Generator: arbitrary non-empty strings between 1 and 5000 chars
    const arbitraryToken = fc.string({ minLength: 1, maxLength: 5000 });

    // Generator: 32-byte keys encoded as 64-char hex strings
    const arbitraryHexKey = fc
      .uint8Array({ minLength: 32, maxLength: 32 })
      .map((bytes) => Buffer.from(bytes).toString("hex"));

    it("decrypt(encrypt(token, key), key) === token para strings arbitrarios y claves hex", () => {
      fc.assert(
        fc.property(arbitraryToken, arbitraryHexKey, (token, key) => {
          const encrypted = encryptToken(token, key);
          const decrypted = decryptToken(encrypted, key);

          expect(decrypted).toBe(token);
        }),
        { numRuns: 100 }
      );
    });

    // Generator: 32-byte keys encoded as base64 strings
    const arbitraryBase64Key = fc
      .uint8Array({ minLength: 32, maxLength: 32 })
      .map((bytes) => Buffer.from(bytes).toString("base64"));

    it("decrypt(encrypt(token, key), key) === token para strings arbitrarios y claves base64", () => {
      fc.assert(
        fc.property(arbitraryToken, arbitraryBase64Key, (token, key) => {
          const encrypted = encryptToken(token, key);
          const decrypted = decryptToken(encrypted, key);

          expect(decrypted).toBe(token);
        }),
        { numRuns: 100 }
      );
    });

    it("cada cifrado produce un resultado diferente (IV aleatorio)", () => {
      fc.assert(
        fc.property(arbitraryToken, arbitraryHexKey, (token, key) => {
          const encrypted1 = encryptToken(token, key);
          const encrypted2 = encryptToken(token, key);

          // Los ciphertexts deben ser diferentes por el IV aleatorio
          expect(encrypted1.iv).not.toBe(encrypted2.iv);

          // Pero ambos descifran al mismo token
          expect(decryptToken(encrypted1, key)).toBe(token);
          expect(decryptToken(encrypted2, key)).toBe(token);
        }),
        { numRuns: 100 }
      );
    });
  });
});
