import { type NextAuthSimpleConfig } from '../../core/types';

/**
 * Two-Factor Authentication configuration
 */
export interface TwoFactorConfig {
  enabled: boolean;
  issuer?: string; // The name of your app shown in authenticator apps
  codeValiditySeconds?: number; // How long a TOTP code is valid for (default: 30 seconds)
  windowSize?: number; // Number of time steps to check before/after current time (default: 1)
  recoveryCodesCount?: number; // Number of recovery codes to generate (default: 8)
  challengeExpiryMinutes?: number; // How long a 2FA challenge is valid for (default: 5 minutes)
}

/**
 * Extended NextAuthSimpleConfig with Two-Factor Authentication
 */
export interface NextAuthSimpleConfigWithTwoFactor extends NextAuthSimpleConfig {
  features?: {
    twoFactor?: TwoFactorConfig;
    // Other features will be added here
  };
}

/**
 * Two-Factor Authentication setup input
 */
export interface TwoFactorSetupInput {
  userId: string;
  code: string; // Verification code from authenticator app
}

/**
 * Two-Factor Authentication verification input
 */
export interface TwoFactorVerifyInput {
  userId: string;
  code: string;
  challengeToken?: string;
}

/**
 * Two-Factor Authentication result
 */
export interface TwoFactorResult {
  success: boolean;
  error?: string;
  challengeToken?: string; // Token for completing the challenge
  verified?: boolean;
  userId?: string;
}

/**
 * Two-Factor Authentication setup result
 */
export interface TwoFactorSetupResult extends TwoFactorResult {
  secret?: string;
  otpAuthUrl?: string;
  qrCodeUrl?: string;
  recoveryCodes?: string[];
}

/**
 * Two-Factor Authentication status
 */
export interface TwoFactorStatus {
  enabled: boolean;
  verified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
