import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * Social Login schema extensions
 */
export const socialAccountsTable = pgTable('social_accounts', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(), // 'google', 'apple', etc.
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: timestamp('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  profile: jsonb('profile'), // Store the full profile data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
