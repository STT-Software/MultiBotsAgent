import { Suspense } from 'react';
import { EmailVerificationGuard } from '@/features/email-verification/components/EmailVerificationGuard';

/**
 * Layout para rutas protegidas.
 * Aplica el guard de verificación de email envuelto en Suspense
 * para evitar CSR bailout.
 *
 * Requisitos: 6.1, 6.2, 6.4, 6.5
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <EmailVerificationGuard>{children}</EmailVerificationGuard>
    </Suspense>
  );
}
