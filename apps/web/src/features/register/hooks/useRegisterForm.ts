'use client';

import { useState, useCallback, useMemo } from 'react';
import type { FormData, FormErrors, TouchedFields, StepId } from '../types';

// ─── Validation helpers ──────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

export const STRENGTH_LABELS = ['Débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
export const STRENGTH_COLORS = [
  'bg-red-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-emerald-400',
];

// ─── Hook ────────────────────────────────────────────────────────────────────

const INITIAL_FORM_DATA: FormData = {
  companyName: '',
  email: '',
  password: '',
  country: '',
  category: '',
  size: '',
  phoneCountryCode: '+57',
  phone: '',
  referralSource: '',
};

const INITIAL_TOUCHED: TouchedFields = {
  companyName: false,
  email: false,
  password: false,
  country: false,
  category: false,
  size: false,
};

export function useRegisterForm() {
  const [step, setStep] = useState<StepId>(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [touched, setTouched] = useState<TouchedFields>(INITIAL_TOUCHED);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Validation ────────────────────────────────────────────────────────

  const errors = useMemo<FormErrors>(() => {
    const e: FormErrors = {};
    if (!formData.companyName.trim()) {
      e.companyName = 'El nombre de empresa es obligatorio';
    }
    if (!formData.email.trim()) {
      e.email = 'El email es obligatorio';
    } else if (!EMAIL_REGEX.test(formData.email)) {
      e.email = 'Formato de email inválido';
    }
    if (!formData.password) {
      e.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 8) {
      e.password = 'Mínimo 8 caracteres';
    } else if (!/[A-Z]/.test(formData.password)) {
      e.password = 'Debe incluir al menos una mayúscula';
    } else if (!/[0-9]/.test(formData.password)) {
      e.password = 'Debe incluir al menos un número';
    }
    if (!formData.country) {
      e.country = 'Selecciona un país';
    }
    if (!formData.category) {
      e.category = 'Selecciona una categoría';
    }
    if (!formData.size) {
      e.size = 'Selecciona el tamaño de empresa';
    }
    return e;
  }, [formData]);

  const step1Valid = !errors.companyName && !errors.country && !errors.category && !errors.size;
  const step2Valid = !errors.email && !errors.password;
  const isFormValid = Object.keys(errors).length === 0;
  const passwordStrength = getPasswordStrength(formData.password);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name } = e.target;
      setTouched((prev) => {
        if (name in prev) {
          return { ...prev, [name]: true };
        }
        return prev;
      });
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (step === 1) {
      setTouched((prev) => ({
        ...prev,
        companyName: true,
        country: true,
        category: true,
        size: true,
      }));
      if (step1Valid) setStep(2);
    } else if (step === 2) {
      setTouched((prev) => ({ ...prev, email: true, password: true }));
      if (step2Valid) setStep(3);
    }
  }, [step, step1Valid, step2Valid]);

  const handleBack = useCallback(() => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as StepId) : prev));
  }, []);

  const touchAll = useCallback(() => {
    setTouched({
      companyName: true,
      email: true,
      password: true,
      country: true,
      category: true,
      size: true,
    });
  }, []);

  const togglePassword = useCallback(() => {
    setShowPassword((v) => !v);
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────────────

  const hasTouchedStep1 = touched.companyName || touched.country || touched.category || touched.size;
  const hasTouchedStep2 = touched.email || touched.password;

  return {
    // State
    step,
    setStep,
    formData,
    touched,
    showPassword,
    // Validation
    errors,
    step1Valid,
    step2Valid,
    isFormValid,
    passwordStrength,
    hasTouchedStep1,
    hasTouchedStep2,
    // Handlers
    handleChange,
    handleBlur,
    handleNext,
    handleBack,
    touchAll,
    togglePassword,
  };
}
