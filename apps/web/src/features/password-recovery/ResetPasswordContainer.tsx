'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useResetPassword } from './hooks';
import { ResetPasswordForm, TokenError } from './components';

/**
 * Contenedor principal del flujo reset-password.
 *
 * - Lee token de query params
 * - Muestra TokenError si no hay token
 * - Orquesta ResetPasswordForm y manejo de errores de token
 * - Redirige a /login?reset=success tras éxito
 */
export default function ResetPasswordContainer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const {
    formState,
    status,
    serverError,
    tokenError,
    validationResult,
    isMatch,
    matchError,
    handleFieldChange,
    submit,
  } = useResetPassword();

  // Success → redirect to login
  useEffect(() => {
    if (status === 'success') {
      router.push('/login?reset=success');
    }
  }, [status, router]);

  // No token in URL → show invalid token error
  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6">
          <TokenError type="TOKEN_INVALID" />
        </div>
      </div>
    );
  }

  // Token error from server response
  if (tokenError) {
    return (
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6">
          <TokenError type={tokenError} />
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return null;
  }

  const handleSubmit = () => {
    submit(token);
  };

  return (
    <div className="w-full max-w-md">
      <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6">
        <ResetPasswordForm
          formState={formState}
          status={status}
          serverError={serverError}
          validationResult={validationResult}
          isMatch={isMatch}
          matchError={matchError}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
