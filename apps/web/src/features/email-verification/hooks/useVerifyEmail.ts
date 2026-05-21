'use client';

import { useTransition, useState, useCallback } from 'react';

import {
  verifyEmail,
  parseVerificationError,
} from '../services/email-verification.service';
import type { VerifyEmailResult, VerificationError } from '../types/email-verification.types';

interface UseVerifyEmailReturn {
  /** Triggers the email verification with the given token. */
  verify: (token: string) => void;
  /** Whether the verification request is in progress (useTransition). */
  isPending: boolean;
  /** The successful verification result, or null if not yet completed. */
  result: VerifyEmailResult | null;
  /** The parsed error if verification failed, or null. */
  error: VerificationError | null;
}

/**
 * Hook para verificar un email mediante token.
 * Usa `useTransition` para el estado de loading (React 18+ pattern).
 *
 * @example
 * ```tsx
 * const { verify, isPending, result, error } = useVerifyEmail();
 * useEffect(() => { if (token) verify(token); }, [token, verify]);
 * ```
 */
export function useVerifyEmail(): UseVerifyEmailReturn {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<VerifyEmailResult | null>(null);
  const [error, setError] = useState<VerificationError | null>(null);

  const verify = useCallback((token: string) => {
    setResult(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await verifyEmail(token);
        setResult(response);
      } catch (err: unknown) {
        setError(parseVerificationError(err));
      }
    });
  }, []);

  return { verify, isPending, result, error };
}
