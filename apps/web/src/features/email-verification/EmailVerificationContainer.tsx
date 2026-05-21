'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { useVerifyEmail } from './hooks/useVerifyEmail';
import { useResendVerification } from './hooks/useResendVerification';
import { VerificationStatus } from './components/VerificationStatus';
import type { VerificationError } from './types/email-verification.types';

const REDIRECT_DELAY_MS = 3000;

interface EmailVerificationContainerProps {
  token: string | null;
}

/**
 * Contenedor principal del feature de verificación de email.
 * - Si no hay token, muestra error TOKEN_INVALID.
 * - Si hay token, llama a verify(token) al montar.
 * - En éxito: redirige a /dashboard (sesión activa) o /login (sin sesión) tras 3s.
 * - En error TOKEN_EXPIRED: ofrece botón de reenvío.
 * - En error INTERNAL_ERROR: ofrece botón de reintentar.
 */
export function EmailVerificationContainer({ token }: EmailVerificationContainerProps) {
  const router = useRouter();
  const { verify, isPending, result, error } = useVerifyEmail();
  const { resend } = useResendVerification();
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasVerifiedRef = useRef(false);

  // Trigger verification on mount if token is present
  useEffect(() => {
    if (token && !hasVerifiedRef.current) {
      hasVerifiedRef.current = true;
      verify(token);
    }
  }, [token, verify]);

  // Handle redirect after successful verification
  useEffect(() => {
    if (result?.verified) {
      redirectTimerRef.current = setTimeout(() => {
        if (result.hasActiveSession) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      }, REDIRECT_DELAY_MS);
    }

    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [result, router]);

  const handleRetry = useCallback(() => {
    if (token) {
      hasVerifiedRef.current = false;
      verify(token);
    }
  }, [token, verify]);

  const handleResend = useCallback(() => {
    if (token) {
      resend({ expiredToken: token });
    }
  }, [token, resend]);

  // If no token provided, show TOKEN_INVALID error immediately
  const displayError: VerificationError | null = !token
    ? { type: 'TOKEN_INVALID', message: 'El link de verificación no es válido.' }
    : error;

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        <VerificationStatus
          isPending={!token ? false : isPending}
          result={result}
          error={displayError}
          onRetry={handleRetry}
          onResend={handleResend}
        />
      </div>
    </main>
  );
}
