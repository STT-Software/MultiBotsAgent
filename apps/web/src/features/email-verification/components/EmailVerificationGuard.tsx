'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthStore, refreshAccessToken } from '@/lib/auth';
import { useEmailVerificationGuard } from '../hooks/useEmailVerificationGuard';
import { BlockedScreen } from './BlockedScreen';

interface EmailVerificationGuardProps {
  children: React.ReactNode;
}

// ─── JWT Decode Utility ──────────────────────────────────────────────────────

interface JwtPayload {
  userId: string;
  companyId: string;
  email: string;
  emailVerified: boolean;
  iat: number;
  exp: number;
}

/**
 * Decodes a JWT payload without verification (client-side only).
 * The token is already verified by the server; we just need the claims.
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Polling Interval (ms) ───────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;

/**
 * Client Component wrapper que evalúa el estado de verificación de email
 * y bloquea el acceso a contenido protegido si el email no está verificado.
 *
 * Implementa polling cada 5s para detectar cambio de estado (e.g., usuario
 * verificó en otra pestaña) y redirigir al dashboard automáticamente.
 *
 * Estado derivado directamente del JWT — no se usa useEffect para derivar estado.
 * El useEffect se usa exclusivamente para el ciclo de vida del polling (side effect).
 *
 * Requisitos: 6.1, 6.2, 6.4, 6.5
 */
export function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const router = useRouter();
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // State to trigger re-renders when token changes via polling
  const [tokenVersion, setTokenVersion] = useState(0);

  // Derive verification state directly from JWT claims (no useEffect for derivation)
  const token = AuthStore.getToken();
  const payload = token ? decodeJwtPayload(token) : null;

  const { isBlocked, email } = useEmailVerificationGuard({
    emailVerified: payload?.emailVerified ?? true,
    email: payload?.email,
  });

  // ─── Polling Side Effect ─────────────────────────────────────────────────
  // useEffect is used ONLY for the polling lifecycle (start/stop/cleanup),
  // NOT for deriving state from emailVerified.

  useEffect(() => {
    if (!isBlocked) return;

    pollIntervalRef.current = setInterval(async () => {
      // Refresh the access token to get updated emailVerified claim
      const refreshed = await refreshAccessToken();
      if (!refreshed) return;

      // Check the new token's payload
      const newToken = AuthStore.getToken();
      if (!newToken) return;

      const newPayload = decodeJwtPayload(newToken);
      if (newPayload?.emailVerified) {
        // Email was verified — trigger re-render and navigate
        setTokenVersion((v) => v + 1);
        router.refresh();
      } else {
        // Token refreshed but still not verified — trigger re-render to sync state
        setTokenVersion((v) => v + 1);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isBlocked, router]);

  // Suppress unused variable warning — tokenVersion is used to trigger re-renders
  void tokenVersion;

  if (isBlocked) {
    return <BlockedScreen email={email} />;
  }

  return <>{children}</>;
}
