import { NextAuthSimpleConfig } from '../../core/types';
import { NextAuthSimpleConfigWithTwoFactor } from '../twoFactor/types';
import { NextAuthSimpleConfigWithMagicUrl } from '../magicUrl/types';
import { NextAuthSimpleConfigWithSocial } from '../social/types';
import { NextAuthSimpleConfigWithPasswordReset } from '../password/types';
import { NextAuthSimpleConfigWithRbac } from '../rbac/types';

/**
 * WebAuthn (Passkeys) configuration
 */
export interface PasskeysConfig {
  enabled: boolean;
  rpName: string; // Relying Party name (your app name)
  rpID?: string; // Relying Party ID (domain without protocol or port)
  origin?: string; // Origin URL (defaults to NEXTAUTH_URL)
  challengeTimeoutSeconds?: number; // How long a challenge is valid for (default: 60 seconds)
  userVerification?: 'required' | 'preferred' | 'discouraged'; // User verification requirement
  attestation?: 'none' | 'indirect' | 'direct'; // Attestation conveyance preference
  authenticatorAttachment?: 'platform' | 'cross-platform'; // Authenticator attachment preference
}

/**
 * Extended NextAuthSimpleConfig with Passkeys
 */
export interface NextAuthSimpleConfigWithPasskeys extends NextAuthSimpleConfig {
  features?: {
    twoFactor?: NextAuthSimpleConfigWithTwoFactor['features'];
    magicUrl?: NextAuthSimpleConfigWithMagicUrl['features'];
    social?: NextAuthSimpleConfigWithSocial['features'];
    passwordReset?: NextAuthSimpleConfigWithPasswordReset['features'];
    rbac?: NextAuthSimpleConfigWithRbac['features'];
    passkeys?: PasskeysConfig;
    // Other features will be added here
  };
}

/**
 * WebAuthn credential
 */
export interface WebAuthnCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: string;
  transports?: string[];
  deviceType?: string;
  backed?: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

/**
 * WebAuthn challenge
 */
export interface WebAuthnChallenge {
  id: string;
  userId?: string;
  challenge: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date;
}

/**
 * Registration options request input
 */
export interface RegistrationOptionsInput {
  userId: string;
  username: string;
  displayName?: string;
  attestation?: 'none' | 'indirect' | 'direct';
  authenticatorAttachment?: 'platform' | 'cross-platform';
}

/**
 * Registration verification input
 */
export interface RegistrationVerificationInput {
  userId: string;
  credential: any; // Credential from navigator.credentials.create()
}

/**
 * Authentication options request input
 */
export interface AuthenticationOptionsInput {
  userId?: string; // Optional, if not provided, all credentials will be allowed
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

/**
 * Authentication verification input
 */
export interface AuthenticationVerificationInput {
  credential: any; // Credential from navigator.credentials.get()
}

/**
 * Registration options result
 */
export interface RegistrationOptionsResult {
  success: boolean;
  error?: string;
  options?: any; // PublicKeyCredentialCreationOptions
  challenge?: string;
}

/**
 * Registration verification result
 */
export interface RegistrationVerificationResult {
  success: boolean;
  error?: string;
  credential?: WebAuthnCredential;
}

/**
 * Authentication options result
 */
export interface AuthenticationOptionsResult {
  success: boolean;
  error?: string;
  options?: any; // PublicKeyCredentialRequestOptions
  challenge?: string;
}

/**
 * Authentication verification result
 */
export interface AuthenticationVerificationResult {
  success: boolean;
  error?: string;
  credential?: WebAuthnCredential;
  user?: any;
  session?: any;
}

/**
 * Get credentials result
 */
export interface GetCredentialsResult {
  success: boolean;
  error?: string;
  credentials?: WebAuthnCredential[];
}
