import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de Next.js para gestión de sesión.
 *
 * Estrategia:
 * - La protección de rutas del panel se hace client-side (useSession + refresh token).
 *   El middleware NO bloquea rutas protegidas porque la cookie `refreshToken` tiene
 *   path `/auth/refresh` y no es visible aquí. El client-side intenta refresh al montar.
 *
 * - Lo que SÍ hace el middleware: redirigir usuarios con sesión activa fuera de
 *   login/register para evitar que vean formularios innecesariamente.
 */

const AUTH_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('session');

  // Si el usuario tiene cookie de sesión y visita login/register → dashboard
  const isAuthPage = AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/register'],
};
