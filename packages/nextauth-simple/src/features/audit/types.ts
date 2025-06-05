import { NextAuthSimpleConfig } from '../../core/types';
import { NextAuthSimpleConfigWithTwoFactor } from '../twoFactor/types';
import { NextAuthSimpleConfigWithMagicUrl } from '../magicUrl/types';
import { NextAuthSimpleConfigWithSocial } from '../social/types';
import { NextAuthSimpleConfigWithPasswordReset } from '../password/types';
import { NextAuthSimpleConfigWithRbac } from '../rbac/types';
import { NextAuthSimpleConfigWithPasskeys } from '../passkeys/types';
import { NextAuthSimpleConfigWithVerification } from '../verification/types';

/**
 * Audit Logging configuration
 */
export interface AuditConfig {
  enabled: boolean;
  logLogin?: boolean; // Whether to log login attempts (default: true)
  logRegistration?: boolean; // Whether to log registrations (default: true)
  logPasswordReset?: boolean; // Whether to log password resets (default: true)
  logAccountVerification?: boolean; // Whether to log account verifications (default: true)
  logRoleChanges?: boolean; // Whether to log role changes (default: true)
  logCredentialChanges?: boolean; // Whether to log credential changes (default: true)
  logSessionOperations?: boolean; // Whether to log session operations (default: true)
  retentionDays?: number; // How long to keep audit logs (default: 90 days)
}

/**
 * Extended NextAuthSimpleConfig with Audit Logging
 */
export interface NextAuthSimpleConfigWithAudit extends NextAuthSimpleConfig {
  features?: {
    twoFactor?: NextAuthSimpleConfigWithTwoFactor['features'];
    magicUrl?: NextAuthSimpleConfigWithMagicUrl['features'];
    social?: NextAuthSimpleConfigWithSocial['features'];
    passwordReset?: NextAuthSimpleConfigWithPasswordReset['features'];
    rbac?: NextAuthSimpleConfigWithRbac['features'];
    passkeys?: NextAuthSimpleConfigWithPasskeys['features'];
    verification?: NextAuthSimpleConfigWithVerification['features'];
    audit?: AuditConfig;
    // Other features will be added here
  };
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  createdAt: Date;
}

/**
 * Audit log creation input
 */
export interface CreateAuditLogInput {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'info' | 'warning';
}

/**
 * Audit log query options
 */
export interface AuditLogQueryOptions {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit log query result
 */
export interface AuditLogQueryResult {
  success: boolean;
  error?: string;
  logs?: AuditLog[];
  total?: number;
}
