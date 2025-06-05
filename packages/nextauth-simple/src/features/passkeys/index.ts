import crypto from 'crypto';
import { 
  type RegistrationOptionsInput,
  type RegistrationVerificationInput,
  type AuthenticationOptionsInput,
  type AuthenticationVerificationInput,
  type RegistrationOptionsResult,
  type RegistrationVerificationResult,
  type AuthenticationOptionsResult,
  type AuthenticationVerificationResult,
  type GetCredentialsResult,
  type NextAuthSimpleConfigWithPasskeys,
  type WebAuthnCredential
} from './types';
import { webAuthnCredentialsTable, webAuthnChallengesTable } from './db/schema';
import { createSession } from '../../core/auth';

// Base64URL encoding/decoding functions
function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(base64Url: string): Buffer {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

/**
 * Generate a random challenge for WebAuthn operations
 * 
 * @returns Random challenge as base64url string
 */
function generateChallenge(): string {
  return base64UrlEncode(crypto.randomBytes(32));
}

/**
 * Store a WebAuthn challenge in the database
 * 
 * @param challenge - Challenge string
 * @param userId - Optional user ID
 * @param config - NextAuth-Simple configuration with Passkeys
 * @returns Challenge ID
 */
async function storeChallenge(
  challenge: string,
  userId: string | undefined,
  config: NextAuthSimpleConfigWithPasskeys
): Promise<string> {
  const { db } = config;
  const passkeysConfig = config.features?.passkeys;
  
  // Calculate expiry time
  const timeoutSeconds = passkeysConfig?.challengeTimeoutSeconds || 60;
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + timeoutSeconds);
  
  // Store challenge
  const challengeId = crypto.randomUUID();
  
  await db.client.insert(webAuthnChallengesTable).values({
    id: challengeId,
    userId,
    challenge,
    expiresAt,
    createdAt: new Date()
  }).execute();
  
  return challengeId;
}

/**
 * Verify and consume a WebAuthn challenge
 * 
 * @param challenge - Challenge string
 * @param config - NextAuth-Simple configuration with Passkeys
 * @returns Whether the challenge is valid
 */
async function verifyAndConsumeChallenge(
  challenge: string,
  config: NextAuthSimpleConfigWithPasskeys
): Promise<boolean> {
  const { db } = config;
  
  // Find challenge
  const challenges = await db.client
    .select()
    .from(webAuthnChallengesTable)
    .where((eb: any) => eb.eq(webAuthnChallengesTable.challenge, challenge))
    .limit(1)
    .execute();
  
  if (challenges.length === 0) {
    return false;
  }
  
  const dbChallenge = challenges[0];
  
  // Check if challenge is expired
  if (new Date() > new Date(dbChallenge.expiresAt)) {
    return false;
  }
  
  // Check if challenge is already used
  if (dbChallenge.usedAt) {
    return false;
  }
  
  // Mark challenge as used
  await db.client
    .update(webAuthnChallengesTable)
    .set({
      usedAt: new Date()
    })
    .where((eb: any) => eb.eq(webAuthnChallengesTable.id, dbChallenge.id))
    .execute();
  
  return true;
}

/**
 * Get registration options for WebAuthn credential creation
 * 
 * @param input - Registration options input
 * @param config - NextAuth-Simple configuration with Passkeys
 * @returns Registration options result
 */
export async function getRegistrationOptions(
  input: RegistrationOptionsInput,
  config: NextAuthSimpleConfigWithPasskeys
): Promise<RegistrationOptionsResult> {
  try {
    const { userId, username, displayName } = input;
    const passkeysConfig = config.features?.passkeys;
    
    if (!passkeysConfig?.enabled) {
      return { success: false, error: 'WebAuthn (Passkeys) is not enabled' };
    }
    
    // Generate challenge
    const challenge = generateChallenge();
    
    // Store challenge
    await storeChallenge(challenge, userId, config);
    
    // Get existing credentials for this user
    const existingCredentials = await getUserCredentials(userId, config);
    
    // Create registration options
    const rpID = passkeysConfig.rpID || new URL(passkeysConfig.origin || process.env.NEXTAUTH_URL || '').hostname;
    
    const options = {
      challenge,
      rp: {
        name: passkeysConfig.rpName,
        id: rpID
      },
      user: {
        id: userId,
        name: username,
        displayName: displayName || username
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 } // RS256
      ],
      timeout: (passkeysConfig.challengeTimeoutSeconds || 60) * 1000,
      attestation: input.attestation || passkeysConfig.attestation || 'none',
      excludeCredentials: existingCredentials.success ? existingCredentials.credentials?.map(cred => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports
      })) : [],
      authenticatorSelection: {
        userVerification: passkeysConfig.userVerification || 'preferred',
        authenticatorAttachment: input.authenticatorAttachment || passkeysConfig.authenticatorAttachment
      }
    };
    
    return {
      success: true,
      options,
      challenge
    };
  } catch (error) {
    console.error('Error getting registration options:', error);
    return { success: false, error: 'Failed to get registration options' };
  }
}

/**
 * Verify WebAuthn registration
 * 
 * @param input - Registration verification input
 * @param config - NextAuth-Simple configuration with Passkeys
 * @returns Registration verification result
 */
export async function verifyRegistration(
  input: RegistrationVerificationInput,
  config: NextAuthSimpleConfigWithPasskeys
): Promise<RegistrationVerificationResult> {
  try {
    const { userId, credential } = input;
    const { db } = config;
    const passkeysConfig = config.features?.passkeys;
    
    if (!passkeysConfig?.enabled) {
      return { success: false, error: 'WebAuthn (Passkeys) is not enabled' };
    }
    
    // Verify challenge
    const isValidChallenge = await verifyAndConsumeChallenge(credential.response.clientDataJSON.challenge, config);
    
    if (!isValidChallenge) {
      return { success: false, error: 'Invalid or expired challenge' };
    }
    
    // Verify credential
    const credentialId = credential.id;
    const publicKey = credential.response.attestationObject.authData.credentialPublicKey;
    const counter = credential.response.attestationObject.authData.counter.toString();
    
    // Check if credential already exists
    const existingCredentials = await db.client
      .select()
      .from(webAuthnCredentialsTable)
      .where((eb: any) => eb.eq(webAuthnCredentialsTable.credentialId, credentialId))
      .limit(1)
      .execute();
    
    if (existingCredentials.length > 0) {
      return { success: false, error: 'Credential already exists' };
    }
    
    // Store credential
    const id = crypto.randomUUID();
    const now = new Date();
    
    const newCredential: WebAuthnCredential = {
      id,
      userId,
      credentialId,
      publicKey,
      counter,
      transports: credential.response.transports,
      deviceType: credential.response.authenticatorAttachment,
      backed: credential.response.authenticatorData?.flags?.backupEligibility || false,
      createdAt: now
    };
    
    await db.client.insert(webAuthnCredentialsTable).values(newCredential).execute();
    
    return {
      success: true,
      credential: newCredential
    };
  } catch (error) {
    console.error('Error verifying registration:', error);
    return { success: false, error: 'Failed to verify registration' };
  }
}

/**
 * Get authentication options for WebAuthn credential request
 * 
 * @param input - Authentication options input
 * @param config - NextAuth-Simple configuration with Passkeys
 * @returns Authentication options result
 */
export async function getAuthenticationOptions(
  input: AuthenticationOptionsInput,
  config: NextAuthSimpleConfigWithPasskeys
): Promise<AuthenticationOptionsResult> {
  try {
    const { userId, userVerification } = input;
    const { db } = config;
    const passkeysConfig = config.features?.passkeys;
    
    if (!passkeysConfig?.enabled) {
      return { success: false, error: 'WebAuthn (Passkeys) is not enabled' };
    }
    
    // Generate challenge
    const challenge = generateChallenge();
    
    // Store challenge
    await storeChallenge(challenge, userId, config);
    
    // Get allowable credentials
    let allowCredentials;
    
    if (userId) {
      const userCredentials = await getUserCredentials(userId, config);
      
      if (!userCredentials.success || !userCredentials.credentials?.length) {
        return { success: false, error: 'No credentials found for this user' };
      }
      
      allowCredentials = userCredentials.credentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports
      }));
    }
    
    // Create authentication options
    const rpID = passkeysConfig.rpID || new URL(passkeysConfig.origin || process.env.NEXTAUTH_URL || '').hostname;
    
    const options = {
      challenge,
      timeout: (passkeysConfig.challengeTimeoutSeconds || 60) * 1000,
      rpId: rpID,
      userVerification: userVerification || passkeysConfig.userVerification || 'preferred',
      allowCredentials
    };
    
    return {
      success: true,
      options,
      challenge
    };
  } catch (error) {
    console.error('Error getting authentication options:', error);
    return { success: false, error: 'Failed to get authentication options' };
  }
}

/**
 * Verify WebAuthn authentication
 * 
 * @param input - Authentication verification input
 * @param config - NextAuth-Simple configuration with Passkeys
 * @returns Authentication verification result
 */
export async function verifyAuthentication(
  input: AuthenticationVerificationInput,
  config: NextAuthSimpleConfigWithPasskeys
): Promise<AuthenticationVerificationResult> {
  try {
    const { credential } = input;
    const { db } = config;
    const passkeysConfig = config.features?.passkeys;
    
    if (!passkeysConfig?.enabled) {
      return { success: false, error: 'WebAuthn (Passkeys) is not enabled' };
    }
    
    // Verify challenge
    const isValidChallenge = await verifyAndConsumeChallenge(credential.response.clientDataJSON.challenge, config);
    
    if (!isValidChallenge) {
      return { success: false, error: 'Invalid or expired challenge' };
    }
    
    // Find credential
    const credentialId = credential.id;
    
    const credentials = await db.client
      .select()
      .from(webAuthnCredentialsTable)
      .where((eb: any) => eb.eq(webAuthnCredentialsTable.credentialId, credentialId))
      .limit(1)
      .execute();
    
    if (credentials.length === 0) {
      return { success: false, error: 'Credential not found' };
    }
    
    const dbCredential = credentials[0] as WebAuthnCredential;
    
    // Verify signature using public key
    // Note: In a real implementation, you would verify the signature here
    // using the stored public key and the authenticator data
    
    // Update counter
    const newCounter = credential.response.authenticatorData.counter.toString();
    
    await db.client
      .update(webAuthnCredentialsTable)
      .set({
        counter: newCounter,
        lastUsedAt: new Date()
      })
      .where((eb: any) => eb.eq(webAuthnCredentialsTable.id, dbCredential.id))
      .execute();
    
    // Get user
    const users = await db.client
      .select()
      .from(db.tables.users)
      .where((eb: any) => eb.eq(db.tables.users.id, dbCredential.userId))
      .limit(1)
      .execute();
    
    if (users.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    const user = users[0];
    
    // Create session
    const session = await createSession(dbCredential.userId, config);
    
    // Return success with user (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      success: true,
      credential: dbCredential,
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
    console.error('Error verifying authentication:', error);
    return { success: false, error: 'Failed to verify authentication' };
  }
}

/**
 * Get all WebAuthn credentials for a user
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration with Passkeys
 * @returns Get credentials result
 */
export async function getUserCredentials(
  userId: string,
  config: NextAuthSimpleConfigWithPasskeys
): Promise<GetCredentialsResult> {
  try {
    const { db } = config;
    const passkeysConfig = config.features?.passkeys;
    
    if (!passkeysConfig?.enabled) {
      return { success: false, error: 'WebAuthn (Passkeys) is not enabled' };
    }
    
    // Get credentials
    const credentials = await db.client
      .select()
      .from(webAuthnCredentialsTable)
      .where((eb: any) => eb.eq(webAuthnCredentialsTable.userId, userId))
      .execute();
    
    return {
      success: true,
      credentials: credentials as WebAuthnCredential[]
    };
  } catch (error) {
    console.error('Error getting user credentials:', error);
    return { success: false, error: 'Failed to get user credentials' };
  }
}

/**
 * Delete a WebAuthn credential
 * 
 * @param credentialId - Credential ID
 * @param userId - User ID (for verification)
 * @param config - NextAuth-Simple configuration with Passkeys
 * @returns Success status
 */
export async function deleteCredential(
  credentialId: string,
  userId: string,
  config: NextAuthSimpleConfigWithPasskeys
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = config;
    const passkeysConfig = config.features?.passkeys;
    
    if (!passkeysConfig?.enabled) {
      return { success: false, error: 'WebAuthn (Passkeys) is not enabled' };
    }
    
    // Find credential
    const credentials = await db.client
      .select()
      .from(webAuthnCredentialsTable)
      .where((eb: any) => eb.and(
        eb.eq(webAuthnCredentialsTable.credentialId, credentialId),
        eb.eq(webAuthnCredentialsTable.userId, userId)
      ))
      .limit(1)
      .execute();
    
    if (credentials.length === 0) {
      return { success: false, error: 'Credential not found or does not belong to user' };
    }
    
    // Delete credential
    await db.client
      .delete(webAuthnCredentialsTable)
      .where((eb: any) => eb.eq(webAuthnCredentialsTable.credentialId, credentialId))
      .execute();
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting credential:', error);
    return { success: false, error: 'Failed to delete credential' };
  }
}
