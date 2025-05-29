import { type NextRequest } from 'next/server';
import { type NextAuthSimpleConfig, type Session, type User } from './types';
import { getCookieHandler } from './cookie-handler';
import { eq } from 'drizzle-orm';

/**
 * Get session from cookie
 * 
 * @param req - Next.js request object (for middleware)
 * @param config - NextAuth-Simple configuration
 * @param res - Optional Response object (for Pages Router)
 * @returns Session object or null
 */
export async function getSessionFromCookie(
  req: NextRequest,
  config: NextAuthSimpleConfig,
  res?: any
): Promise<(Omit<Session, 'token'> & { user: Omit<User, 'password'> }) | null> {
  try {
    const cookieHandler = getCookieHandler(req, res);
    const token = cookieHandler.get('nextauth-simple-session')?.value;

    if (!token) {
      return null;
    }

    return getSessionByToken(token, config);
  } catch (error) {
    console.error('Error getting session from cookie:', error);
    return null;
  }
}

/**
 * Get session from server component
 * 
 * @param config - NextAuth-Simple configuration
 * @param req - Optional NextRequest object (for Pages Router)
 * @param res - Optional Response object (for Pages Router)
 * @returns Session object or null
 */
export async function getServerSession(
  config: NextAuthSimpleConfig,
  req?: NextRequest,
  res?: any
): Promise<(Omit<Session, 'token'> & { user: Omit<User, 'password'> }) | null> {
  try {
    const cookieHandler = getCookieHandler(req, res);
    const token = cookieHandler.get('nextauth-simple-session')?.value;

    if (!token) {
      return null;
    }

    return getSessionByToken(token, config);
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}

/**
 * Get session by token
 * 
 * @param token - Session token
 * @param config - NextAuth-Simple configuration
 * @returns Session object or null
 */
async function getSessionByToken(
  token: string,
  config: NextAuthSimpleConfig
): Promise<(Omit<Session, 'token'> & { user: Omit<User, 'password'> }) | null> {
  try {
    const { db } = config;

    // Get session from database - O(1) with indexed token field
    const sessions = await db.client
      .select()
      .from(db.tables.sessions)
      .where(eq(db.tables.sessions.token, token))
      .limit(1)
      .execute();

    if (sessions.length === 0) {
      return null;
    }

    const session = sessions[0] as Session;

    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      // Delete expired session
      await db.client
        .delete(db.tables.sessions)
        .where(eq(db.tables.sessions.id, session.id))
        .execute();

      return null;
    }

    // Get user from database - O(1) with indexed id field
    const users = await db.client
      .select()
      .from(db.tables.users)
      .where(eq(db.tables.users.id, session.userId))
      .limit(1)
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0] as User;

    // Return session with user (excluding sensitive fields)
    const { token: _, ...sessionWithoutToken } = session;
    const { password: __, ...userWithoutPassword } = user;

    return {
      ...sessionWithoutToken,
      user: userWithoutPassword
    };
  } catch (error) {
    console.error('Error getting session by token:', error);
    return null;
  }
}
