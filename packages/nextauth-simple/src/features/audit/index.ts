import crypto from 'crypto';
import { 
  type CreateAuditLogInput,
  type AuditLogQueryOptions,
  type AuditLogQueryResult,
  type NextAuthSimpleConfigWithAudit,
  type AuditLog
} from './types';
import { auditLogsTable } from './db/schema';

/**
 * Create an audit log entry
 * 
 * @param input - Audit log creation input
 * @param config - NextAuth-Simple configuration with Audit
 * @returns Success status
 */
export async function createAuditLog(
  input: CreateAuditLogInput,
  config: NextAuthSimpleConfigWithAudit
): Promise<{ success: boolean; error?: string; log?: AuditLog }> {
  try {
    const { db } = config;
    const auditConfig = config.features?.audit;
    
    if (!auditConfig?.enabled) {
      return { success: false, error: 'Audit logging is not enabled' };
    }
    
    // Check if this type of action should be logged
    if (!shouldLogAction(input.action, auditConfig)) {
      return { success: true }; // Silently skip logging
    }
    
    // Create log entry
    const id = crypto.randomUUID();
    const now = new Date();
    
    const log: AuditLog = {
      id,
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      details: input.details,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: input.status,
      createdAt: now
    };
    
    await db.client.insert(auditLogsTable).values(log).execute();
    
    return {
      success: true,
      log
    };
  } catch (error) {
    console.error('Error creating audit log:', error);
    return { success: false, error: 'Failed to create audit log' };
  }
}

/**
 * Query audit logs
 * 
 * @param options - Audit log query options
 * @param config - NextAuth-Simple configuration with Audit
 * @returns Audit log query result
 */
export async function queryAuditLogs(
  options: AuditLogQueryOptions,
  config: NextAuthSimpleConfigWithAudit
): Promise<AuditLogQueryResult> {
  try {
    const { db } = config;
    const auditConfig = config.features?.audit;
    
    if (!auditConfig?.enabled) {
      return { success: false, error: 'Audit logging is not enabled' };
    }
    
    // Build query
    let query = db.client.select().from(auditLogsTable);
    
    // Apply filters
    if (options.userId) {
      query = query.where((eb: any) => eb.eq(auditLogsTable.userId, options.userId));
    }
    
    if (options.action) {
      query = query.where((eb: any) => eb.eq(auditLogsTable.action, options.action));
    }
    
    if (options.resource) {
      query = query.where((eb: any) => eb.eq(auditLogsTable.resource, options.resource));
    }
    
    if (options.resourceId) {
      query = query.where((eb: any) => eb.eq(auditLogsTable.resourceId, options.resourceId));
    }
    
    if (options.status) {
      query = query.where((eb: any) => eb.eq(auditLogsTable.status, options.status));
    }
    
    if (options.startDate) {
      query = query.where((eb: any) => eb.gte(auditLogsTable.createdAt, options.startDate));
    }
    
    if (options.endDate) {
      query = query.where((eb: any) => eb.lte(auditLogsTable.createdAt, options.endDate));
    }
    
    // Get total count
    const countQuery = query.toSQL();
    const countResult = await db.client.execute(
      `SELECT COUNT(*) as total FROM (${countQuery.sql}) as count_query`,
      countQuery.params
    );
    
    const total = parseInt(countResult[0]?.total || '0', 10);
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.offset(options.offset);
    }
    
    // Order by creation date, newest first
    query = query.orderBy((eb: any) => eb.desc(auditLogsTable.createdAt));
    
    // Execute query
    const logs = await query.execute();
    
    return {
      success: true,
      logs: logs as AuditLog[],
      total
    };
  } catch (error) {
    console.error('Error querying audit logs:', error);
    return { success: false, error: 'Failed to query audit logs' };
  }
}

/**
 * Clean up old audit logs
 * 
 * @param config - NextAuth-Simple configuration with Audit
 * @returns Success status
 */
export async function cleanupAuditLogs(
  config: NextAuthSimpleConfigWithAudit
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
  try {
    const { db } = config;
    const auditConfig = config.features?.audit;
    
    if (!auditConfig?.enabled) {
      return { success: false, error: 'Audit logging is not enabled' };
    }
    
    const retentionDays = auditConfig.retentionDays || 90;
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Delete old logs
    const result = await db.client
      .delete(auditLogsTable)
      .where((eb: any) => eb.lt(auditLogsTable.createdAt, cutoffDate))
      .execute();
    
    return {
      success: true,
      deletedCount: result.rowCount
    };
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    return { success: false, error: 'Failed to clean up audit logs' };
  }
}

/**
 * Get audit log by ID
 * 
 * @param id - Audit log ID
 * @param config - NextAuth-Simple configuration with Audit
 * @returns Audit log
 */
export async function getAuditLog(
  id: string,
  config: NextAuthSimpleConfigWithAudit
): Promise<{ success: boolean; error?: string; log?: AuditLog }> {
  try {
    const { db } = config;
    const auditConfig = config.features?.audit;
    
    if (!auditConfig?.enabled) {
      return { success: false, error: 'Audit logging is not enabled' };
    }
    
    // Get log
    const logs = await db.client
      .select()
      .from(auditLogsTable)
      .where((eb: any) => eb.eq(auditLogsTable.id, id))
      .limit(1)
      .execute();
    
    if (logs.length === 0) {
      return { success: false, error: 'Audit log not found' };
    }
    
    return {
      success: true,
      log: logs[0] as AuditLog
    };
  } catch (error) {
    console.error('Error getting audit log:', error);
    return { success: false, error: 'Failed to get audit log' };
  }
}

/**
 * Check if an action should be logged based on configuration
 * 
 * @param action - Action name
 * @param config - Audit configuration
 * @returns Whether the action should be logged
 */
function shouldLogAction(action: string, config: any): boolean {
  // Always log if not specifically disabled
  if (action.startsWith('login') && config.logLogin === false) {
    return false;
  }
  
  if (action.startsWith('register') && config.logRegistration === false) {
    return false;
  }
  
  if (action.startsWith('password.reset') && config.logPasswordReset === false) {
    return false;
  }
  
  if (action.startsWith('verification') && config.logAccountVerification === false) {
    return false;
  }
  
  if (action.startsWith('role') && config.logRoleChanges === false) {
    return false;
  }
  
  if (action.startsWith('credential') && config.logCredentialChanges === false) {
    return false;
  }
  
  if (action.startsWith('session') && config.logSessionOperations === false) {
    return false;
  }
  
  return true;
}
