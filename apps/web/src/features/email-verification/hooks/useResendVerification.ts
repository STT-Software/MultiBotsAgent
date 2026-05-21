'use client';

import { useTransition, useState, useCallback, useRef, useEffect } from 'react';

import {
  resendVerification,
  parseVerificationError,
} from '../services/email-verification.service';
import type { ResendVerificationParams } from '../services/email-verification.service';
import type { ResendVerificationResult, VerificationError } from '../types/email-verification.types';

const COOLDOWN_SECONDS = 60;

interface UseResendVerificationReturn {
  /** Triggers the resend verification email request. */
  resend: (params?: ResendVerificationParams) => void;
  /** Whether the resend request is in progress. */
  isPending: boolean;
  /** Remaining cooldown seconds (0 when cooldown is inactive). */
  cooldownSeconds: number;
  /** The successful resend result, or null. */
  result: ResendVerificationResult | null;
  /** The parsed error if resend failed, or null. */
  error: VerificationError | null;
}

/**
 * Hook para reenviar el email de verificación con cooldown visual (60s).
 * Usa `useRef` para el interval ID (valor transitorio, no provoca re-render).
 *
 * @example
 * ```tsx
 * const { resend, isPending, cooldownSeconds, result, error } = useResendVerification();
 * <button onClick={() => resend()} disabled={isPending || cooldownSeconds > 0}>
 *   {cooldownSeconds > 0 ? `Espera ${cooldownSeconds}s` : 'Reenviar'}
 * </button>
 * ```
 */
export function useResendVerification(): UseResendVerificationReturn {
  const [isPending, startTransition] = useTransition();
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [result, setResult] = useState<ResendVerificationResult | null>(null);
  const [error, setError] = useState<VerificationError | null>(null);

  // useRef for the interval ID — transient value that doesn't trigger re-renders
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setCooldownSeconds(COOLDOWN_SECONDS);

    intervalRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resend = useCallback(
    (params: ResendVerificationParams = {}) => {
      if (cooldownSeconds > 0) return;

      setResult(null);
      setError(null);

      startTransition(async () => {
        try {
          const response = await resendVerification(params);
          setResult(response);
          startCooldown();
        } catch (err: unknown) {
          const parsedError = parseVerificationError(err);
          setError(parsedError);

          // If the server returns a cooldown error with retryAfter, start the countdown
          if (parsedError.retryAfter && parsedError.retryAfter > 0) {
            setCooldownSeconds(parsedError.retryAfter);
            intervalRef.current = setInterval(() => {
              setCooldownSeconds((prev) => {
                if (prev <= 1) {
                  if (intervalRef.current !== null) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                  }
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        }
      });
    },
    [cooldownSeconds, startCooldown],
  );

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { resend, isPending, cooldownSeconds, result, error };
}
