import { type NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from './session';
import { type NextAuthSimpleConfig } from './types';

/**
 * Middleware function for protecting routes based on authentication status
 * 
 * @param req - The Next.js request object
 * @param config - Configuration options for NextAuth-Simple
 * @returns NextResponse object
 */
export async function authMiddleware(
  req: NextRequest,
  config: NextAuthSimpleConfig
) {
  const { loginUrl = '/login', publicPaths = [] } = config;
  const path = req.nextUrl.pathname;
  
  // Check if the path is public
  if (publicPaths.some(publicPath => 
    publicPath instanceof RegExp 
      ? publicPath.test(path) 
      : path === publicPath || path.startsWith(`${publicPath}/`)
  )) {
    return NextResponse.next();
  }
  
  // Get session from cookie with O(1) lookup
  const session = await getSessionFromCookie(req, config);
  
  // If no session, redirect to login
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = loginUrl;
    url.searchParams.set('callbackUrl', encodeURIComponent(req.url));
    return NextResponse.redirect(url);
  }
  
  // User is authenticated, proceed
  return NextResponse.next();
}
