# NextAuth-Simple

A minimal, highly opinionated authentication library tailored exclusively for the Next.js App Router, focusing solely on secure email/password (credential) authentication with database-backed sessions.

## Features

- **Focused Functionality**: Email/password authentication only, no OAuth complexity
- **Next.js App Router Integration**: Designed specifically for the latest Next.js patterns
- **Type Safety**: Written in TypeScript with strict type checking
- **Security Best Practices**: Secure password hashing, HTTP-only cookies, CSRF protection
- **Performance Optimized**: O(1) lookups for critical operations
- **Database Integration**: PostgreSQL support via Drizzle ORM

## Installation

```bash
# Using bun (recommended)
bun add nextauth-simple

# Using npm
npm install nextauth-simple

# Using yarn
yarn add nextauth-simple

# Using pnpm
pnpm add nextauth-simple
```

## Quick Start

### 1. Set up your database

First, create the necessary database tables using Drizzle ORM:

```typescript
// db/schema.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));
```

### 2. Configure NextAuth-Simple

Create a configuration file for NextAuth-Simple:

```typescript
// lib/auth.ts
import { createDrizzleClient } from 'nextauth-simple/db';
import { NextAuthSimpleConfig } from 'nextauth-simple';
import { schema } from 'nextauth-simple/db';

// Database connection string from environment variable
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/nextauth_simple';

// Create Drizzle client
const drizzleClient = createDrizzleClient(connectionString);

// NextAuth-Simple configuration
export const config: NextAuthSimpleConfig = {
  db: {
    client: drizzleClient,
    tables: {
      users: schema.users,
      sessions: schema.sessions
    }
  },
  security: {
    bcryptWorkFactor: 12, // Default: 12
    sessionExpiryDays: 30, // Default: 30
    rateLimit: {
      maxAttempts: 5, // Default: 5
      windowMs: 5 * 60 * 1000 // Default: 5 minutes
    }
  },
  loginUrl: '/login', // Default: '/login'
  publicPaths: ['/login', '/register', '/api/auth'] // Paths that don't require authentication
};
```

### 3. Set up API Routes

Create the necessary API routes for authentication:

```typescript
// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from 'nextauth-simple';
import { config } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Attempt registration
    const result = await registerUser({ email, password }, config);
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error || 'Registration failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from 'nextauth-simple';
import { config } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Attempt login
    const result = await loginUser({ email, password }, config);
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error || 'Login failed' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from 'nextauth-simple';
import { config } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Attempt logout
    const result = await logoutUser(config);
    
    if (result.success) {
      // Redirect to login page after logout
      return NextResponse.redirect(new URL('/login', request.url));
    } else {
      return NextResponse.json(
        { error: 'Logout failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'nextauth-simple';
import { config } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(config);
    
    if (session) {
      return NextResponse.json({ 
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        }, 
        user: session.user 
      });
    } else {
      return NextResponse.json({ session: null, user: null });
    }
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
```

### 4. Set up Middleware for Route Protection

Create a middleware file to protect routes:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authMiddleware } from 'nextauth-simple';
import { config } from '@/lib/auth';

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
    ...config,
    publicPaths
  });
}

// Configure middleware to run on specific paths
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 5. Set up Client Components

Wrap your application with the SessionProvider in your root layout:

```typescript
// app/layout.tsx
'use client';

import { SessionProvider } from 'nextauth-simple';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

### 6. Access Session in Client Components

Use the `useSession` hook to access the session in client components:

```typescript
// app/profile/page.tsx
'use client';

import { useSession } from 'nextauth-simple';

export default function ProfilePage() {
  const { session, user, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <div>You are not authenticated</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>Email: {user?.email}</p>
      <pre>{JSON.stringify({ session, user }, null, 2)}</pre>
    </div>
  );
}
```

### 7. Access Session in Server Components

Use the `getServerSession` function to access the session in server components:

```typescript
// app/dashboard/page.tsx
import { getServerSession } from 'nextauth-simple';
import { config } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession(config);

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {session.user.email}</p>
    </div>
  );
}
```

## API Reference

### Core Functions

#### `registerUser(input, config)`

Registers a new user with email and password.

```typescript
import { registerUser } from 'nextauth-simple';

const result = await registerUser(
  { email: 'user@example.com', password: 'securepassword' },
  config
);

if (result.success) {
  // User registered successfully
  console.log(result.user); // User data (without password)
  console.log(result.session); // Session data
} else {
  // Registration failed
  console.error(result.error);
}
```

#### `loginUser(input, config)`

Authenticates a user with email and password.

```typescript
import { loginUser } from 'nextauth-simple';

const result = await loginUser(
  { email: 'user@example.com', password: 'securepassword' },
  config
);

if (result.success) {
  // User logged in successfully
  console.log(result.user); // User data (without password)
  console.log(result.session); // Session data
} else {
  // Login failed
  console.error(result.error);
}
```

#### `logoutUser(config)`

Logs out the current user by invalidating their session.

```typescript
import { logoutUser } from 'nextauth-simple';

const result = await logoutUser(config);

if (result.success) {
  // User logged out successfully
} else {
  // Logout failed
}
```

#### `getServerSession(config)`

Gets the current session in server components.

```typescript
import { getServerSession } from 'nextauth-simple';

const session = await getServerSession(config);

if (session) {
  // User is authenticated
  console.log(session.user); // User data (without password)
} else {
  // No active session
}
```

### Client Hooks

#### `useSession()`

React hook for accessing session data in client components.

```typescript
import { useSession } from 'nextauth-simple';

function MyComponent() {
  const { session, user, status, refetch } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      <button onClick={refetch}>Refresh session</button>
    </div>
  );
}
```

### Middleware

#### `authMiddleware(request, config)`

Middleware function for protecting routes based on authentication status.

```typescript
import { authMiddleware } from 'nextauth-simple';

export function middleware(request) {
  return authMiddleware(request, {
    ...config,
    publicPaths: ['/login', '/register', '/api/auth']
  });
}
```

## Configuration Options

The `NextAuthSimpleConfig` interface provides the following configuration options:

```typescript
interface NextAuthSimpleConfig {
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
```

## Security Considerations

NextAuth-Simple implements several security best practices:

1. **Password Hashing**: Uses bcrypt with a configurable work factor (default: 12) for secure password hashing.
2. **Session Management**: Generates cryptographically secure session tokens using `crypto.randomUUID()`.
3. **Secure Cookies**: Stores session tokens in HTTP-only, Secure, SameSite=Strict cookies to prevent XSS and CSRF attacks.
4. **Rate Limiting**: Implements rate limiting on login attempts to prevent brute-force attacks.
5. **Input Validation**: Validates all inputs (email format, password strength) with clear error messages.
6. **SQL Injection Prevention**: Uses Drizzle ORM's query builder to prevent SQL injection.
7. **Session Expiry**: Ensures session tokens expire after a configurable period (default: 30 days) and supports token invalidation on logout.

## Performance Considerations

NextAuth-Simple is optimized for performance:

1. **O(1) Lookups**: Uses indexed database fields for email and session token lookups.
2. **Minimal Database Queries**: Optimizes database access patterns to minimize queries.
3. **Efficient Password Hashing**: Uses bcrypt with a configurable work factor to balance security and performance.
4. **Type Safety**: Ensures compile-time type checking catches errors early, with no runtime type errors.

## Troubleshooting

### Common Issues

#### Cookies Not Being Set

If cookies are not being set properly, ensure:

1. Your application is running on HTTPS in production.
2. You're not trying to access cookies across different domains.
3. The `SameSite` attribute is compatible with your application's architecture.

#### Session Not Persisting

If sessions are not persisting:

1. Check that your database connection is stable.
2. Verify that the session table has the correct schema.
3. Ensure cookies are being set correctly.

#### Authentication Failing

If authentication is failing:

1. Check that the email and password are being sent correctly.
2. Verify that the user exists in the database.
3. Ensure the password is being hashed and compared correctly.

## Limitations

NextAuth-Simple is intentionally limited in scope:

1. **Email/Password Only**: Does not support OAuth or other authentication providers.
2. **Next.js App Router Only**: Not compatible with the Pages Router or other frameworks.
3. **PostgreSQL Focus**: Primarily designed for PostgreSQL via Drizzle ORM.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
