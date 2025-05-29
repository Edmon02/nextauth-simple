import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export { schema };

/**
 * Create a Drizzle ORM client for PostgreSQL
 * 
 * @param connectionString - PostgreSQL connection string
 * @returns Drizzle ORM client
 */
export function createDrizzleClient(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

/**
 * Export database schema and client creation function
 */
export const db = {
  schema,
  createClient: createDrizzleClient
};
