import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authMiddleware } from 'nextauth-simple';
import { config as authConfig } from '@/lib/auth';

// Define public paths that don't require authentication
const publicPaths = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/session'
];

// Export middleware function
export function middleware(request: NextRequest) {
  return authMiddleware(request, {
    ...authConfig,
    publicPaths
  });
}

// Configure middleware to run on specific paths
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
