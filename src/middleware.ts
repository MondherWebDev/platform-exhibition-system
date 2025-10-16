import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Only protect dashboard routes
  if (path.startsWith('/dashboard/')) {
    // Check for any authentication indicators
    const allCookies = request.cookies.getAll();
    const authCookies = allCookies.filter(cookie =>
      cookie.name.includes('firebase') ||
      cookie.name.includes('auth') ||
      cookie.name.includes('session') ||
      cookie.name.startsWith('__')
    );

    // Check for Authorization header (if using custom auth)
    const authHeader = request.headers.get('authorization');

    // In development, be more permissive
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasAuthCookie = authCookies.length > 1; // More than just __next_hmr_refresh_hash__
    const hasAuthHeader = !!authHeader;

    console.log('🔐 MIDDLEWARE DEBUG: All cookies:', allCookies.map(c => c.name));
    console.log('🔐 MIDDLEWARE DEBUG: Auth cookies:', authCookies.map(c => c.name));
    console.log('🔐 MIDDLEWARE DEBUG: Has auth header:', hasAuthHeader);
    console.log('🔐 MIDDLEWARE DEBUG: Is development:', isDevelopment);
    console.log('🔐 MIDDLEWARE DEBUG: Path:', path);

    // Allow access if authenticated or in development with auth cookies
    if (hasAuthCookie || hasAuthHeader || isDevelopment) {
      console.log('🔐 MIDDLEWARE DEBUG: Allowing access');
      return NextResponse.next();
    } else {
      console.log('🔐 MIDDLEWARE DEBUG: No authentication found, redirecting to signin');
      return NextResponse.redirect(new URL('/signin', request.url));
    }
  }

  // For all other routes (including /test), allow access without authentication
  console.log('🔐 MIDDLEWARE DEBUG: Non-protected route, allowing access');
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/test/:path*',
  ],
};
