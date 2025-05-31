import type { Config } from 'drizzle-kit';

export default {
  schema: './packages/nextauth-simple/src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'nextauth_simple',
  },
} satisfies Config;
