import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * Role-Based Access Control schema extensions
 */
export const rolesTable = pgTable('roles', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').notNull(), // Array of permission strings
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const userRolesTable = pgTable('user_roles', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull(),
  roleId: text('role_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
