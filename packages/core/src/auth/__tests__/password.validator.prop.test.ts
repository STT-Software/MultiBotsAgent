/* eslint-disable no-control-regex */
/**
 * Property-Based Tests para password.validator.
 *
 * Property 1: Completitud de validación de contraseña
 * Property 3: Detección de discrepancia en confirmación
 * Property 5: Sanitización y rechazo de entrada
 *
 * Feature: password-change
 */
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import {
  validatePassword,
  sanitizePasswordInput,
  validatePasswordMatch,
} from "../password.validator";

// ─── Property 1: Completitud de validación de contraseña ─────────────────────

describe("Feature: password-change, Property 1: Completitud de validación", () => {
  /**
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.9**
   */

  it("para cualquier string, retorna resultado con exactamente 6 reglas evaluadas", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = validatePassword(password);
        expect(result.rules).toHaveLength(6);
      }),
      { numRuns: 100 },
    );
  });

  it("para cualquier string, isValid es consistente con rules.every(r => r.passed)", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(result.rules.every((r) => r.passed));
      }),
      { numRuns: 100 },
    );
  });

  it("las 6 reglas retornadas cubren todos los identificadores esperados", () => {
    const expectedRules = [
      "MIN_LENGTH",
      "MAX_LENGTH",
      "UPPERCASE",
      "LOWERCASE",
      "DIGIT",
      "SPECIAL_CHAR",
    ];

    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = validatePassword(password);
        const ruleNames = result.rules.map((r) => r.rule);
        expect(ruleNames).toEqual(expectedRules);
      }),
      { numRuns: 100 },
    );
  });

  it("cada regla tiene un mensaje descriptivo no vacío", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = validatePassword(password);
        for (const rule of result.rules) {
          expect(rule.message).toBeDefined();
          expect(rule.message.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("MIN_LENGTH pasa si y solo si la contraseña tiene >= 8 caracteres", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = validatePassword(password);
        const minLengthRule = result.rules.find((r) => r.rule === "MIN_LENGTH");
        expect(minLengthRule!.passed).toBe(password.length >= 8);
      }),
      { numRuns: 100 },
    );
  });

  it("MAX_LENGTH pasa si y solo si la contraseña tiene <= 128 caracteres", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = validatePassword(password);
        const maxLengthRule = result.rules.find((r) => r.rule === "MAX_LENGTH");
        expect(maxLengthRule!.passed).toBe(password.length <= 128);
      }),
      { numRuns: 100 },
    );
  });

  it("UPPERCASE pasa si y solo si la contraseña contiene al menos una mayúscula", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = validatePassword(password);
        const uppercaseRule = result.rules.find((r) => r.rule === "UPPERCASE");
        expect(uppercaseRule!.passed).toBe(/[A-Z]/.test(password));
      }),
      { numRuns: 100 },
    );
  });

  it("LOWERCASE pasa si y solo si la contraseña contiene al menos una minúscula", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = validatePassword(password);
        const lowercaseRule = result.rules.find((r) => r.rule === "LOWERCASE");
        expect(lowercaseRule!.passed).toBe(/[a-z]/.test(password));
      }),
      { numRuns: 100 },
    );
  });

  it("DIGIT pasa si y solo si la contraseña contiene al menos un dígito", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = validatePassword(password);
        const digitRule = result.rules.find((r) => r.rule === "DIGIT");
        expect(digitRule!.passed).toBe(/\d/.test(password));
      }),
      { numRuns: 100 },
    );
  });

  it("SPECIAL_CHAR pasa si y solo si la contraseña contiene al menos un carácter especial", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = validatePassword(password);
        const specialRule = result.rules.find(
          (r) => r.rule === "SPECIAL_CHAR",
        );
        expect(specialRule!.passed).toBe(
          /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(password),
        );
      }),
      { numRuns: 100 },
    );
  });

  it("una contraseña que cumple todas las reglas retorna isValid: true", () => {
    const validPasswordArb = fc
      .tuple(
        fc.stringMatching(/^[A-Z]$/),
        fc.stringMatching(/^[a-z]$/),
        fc.stringMatching(/^\d$/),
        fc.constantFrom("!", "@", "#", "$", "%", "^", "&", "*"),
        fc.stringMatching(/^[a-zA-Z0-9]{4,120}$/),
      )
      .map(
        ([upper, lower, digit, special, rest]) =>
          upper + lower + digit + special + rest,
      );

    fc.assert(
      fc.property(validPasswordArb, (password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Detección de discrepancia en confirmación ───────────────────

describe("Feature: password-change, Property 3: Detección de discrepancia en confirmación", () => {
  /**
   * **Validates: Requirements 5.1**
   */

  it("should indicate mismatch for any pair (newPassword, confirmation) where they differ", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 128 }),
        fc.string({ minLength: 1, maxLength: 128 }),
        (newPassword, confirmation) => {
          fc.pre(newPassword !== confirmation);
          const result = validatePasswordMatch(newPassword, confirmation);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should indicate valid match when newPassword === confirmation", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 128 }),
        (password) => {
          const result = validatePasswordMatch(password, password);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should detect mismatch even for strings differing by a single character", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 127 }),
        fc.string({ minLength: 1, maxLength: 1 }),
        (base, extraChar) => {
          const newPassword = base;
          const confirmation = base + extraChar;
          // They are always different since confirmation has an extra char
          const result = validatePasswordMatch(newPassword, confirmation);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should be symmetric: match(a, b) === match(b, a) for equality detection", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 128 }),
        fc.string({ minLength: 1, maxLength: 128 }),
        (a, b) => {
          expect(validatePasswordMatch(a, b)).toBe(
            validatePasswordMatch(b, a),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 5: Sanitización y rechazo de entrada ───────────────────────────

describe("Feature: password-change, Property 5: Sanitización y rechazo de entrada", () => {
  /**
   * **Validates: Requirements 9.4, 9.6**
   */

  it("para cualquier string, sanitizePasswordInput elimina todos los caracteres de control (U+0000–U+001F, U+007F–U+009F)", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const sanitized = sanitizePasswordInput(input);
        expect(sanitized).not.toMatch(/[\u0000-\u001F\u007F-\u009F]/);
      }),
      { numRuns: 100 },
    );
  });

  it("para cualquier string, el resultado de sanitizePasswordInput está recortado (sin espacios al inicio/final)", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const sanitized = sanitizePasswordInput(input);
        expect(sanitized).toBe(sanitized.trim());
      }),
      { numRuns: 100 },
    );
  });

  it("para cualquier string, los caracteres no-control y no-whitespace-extremo se preservan en orden", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const sanitized = sanitizePasswordInput(input);
        const expected = input
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
          .trim();
        expect(sanitized).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it("strings con solo caracteres de control se sanitizan a string vacío", () => {
    const controlOnlyArb = fc
      .array(fc.integer({ min: 0x00, max: 0x1f }), {
        minLength: 1,
        maxLength: 20,
      })
      .map((codes) => String.fromCharCode(...codes));

    fc.assert(
      fc.property(controlOnlyArb, (input) => {
        const sanitized = sanitizePasswordInput(input);
        expect(sanitized).toBe("");
      }),
      { numRuns: 100 },
    );
  });

  it("strings con caracteres de control C1 (U+007F–U+009F) también se eliminan", () => {
    const c1ControlArb = fc
      .array(fc.integer({ min: 0x7f, max: 0x9f }), {
        minLength: 1,
        maxLength: 10,
      })
      .map((codes) => String.fromCharCode(...codes));

    fc.assert(
      fc.property(c1ControlArb, (input) => {
        const sanitized = sanitizePasswordInput(input);
        expect(sanitized).toBe("");
      }),
      { numRuns: 100 },
    );
  });

  it("strings con espacios al inicio y final se recortan correctamente", () => {
    const paddedStringArb = fc
      .tuple(
        fc.stringMatching(/^ {1,5}$/),
        fc.stringMatching(/^[a-zA-Z0-9!@#]{1,20}$/),
        fc.stringMatching(/^ {1,5}$/),
      )
      .map(([leading, content, trailing]) => leading + content + trailing);

    fc.assert(
      fc.property(paddedStringArb, (input) => {
        const sanitized = sanitizePasswordInput(input);
        expect(sanitized).not.toMatch(/^\s/);
        expect(sanitized).not.toMatch(/\s$/);
        expect(sanitized.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it("caracteres de control intercalados con texto se eliminan preservando el texto", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]{3,10}$/),
        fc.array(fc.integer({ min: 0x00, max: 0x1f }), {
          minLength: 1,
          maxLength: 5,
        }),
        (text, controlCodes) => {
          const controlChars = String.fromCharCode(...controlCodes);
          const input = controlChars + text + controlChars;
          const sanitized = sanitizePasswordInput(input);
          expect(sanitized).toBe(text);
        },
      ),
      { numRuns: 100 },
    );
  });
});
