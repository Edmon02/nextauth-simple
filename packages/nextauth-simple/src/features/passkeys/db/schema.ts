import { pgTable, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * WebAuthn (Passkeys) schema extensions
 */
export const webAuthnCredentialsTable = pgTable('webauthn_credentials', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull(),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: text('counter').notNull(),
  transports: jsonb('transports'), // Array of transports
  deviceType: text('device_type'), // 'platform', 'cross-platform', etc.
  backed: boolean('backed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at')
});

export const webAuthnChallengesTable = pgTable('webauthn_challenges', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id'),
  challenge: text('challenge').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  usedAt: timestamp('used_at')
});
