'use client';

import { useState, useEffect, useRef } from 'react';
import { validatePassword } from '@multibotagents/core';
import type { PasswordValidationResult } from '@multibotagents/types';

const MATCH_DEBOUNCE_MS = 300;

export interface UsePasswordValidationParams {
  newPassword: string;
  confirmPassword: string;
}

export interface UsePasswordValidationReturn {
  /** Resultado de validación de reglas de la nueva contraseña. */
  validationResult: PasswordValidationResult;
  /** null si confirmación vacía/no interactuada, true si coincide, false si no. */
  isMatch: boolean | null;
  /** Mensaje de error cuando las contraseñas no coinciden, null en caso contrario. */
  matchError: string | null;
}

/**
 * Hook de validación de contraseña en tiempo real.
 *
 * - Ejecuta `validatePassword` en cada cambio de `newPassword` (keystroke).
 * - Valida coincidencia con confirmación usando debounce de 300ms.
 * - No muestra error de coincidencia si confirmPassword está vacío.
 *
 * @param params - newPassword y confirmPassword actuales
 * @returns Estado de validación de reglas y coincidencia
 */
export function usePasswordValidation({
  newPassword,
  confirmPassword,
}: UsePasswordValidationParams): UsePasswordValidationReturn {
  // Validación de reglas en tiempo real (sin debounce)
  const [validationResult, setValidationResult] = useState<PasswordValidationResult>(() =>
    validatePassword(newPassword),
  );

  // Estado de coincidencia con debounce
  const [isMatch, setIsMatch] = useState<boolean | null>(null);

  // Ref para rastrear si el usuario ha interactuado con el campo de confirmación
  const hasInteractedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Actualizar validación de reglas en cada cambio de newPassword
  useEffect(() => {
    setValidationResult(validatePassword(newPassword));
  }, [newPassword]);

  // Marcar interacción cuando confirmPassword tiene contenido
  useEffect(() => {
    if (confirmPassword.length > 0) {
      hasInteractedRef.current = true;
    }
  }, [confirmPassword]);

  // Validación de coincidencia con debounce
  useEffect(() => {
    // Limpiar timer anterior
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // No validar si confirmPassword está vacío o no ha sido interactuado
    if (!confirmPassword || !hasInteractedRef.current) {
      setIsMatch(null);
      return;
    }

    // Debounce de 300ms para la validación de coincidencia
    debounceTimerRef.current = setTimeout(() => {
      setIsMatch(newPassword === confirmPassword);
    }, MATCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [newPassword, confirmPassword]);

  // Derivar mensaje de error de coincidencia
  const matchError: string | null =
    isMatch === false ? 'Las contraseñas no coinciden' : null;

  return {
    validationResult,
    isMatch,
    matchError,
  };
}
