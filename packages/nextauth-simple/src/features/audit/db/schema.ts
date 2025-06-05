import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * Audit Logging schema extensions
 */
export const auditLogsTable = pgTable('audit_logs', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id'),
  action: text('action').notNull(),
  resource: text('resource'),
  resourceId: text('resource_id'),
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  status: text('status').notNull(), // 'success', 'failure', etc.
  createdAt: timestamp('created_at').defaultNow().notNull()
});
