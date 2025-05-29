import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Users table schema
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Sessions table schema
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Relations between tables
 */
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));
