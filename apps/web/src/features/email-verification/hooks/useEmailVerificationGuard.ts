'use client';

interface UseEmailVerificationGuardParams {
  /** Whether the user's email is verified (from JWT/session). */
  emailVerified: boolean;
  /** The user's email address (from session). */
  email?: string;
}

interface UseEmailVerificationGuardReturn {
  /** Whether the user should be blocked from accessing protected content. */
  isBlocked: boolean;
  /** The user's email address (for display in the blocked screen). */
  email: string | undefined;
}

/**
 * Hook que evalúa si el usuario debe ser bloqueado por falta de verificación de email.
 * Deriva el estado directamente sin useEffect (rerender-derived-state-no-effect).
 *
 * @example
 * ```tsx
 * const { isBlocked, email } = useEmailVerificationGuard({
 *   emailVerified: session.emailVerified,
 *   email: session.email,
 * });
 * if (isBlocked) return <BlockedScreen email={email} />;
 * ```
 */
export function useEmailVerificationGuard({
  emailVerified,
  email,
}: UseEmailVerificationGuardParams): UseEmailVerificationGuardReturn {
  // Derived state — no useEffect needed.
  // isBlocked is true when the email is NOT verified.
  const isBlocked = !emailVerified;

  return { isBlocked, email };
}
