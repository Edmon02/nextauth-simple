import { type NextRequest } from 'next/server';

// Cookie handling interface to support both App Router and Pages Router
export interface CookieHandler {
  get(name: string): { value: string } | undefined;
  set(cookie: {
    name: string;
    value: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    expires?: Date;
    path?: string;
  }): void;
  delete(name: string): void;
}

// Function to get the appropriate cookie handler based on environment
export function getCookieHandler(req?: NextRequest, res?: any): CookieHandler {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // If we're in a browser or the config specifies to use request/response
  if (isBrowser || (req && res)) {
    // Return a handler that works with request/response objects or document.cookie
    return {
      get: (name: string) => {
        if (req) {
          const cookie = req.cookies.get(name);
          return cookie ? { value: cookie.value } : undefined;
        }
        // Fallback to document.cookie in browser
        const value = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${name}=`))
          ?.split('=')[1];
        return value ? { value } : undefined;
      },
      set: (cookie) => {
        if (res && res.cookies && typeof res.cookies.set === 'function') {
          res.cookies.set(cookie);
        } else if (isBrowser) {
          document.cookie = `${cookie.name}=${cookie.value}; ${
            cookie.httpOnly ? 'HttpOnly;' : ''
          } ${cookie.secure ? 'Secure;' : ''} ${
            cookie.sameSite ? `SameSite=${cookie.sameSite};` : ''
          } ${cookie.expires ? `Expires=${cookie.expires.toUTCString()};` : ''} ${
            cookie.path ? `Path=${cookie.path};` : ''
          }`;
        }
      },
      delete: (name: string) => {
        if (res && res.cookies && typeof res.cookies.delete === 'function') {
          res.cookies.delete(name);
        } else if (isBrowser) {
          document.cookie = `${name}=; Max-Age=0; Path=/;`;
        }
      }
    };
  }
  
  // Try to use next/headers if available (App Router)
  try {
    // Dynamic import to avoid static analysis issues
    const { cookies } = require('next/headers');
    return {
      get: (name: string) => cookies().get(name),
      set: (cookie) => cookies().set(cookie),
      delete: (name: string) => cookies().delete(name)
    };
  } catch (e) {
    // If next/headers is not available, return a dummy handler that logs warnings
    return {
      get: (name: string) => {
        console.warn('Cookie access attempted without proper context. Please provide req/res objects.');
        return undefined;
      },
      set: (cookie) => {
        console.warn('Cookie setting attempted without proper context. Please provide req/res objects.');
      },
      delete: (name: string) => {
        console.warn('Cookie deletion attempted without proper context. Please provide req/res objects.');
      }
    };
  }
}