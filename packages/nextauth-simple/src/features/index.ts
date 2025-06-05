import { NextAuthSimpleConfig } from '../core/types';
import { TwoFactorConfig } from './twoFactor/types';
import { MagicUrlConfig } from './magicUrl/types';
import { SocialLoginConfig } from './social/types';
import { PasswordResetConfig } from './password/types';
import { RbacConfig } from './rbac/types';
import { PasskeysConfig } from './passkeys/types';
import { VerificationConfig } from './verification/types';
import { AuditConfig } from './audit/types';

/**
 * Complete NextAuthSimpleConfig with all features
 */
export interface NextAuthSimpleConfigWithAllFeatures extends NextAuthSimpleConfig {
  features?: {
    twoFactor?: TwoFactorConfig;
    magicUrl?: MagicUrlConfig;
    social?: SocialLoginConfig;
    passwordReset?: PasswordResetConfig;
    rbac?: RbacConfig;
    passkeys?: PasskeysConfig;
    verification?: VerificationConfig;
    audit?: AuditConfig;
  };
}

/**
 * Feature integration helpers
 */

// Re-export all feature modules
export * from './twoFactor';
export * from './magicUrl';
export * from './social';
export * from './password';
export * from './rbac';
export * from './passkeys';
export * from './verification';
export * from './audit';

// Re-export all feature types
export * from './twoFactor/types';
export * from './magicUrl/types';
export * from './social/types';
export * from './password/types';
export * from './rbac/types';
export * from './passkeys/types';
export * from './verification/types';
export * from './audit/types';

/**
 * Initialize all enabled features
 * 
 * @param config - NextAuth-Simple configuration with all features
 * @returns Success status
 */
export async function initializeFeatures(
  config: NextAuthSimpleConfigWithAllFeatures
): Promise<{ success: boolean; error?: string }> {
  try {
    // Initialize RBAC if enabled
    if (config.features?.rbac?.enabled) {
      const { initializeDefaultRoles } = await import('./rbac');
      await initializeDefaultRoles(config as any);
    }

    // Initialize other features as needed

    return { success: true };
  } catch (error) {
    console.error('Error initializing features:', error);
    return { success: false, error: 'Failed to initialize features' };
  }
}

/**
 * Validate configuration for all enabled features
 * 
 * @param config - NextAuth-Simple configuration with all features
 * @returns Validation result
 */
export function validateFeatureConfig(
  config: NextAuthSimpleConfigWithAllFeatures
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate database connection
  if (!config.db || !config.db.client || !config.db.tables) {
    errors.push('Database configuration is required for all features');
  }

  // Validate Two-Factor Authentication config
  if (config.features?.twoFactor?.enabled) {
    if (!config.features.twoFactor.issuer) {
      errors.push('Two-Factor Authentication requires an issuer name');
    }
  }

  // Validate Magic URL config
  if (config.features?.magicUrl?.enabled) {
    if (!config.features.magicUrl.tokenExpiryMinutes || config.features.magicUrl.tokenExpiryMinutes <= 0) {
      errors.push('Magic URL requires a positive token expiry time');
    }
  }

  // Validate Social Login config
  if (config.features?.social?.enabled) {
    if (!config.features.social.providers || Object.keys(config.features.social.providers).length === 0) {
      errors.push('Social Login requires at least one provider configuration');
    }
  }

  // Validate Password Reset config
  if (config.features?.passwordReset?.enabled) {
    if (!config.features.passwordReset.tokenExpiryMinutes || config.features.passwordReset.tokenExpiryMinutes <= 0) {
      errors.push('Password Reset requires a positive token expiry time');
    }
  }

  // Validate RBAC config
  if (config.features?.rbac?.enabled) {
    // No specific validation needed
  }

  // Validate Passkeys config
  if (config.features?.passkeys?.enabled) {
    if (!config.features.passkeys.rpName) {
      errors.push('Passkeys requires a Relying Party name');
    }
  }

  // Validate Account Verification config
  if (config.features?.verification?.enabled) {
    if (!config.features.verification.tokenExpiryMinutes || config.features.verification.tokenExpiryMinutes <= 0) {
      errors.push('Account Verification requires a positive token expiry time');
    }
  }

  // Validate Audit Logging config
  if (config.features?.audit?.enabled) {
    // No specific validation needed
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create database schema for all enabled features
 * 
 * @param config - NextAuth-Simple configuration with all features
 * @returns Success status
 */
export async function createFeatureSchemas(
  config: NextAuthSimpleConfigWithAllFeatures
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = config;

    // Import all schema tables
    const { users, sessions } = await import('../db/schema');

    // Feature schemas
    let schemas: any[] = [users, sessions];

    // Add Two-Factor Authentication schema
    if (config.features?.twoFactor?.enabled) {
      const { usersTwoFactorTable, twoFactorRecoveryCodesTable, twoFactorChallengesTable } = await import('./twoFactor/db/schema');
      schemas = [...schemas, usersTwoFactorTable, twoFactorRecoveryCodesTable, twoFactorChallengesTable];
    }

    // Add Magic URL schema
    if (config.features?.magicUrl?.enabled) {
      const { magicUrlTokensTable } = await import('./magicUrl/db/schema');
      schemas = [...schemas, magicUrlTokensTable];
    }

    // Add Social Login schema
    if (config.features?.social?.enabled) {
      const { socialAccountsTable } = await import('./social/db/schema');
      schemas = [...schemas, socialAccountsTable];
    }

    // Add Password Reset schema
    if (config.features?.passwordReset?.enabled) {
      const { passwordResetTokensTable } = await import('./password/db/schema');
      schemas = [...schemas, passwordResetTokensTable];
    }

    // Add RBAC schema
    if (config.features?.rbac?.enabled) {
      const { rolesTable, userRolesTable } = await import('./rbac/db/schema');
      schemas = [...schemas, rolesTable, userRolesTable];
    }

    // Add Passkeys schema
    if (config.features?.passkeys?.enabled) {
      const { webAuthnCredentialsTable, webAuthnChallengesTable } = await import('./passkeys/db/schema');
      schemas = [...schemas, webAuthnCredentialsTable, webAuthnChallengesTable];
    }

    // Add Account Verification schema
    if (config.features?.verification?.enabled) {
      const { accountVerificationTokensTable, userVerificationStatusTable } = await import('./verification/db/schema');
      schemas = [...schemas, accountVerificationTokensTable, userVerificationStatusTable];
    }

    // Add Audit Logging schema
    if (config.features?.audit?.enabled) {
      const { auditLogsTable } = await import('./audit/db/schema');
      schemas = [...schemas, auditLogsTable];
    }

    // Create all tables
    for (const schema of schemas) {
      try {
        await db.client.execute(`
          CREATE TABLE IF NOT EXISTS "${schema.name}" (
            ${Object.entries(schema.columns).map(([name, column]: [string, any]) => {
          let columnDef = `"${name}" ${column.dataType}`;
          if (column.primaryKey) columnDef += ' PRIMARY KEY';
          if (column.notNull) columnDef += ' NOT NULL';
          if (column.unique) columnDef += ' UNIQUE';
          if (column.default) columnDef += ` DEFAULT ${column.default}`;
          return columnDef;
        }).join(',\n')}
          )
        `);
      } catch (error) {
        console.error(`Error creating table ${schema.name}:`, error);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating feature schemas:', error);
    return { success: false, error: 'Failed to create feature schemas' };
  }
}

/**
 * Integrate all features with the authentication flow
 * 
 * @param config - NextAuth-Simple configuration with all features
 * @returns Integrated configuration
 */
export function integrateFeatures(
  config: NextAuthSimpleConfigWithAllFeatures
): NextAuthSimpleConfigWithAllFeatures {
  // Create a deep copy of the config
  const integratedConfig = JSON.parse(JSON.stringify(config));

  // Add hooks for feature integration
  integratedConfig._hooks = {
    // Pre-login hooks
    preLogin: async (email: string, password: string) => {
      // Example: Check if account verification is required
      if (config.features?.verification?.enabled && config.features.verification.requireVerification) {
        const { getUserVerificationStatus } = await import('./verification');
        const user = await getUserByEmail(email, config);

        if (user) {
          const verificationStatus = await getUserVerificationStatus(user.id, config as any);
          if (verificationStatus.success && verificationStatus.status && !verificationStatus.status.verified) {
            return { success: false, error: 'Account not verified' };
          }
        }
      }

      return { success: true };
    },

    // Post-login hooks
    postLogin: async (userId: string, sessionId: string) => {
      // Example: Log successful login
      if (config.features?.audit?.enabled) {
        const { createAuditLog } = await import('./audit');
        await createAuditLog({
          userId,
          action: 'login.success',
          resource: 'session',
          resourceId: sessionId,
          status: 'success'
        }, config as any);
      }

      return { success: true };
    },

    // Pre-registration hooks
    preRegistration: async (email: string, password: string) => {
      return { success: true };
    },

    // Post-registration hooks
    postRegistration: async (userId: string) => {
      // Example: Assign default role to new user
      if (config.features?.rbac?.enabled) {
        const { assignDefaultRoleToUser } = await import('./rbac');
        await assignDefaultRoleToUser(userId, config as any);
      }

      // Example: Log successful registration
      if (config.features?.audit?.enabled) {
        const { createAuditLog } = await import('./audit');
        await createAuditLog({
          userId,
          action: 'register.success',
          resource: 'user',
          resourceId: userId,
          status: 'success'
        }, config as any);
      }

      return { success: true };
    }
  };

  return integratedConfig;
}

/**
 * Helper function to get user by email
 * 
 * @param email - User email
 * @param config - NextAuth-Simple configuration
 * @returns User or null
 */
async function getUserByEmail(email: string, config: NextAuthSimpleConfig): Promise<any | null> {
  try {
    const { db } = config;

    const users = await db.client
      .select()
      .from(db.tables.users)
      .where((eb: any) => eb.eq(db.tables.users.email, email.toLowerCase()))
      .limit(1)
      .execute();

    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}
