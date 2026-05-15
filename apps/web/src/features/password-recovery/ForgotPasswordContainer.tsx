'use client';

import { useForgotPassword } from './hooks';
import { ForgotPasswordForm, ResetSuccess } from './components';

/**
 * Contenedor principal del flujo forgot-password.
 *
 * Orquesta el hook de estado/submit y alterna entre:
 * - ForgotPasswordForm (estado idle/loading/error)
 * - ResetSuccess (estado success — mensaje genérico post-envío)
 */
export default function ForgotPasswordContainer() {
  const {
    formState,
    status,
    error,
    handleEmailChange,
    submit,
  } = useForgotPassword();

  // Mostrar mensaje de éxito post-envío
  if (status === 'success') {
    return (
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6">
          <ResetSuccess />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6">
        <ForgotPasswordForm
          formState={formState}
          status={status}
          error={error}
          onEmailChange={handleEmailChange}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
