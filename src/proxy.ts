import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from './lib/auth';

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Define public paths
  const isAuthPage = path === '/login' || path === '/signup';
  
  // Retrieve session cookie
  const sessionCookie = req.cookies.get('session')?.value;
  let userSession = null;

  if (sessionCookie) {
    userSession = await verifySessionToken(sessionCookie);
  }

  // If already authenticated and accessing login/signup, redirect to dashboard
  if (isAuthPage && userSession) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  // If protected route and NOT authenticated, redirect to login
  const isProtectedRoute = path === '/' || path.startsWith('/products') || path.startsWith('/categories');
  if (isProtectedRoute && !userSession) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
