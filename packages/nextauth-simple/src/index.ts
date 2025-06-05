import { NextAuthSimpleConfig } from './core/types';
import { NextAuthSimpleConfigWithAllFeatures, validateFeatureConfig, createFeatureSchemas, initializeFeatures, integrateFeatures } from './features';

// Re-export core functionality
export * from './core/auth';
export * from './core/session';
export * from './core/middleware';
export * from './core/types';
export * from './core/hooks';
export * from './db'

// Re-export all features
export * from './features';

/**
 * Initialize NextAuth-Simple with all configured features
 * 
 * @param config - NextAuth-Simple configuration with optional features
 * @returns Initialized configuration
 */
export async function initializeNextAuthSimple(
  config: NextAuthSimpleConfigWithAllFeatures
): Promise<{ success: boolean; error?: string; config?: NextAuthSimpleConfigWithAllFeatures }> {
  try {
    // Validate configuration
    const validation = validateFeatureConfig(config);

    if (!validation.valid) {
      return {
        success: false,
        error: `Configuration validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Create database schemas for all enabled features
    const schemaResult = await createFeatureSchemas(config);

    if (!schemaResult.success) {
      return {
        success: false,
        error: `Failed to create database schemas: ${schemaResult.error}`
      };
    }

    // Initialize all enabled features
    const initResult = await initializeFeatures(config);

    if (!initResult.success) {
      return {
        success: false,
        error: `Failed to initialize features: ${initResult.error}`
      };
    }

    // Integrate features with core authentication flow
    const integratedConfig = integrateFeatures(config);

    return {
      success: true,
      config: integratedConfig
    };
  } catch (error) {
    console.error('Error initializing NextAuth-Simple:', error);
    return {
      success: false,
      error: `Failed to initialize NextAuth-Simple: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Create a default configuration with recommended settings
 * 
 * @param dbConfig - Database configuration
 * @returns Default configuration
 */
export function createDefaultConfig(
  dbConfig: NextAuthSimpleConfig['db']
): NextAuthSimpleConfigWithAllFeatures {
  return {
    db: dbConfig,
    security: {
      bcryptWorkFactor: 12,
      sessionExpiryDays: 1, // 1 day
      rateLimit: {
        maxAttempts: 5,
        windowMs: 5 * 60 * 1000 // 5 minutes
      }
      // cookieSecure: process.env.NODE_ENV === 'production',
      // cookieSameSite: 'lax'
    },
    features: {
      // Two-Factor Authentication
      twoFactor: {
        enabled: false,
        issuer: 'NextAuth-Simple',
        codeValiditySeconds: 30,
        windowSize: 1,
        recoveryCodesCount: 8,
        challengeExpiryMinutes: 5
      },

      // Magic URL (Passwordless Email Login)
      magicUrl: {
        enabled: false,
        tokenExpiryMinutes: 15,
        emailSubject: 'Your login link',
        redirectUrl: '/login/callback'
      },

      // Social Logins
      social: {
        enabled: false,
        providers: {}
      },

      // Password Reset
      passwordReset: {
        enabled: false,
        tokenExpiryMinutes: 15,
        emailSubject: 'Reset your password',
        minimumPasswordLength: 8
      },

      // Role-Based Access Control
      rbac: {
        enabled: false,
        defaultRole: 'user',
        superAdminRole: 'admin',
        cachePermissions: true,
        cacheTTLSeconds: 300
      },

      // Passkeys (WebAuthn)
      passkeys: {
        enabled: false,
        rpName: 'NextAuth-Simple App',
        challengeTimeoutSeconds: 60,
        userVerification: 'preferred',
        attestation: 'none'
      },

      // Account Verification
      verification: {
        enabled: false,
        tokenExpiryMinutes: 60,
        emailSubject: 'Verify your account',
        requireVerification: false
      },

      // Audit Logging
      audit: {
        enabled: false,
        logLogin: true,
        logRegistration: true,
        logPasswordReset: true,
        logAccountVerification: true,
        logRoleChanges: true,
        logCredentialChanges: true,
        logSessionOperations: true,
        retentionDays: 90
      }
    }
  };
}
