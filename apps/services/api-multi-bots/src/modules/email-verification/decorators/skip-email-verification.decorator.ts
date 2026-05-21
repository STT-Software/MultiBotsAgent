import { SetMetadata } from '@nestjs/common';

export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';

/**
 * Decorador para marcar endpoints que no requieren verificación de email.
 * Usar en endpoints como login, refresh, verify-email, resend-verification.
 *
 * @example
 * ```typescript
 * @SkipEmailVerification()
 * @Get('verify-email')
 * verifyEmail() { ... }
 * ```
 */
export const SkipEmailVerification = () =>
  SetMetadata(SKIP_EMAIL_VERIFICATION_KEY, true);
