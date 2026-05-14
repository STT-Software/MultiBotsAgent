/**
 * Property Test: Control de acceso del guard de verificación de email
 *
 * Feature: email-verification, Property 10: Control de acceso del guard de verificación de email
 *
 * Para cualquier ruta y estado emailVerified:
 * - Si emailVerified=false y la ruta NO tiene @SkipEmailVerification() → 403 ForbiddenException
 * - Si emailVerified=true → permitir acceso (retorna true)
 * - Si tiene @SkipEmailVerification() → permitir acceso independientemente de emailVerified
 * - Si no hay usuario en el request → permitir acceso (dejar que otros guards manejen auth)
 *
 * **Validates: Requirements 6.1, 6.3, 6.4, 6.6**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmailVerifiedGuard } from '../guards/email-verified.guard';

/**
 * Creates a mock ExecutionContext with the given user and skip metadata configuration.
 */
function createMockExecutionContext(options: {
  user?: { emailVerified: boolean; [key: string]: unknown } | null;
  skipMetadata?: boolean;
}) {
  const handler = () => {};
  const classRef = class {};

  const request = options.user !== null ? { user: options.user } : {};

  const context = {
    getHandler: () => handler,
    getClass: () => classRef,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };

  return { context, handler, classRef, skipMetadata: options.skipMetadata ?? false };
}

/**
 * Creates a Reflector mock that returns the given skipMetadata value.
 */
function createMockReflector(skipMetadata: boolean): Reflector {
  return {
    getAllAndOverride: (_key: string, _targets: unknown[]) => skipMetadata,
  } as unknown as Reflector;
}

describe('Feature: email-verification, Property 10: Control de acceso del guard de verificación de email', () => {
  it('Property A: emailVerified=false and NO skip metadata → throws ForbiddenException', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary user data with emailVerified=false
        fc.record({
          emailVerified: fc.constant(false),
          userId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('admin', 'user', 'manager', 'viewer'),
        }),
        (userData) => {
          const reflector = createMockReflector(false);
          const guard = new EmailVerifiedGuard(reflector);

          const { context } = createMockExecutionContext({
            user: userData,
            skipMetadata: false,
          });

          expect(() => guard.canActivate(context as any)).toThrow(ForbiddenException);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property B: emailVerified=true → guard returns true (allows access)', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary user data with emailVerified=true
        fc.record({
          emailVerified: fc.constant(true),
          userId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('admin', 'user', 'manager', 'viewer'),
        }),
        fc.boolean(), // skipMetadata can be true or false, doesn't matter
        (userData, skipMetadata) => {
          const reflector = createMockReflector(skipMetadata);
          const guard = new EmailVerifiedGuard(reflector);

          const { context } = createMockExecutionContext({
            user: userData,
            skipMetadata,
          });

          const result = guard.canActivate(context as any);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property C: skip metadata set to true → guard returns true regardless of emailVerified', () => {
    fc.assert(
      fc.property(
        // emailVerified can be true or false
        fc.boolean(),
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('admin', 'user', 'manager', 'viewer'),
        }),
        (emailVerified, extraData) => {
          const reflector = createMockReflector(true);
          const guard = new EmailVerifiedGuard(reflector);

          const { context } = createMockExecutionContext({
            user: { ...extraData, emailVerified },
            skipMetadata: true,
          });

          const result = guard.canActivate(context as any);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property D: no user on request → guard returns true (unauthenticated, let other guards handle)', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // skipMetadata can be true or false
        (skipMetadata) => {
          const reflector = createMockReflector(skipMetadata);
          const guard = new EmailVerifiedGuard(reflector);

          const { context } = createMockExecutionContext({
            user: null,
            skipMetadata,
          });

          const result = guard.canActivate(context as any);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
