import crypto from 'crypto';
import { type NextRequest } from 'next/server';
import { getCookieHandler } from './cookie-handler';
import { hashPassword, comparePassword } from './utils/password';
import {
  type AuthResult,
  type LoginInput,
  type NextAuthSimpleConfig,
  type RegisterInput,
  type Session,
  type User
} from './types';
import { eq } from 'drizzle-orm';

/**
 * Register a new user with email and password
 * 
 * @param input - Registration input containing email and password
 * @param config - NextAuth-Simple configuration
 * @param req - Optional NextRequest object (for Pages Router)
 * @param res - Optional Response object (for Pages Router)
 * @returns Authentication result
 */
export async function registerUser(
  input: RegisterInput,
  config: NextAuthSimpleConfig,
  req?: NextRequest,
  res?: any
): Promise<AuthResult> {
  try {
    // Validate input
    const validationResult = validateRegistrationInput(input);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }

    const { email, password } = input;
    const { db, security = {} } = config;
    const { bcryptWorkFactor = 12 } = security;

    // Check if user already exists - O(1) with indexed email field
    const existingUser = await db.client
      .select()
      .from(db.tables.users)
      .where(eq(db.tables.users.email, email.toLowerCase()))
      .limit(1)
      .execute();

    if (existingUser.length > 0) {
      return { success: false, error: 'User already exists' };
    }

    // Hash password - O(1) runtime with bcrypt or browser fallback
    const hashedPassword = await hashPassword(password, bcryptWorkFactor);

    // Create user - using Drizzle ORM to prevent SQL injection
    const userId = crypto.randomUUID();
    const now = new Date();

    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: now,
      updatedAt: now
    };

    await db.client.insert(db.tables.users).values(newUser).execute();

    // Create session
    const session = await createSession(userId, config, req, res);

    // Return success with user (excluding password)
    const { password: _, ...userWithoutPassword } = newUser;
    return {
      success: true,
      user: userWithoutPassword,
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Registration failed' };
  }
}

/**
 * Login a user with email and password
 * 
 * @param input - Login input containing email and password
 * @param config - NextAuth-Simple configuration
 * @param req - Optional NextRequest object (for Pages Router)
 * @param res - Optional Response object (for Pages Router)
 * @returns Authentication result
 */
export async function loginUser(
  input: LoginInput,
  config: NextAuthSimpleConfig,
  req?: NextRequest,
  res?: any
): Promise<AuthResult> {
  try {
    // Validate input
    const validationResult = validateLoginInput(input);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }

    const { email, password } = input;
    const { db } = config;

    // Find user by email - O(1) with indexed email field
    const users = await db.client
      .select()
      .from(db.tables.users)
      .where(eq(db.tables.users.email, email.toLowerCase()))
      .limit(1)
      .execute();

    if (users.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const user = users[0] as User;

    // Verify password - O(1) for bcrypt verification or browser fallback
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Create session
    const session = await createSession(user.id, config, req, res);

    // Return success with user (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    return {
      success: true,
      user: userWithoutPassword,
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
}

/**
 * Logout a user by invalidating their session
 * 
 * @param config - NextAuth-Simple configuration
 * @param req - Optional NextRequest object (for Pages Router)
 * @param res - Optional Response object (for Pages Router)
 * @returns Success status
 */
export async function logoutUser(
  config: NextAuthSimpleConfig,
  req?: NextRequest,
  res?: any
): Promise<{ success: boolean }> {
  try {
    const cookieHandler = getCookieHandler(req, res);
    const sessionToken = cookieHandler.get('nextauth-simple-session')?.value;

    if (sessionToken) {
      // Delete session from database - O(1) with indexed token field
      await config.db.client
        .delete(config.db.tables.sessions)
        .where(eq(config.db.tables.sessions.token, sessionToken))
        .execute();

      // Clear cookie
      cookieHandler.delete('nextauth-simple-session');
    }

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false };
  }
}

/**
 * Create a new session for a user
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration
 * @param req - Optional NextRequest object (for Pages Router)
 * @param res - Optional Response object (for Pages Router)
 * @returns Session object
 */
export async function createSession(
  userId: string,
  config: NextAuthSimpleConfig,
  req?: NextRequest,
  res?: any
): Promise<Session> {
  const { db, security = {} } = config;
  const { sessionExpiryDays = 30 } = security;

  // Generate secure random token - cryptographically secure
  const token = crypto.randomUUID();
  const now = new Date();

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + sessionExpiryDays);

  // Create session in database
  const session: Session = {
    id: crypto.randomUUID(),
    userId,
    token,
    expiresAt,
    createdAt: now,
    updatedAt: now
  };

  await db.client.insert(db.tables.sessions).values(session).execute();

  // Set session cookie using the appropriate handler
  const cookieHandler = getCookieHandler(req, res);
  cookieHandler.set({
    name: 'nextauth-simple-session',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/'
  });

  return session;
}

/**
 * Validate registration input
 * 
 * @param input - Registration input
 * @returns Validation result
 */
function validateRegistrationInput(input: RegisterInput): { valid: boolean; error?: string } {
  const { email, password } = input;

  // Validate email
  if (!email || !email.includes('@') || email.length < 5) {
    return { valid: false, error: 'Invalid email address' };
  }

  // Validate password
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  return { valid: true };
}

/**
 * Validate login input
 * 
 * @param input - Login input
 * @returns Validation result
 */
function validateLoginInput(input: LoginInput): { valid: boolean; error?: string } {
  const { email, password } = input;

  // Validate email
  if (!email || !email.includes('@')) {
    return { valid: false, error: 'Invalid email address' };
  }

  // Validate password
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  return { valid: true };
}
