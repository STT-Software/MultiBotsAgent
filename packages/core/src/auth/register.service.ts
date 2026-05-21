/**
 * Servicio orquestador de registro de empresa y usuario.
 *
 * Flujo: validate → captcha → startTransaction → checkEmail → createCompany
 *        → createUser → revokeTokens → createRefreshToken → createVerifyToken
 *        → enqueueVerificationEmail → commitTransaction → generateAccessToken
 *
 * Maneja:
 * - Transacciones atómicas (abort en error)
 * - Concurrencia (retry si conflicto de unicidad)
 * - Token de verificación y email encolados dentro de la transacción
 * - Logging seguro (sin datos sensibles)
 *
 * Este módulo es lógica pura sin dependencias de AWS.
 */
import type {
  RegisterDto,
  RegisterResult,
  AccessTokenPayload,
  ServiceCategory,
  CompanySize,
  ReferralSource,
} from '@multibotagents/types';
import {
  CompanyStatus,
  DuplicateEmailError,
  ConcurrencyConflictError,
  EmailTemplate,
  EmailQueueStatus,
} from '@multibotagents/types';
import { validateRegister } from './register.validator';
import type { RegisterServiceDeps } from './interfaces';

// Re-export interfaces for consumers
export type {
  TransactionSession,
  CreateCompanyData,
  CreateUserData,
  CreateRefreshTokenData,
  EnqueueEmailData,
  CompanyEntity,
  UserEntity,
  IUserRepository,
  ICompanyRepository,
  IRefreshTokenRepository,
  IVerifyTokenRepository,
  IEmailQueueRepository,
  Logger,
  RegisterServiceDeps,
} from './interfaces';

// ─── RegisterService ─────────────────────────────────────────────────────────

/** Refresh token expiration: 7 days in milliseconds. */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class RegisterService {
  private readonly deps: RegisterServiceDeps;

  constructor(deps: RegisterServiceDeps) {
    this.deps = deps;
  }

  /**
   * Ejecuta el flujo completo de registro de empresa y usuario.
   *
   * @param dto - Datos de registro del formulario
   * @returns Resultado con tokens y datos del usuario/empresa creados
   * @throws {ValidationError} Si los datos son inválidos
   * @throws {CaptchaError} Si el CAPTCHA falla
   * @throws {DuplicateEmailError} Si el email ya existe
   * @throws {TokenGenerationError} Si crypto no está disponible
   */
  async register(dto: RegisterDto): Promise<RegisterResult> {
    // 1. Validar y sanitizar entrada
    const validated = validateRegister(dto);

    // 2. Verificar CAPTCHA
    await this.deps.captchaService.verify(validated.captchaToken);

    // 3. Ejecutar registro transaccional
    return this.executeRegistration(validated);
  }

  private async executeRegistration(validated: {
    companyName: string;
    email: string;
    password: string;
    country: string;
    category: ServiceCategory;
    size: CompanySize;
    phone?: string;
    phoneCountryCode?: string;
    referralSource?: ReferralSource;
  }): Promise<RegisterResult> {
    const session = await this.deps.getSession();

    try {
      session.startTransaction();

      // 4. Verificar unicidad de email
      const existingUser = await this.deps.userRepository.findByEmail(validated.email);
      if (existingUser) {
        await session.abortTransaction();
        await session.endSession();
        throw new DuplicateEmailError(validated.email);
      }

      // 5. Crear Company
      const now = new Date();
      const company = await this.deps.companyRepository.createWithSession(
        {
          name: validated.companyName,
          country: validated.country,
          category: validated.category,
          size: validated.size,
          phone: validated.phone,
          referralSource: validated.referralSource,
          status: CompanyStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
        },
        session,
      );

      // 6. Hash password y crear User
      const passwordHash = await this.deps.passwordService.hash(validated.password);
      const user = await this.deps.userRepository.createWithSession(
        {
          email: validated.email,
          passwordHash,
          emailVerified: false,
          companyId: company.id,
          createdAt: now,
          updatedAt: now,
        },
        session,
      );

      // 7. Revocar tokens previos del usuario
      await this.deps.refreshTokenRepository.revokeAllByUserId(user.id, session);

      // 8. Crear Refresh Token
      const refreshTokenValue = this.deps.tokenService.generateRefreshToken();
      await this.deps.refreshTokenRepository.createWithSession(
        {
          userId: user.id,
          token: refreshTokenValue,
          expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
          revoked: false,
          createdAt: now,
        },
        session,
      );

      // 9. Generar VerifyToken y encolar email de verificación (dentro de la transacción)
      const verificationToken = this.deps.tokenService.generateVerificationToken();
      await this.deps.verifyTokenRepository.createForUserWithSession(
        user.id,
        'email_verification',
        verificationToken,
        session,
      );

      const verificationUrl = `${this.deps.frontendDomain}/verify-email?token=${verificationToken}`;
      await this.deps.emailQueueRepository.enqueueWithSession(
        {
          to: user.email,
          template: EmailTemplate.VERIFICATION,
          payload: {
            token: verificationToken,
            url: verificationUrl,
            username: user.email,
          },
          status: EmailQueueStatus.PENDING,
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        },
        session,
      );

      // 10. Commit transacción
      await session.commitTransaction();
      await session.endSession();

      // 11. Generar Access Token (fuera de la transacción)
      const accessTokenPayload: AccessTokenPayload = {
        userId: user.id,
        companyId: company.id,
        email: user.email,
        emailVerified: user.emailVerified,
        companyName: company.name,
      };
      const accessToken = this.deps.tokenService.generateAccessToken(accessTokenPayload);

      // 12. Log evento de registro (sin datos sensibles)
      this.deps.logger.info('User registered successfully', {
        userId: user.id,
        companyId: company.id,
        email: user.email,
        timestamp: now.toISOString(),
      });

      return {
        accessToken,
        refreshToken: refreshTokenValue,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
        },
        company: {
          id: company.id,
          name: company.name,
        },
      };
    } catch (error) {
      // Si es un error de dominio conocido, re-lanzar
      if (
        error instanceof DuplicateEmailError ||
        error instanceof ConcurrencyConflictError
      ) {
        throw error;
      }

      // Intentar abort de la transacción si aún está activa
      try {
        await session.abortTransaction();
      } catch {
        // Ignorar error de abort (la transacción puede ya estar abortada)
      }

      try {
        await session.endSession();
      } catch {
        // Ignorar error de endSession
      }

      // Manejar conflicto de concurrencia (e.g., duplicate key en MongoDB)
      if (this.isConcurrencyConflict(error)) {
        // Reintentar validación de unicidad
        const existingUser = await this.deps.userRepository.findByEmail(validated.email);
        if (existingUser) {
          throw new DuplicateEmailError(validated.email);
        }
        throw new ConcurrencyConflictError();
      }

      throw error;
    }
  }

  /**
   * Determina si un error es un conflicto de concurrencia (duplicate key).
   */
  private isConcurrencyConflict(error: unknown): boolean {
    if (error instanceof Error) {
      // MongoDB duplicate key error code
      return error.message.includes('E11000') || error.message.includes('duplicate key');
    }
    return false;
  }
}
