import { createDrizzleClient, NextAuthSimpleConfig, schema } from 'nextauth-simple';

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
    bcryptWorkFactor: 12,
    sessionExpiryDays: 30,
    rateLimit: {
      maxAttempts: 5,
      windowMs: 5 * 60 * 1000 // 5 minutes
    }
  },
  loginUrl: '/login',
  publicPaths: ['/login', '/register', '/api/auth']
};
