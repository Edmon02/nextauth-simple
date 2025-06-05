import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Magic URL (Passwordless Email) schema extensions
 */
export const magicUrlTokensTable = pgTable('magic_url_tokens', {
  id: text('id').primaryKey().notNull(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  usedAt: timestamp('used_at'),
  callbackUrl: text('callback_url')
});
