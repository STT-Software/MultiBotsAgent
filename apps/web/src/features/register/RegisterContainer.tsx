'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/layout/hooks/use-session';
import { RegisterForm } from './components';

export default function RegisterContainer() {
  const router = useRouter();
  const [hasSessionCookie, setHasSessionCookie] = useState<boolean | null>(null);
  const { session, loading } = useSession();

  useEffect(() => {
    // Check if session cookie exists on mount
    const exists = document.cookie.split(';').some((item) => item.trim().startsWith('session='));
    setHasSessionCookie(exists);
  }, []);

  useEffect(() => {
    if (hasSessionCookie === true && !loading && session !== null) {
      router.push('/dashboard');
    }
  }, [hasSessionCookie, session, loading, router]);

  // If we have a cookie and it's loading/valid, or if we haven't checked yet, show spinner
  if (hasSessionCookie === null || (hasSessionCookie === true && (loading || session !== null))) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return <RegisterForm />;
}
