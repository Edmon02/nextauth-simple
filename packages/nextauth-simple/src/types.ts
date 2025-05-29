/**
 * Type definitions for NextAuth-Simple
 */

// Configuration options for NextAuth-Simple
export interface NextAuthSimpleConfig {
  // Database connection configuration
  db: {
    client: any; // Drizzle client
    tables: {
      users: any; // Users table schema
      sessions: any; // Sessions table schema
    };
  };
  // Security settings
  security?: {
    bcryptWorkFactor?: number; // Default: 12
    sessionExpiryDays?: number; // Default: 30
    rateLimit?: {
      maxAttempts?: number; // Default: 5
      windowMs?: number; // Default: 5 * 60 * 1000 (5 minutes)
    };
  };
  // URLs
  loginUrl?: string; // Default: '/login'
  publicPaths?: (string | RegExp)[]; // Paths that don't require authentication
}

// User type
export interface User {
  id: string;
  email: string;
  password: string; // Hashed password
  createdAt: Date;
  updatedAt: Date;
}

// Session type
export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Authentication result
export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'password'>;
  error?: string;
  session?: Omit<Session, 'token'>;
}

// Registration input
export interface RegisterInput {
  email: string;
  password: string;
}

// Login input
export interface LoginInput {
  email: string;
  password: string;
}

// Session context for client components
export interface SessionContextType {
  session: Omit<Session, 'token'> | null;
  user: Omit<User, 'password'> | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  refetch: () => Promise<void>;
}
