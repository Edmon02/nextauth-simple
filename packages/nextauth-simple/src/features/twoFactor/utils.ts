import crypto from 'crypto';
import { hashPassword } from '../../utils/password';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { 
  type TwoFactorSetupInput, 
  type TwoFactorVerifyInput, 
  type TwoFactorResult, 
  type TwoFactorSetupResult,
  type TwoFactorStatus,
  type NextAuthSimpleConfigWithTwoFactor
} from './types';

/**
 * Generate a new TOTP secret
 * 
 * @returns Random TOTP secret
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate OTP auth URL for QR code
 * 
 * @param email - User's email
 * @param secret - TOTP secret
 * @param issuer - App name shown in authenticator
 * @returns OTP auth URL
 */
export function generateOtpAuthUrl(email: string, secret: string, issuer: string): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Generate QR code data URL from OTP auth URL
 * 
 * @param otpAuthUrl - OTP auth URL
 * @returns Promise resolving to QR code data URL
 */
export async function generateQrCodeUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl);
}

/**
 * Generate recovery codes
 * 
 * @param count - Number of recovery codes to generate
 * @returns Array of recovery codes
 */
export function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate a random 10-character alphanumeric code
    const code = crypto.randomBytes(5).toString('hex').toUpperCase();
    // Format as XXXX-XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`);
  }
  return codes;
}

/**
 * Hash recovery codes for secure storage
 * 
 * @param codes - Array of recovery codes
 * @returns Array of hashed recovery codes
 */
export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  const hashedCodes: string[] = [];
  for (const code of codes) {
    // Use a lower work factor for recovery codes since we're hashing multiple
    const hashedCode = await hashPassword(code, 8);
    hashedCodes.push(hashedCode);
  }
  return hashedCodes;
}

/**
 * Verify TOTP code
 * 
 * @param secret - TOTP secret
 * @param token - TOTP code to verify
 * @param config - Two-factor configuration
 * @returns Whether the code is valid
 */
export function verifyTotpToken(
  secret: string, 
  token: string,
  config: NextAuthSimpleConfigWithTwoFactor
): boolean {
  const twoFactorConfig = config.features?.twoFactor;
  
  // Configure authenticator with custom settings if provided
  if (twoFactorConfig?.windowSize) {
    authenticator.options = { 
      ...authenticator.options,
      window: twoFactorConfig.windowSize 
    };
  }
  
  if (twoFactorConfig?.codeValiditySeconds) {
    authenticator.options = { 
      ...authenticator.options,
      step: twoFactorConfig.codeValiditySeconds 
    };
  }
  
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('Error verifying TOTP token:', error);
    return false;
  }
}

/**
 * Verify recovery code
 * 
 * @param code - Recovery code to verify
 * @param hashedCodes - Array of hashed recovery codes
 * @returns Index of the matched code or -1 if no match
 */
export async function verifyRecoveryCode(
  code: string,
  hashedCodes: string[]
): Promise<number> {
  // Normalize the code (remove spaces, dashes, etc.)
  const normalizedCode = code.replace(/[^A-Z0-9]/g, '');
  
  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await hashPassword(normalizedCode, +hashedCodes[i]);
    if (isMatch) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Generate a challenge token for two-factor authentication
 * 
 * @returns Random challenge token
 */
export function generateChallengeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
