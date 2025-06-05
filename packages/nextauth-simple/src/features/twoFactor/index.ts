import crypto from 'crypto';
import { 
  type TwoFactorSetupInput, 
  type TwoFactorVerifyInput, 
  type TwoFactorResult, 
  type TwoFactorSetupResult,
  type TwoFactorStatus,
  type NextAuthSimpleConfigWithTwoFactor
} from './types';
import { 
  generateTotpSecret, 
  generateOtpAuthUrl, 
  generateQrCodeUrl,
  generateRecoveryCodes,
  hashRecoveryCodes,
  verifyTotpToken,
  verifyRecoveryCode,
  generateChallengeToken
} from './utils';
import { usersTwoFactorTable, twoFactorRecoveryCodesTable, twoFactorChallengesTable } from './db/schema';

/**
 * Setup two-factor authentication for a user
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration with 2FA
 * @returns Two-factor setup result with secret and QR code
 */
export async function setupTwoFactor(
  userId: string,
  config: NextAuthSimpleConfigWithTwoFactor
): Promise<TwoFactorSetupResult> {
  try {
    const { db } = config;
    const twoFactorConfig = config.features?.twoFactor;
    
    if (!twoFactorConfig?.enabled) {
      return { success: false, error: 'Two-factor authentication is not enabled' };
    }
    
    // Get user email for the OTP auth URL
    const users = await db.client
      .select()
      .from(db.tables.users)
      .where((eb: any) => eb.eq(db.tables.users.id, userId))
      .limit(1)
      .execute();
    
    if (users.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    const user = users[0];
    
    // Check if 2FA is already set up
    const existingSetup = await db.client
      .select()
      .from(usersTwoFactorTable)
      .where((eb: any) => eb.eq(usersTwoFactorTable.userId, userId))
      .limit(1)
      .execute();
    
    // If already set up, return error
    if (existingSetup.length > 0) {
      return { success: false, error: 'Two-factor authentication is already set up' };
    }
    
    // Generate TOTP secret
    const secret = generateTotpSecret();
    
    // Generate OTP auth URL
    const issuer = twoFactorConfig.issuer || 'NextAuth-Simple';
    const otpAuthUrl = generateOtpAuthUrl(user.email, secret, issuer);
    
    // Generate QR code
    const qrCodeUrl = await generateQrCodeUrl(otpAuthUrl);
    
    // Generate recovery codes
    const recoveryCodes = generateRecoveryCodes(twoFactorConfig.recoveryCodesCount);
    
    // Hash recovery codes for storage
    const hashedCodes = await hashRecoveryCodes(recoveryCodes);
    
    // Store initial 2FA setup (not yet verified)
    const now = new Date();
    await db.client.insert(usersTwoFactorTable).values({
      userId,
      secret,
      enabled: false,
      backupCodes: JSON.stringify(hashedCodes),
      createdAt: now,
      updatedAt: now
    }).execute();
    
    return {
      success: true,
      secret,
      otpAuthUrl,
      qrCodeUrl,
      recoveryCodes
    };
  } catch (error) {
    console.error('Error setting up two-factor authentication:', error);
    return { success: false, error: 'Failed to set up two-factor authentication' };
  }
}

/**
 * Verify and enable two-factor authentication
 * 
 * @param input - Two-factor verification input
 * @param config - NextAuth-Simple configuration with 2FA
 * @returns Two-factor verification result
 */
export async function verifyAndEnableTwoFactor(
  input: TwoFactorSetupInput,
  config: NextAuthSimpleConfigWithTwoFactor
): Promise<TwoFactorResult> {
  try {
    const { userId, code } = input;
    const { db } = config;
    const twoFactorConfig = config.features?.twoFactor;
    
    if (!twoFactorConfig?.enabled) {
      return { success: false, error: 'Two-factor authentication is not enabled' };
    }
    
    // Get 2FA setup
    const setups = await db.client
      .select()
      .from(usersTwoFactorTable)
      .where((eb: any) => eb.eq(usersTwoFactorTable.userId, userId))
      .limit(1)
      .execute();
    
    if (setups.length === 0) {
      return { success: false, error: 'Two-factor authentication is not set up' };
    }
    
    const setup = setups[0];
    
    // If already verified, return error
    if (setup.enabled) {
      return { success: false, error: 'Two-factor authentication is already enabled' };
    }
    
    // Verify the TOTP code
    const isValid = verifyTotpToken(setup.secret, code, config);
    
    if (!isValid) {
      return { success: false, error: 'Invalid verification code' };
    }
    
    // Update 2FA setup to enabled and verified
    const now = new Date();
    await db.client
      .update(usersTwoFactorTable)
      .set({
        enabled: true,
        verifiedAt: now,
        updatedAt: now
      })
      .where((eb: any) => eb.eq(usersTwoFactorTable.userId, userId))
      .execute();
    
    return {
      success: true,
      verified: true
    };
  } catch (error) {
    console.error('Error verifying two-factor authentication:', error);
    return { success: false, error: 'Failed to verify two-factor authentication' };
  }
}

/**
 * Create a two-factor authentication challenge
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration with 2FA
 * @returns Two-factor challenge result
 */
export async function createTwoFactorChallenge(
  userId: string,
  config: NextAuthSimpleConfigWithTwoFactor
): Promise<TwoFactorResult> {
  try {
    const { db } = config;
    const twoFactorConfig = config.features?.twoFactor;
    
    if (!twoFactorConfig?.enabled) {
      return { success: false, error: 'Two-factor authentication is not enabled' };
    }
    
    // Generate challenge token
    const challengeToken = generateChallengeToken();
    
    // Calculate expiry time
    const expiryMinutes = twoFactorConfig.challengeExpiryMinutes || 5;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
    
    // Store challenge
    await db.client.insert(twoFactorChallengesTable).values({
      id: crypto.randomUUID(),
      userId,
      token: challengeToken,
      expiresAt,
      createdAt: new Date()
    }).execute();
    
    return {
      success: true,
      challengeToken
    };
  } catch (error) {
    console.error('Error creating two-factor challenge:', error);
    return { success: false, error: 'Failed to create two-factor challenge' };
  }
}

/**
 * Verify a two-factor authentication code
 * 
 * @param input - Two-factor verification input
 * @param config - NextAuth-Simple configuration with 2FA
 * @returns Two-factor verification result
 */
export async function verifyTwoFactorCode(
  input: TwoFactorVerifyInput,
  config: NextAuthSimpleConfigWithTwoFactor
): Promise<TwoFactorResult> {
  try {
    const { userId, code, challengeToken } = input;
    const { db } = config;
    const twoFactorConfig = config.features?.twoFactor;
    
    if (!twoFactorConfig?.enabled) {
      return { success: false, error: 'Two-factor authentication is not enabled' };
    }
    
    // Verify challenge token if provided
    if (challengeToken) {
      const challenges = await db.client
        .select()
        .from(twoFactorChallengesTable)
        .where((eb: any) => eb.and(
          eb.eq(twoFactorChallengesTable.userId, userId),
          eb.eq(twoFactorChallengesTable.token, challengeToken)
        ))
        .limit(1)
        .execute();
      
      if (challenges.length === 0) {
        return { success: false, error: 'Invalid challenge token' };
      }
      
      const challenge = challenges[0];
      
      // Check if challenge is expired
      if (new Date() > new Date(challenge.expiresAt)) {
        return { success: false, error: 'Challenge token expired' };
      }
    }
    
    // Get 2FA setup
    const setups = await db.client
      .select()
      .from(usersTwoFactorTable)
      .where((eb: any) => eb.eq(usersTwoFactorTable.userId, userId))
      .limit(1)
      .execute();
    
    if (setups.length === 0) {
      return { success: false, error: 'Two-factor authentication is not set up' };
    }
    
    const setup = setups[0];
    
    // Check if 2FA is enabled
    if (!setup.enabled) {
      return { success: false, error: 'Two-factor authentication is not enabled' };
    }
    
    // Try to verify as TOTP code first
    const isValidTotp = verifyTotpToken(setup.secret, code, config);
    
    if (isValidTotp) {
      // Clean up challenge if it exists
      if (challengeToken) {
        await db.client
          .delete(twoFactorChallengesTable)
          .where((eb: any) => eb.eq(twoFactorChallengesTable.token, challengeToken))
          .execute();
      }
      
      return { success: true, verified: true };
    }
    
    // If not a valid TOTP code, try as recovery code
    const hashedCodes = JSON.parse(setup.backupCodes || '[]');
    const recoveryCodeIndex = await verifyRecoveryCode(code, hashedCodes);
    
    if (recoveryCodeIndex >= 0) {
      // Mark recovery code as used
      hashedCodes[recoveryCodeIndex] = 'USED';
      
      // Update backup codes
      await db.client
        .update(usersTwoFactorTable)
        .set({
          backupCodes: JSON.stringify(hashedCodes),
          updatedAt: new Date()
        })
        .where((eb: any) => eb.eq(usersTwoFactorTable.userId, userId))
        .execute();
      
      // Clean up challenge if it exists
      if (challengeToken) {
        await db.client
          .delete(twoFactorChallengesTable)
          .where((eb: any) => eb.eq(twoFactorChallengesTable.token, challengeToken))
          .execute();
      }
      
      return { success: true, verified: true };
    }
    
    return { userId, success: false, error: 'Invalid verification code' };
  } catch (error) {
    console.error('Error verifying two-factor code:', error);
    return { success: false, error: 'Failed to verify two-factor code' };
  }
}

/**
 * Disable two-factor authentication
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration with 2FA
 * @returns Success status
 */
export async function disableTwoFactor(
  userId: string,
  config: NextAuthSimpleConfigWithTwoFactor
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = config;
    
    // Delete 2FA setup
    await db.client
      .delete(usersTwoFactorTable)
      .where((eb: any) => eb.eq(usersTwoFactorTable.userId, userId))
      .execute();
    
    // Delete any challenges
    await db.client
      .delete(twoFactorChallengesTable)
      .where((eb: any) => eb.eq(twoFactorChallengesTable.userId, userId))
      .execute();
    
    return { success: true };
  } catch (error) {
    console.error('Error disabling two-factor authentication:', error);
    return { success: false, error: 'Failed to disable two-factor authentication' };
  }
}

/**
 * Get two-factor authentication status
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration with 2FA
 * @returns Two-factor status
 */
export async function getTwoFactorStatus(
  userId: string,
  config: NextAuthSimpleConfigWithTwoFactor
): Promise<TwoFactorStatus | null> {
  try {
    const { db } = config;
    
    // Get 2FA setup
    const setups = await db.client
      .select()
      .from(usersTwoFactorTable)
      .where((eb: any) => eb.eq(usersTwoFactorTable.userId, userId))
      .limit(1)
      .execute();
    
    if (setups.length === 0) {
      return null;
    }
    
    const setup = setups[0];
    
    return {
      enabled: setup.enabled,
      verified: !!setup.verifiedAt,
      createdAt: setup.createdAt,
      updatedAt: setup.updatedAt
    };
  } catch (error) {
    console.error('Error getting two-factor status:', error);
    return null;
  }
}

/**
 * Check if a user has two-factor authentication enabled
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration with 2FA
 * @returns Whether 2FA is enabled
 */
export async function isTwoFactorEnabled(
  userId: string,
  config: NextAuthSimpleConfigWithTwoFactor
): Promise<boolean> {
  try {
    const status = await getTwoFactorStatus(userId, config);
    return !!status?.enabled;
  } catch (error) {
    console.error('Error checking two-factor status:', error);
    return false;
  }
}
