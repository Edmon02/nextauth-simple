import crypto from 'crypto';
import { 
  type MagicUrlLoginInput, 
  type MagicUrlVerifyInput, 
  type MagicUrlLoginResult, 
  type MagicUrlVerifyResult,
  type NextAuthSimpleConfigWithMagicUrl
} from './types';
import { magicUrlTokensTable } from './db/schema';
import { createSession } from '../../core/auth';

/**
 * Default email sending function
 * 
 * @param to - Recipient email
 * @param subject - Email subject
 * @param html - Email HTML content
 * @returns Promise resolving to success status
 */
async function defaultSendEmail(to: string, subject: string, html: string): Promise<boolean> {
  console.log(`[Magic URL Email] To: ${to}, Subject: ${subject}`);
  console.log(`[Magic URL Email] Content: ${html}`);
  console.log('[Magic URL Email] This is a placeholder. Implement your own email sending function.');
  return true;
}

/**
 * Generate a secure random token for magic URL
 * 
 * @returns Random token
 */
function generateMagicUrlToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a magic URL login link
 * 
 * @param input - Magic URL login input
 * @param config - NextAuth-Simple configuration with Magic URL
 * @returns Magic URL login result
 */
export async function createMagicUrlLogin(
  input: MagicUrlLoginInput,
  config: NextAuthSimpleConfigWithMagicUrl
): Promise<MagicUrlLoginResult> {
  try {
    const { email, callbackUrl } = input;
    const { db } = config;
    const magicUrlConfig = config.features?.magicUrl;
    
    if (!magicUrlConfig?.enabled) {
      return { success: false, error: 'Magic URL authentication is not enabled' };
    }
    
    // Validate email
    if (!email || !email.includes('@') || email.length < 5) {
      return { success: false, error: 'Invalid email address' };
    }
    
    // Generate token
    const token = generateMagicUrlToken();
    
    // Calculate expiry time
    const expiryMinutes = magicUrlConfig.tokenExpiryMinutes || 10;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
    
    // Store token
    await db.client.insert(magicUrlTokensTable).values({
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      token,
      expiresAt,
      createdAt: new Date(),
      callbackUrl: callbackUrl || ''
    }).execute();
    
    // Generate magic link
    const baseUrl = process.env.NEXTAUTH_URL || '';
    const magicLink = `${baseUrl}/api/auth/verify-magic-url?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;
    
    // Prepare email
    const subject = magicUrlConfig.emailSubject || 'Your login link';
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Login to your account</h2>
        <p>Click the link below to log in to your account. This link will expire in ${expiryMinutes} minutes.</p>
        <p style="margin: 20px 0;">
          <a href="${magicLink}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Log in to your account
          </a>
        </p>
        <p>If you didn't request this link, you can safely ignore this email.</p>
        <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; font-size: 14px; color: #666;">${magicLink}</p>
      </div>
    `;
    
    // Send email
    const sendEmail = magicUrlConfig.sendEmail || defaultSendEmail;
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
    console.error('Error creating magic URL login:', error);
    return { success: false, error: 'Failed to create magic URL login' };
  }
}

/**
 * Verify a magic URL token
 * 
 * @param input - Magic URL verification input
 * @param config - NextAuth-Simple configuration with Magic URL
 * @returns Magic URL verification result
 */
export async function verifyMagicUrlToken(
  input: MagicUrlVerifyInput,
  config: NextAuthSimpleConfigWithMagicUrl
): Promise<MagicUrlVerifyResult> {
  try {
    const { token, email } = input;
    const { db } = config;
    const magicUrlConfig = config.features?.magicUrl;
    
    if (!magicUrlConfig?.enabled) {
      return { success: false, error: 'Magic URL authentication is not enabled' };
    }
    
    // Find token
    const tokens = await db.client
      .select()
      .from(magicUrlTokensTable)
      .where((eb: any) => eb.and(
        eb.eq(magicUrlTokensTable.token, token),
        eb.eq(magicUrlTokensTable.email, email.toLowerCase())
      ))
      .limit(1)
      .execute();
    
    if (tokens.length === 0) {
      return { success: false, error: 'Invalid or expired token' };
    }
    
    const magicToken = tokens[0];
    
    // Check if token is expired
    if (new Date() > new Date(magicToken.expiresAt)) {
      return { success: false, error: 'Token has expired' };
    }
    
    // Check if token is already used
    if (magicToken.usedAt) {
      return { success: false, error: 'Token has already been used' };
    }
    
    // Mark token as used
    await db.client
      .update(magicUrlTokensTable)
      .set({
        usedAt: new Date()
      })
      .where((eb: any) => eb.eq(magicUrlTokensTable.id, magicToken.id))
      .execute();
    
    // Find or create user
    let user;
    const users = await db.client
      .select()
      .from(db.tables.users)
      .where((eb: any) => eb.eq(db.tables.users.email, email.toLowerCase()))
      .limit(1)
      .execute();
    
    if (users.length > 0) {
      // User exists
      user = users[0];
    } else {
      // Create new user
      const userId = crypto.randomUUID();
      const now = new Date();
      
      // Generate a random password (user won't need this)
      const randomPassword = crypto.randomBytes(32).toString('hex');
      
      const newUser = {
        id: userId,
        email: email.toLowerCase(),
        password: randomPassword, // This is just a placeholder
        createdAt: now,
        updatedAt: now
      };
      
      await db.client.insert(db.tables.users).values(newUser).execute();
      user = newUser;
    }
    
    // Create session
    const session = await createSession(user.id, config);
    
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
    console.error('Error verifying magic URL token:', error);
    return { success: false, error: 'Failed to verify magic URL token' };
  }
}
