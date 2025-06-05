// src/lib/auth.ts
import { initializeNextAuthSimple, createDefaultConfig, schema } from 'nextauth-simple';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create database client
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/nextauth_simple';
const client = postgres(connectionString);
const db = drizzle(client);

// Create default configuration with all features disabled
const defaultConfig = createDefaultConfig({
  client: db,
  tables: {
    users: schema.users,
    sessions: schema.sessions
  }
});

// NextAuth-Simple configuration
export const config = {
  ...defaultConfig,
  features: {
    ...defaultConfig.features,
    twoFactor: {
      ...defaultConfig.features?.twoFactor,
      enabled: true,
      issuer: 'My App'
    },
    passwordReset: {
      ...defaultConfig.features?.passwordReset,
      enabled: true,
      tokenExpiryMinutes: 30,
      emailSubject: 'Reset your password for My App'
    }
    // Enable other features as needed
  },
  loginUrl: '/login',
  publicPaths: ['/login', '/register', '/api/auth']
};