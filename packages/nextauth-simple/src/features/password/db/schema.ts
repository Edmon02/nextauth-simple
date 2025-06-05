import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Password Reset schema extensions
 */
export const passwordResetTokensTable = pgTable('password_reset_tokens', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  usedAt: timestamp('used_at')
});
