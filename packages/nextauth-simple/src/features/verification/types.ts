import { NextAuthSimpleConfig } from '../../core/types';
import { NextAuthSimpleConfigWithTwoFactor } from '../twoFactor/types';
import { NextAuthSimpleConfigWithMagicUrl } from '../magicUrl/types';
import { NextAuthSimpleConfigWithSocial } from '../social/types';
import { NextAuthSimpleConfigWithPasswordReset } from '../password/types';
import { NextAuthSimpleConfigWithRbac } from '../rbac/types';
import { NextAuthSimpleConfigWithPasskeys } from '../passkeys/types';

/**
 * Account Verification configuration
 */
export interface VerificationConfig {
  enabled: boolean;
  tokenExpiryMinutes?: number; // How long a verification token is valid for (default: 60 minutes)
  emailSubject?: string; // Email subject line
  emailFrom?: string; // From email address
  redirectUrl?: string; // URL to redirect to after verification
  sendEmail?: (to: string, subject: string, html: string) => Promise<boolean>; // Custom email sending function
  requireVerification?: boolean; // Whether to require verification for login (default: false)
}

/**
 * Extended NextAuthSimpleConfig with Account Verification
 */
export interface NextAuthSimpleConfigWithVerification extends NextAuthSimpleConfig {
  features?: {
    twoFactor?: NextAuthSimpleConfigWithTwoFactor['features'];
    magicUrl?: NextAuthSimpleConfigWithMagicUrl['features'];
    social?: NextAuthSimpleConfigWithSocial['features'];
    passwordReset?: NextAuthSimpleConfigWithPasswordReset['features'];
    rbac?: NextAuthSimpleConfigWithRbac['features'];
    passkeys?: NextAuthSimpleConfigWithPasskeys['features'];
    verification?: VerificationConfig;
    // Other features will be added here
  };
}

/**
 * Verification request input
 */
export interface VerificationRequestInput {
  userId: string;
  email: string;
  redirectUrl?: string; // URL to include in the verification link
}

/**
 * Verification token verification input
 */
export interface VerificationVerifyInput {
  token: string;
  email: string;
}

/**
 * Verification request result
 */
export interface VerificationRequestResult {
  success: boolean;
  error?: string;
  emailSent?: boolean;
}

/**
 * Verification verification result
 */
export interface VerificationVerifyResult {
  success: boolean;
  error?: string;
  verified?: boolean;
}

/**
 * Verification status
 */
export interface VerificationStatus {
  verified: boolean;
  verifiedAt?: Date;
  verificationMethod?: string;
  updatedAt: Date;
}

/**
 * Verification status result
 */
export interface VerificationStatusResult {
  success: boolean;
  error?: string;
  status?: VerificationStatus;
}
