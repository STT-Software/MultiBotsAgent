import { Suspense } from 'react';
import ResetPasswordContainer from '@/features/password-recovery/ResetPasswordContainer';

function ResetPasswordFallback() {
  return (
    <div className="flex w-full max-w-md items-center justify-center p-6">
      <svg className="h-6 w-6 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContainer />
    </Suspense>
  );
}
