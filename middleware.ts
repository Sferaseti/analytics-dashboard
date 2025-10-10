import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth/session';

const protectedRoutes = '/dashboard';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  const isProtectedRoute = pathname.startsWith(protectedRoutes);

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  let res = NextResponse.next();

  if (sessionCookie && request.method === 'GET') {
    try {
      const parsed = await verifyToken(sessionCookie.value);
      const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Проверяем роль пользователя и перенаправляем супер-админов
      if (parsed.role === 'super_admin') {
        // Если супер-админ пытается зайти на обычный дашборд, перенаправляем на админ-панель
        if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
          // Исключаем админ-панель из перенаправления
          if (!pathname.startsWith('/dashboard/admin')) {
            return NextResponse.redirect(new URL('/admin', request.url));
          }
        }
        // Если супер-админ заходит на корень дашборда, перенаправляем на админ-панель
        if (pathname === '/dashboard') {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      }

      res.cookies.set({
        name: 'session',
        value: await signToken({
          ...parsed,
          expires: expiresInOneDay.toISOString()
        }),
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        expires: expiresInOneDay
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.cookies.delete('session');
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs'
};
