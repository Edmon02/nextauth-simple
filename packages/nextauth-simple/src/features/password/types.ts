import { NextAuthSimpleConfig } from '../../core/types';
import { NextAuthSimpleConfigWithTwoFactor } from '../twoFactor/types';
import { NextAuthSimpleConfigWithMagicUrl } from '../magicUrl/types';
import { NextAuthSimpleConfigWithSocial } from '../social/types';

/**
 * Password Reset configuration
 */
export interface PasswordResetConfig {
  enabled: boolean;
  tokenExpiryMinutes?: number; // How long a password reset token is valid for (default: 15 minutes)
  emailSubject?: string; // Email subject line
  emailFrom?: string; // From email address
  redirectUrl?: string; // URL to redirect to after password reset
  sendEmail?: (to: string, subject: string, html: string) => Promise<boolean>; // Custom email sending function
  minimumPasswordLength?: number; // Minimum password length (default: 8)
}

/**
 * Extended NextAuthSimpleConfig with Password Reset
 */
export interface NextAuthSimpleConfigWithPasswordReset extends NextAuthSimpleConfig {
  features?: {
    twoFactor?: NextAuthSimpleConfigWithTwoFactor['features'];
    magicUrl?: NextAuthSimpleConfigWithMagicUrl['features'];
    social?: NextAuthSimpleConfigWithSocial['features'];
    passwordReset?: PasswordResetConfig;
    // Other features will be added here
  };
}

/**
 * Password Reset request input
 */
export interface PasswordResetRequestInput {
  email: string;
  redirectUrl?: string; // URL to include in the reset link
}

/**
 * Password Reset verification input
 */
export interface PasswordResetVerifyInput {
  token: string;
  email: string;
}

/**
 * Password Reset completion input
 */
export interface PasswordResetCompleteInput {
  token: string;
  email: string;
  password: string;
}

/**
 * Password Reset request result
 */
export interface PasswordResetRequestResult {
  success: boolean;
  error?: string;
  emailSent?: boolean;
}

/**
 * Password Reset verification result
 */
export interface PasswordResetVerifyResult {
  success: boolean;
  error?: string;
  valid?: boolean;
  userId?: string;
}

/**
 * Password Reset completion result
 */
export interface PasswordResetCompleteResult {
  success: boolean;
  error?: string;
  passwordUpdated?: boolean;
}
