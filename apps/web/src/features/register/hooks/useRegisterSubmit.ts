'use client';

import { useState, useCallback } from 'react';
import { registerUser } from '../services';
import type { RegisterError } from '../services/registerApi';
import type { FormData, StepId } from '../types';

interface UseRegisterSubmitOptions {
  formData: FormData;
  isFormValid: boolean;
  step1Valid: boolean;
  step2Valid: boolean;
  touchAll: () => void;
  setStep: (step: StepId) => void;
}

export function useRegisterSubmit({
  formData,
  isFormValid,
  step1Valid,
  step2Valid,
  touchAll,
  setStep,
}: UseRegisterSubmitOptions) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string> | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const clearServerErrors = useCallback(() => {
    setServerError(null);
    setServerFieldErrors(null);
    setIsConflict(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      touchAll();

      if (!isFormValid) {
        if (!step1Valid) setStep(1);
        else if (!step2Valid) setStep(2);
        return;
      }

      clearServerErrors();
      setSubmitting(true);

      try {
        const payload = {
          companyName: formData.companyName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          country: formData.country,
          category: formData.category,
          size: formData.size,
          ...(formData.captchaToken && {
            captchaToken: formData.captchaToken,
          }),
          ...(formData.phone.trim() && {
            phone: formData.phone.trim(),
            phoneCountryCode: formData.phoneCountryCode,
          }),
          ...(formData.referralSource && {
            referralSource: formData.referralSource,
          }),
        };

        await registerUser(payload);
        setRegistrationSuccess(true);

        // No redirect — user needs to verify email first.
        // The protected layout will show BlockedScreen if they navigate manually.
      } catch (err: unknown) {
        const error = err as RegisterError;

        if (error.fields) {
          setServerFieldErrors(error.fields);
        } else if (error.message) {
          setServerError(error.message);
        }

        if (error.status === 409) {
          setIsConflict(true);
          setStep(2);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [formData, isFormValid, step1Valid, step2Valid, touchAll, setStep, clearServerErrors],
  );

  return {
    submitting,
    serverError,
    serverFieldErrors,
    isConflict,
    registrationSuccess,
    clearServerErrors,
    handleSubmit,
  };
}
