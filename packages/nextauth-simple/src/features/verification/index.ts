import crypto from 'crypto';
import {
  type VerificationRequestInput,
  type VerificationVerifyInput,
  type VerificationRequestResult,
  type VerificationVerifyResult,
  type VerificationStatusResult,
  type NextAuthSimpleConfigWithVerification
} from './types';
import { accountVerificationTokensTable, userVerificationStatusTable } from './db/schema';

/**
 * Default email sending function
 * 
 * @param to - Recipient email
 * @param subject - Email subject
 * @param html - Email HTML content
 * @returns Promise resolving to success status
 */
async function defaultSendEmail(to: string, subject: string, html: string): Promise<boolean> {
  console.log(`[Account Verification Email] To: ${to}, Subject: ${subject}`);
  console.log(`[Account Verification Email] Content: ${html}`);
  console.log('[Account Verification Email] This is a placeholder. Implement your own email sending function.');
  return true;
}

/**
 * Generate a secure random token for account verification
 * 
 * @returns Random token
 */
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Request account verification
 * 
 * @param input - Verification request input
 * @param config - NextAuth-Simple configuration with Verification
 * @returns Verification request result
 */
export async function requestVerification(
  input: VerificationRequestInput,
  config: NextAuthSimpleConfigWithVerification
): Promise<VerificationRequestResult> {
  try {
    const { userId, email, redirectUrl } = input;
    const { db } = config;
    const verificationConfig = config.features?.verification;

    if (!verificationConfig?.enabled) {
      return { success: false, error: 'Account verification is not enabled' };
    }

    // Validate email
    if (!email || !email.includes('@') || email.length < 5) {
      return { success: false, error: 'Invalid email address' };
    }

    // Check if user exists
    const users = await db.client
      .select()
      .from(db.tables.users)
      .where((eb: any) => eb.eq(db.tables.users.id, userId))
      .limit(1)
      .execute();

    if (users.length === 0) {
      return { success: false, error: 'User not found' };
    }

    // Check if user is already verified
    const verificationStatus = await getUserVerificationStatus(userId, config);

    if (verificationStatus.success && verificationStatus.status?.verified) {
      return { success: false, error: 'Account is already verified' };
    }

    // Generate token
    const token = generateVerificationToken();

    // Calculate expiry time
    const expiryMinutes = verificationConfig.tokenExpiryMinutes || 60;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    // Delete any existing tokens for this user
    await db.client
      .delete(accountVerificationTokensTable)
      .where((eb: any) => eb.eq(accountVerificationTokensTable.userId, userId))
      .execute();

    // Store token
    await db.client.insert(accountVerificationTokensTable).values({
      id: crypto.randomUUID(),
      userId,
      token,
      expiresAt,
      createdAt: new Date()
    }).execute();

    // Generate verification link
    const baseUrl = process.env.NEXTAUTH_URL || '';
    const verificationUrl = redirectUrl
      ? `${redirectUrl}?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`
      : `${baseUrl}/verify-account?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

    // Prepare email
    const subject = verificationConfig.emailSubject || 'Verify your account';
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Verify your account</h2>
        <p>Please click the link below to verify your account. This link will expire in ${expiryMinutes} minutes.</p>
        <p style="margin: 20px 0;">
          <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify your account
          </a>
        </p>
        <p>If you didn't request this verification, you can safely ignore this email.</p>
        <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; font-size: 14px; color: #666;">${verificationUrl}</p>
      </div>
    `;

    // Send email
    const sendEmail = verificationConfig.sendEmail || defaultSendEmail;
    const emailSent = await sendEmail(
      email.toLowerCase(),
      subject,
      html
    );

    if (!emailSent) {
      return { success: false, error: 'Failed to send email' };
    }

    return {
      success: true,
      emailSent: true
    };
  } catch (error) {
    console.error('Error requesting account verification:', error);
    return { success: false, error: 'Failed to request account verification' };
  }
}

/**
 * Verify account with token
 * 
 * @param input - Verification token verification input
 * @param config - NextAuth-Simple configuration with Verification
 * @returns Verification verification result
 */
export async function verifyAccount(
  input: VerificationVerifyInput,
  config: NextAuthSimpleConfigWithVerification
): Promise<VerificationVerifyResult> {
  try {
    const { token, email } = input;
    const { db } = config;
    const verificationConfig = config.features?.verification;

    if (!verificationConfig?.enabled) {
      return { success: false, error: 'Account verification is not enabled' };
    }

    // Find user by email
    const users = await db.client
      .select()
      .from(db.tables.users)
      .where((eb: any) => eb.eq(db.tables.users.email, email.toLowerCase()))
      .limit(1)
      .execute();

    if (users.length === 0) {
      return { success: false, error: 'User not found' };
    }

    const user = users[0];

    // Find token
    const tokens = await db.client
      .select()
      .from(accountVerificationTokensTable)
      .where((eb: any) => eb.and(
        eb.eq(accountVerificationTokensTable.token, token),
        eb.eq(accountVerificationTokensTable.userId, user.id)
      ))
      .limit(1)
      .execute();

    if (tokens.length === 0) {
      return { success: false, error: 'Invalid token' };
    }

    const verificationToken = tokens[0];

    // Check if token is expired
    if (new Date() > new Date(verificationToken.expiresAt)) {
      return { success: false, error: 'Token has expired' };
    }

    // Check if token is already used
    if (verificationToken.usedAt) {
      return { success: false, error: 'Token has already been used' };
    }

    // Mark token as used
    await db.client
      .update(accountVerificationTokensTable)
      .set({
        usedAt: new Date()
      })
      .where((eb: any) => eb.eq(accountVerificationTokensTable.id, verificationToken.id))
      .execute();

    // Update user verification status
    const now = new Date();

    // Check if status record exists
    const statuses = await db.client
      .select()
      .from(userVerificationStatusTable)
      .where((eb: any) => eb.eq(userVerificationStatusTable.userId, user.id))
      .limit(1)
      .execute();

    if (statuses.length === 0) {
      // Create new status record
      await db.client.insert(userVerificationStatusTable).values({
        userId: user.id,
        verified: true,
        verifiedAt: now,
        verificationMethod: 'email',
        updatedAt: now
      }).execute();
    } else {
      // Update existing status record
      await db.client
        .update(userVerificationStatusTable)
        .set({
          verified: true,
          verifiedAt: now,
          verificationMethod: 'email',
          updatedAt: now
        })
        .where((eb: any) => eb.eq(userVerificationStatusTable.userId, user.id))
        .execute();
    }

    return {
      success: true,
      verified: true
    };
  } catch (error) {
    console.error('Error verifying account:', error);
    return { success: false, error: 'Failed to verify account' };
  }
}

/**
 * Get user verification status
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration with Verification
 * @returns Verification status result
 */
export async function getUserVerificationStatus(
  userId: string,
  config: NextAuthSimpleConfigWithVerification
): Promise<VerificationStatusResult> {
  try {
    const { db } = config;
    const verificationConfig = config.features?.verification;

    if (!verificationConfig?.enabled) {
      return { success: false, error: 'Account verification is not enabled' };
    }

    // Get verification status
    const statuses = await db.client
      .select()
      .from(userVerificationStatusTable)
      .where((eb: any) => eb.eq(userVerificationStatusTable.userId, userId))
      .limit(1)
      .execute();

    if (statuses.length === 0) {
      // No status record, user is not verified
      return {
        success: true,
        status: {
          verified: false,
          updatedAt: new Date()
        }
      };
    }

    return {
      success: true,
      status: statuses[0]
    };
  } catch (error) {
    console.error('Error getting user verification status:', error);
    return { success: false, error: 'Failed to get user verification status' };
  }
}

/**
 * Check if verification is required for login
 * 
 * @param config - NextAuth-Simple configuration with Verification
 * @returns Whether verification is required
 */
export function isVerificationRequired(
  config: NextAuthSimpleConfigWithVerification
): boolean | undefined {
  const verificationConfig = config.features?.verification;
  return verificationConfig?.enabled && !!verificationConfig.requireVerification;
}

/**
 * Mark user as verified manually
 * 
 * @param userId - User ID
 * @param method - Verification method
 * @param config - NextAuth-Simple configuration with Verification
 * @returns Success status
 */
export async function markUserAsVerified(
  userId: string,
  method: string,
  config: NextAuthSimpleConfigWithVerification
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = config;
    const verificationConfig = config.features?.verification;

    if (!verificationConfig?.enabled) {
      return { success: false, error: 'Account verification is not enabled' };
    }

    // Check if user exists
    const users = await db.client
      .select()
      .from(db.tables.users)
      .where((eb: any) => eb.eq(db.tables.users.id, userId))
      .limit(1)
      .execute();

    if (users.length === 0) {
      return { success: false, error: 'User not found' };
    }

    // Update user verification status
    const now = new Date();

    // Check if status record exists
    const statuses = await db.client
      .select()
      .from(userVerificationStatusTable)
      .where((eb: any) => eb.eq(userVerificationStatusTable.userId, userId))
      .limit(1)
      .execute();

    if (statuses.length === 0) {
      // Create new status record
      await db.client.insert(userVerificationStatusTable).values({
        userId,
        verified: true,
        verifiedAt: now,
        verificationMethod: method,
        updatedAt: now
      }).execute();
    } else {
      // Update existing status record
      await db.client
        .update(userVerificationStatusTable)
        .set({
          verified: true,
          verifiedAt: now,
          verificationMethod: method,
          updatedAt: now
        })
        .where((eb: any) => eb.eq(userVerificationStatusTable.userId, userId))
        .execute();
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking user as verified:', error);
    return { success: false, error: 'Failed to mark user as verified' };
  }
}
