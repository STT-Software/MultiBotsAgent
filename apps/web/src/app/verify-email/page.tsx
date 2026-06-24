import { Suspense } from 'react';

import { EmailVerificationContainer } from '@/features/email-verification/EmailVerificationContainer';

function LoadingFallback() {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-gray-950"
      role="status"
      aria-label="Cargando verificación"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-emerald-500" />
    </div>
  );
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <EmailVerificationContainer token={token ?? null} />
    </Suspense>
  );
}
