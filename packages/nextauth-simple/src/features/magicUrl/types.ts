import { NextAuthSimpleConfig } from '../../core/types';
import { NextAuthSimpleConfigWithTwoFactor } from '../twoFactor/types';

/**
 * Magic URL (Passwordless Email) configuration
 */
export interface MagicUrlConfig {
  enabled: boolean;
  tokenExpiryMinutes?: number; // How long a magic link is valid for (default: 10 minutes)
  emailSubject?: string; // Email subject line
  emailFrom?: string; // From email address
  redirectUrl?: string; // URL to redirect to after successful login
  sendEmail?: (to: string, subject: string, html: string) => Promise<boolean>; // Custom email sending function
}

/**
 * Extended NextAuthSimpleConfig with Magic URL Authentication
 */
export interface NextAuthSimpleConfigWithMagicUrl extends NextAuthSimpleConfig {
  features?: {
    twoFactor?: NextAuthSimpleConfigWithTwoFactor['features'];
    magicUrl?: MagicUrlConfig;
    // Other features will be added here
  };
}

/**
 * Magic URL login input
 */
export interface MagicUrlLoginInput {
  email: string;
  callbackUrl?: string; // URL to include in the magic link
}

/**
 * Magic URL token verification input
 */
export interface MagicUrlVerifyInput {
  token: string;
  email: string;
}

/**
 * Magic URL login result
 */
export interface MagicUrlLoginResult {
  success: boolean;
  error?: string;
  emailSent?: boolean;
}

/**
 * Magic URL verification result
 */
export interface MagicUrlVerifyResult {
  success: boolean;
  error?: string;
  user?: any;
  session?: any;
}
