import crypto from 'crypto';
import { hashPassword } from '../../utils/password';
import { 
  type PasswordResetRequestInput, 
  type PasswordResetVerifyInput, 
  type PasswordResetCompleteInput,
  type PasswordResetRequestResult,
  type PasswordResetVerifyResult,
  type PasswordResetCompleteResult,
  type NextAuthSimpleConfigWithPasswordReset
} from './types';
import { passwordResetTokensTable } from './db/schema';

/**
 * Default email sending function
 * 
 * @param to - Recipient email
 * @param subject - Email subject
 * @param html - Email HTML content
 * @returns Promise resolving to success status
 */
async function defaultSendEmail(to: string, subject: string, html: string): Promise<boolean> {
  console.log(`[Password Reset Email] To: ${to}, Subject: ${subject}`);
  console.log(`[Password Reset Email] Content: ${html}`);
  console.log('[Password Reset Email] This is a placeholder. Implement your own email sending function.');
  return true;
}

/**
 * Generate a secure random token for password reset
 * 
 * @returns Random token
 */
function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Request a password reset
 * 
 * @param input - Password reset request input
 * @param config - NextAuth-Simple configuration with Password Reset
 * @returns Password reset request result
 */
export async function requestPasswordReset(
  input: PasswordResetRequestInput,
  config: NextAuthSimpleConfigWithPasswordReset
): Promise<PasswordResetRequestResult> {
  try {
    const { email, redirectUrl } = input;
    const { db } = config;
    const passwordResetConfig = config.features?.passwordReset;
    
    if (!passwordResetConfig?.enabled) {
      return { success: false, error: 'Password reset is not enabled' };
    }
    
    // Validate email
    if (!email || !email.includes('@') || email.length < 5) {
      return { success: false, error: 'Invalid email address' };
    }
    
    // Find user by email
    const users = await db.client
      .select()
      .from(db.tables.users)
      .where((eb: any) => eb.eq(db.tables.users.email, email.toLowerCase()))
      .limit(1)
      .execute();
    
    // If user doesn't exist, still return success for security reasons
    // This prevents user enumeration
    if (users.length === 0) {
      return { success: true, emailSent: true };
    }
    
    const user = users[0];
    
    // Generate token
    const token = generatePasswordResetToken();
    
    // Calculate expiry time
    const expiryMinutes = passwordResetConfig.tokenExpiryMinutes || 15;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
    
    // Delete any existing tokens for this user
    await db.client
      .delete(passwordResetTokensTable)
      .where((eb: any) => eb.eq(passwordResetTokensTable.userId, user.id))
      .execute();
    
    // Store token
    await db.client.insert(passwordResetTokensTable).values({
      id: crypto.randomUUID(),
      userId: user.id,
      token,
      expiresAt,
      createdAt: new Date()
    }).execute();
    
    // Generate reset link
    const baseUrl = process.env.NEXTAUTH_URL || '';
    const resetUrl = redirectUrl 
      ? `${redirectUrl}?token=${token}&email=${encodeURIComponent(email.toLowerCase())}` 
      : `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;
    
    // Prepare email
    const subject = passwordResetConfig.emailSubject || 'Reset your password';
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Reset your password</h2>
        <p>You requested to reset your password. Click the link below to set a new password. This link will expire in ${expiryMinutes} minutes.</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset your password
          </a>
        </p>
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
        <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; font-size: 14px; color: #666;">${resetUrl}</p>
      </div>
    `;
    
    // Send email
    const sendEmail = passwordResetConfig.sendEmail || defaultSendEmail;
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
    console.error('Error requesting password reset:', error);
    return { success: false, error: 'Failed to request password reset' };
  }
}

/**
 * Verify a password reset token
 * 
 * @param input - Password reset verification input
 * @param config - NextAuth-Simple configuration with Password Reset
 * @returns Password reset verification result
 */
export async function verifyPasswordResetToken(
  input: PasswordResetVerifyInput,
  config: NextAuthSimpleConfigWithPasswordReset
): Promise<PasswordResetVerifyResult> {
  try {
    const { token, email } = input;
    const { db } = config;
    const passwordResetConfig = config.features?.passwordReset;
    
    if (!passwordResetConfig?.enabled) {
      return { success: false, error: 'Password reset is not enabled' };
    }
    
    // Find user by email
    const users = await db.client
      .select()
      .from(db.tables.users)
      .where((eb: any) => eb.eq(db.tables.users.email, email.toLowerCase()))
      .limit(1)
      .execute();
    
    if (users.length === 0) {
      return { success: false, error: 'Invalid token' };
    }
    
    const user = users[0];
    
    // Find token
    const tokens = await db.client
      .select()
      .from(passwordResetTokensTable)
      .where((eb: any) => eb.and(
        eb.eq(passwordResetTokensTable.token, token),
        eb.eq(passwordResetTokensTable.userId, user.id)
      ))
      .limit(1)
      .execute();
    
    if (tokens.length === 0) {
      return { success: false, error: 'Invalid token' };
    }
    
    const resetToken = tokens[0];
    
    // Check if token is expired
    if (new Date() > new Date(resetToken.expiresAt)) {
      return { success: false, error: 'Token has expired' };
    }
    
    // Check if token is already used
    if (resetToken.usedAt) {
      return { success: false, error: 'Token has already been used' };
    }
    
    return {
      success: true,
      valid: true,
      userId: user.id
    };
  } catch (error) {
    console.error('Error verifying password reset token:', error);
    return { success: false, error: 'Failed to verify token' };
  }
}

/**
 * Complete password reset
 * 
 * @param input - Password reset completion input
 * @param config - NextAuth-Simple configuration with Password Reset
 * @returns Password reset completion result
 */
export async function completePasswordReset(
  input: PasswordResetCompleteInput,
  config: NextAuthSimpleConfigWithPasswordReset
): Promise<PasswordResetCompleteResult> {
  try {
    const { token, email, password } = input;
    const { db } = config;
    const passwordResetConfig = config.features?.passwordReset;
    
    if (!passwordResetConfig?.enabled) {
      return { success: false, error: 'Password reset is not enabled' };
    }
    
    // Validate password
    const minLength = passwordResetConfig.minimumPasswordLength || 8;
    if (!password || password.length < minLength) {
      return { success: false, error: `Password must be at least ${minLength} characters long` };
    }
    
    // Verify token first
    const verifyResult = await verifyPasswordResetToken({ token, email }, config);
    
    if (!verifyResult.success || !verifyResult.valid) {
      return { success: false, error: verifyResult.error || 'Invalid token' };
    }
    
    const userId = verifyResult.userId;
    
    // Hash new password
    const bcryptWorkFactor = config.security?.bcryptWorkFactor || 12;
    const hashedPassword = await hashPassword(password, bcryptWorkFactor);
    
    // Update user password
    await db.client
      .update(db.tables.users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where((eb: any) => eb.eq(db.tables.users.id, userId))
      .execute();
    
    // Mark token as used
    await db.client
      .update(passwordResetTokensTable)
      .set({
        usedAt: new Date()
      })
      .where((eb: any) => eb.eq(passwordResetTokensTable.token, token))
      .execute();
    
    return {
      success: true,
      passwordUpdated: true
    };
  } catch (error) {
    console.error('Error completing password reset:', error);
    return { success: false, error: 'Failed to reset password' };
  }
}
