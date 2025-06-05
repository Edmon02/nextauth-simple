import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

/**
 * Two-Factor Authentication schema extensions
 */
export const usersTwoFactorTable = pgTable('users_two_factor', {
  userId: text('user_id').primaryKey().notNull(),
  secret: text('secret').notNull(),
  enabled: boolean('enabled').default(false).notNull(),
  backupCodes: text('backup_codes'), // JSON string of hashed backup codes
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const twoFactorRecoveryCodesTable = pgTable('two_factor_recovery_codes', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull(),
  code: text('code').notNull(), // Hashed recovery code
  used: boolean('used').default(false).notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const twoFactorChallengesTable = pgTable('two_factor_challenges', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull(),
  token: text('token').notNull(), // Challenge token for the session
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
