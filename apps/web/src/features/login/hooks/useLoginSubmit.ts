'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthStore } from '@/lib/auth';
import { loginUser } from '../services';
import type { LoginApiError } from '../services/loginApi';
import type { LoginFormData, ServerErrorState } from '../types';

interface UseLoginSubmitOptions {
  formData: LoginFormData;
  isFormValid: boolean;
  touchAll: () => void;
}

export function useLoginSubmit({ formData, isFormValid, touchAll }: UseLoginSubmitOptions) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<ServerErrorState | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitCountdown === null || rateLimitCountdown <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

  const clearServerError = useCallback(() => {
    setServerError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      touchAll();

      if (!isFormValid) return;

      setSubmitting(true);
      setServerError(null);
      setRateLimitCountdown(null);

      try {
        const data = await loginUser(formData.email, formData.password);
        AuthStore.setToken(data.accessToken);
        setLoginSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch (err: unknown) {
        const error = err as LoginApiError;

        if (error.code === 'RATE_LIMIT_EXCEEDED' && error.retryAfter) {
          setRateLimitCountdown(error.retryAfter);
        }

        setServerError({
          code: error.code as ServerErrorState['code'],
          message: error.message,
          deletionDate: error.deletionDate,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [formData, isFormValid, touchAll, router],
  );

  return {
    submitting,
    serverError,
    loginSuccess,
    rateLimitCountdown,
    clearServerError,
    handleSubmit,
  };
}
