import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

/**
 * Account Verification schema extensions
 */
export const accountVerificationTokensTable = pgTable('account_verification_tokens', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  usedAt: timestamp('used_at')
});

export const userVerificationStatusTable = pgTable('user_verification_status', {
  userId: text('user_id').primaryKey().notNull(),
  verified: boolean('verified').default(false).notNull(),
  verifiedAt: timestamp('verified_at'),
  verificationMethod: text('verification_method'), // 'email', 'phone', etc.
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
