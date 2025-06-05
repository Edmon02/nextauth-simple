import { type AuthResult, type LoginInput, type NextAuthSimpleConfig } from '../../core/types';
import { loginUser as coreLoginUser } from '../../core/auth';
import { NextAuthSimpleConfigWithTwoFactor, TwoFactorVerifyInput } from './types';
import { createTwoFactorChallenge, isTwoFactorEnabled, verifyTwoFactorCode } from './index';

/**
 * Enhanced login function with Two-Factor Authentication support
 * 
 * @param input - Login input containing email and password
 * @param config - NextAuth-Simple configuration with 2FA
 * @returns Authentication result, potentially with 2FA challenge
 */
export async function loginUserWithTwoFactor(
  input: LoginInput,
  config: NextAuthSimpleConfigWithTwoFactor
): Promise<AuthResult & { requiresTwoFactor?: boolean; challengeToken?: string }> {
  try {
    // First, perform the basic email/password authentication
    const basicAuthResult = await coreLoginUser(input, config);
    
    // If basic auth failed, return the error
    if (!basicAuthResult.success || !basicAuthResult.user) {
      return basicAuthResult;
    }
    
    // Check if 2FA is enabled for this user
    const twoFactorEnabled = config.features?.twoFactor?.enabled && 
      await isTwoFactorEnabled(basicAuthResult.user.id, config as NextAuthSimpleConfigWithTwoFactor);
    
    // If 2FA is not enabled, return the basic auth result
    if (!twoFactorEnabled) {
      return basicAuthResult;
    }
    
    // Create a 2FA challenge
    const challengeResult = await createTwoFactorChallenge(
      basicAuthResult.user.id, 
      config as NextAuthSimpleConfigWithTwoFactor
    );
    
    if (!challengeResult.success) {
      return { ...basicAuthResult, requiresTwoFactor: true };
    }
    
    // Return result indicating 2FA is required
    return {
      success: true,
      user: basicAuthResult.user,
      requiresTwoFactor: true,
      challengeToken: challengeResult.challengeToken
    };
  } catch (error) {
    console.error('Error in login with two-factor:', error);
    return { success: false, error: 'Login failed' };
  }
}

/**
 * Complete Two-Factor Authentication challenge
 * 
 * @param input - Two-factor verification input
 * @param config - NextAuth-Simple configuration with 2FA
 * @returns Authentication result
 */
export async function completeTwoFactorLogin(
  input: TwoFactorVerifyInput,
  config: NextAuthSimpleConfigWithTwoFactor
): Promise<AuthResult> {
  try {
    // Verify the 2FA code
    const verifyResult = await verifyTwoFactorCode(input, config);
    
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error || 'Two-factor verification failed' };
    }
    
    // Get user
    const { userId } = input;
    const { db } = config;
    
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
    
    // Create session (similar to core loginUser)
    const { createSession } = await import('../../core/auth');
    const session = await createSession(userId, config);
    
    // Return success with user (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    return { 
      success: true, 
      user: userWithoutPassword,
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    };
  } catch (error) {
    console.error('Error completing two-factor login:', error);
    return { success: false, error: 'Two-factor authentication failed' };
  }
}
