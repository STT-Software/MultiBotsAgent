'use client';

import { useState, useCallback, useMemo } from 'react';
import type { LoginFormData, LoginFormErrors, LoginTouchedFields } from '../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useLoginForm() {
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
  const [touched, setTouched] = useState<LoginTouchedFields>({ email: false, password: false });
  const [showPassword, setShowPassword] = useState(false);

  const errors = useMemo<LoginFormErrors>(() => {
    const e: LoginFormErrors = {};
    if (!formData.email.trim()) {
      e.email = 'El email es obligatorio';
    } else if (!EMAIL_REGEX.test(formData.email)) {
      e.email = 'Formato de email inválido';
    }
    if (!formData.password) {
      e.password = 'La contraseña es obligatoria';
    }
    return e;
  }, [formData]);

  const isFormValid = Object.keys(errors).length === 0;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const touchAll = useCallback(() => {
    setTouched({ email: true, password: true });
  }, []);

  const togglePassword = useCallback(() => {
    setShowPassword((v) => !v);
  }, []);

  const fieldError = (field: keyof LoginFormErrors): string | undefined => {
    if (touched[field] && errors[field]) return errors[field];
    return undefined;
  };

  return {
    formData,
    touched,
    showPassword,
    errors,
    isFormValid,
    handleChange,
    handleBlur,
    touchAll,
    togglePassword,
    fieldError,
  };
}
