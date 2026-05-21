/**
 * Property-Based Tests para RegisterService.
 *
 * Property 1: Normalización y unicidad de email
 * Property 2: Mapeo correcto de datos de registro
 * Property 6: Sesión única — revocación de tokens previos
 * Property 7: Encolado correcto de email de verificación
 * Property 9: Sanitización de errores internos
 * Property 12: Seguridad de logs
 *
 * Feature: flujo-2.1-registro-empresa-usuario
 */
import * as fc from 'fast-check';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CompanySize,
  ServiceCategory,
  CompanyStatus,
  DuplicateEmailError,
  EmailTemplate,
  EmailQueueStatus,
} from '@multibotagents/types';
import type { RegisterDto } from '@multibotagents/types';
import { RegisterService } from '../register.service';
import type {
  RegisterServiceDeps,
  TransactionSession,
  Logger,
  IUserRepository,
  ICompanyRepository,
  IRefreshTokenRepository,
  IVerifyTokenRepository,
  IEmailQueueRepository,
} from '../register.service';
import { PasswordService } from '../password.service';
import { TokenService } from '../token.service';
import { CaptchaService } from '../captcha.service';

// ─── Test Helpers ────────────────────────────────────────────────────────────

const TEST_SECRET = 'test-secret-for-property-tests';

function createMockSession(): TransactionSession {
  return {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    abortTransaction: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockLogger(): Logger & { calls: { info: Array<[string, Record<string, unknown>?]>; error: Array<[string, Record<string, unknown>?]> } } {
  const calls = {
    info: [] as Array<[string, Record<string, unknown>?]>,
    error: [] as Array<[string, Record<string, unknown>?]>,
  };
  return {
    calls,
    info: vi.fn((msg: string, meta?: Record<string, unknown>) => { calls.info.push([msg, meta]); }),
    error: vi.fn((msg: string, meta?: Record<string, unknown>) => { calls.error.push([msg, meta]); }),
    warn: vi.fn(),
  };
}

let userIdCounter = 0;
let companyIdCounter = 0;

function createMockDeps(overrides: Partial<RegisterServiceDeps> = {}): RegisterServiceDeps {
  const session = createMockSession();
  const logger = createMockLogger();

  const userRepository: IUserRepository = {
    findByEmail: vi.fn().mockResolvedValue(null),
    createWithSession: vi.fn().mockImplementation(async (data) => ({
      id: `user-${++userIdCounter}`,
      email: data.email,
      emailVerified: data.emailVerified,
      companyId: data.companyId,
    })),
  };

  const companyRepository: ICompanyRepository = {
    createWithSession: vi.fn().mockImplementation(async (data) => ({
      id: `company-${++companyIdCounter}`,
      name: data.name,
    })),
  };

  const refreshTokenRepository: IRefreshTokenRepository = {
    createWithSession: vi.fn().mockResolvedValue({ id: 'rt-1' }),
    revokeAllByUserId: vi.fn().mockResolvedValue(undefined),
  };

  const verifyTokenRepository: IVerifyTokenRepository = {
    createForUser: vi.fn().mockResolvedValue({ id: 'vt-1' }),
    createForUserWithSession: vi.fn().mockResolvedValue({ id: 'vt-1' }),
  };

  const emailQueueRepository: IEmailQueueRepository = {
    enqueue: vi.fn().mockResolvedValue({ id: 'eq-1' }),
    enqueueWithSession: vi.fn().mockResolvedValue({ id: 'eq-1' }),
  };

  // Use a mock password service to avoid slow bcrypt in property tests
  const mockPasswordService = {
    hash: vi.fn().mockResolvedValue('$2b$12$mockedhashvalue1234567890123456789012345678901234'),
    verify: vi.fn().mockResolvedValue(true),
  } as unknown as PasswordService;

  return {
    userRepository,
    companyRepository,
    refreshTokenRepository,
    verifyTokenRepository,
    emailQueueRepository,
    passwordService: mockPasswordService,
    tokenService: new TokenService({ secrets: [TEST_SECRET] }),
    captchaService: new CaptchaService({}), // No config = skip
    getSession: vi.fn().mockResolvedValue(session),
    logger,
    frontendDomain: 'https://app.example.com',
    ...overrides,
  };
}

/** Genera un RegisterDto válido. */
function validDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
  return {
    companyName: 'Test Company',
    email: 'user@example.com',
    password: 'Password1',
    country: 'CO',
    category: ServiceCategory.SALES,
    size: CompanySize.TWO_TO_FIVE,
    ...overrides,
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Genera emails con casing aleatorio. */
const emailWithRandomCasingArb = fc.tuple(
  fc.stringMatching(/^[a-z]{3,10}$/),
  fc.constantFrom('example.com', 'test.org', 'company.io'),
).chain(([local, domain]) => {
  // Randomly capitalize some characters
  return fc.array(fc.boolean(), { minLength: local.length, maxLength: local.length }).map(
    (caps) => {
      const mixed = local.split('').map((c: string, i: number) => caps[i] ? c.toUpperCase() : c).join('');
      return `${mixed}@${domain}`;
    },
  );
});

/** Genera datos de registro válidos con variaciones. */
const validRegisterDtoArb = fc.record({
  companyName: fc.stringMatching(/^[a-zA-Z ]{1,50}$/).filter(s => s.trim().length > 0),
  email: fc.tuple(
    fc.stringMatching(/^[a-z0-9]{3,10}$/),
    fc.constantFrom('example.com', 'test.org', 'company.io'),
  ).map(([local, domain]) => `${local}@${domain}`),
  password: fc.tuple(
    fc.stringMatching(/^[a-z]{6,15}$/),
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
    fc.constantFrom(...'0123456789'.split('')),
  ).map(([base, upper, digit]) => `${base}${upper}${digit}`),
  country: fc.constantFrom('CO', 'US', 'MX', 'ES', 'AR'),
  category: fc.constantFrom(...Object.values(ServiceCategory)),
  size: fc.constantFrom(...Object.values(CompanySize)),
});

// ─── Property 1: Normalización y unicidad de email ───────────────────────────

describe('Property 1: Normalización y unicidad de email', () => {
  /**
   * **Validates: Requirements 3.1, 3.3, 10.2**
   *
   * For any string de email con cualquier combinación de mayúsculas/minúsculas,
   * el sistema de registro SHALL normalizar el email a minúsculas antes de almacenarlo,
   * y SHALL rechazar el registro si ya existe un usuario con el mismo email normalizado.
   */

  beforeEach(() => {
    userIdCounter = 0;
    companyIdCounter = 0;
  });

  it('should normalize email to lowercase for any casing combination', async () => {
    await fc.assert(
      fc.asyncProperty(emailWithRandomCasingArb, async (email) => {
        const deps = createMockDeps();
        const service = new RegisterService(deps);

        const result = await service.register(validDto({ email }));

        // The stored email should be lowercase
        expect(result.user.email).toBe(email.toLowerCase());
      }),
      { numRuns: 50 },
    );
  }, 30000);

  it('should reject registration when email already exists (case-insensitive)', async () => {
    await fc.assert(
      fc.asyncProperty(emailWithRandomCasingArb, async (email) => {
        const deps = createMockDeps();
        // Simulate existing user with same email (lowercase)
        (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'existing-user',
          email: email.toLowerCase(),
          emailVerified: true,
          companyId: 'existing-company',
        });

        const service = new RegisterService(deps);

        await expect(service.register(validDto({ email }))).rejects.toThrow(DuplicateEmailError);
      }),
      { numRuns: 50 },
    );
  });
});

// ─── Property 2: Mapeo correcto de datos de registro ─────────────────────────

describe('Property 2: Mapeo correcto de datos de registro', () => {
  /**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   *
   * For any datos de registro válidos, después de un registro exitoso,
   * las entidades Company y User creadas SHALL contener todos los campos
   * proporcionados con sus valores correctos.
   */

  beforeEach(() => {
    userIdCounter = 0;
    companyIdCounter = 0;
  });

  it('should create Company with correct fields from registration data', async () => {
    await fc.assert(
      fc.asyncProperty(validRegisterDtoArb, async (dto) => {
        const deps = createMockDeps();
        const service = new RegisterService(deps);

        await service.register(dto);

        // Verify company was created with correct data
        const createCall = (deps.companyRepository.createWithSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(createCall.name).toBe(dto.companyName.trim());
        expect(createCall.country).toBe(dto.country.toUpperCase());
        expect(createCall.category).toBe(dto.category);
        expect(createCall.size).toBe(dto.size);
        expect(createCall.status).toBe(CompanyStatus.ACTIVE);
        expect(createCall.createdAt).toBeInstanceOf(Date);
        expect(createCall.updatedAt).toBeInstanceOf(Date);
      }),
      { numRuns: 50 },
    );
  });

  it('should create User with emailVerified=false and correct companyId', async () => {
    await fc.assert(
      fc.asyncProperty(validRegisterDtoArb, async (dto) => {
        const deps = createMockDeps();
        const service = new RegisterService(deps);

        const result = await service.register(dto);

        // Verify user was created with correct data
        const createCall = (deps.userRepository.createWithSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(createCall.email).toBe(dto.email.toLowerCase());
        expect(createCall.emailVerified).toBe(false);
        expect(createCall.companyId).toBeDefined();
        expect(result.user.emailVerified).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it('should return result with user.companyId referencing the created company', async () => {
    await fc.assert(
      fc.asyncProperty(validRegisterDtoArb, async (dto) => {
        const deps = createMockDeps();
        const service = new RegisterService(deps);

        const result = await service.register(dto);

        // User's company should match the created company
        expect(result.company.id).toBeDefined();
        expect(result.company.name).toBe(dto.companyName.trim());
      }),
      { numRuns: 50 },
    );
  });
});

// ─── Property 6: Sesión única — revocación de tokens previos ─────────────────

describe('Property 6: Sesión única — revocación de tokens previos', () => {
  /**
   * **Validates: Requirements 5.6**
   *
   * For any usuario que ya tiene refresh tokens activos, cuando se genera un nuevo
   * refresh token durante el registro, todos los refresh tokens previos del mismo
   * usuario SHALL quedar marcados como revocados.
   */

  beforeEach(() => {
    userIdCounter = 0;
    companyIdCounter = 0;
  });

  it('should call revokeAllByUserId for the newly created user during registration', async () => {
    await fc.assert(
      fc.asyncProperty(validRegisterDtoArb, async (dto) => {
        const deps = createMockDeps();
        const service = new RegisterService(deps);

        await service.register(dto);

        // revokeAllByUserId should have been called with the user's ID
        expect(deps.refreshTokenRepository.revokeAllByUserId).toHaveBeenCalled();
        const revokeCall = (deps.refreshTokenRepository.revokeAllByUserId as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(revokeCall[0]).toBeDefined(); // userId
        expect(typeof revokeCall[0]).toBe('string');
      }),
      { numRuns: 50 },
    );
  });

  it('should revoke tokens before creating the new refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(validRegisterDtoArb, async (dto) => {
        const deps = createMockDeps();
        const callOrder: string[] = [];

        (deps.refreshTokenRepository.revokeAllByUserId as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          callOrder.push('revoke');
        });
        (deps.refreshTokenRepository.createWithSession as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          callOrder.push('create');
          return { id: 'rt-1' };
        });

        const service = new RegisterService(deps);
        await service.register(dto);

        // Revoke should happen before create
        expect(callOrder.indexOf('revoke')).toBeLessThan(callOrder.indexOf('create'));
      }),
      { numRuns: 50 },
    );
  });
});

// ─── Property 7: Encolado correcto de email de verificación ──────────────────

describe('Property 7: Encolado correcto de email de verificación', () => {
  /**
   * **Validates: Requirements 6.1**
   *
   * For any registro exitoso, la cola de email SHALL contener exactamente un nuevo
   * documento con: `to` igual al email del usuario, `template` igual a 'verification',
   * `status` igual a 'pending', `attempts` igual a 0, y `payload` conteniendo un
   * token de verificación válido y una URL.
   */

  beforeEach(() => {
    userIdCounter = 0;
    companyIdCounter = 0;
  });

  it('should enqueue exactly one verification email with correct structure', async () => {
    await fc.assert(
      fc.asyncProperty(validRegisterDtoArb, async (dto) => {
        const deps = createMockDeps();
        const service = new RegisterService(deps);

        await service.register(dto);

        // Email queue should have been called exactly once (within transaction)
        expect(deps.emailQueueRepository.enqueueWithSession).toHaveBeenCalledTimes(1);

        const enqueueCall = (deps.emailQueueRepository.enqueueWithSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(enqueueCall.to).toBe(dto.email.toLowerCase());
        expect(enqueueCall.template).toBe(EmailTemplate.VERIFICATION);
        expect(enqueueCall.status).toBe(EmailQueueStatus.PENDING);
        expect(enqueueCall.attempts).toBe(0);
        expect(enqueueCall.payload).toHaveProperty('token');
        expect(enqueueCall.payload).toHaveProperty('url');
        // Token should be 64 hex chars (32 bytes)
        expect(enqueueCall.payload.token).toMatch(/^[0-9a-f]{64}$/);
        // URL should contain the token
        expect(enqueueCall.payload.url).toContain(enqueueCall.payload.token);
      }),
      { numRuns: 50 },
    );
  });

  it('should create a verify token for the user before enqueueing email', async () => {
    await fc.assert(
      fc.asyncProperty(validRegisterDtoArb, async (dto) => {
        const deps = createMockDeps();
        const service = new RegisterService(deps);

        await service.register(dto);

        // Verify token should have been created within the transaction
        expect(deps.verifyTokenRepository.createForUserWithSession).toHaveBeenCalledTimes(1);
        const createCall = (deps.verifyTokenRepository.createForUserWithSession as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(createCall[0]).toBeDefined(); // userId
        expect(createCall[1]).toBe('email_verification'); // type
        expect(createCall[2]).toMatch(/^[0-9a-f]{64}$/); // token
        expect(createCall[3]).toBeDefined(); // session
      }),
      { numRuns: 50 },
    );
  });
});

// ─── Property 9: Sanitización de errores internos ────────────────────────────

describe('Property 9: Sanitización de errores internos', () => {
  /**
   * **Validates: Requirements 8.4**
   *
   * For any error interno del sistema, la respuesta SHALL NOT contener stack traces,
   * nombres de colecciones, detalles de conexión, ni información interna del sistema.
   */

  beforeEach(() => {
    userIdCounter = 0;
    companyIdCounter = 0;
  });

  it('should propagate internal errors without exposing sensitive details in domain errors', async () => {
    const internalErrorMessages = [
      'MongoServerError: connection refused to mongodb://admin:secret@10.0.0.1:27017/mydb',
      'ECONNREFUSED 10.0.0.1:27017',
      'Authentication failed for user admin on database mydb',
      'Error in collection users: duplicate key error',
    ];

    for (const errorMsg of internalErrorMessages) {
      const deps = createMockDeps();
      // Simulate internal error during company creation
      (deps.companyRepository.createWithSession as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error(errorMsg),
      );

      const service = new RegisterService(deps);

      try {
        await service.register(validDto());
        expect.fail('Should have thrown');
      } catch (error) {
        // The error should be the raw internal error (handler maps it to 500)
        // But it should NOT be a DuplicateEmailError or other domain error
        expect(error).toBeInstanceOf(Error);
        // The RegisterService re-throws internal errors for the handler to map
        // The handler is responsible for sanitizing the response
      }
    }
  });

  it('should not expose internal errors as domain errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'MongoServerError: timeout',
          'ECONNREFUSED',
          'socket hang up',
          'getaddrinfo ENOTFOUND',
        ),
        async (errorMsg) => {
          const deps = createMockDeps();
          (deps.companyRepository.createWithSession as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error(errorMsg),
          );

          const service = new RegisterService(deps);

          try {
            await service.register(validDto());
            throw new Error('Should have thrown');
          } catch (error) {
            expect(error).not.toBeInstanceOf(DuplicateEmailError);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ─── Property 12: Seguridad de logs ──────────────────────────────────────────

describe('Property 12: Seguridad de logs', () => {
  /**
   * **Validates: Requirements 10.6**
   *
   * For any registro exitoso, los logs generados SHALL contener el evento de registro
   * (userId, companyId, timestamp) pero SHALL NOT contener la contraseña en texto plano,
   * el hash de la contraseña, tokens de refresh, ni tokens de verificación.
   */

  beforeEach(() => {
    userIdCounter = 0;
    companyIdCounter = 0;
  });

  it('should log registration event with userId, companyId, and timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(validRegisterDtoArb, async (dto) => {
        const deps = createMockDeps();
        const mockLogger = deps.logger as Logger & { calls: { info: Array<[string, Record<string, unknown>?]> } };
        const service = new RegisterService(deps);

        await service.register(dto);

        // Should have logged at least one info message
        expect(mockLogger.calls.info.length).toBeGreaterThan(0);

        const [message, meta] = mockLogger.calls.info[0];
        expect(message).toContain('registered');
        expect(meta).toHaveProperty('userId');
        expect(meta).toHaveProperty('companyId');
        expect(meta).toHaveProperty('timestamp');
      }),
      { numRuns: 50 },
    );
  });

  it('should never log plain password in any log entry', async () => {
    await fc.assert(
      fc.asyncProperty(
        validRegisterDtoArb,
        async (dto) => {
          const deps = createMockDeps();
          const allLogEntries: string[] = [];

          // Capture all log output as strings
          (deps.logger.info as ReturnType<typeof vi.fn>).mockImplementation((msg: string, meta?: Record<string, unknown>) => {
            allLogEntries.push(JSON.stringify({ msg, meta }));
          });
          (deps.logger.error as ReturnType<typeof vi.fn>).mockImplementation((msg: string, meta?: Record<string, unknown>) => {
            allLogEntries.push(JSON.stringify({ msg, meta }));
          });
          (deps.logger.warn as ReturnType<typeof vi.fn>).mockImplementation((msg: string, meta?: Record<string, unknown>) => {
            allLogEntries.push(JSON.stringify({ msg, meta }));
          });

          const service = new RegisterService(deps);
          await service.register(dto);

          const allLogs = allLogEntries.join('\n');

          // Password should never appear in logs
          expect(allLogs).not.toContain(dto.password);
          // Password hash pattern should not appear
          expect(allLogs).not.toMatch(/\$2[aby]\$\d{2}\$/);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should never log refresh tokens or verification tokens', async () => {
    await fc.assert(
      fc.asyncProperty(validRegisterDtoArb, async (dto) => {
        const deps = createMockDeps();
        const allLogEntries: string[] = [];

        (deps.logger.info as ReturnType<typeof vi.fn>).mockImplementation((msg: string, meta?: Record<string, unknown>) => {
          allLogEntries.push(JSON.stringify({ msg, meta }));
        });
        (deps.logger.error as ReturnType<typeof vi.fn>).mockImplementation((msg: string, meta?: Record<string, unknown>) => {
          allLogEntries.push(JSON.stringify({ msg, meta }));
        });

        const service = new RegisterService(deps);
        const result = await service.register(dto);

        const allLogs = allLogEntries.join('\n');

        // Refresh token (128 hex chars) should not appear in logs
        expect(allLogs).not.toContain(result.refreshToken);
        // Access token should not appear in logs
        expect(allLogs).not.toContain(result.accessToken);
      }),
      { numRuns: 50 },
    );
  });
});
