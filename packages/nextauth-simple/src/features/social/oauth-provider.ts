import crypto from 'crypto';
import {
  type SocialAuthResult,
  type SocialProfile,
  type OAuthState,
  type OAuthTokenResponse,
  type NextAuthSimpleConfigWithSocial,
  SocialLoginConfig
} from './types';
import { socialAccountsTable } from './db/schema';
import { createSession } from '../../core/auth';

/**
 * Base class for OAuth providers
 */
export abstract class OAuthProvider {
  protected config: NextAuthSimpleConfigWithSocial;
  protected providerName: string;
  protected providerConfig: any;

  constructor(config: NextAuthSimpleConfigWithSocial, providerName: string) {
    this.config = config;
    this.providerName = providerName;
    this.providerConfig = config.features?.social?.providers?.[providerName as keyof SocialLoginConfig['providers']];

    if (!this.providerConfig) {
      throw new Error(`Provider ${providerName} is not configured`);
    }
  }

  /**
   * Generate authorization URL for OAuth flow
   * 
   * @param redirectUri - Redirect URI after authorization
   * @param callbackUrl - URL to redirect to after login
   * @returns Authorization URL and state
   */
  public getAuthorizationUrl(redirectUri: string, callbackUrl?: string): { url: string; state: string } {
    // Create state for CSRF protection
    const state = this.generateState(redirectUri, callbackUrl);
    const encodedState = this.encodeState(state);

    // Build authorization URL
    const authUrl = new URL(this.getAuthorizationEndpoint());
    authUrl.searchParams.append('client_id', this.providerConfig.clientId);
    authUrl.searchParams.append('redirect_uri', this.providerConfig.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', encodedState);

    const scope = this.providerConfig.scope || this.getDefaultScope();
    if (scope) {
      authUrl.searchParams.append('scope', scope);
    }

    return {
      url: authUrl.toString(),
      state: encodedState
    };
  }

  /**
   * Handle OAuth callback
   * 
   * @param code - Authorization code
   * @param state - State parameter
   * @returns Social auth result
   */
  public async handleCallback(code: string, state: string): Promise<SocialAuthResult> {
    try {
      // Decode and validate state
      const decodedState = this.decodeState(state);
      if (!decodedState || Date.now() - decodedState.createdAt > 10 * 60 * 1000) {
        return { success: false, error: 'Invalid or expired state' };
      }

      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code);
      if (!tokenResponse.access_token) {
        return { success: false, error: 'Failed to obtain access token' };
      }

      // Get user profile
      const profile = await this.getUserProfile(tokenResponse.access_token);
      if (!profile || !profile.id) {
        return { success: false, error: 'Failed to obtain user profile' };
      }

      // Find or create user
      const result = await this.findOrCreateUser(profile, tokenResponse, decodedState.provider);

      return result;
    } catch (error) {
      console.error(`Error handling ${this.providerName} callback:`, error);
      return { success: false, error: `Authentication with ${this.providerName} failed` };
    }
  }

  /**
   * Exchange authorization code for tokens
   * 
   * @param code - Authorization code
   * @returns Token response
   */
  protected async exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
    const tokenUrl = this.getTokenEndpoint();
    const params = new URLSearchParams();
    params.append('client_id', this.providerConfig.clientId);
    params.append('client_secret', this.providerConfig.clientSecret);
    params.append('code', code);
    params.append('redirect_uri', this.providerConfig.redirectUri);
    params.append('grant_type', 'authorization_code');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for tokens: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Find or create user based on social profile
   * 
   * @param profile - Social profile
   * @param tokens - OAuth tokens
   * @param provider - Provider name
   * @returns Social auth result
   */
  protected async findOrCreateUser(
    profile: SocialProfile,
    tokens: OAuthTokenResponse,
    provider: string
  ): Promise<SocialAuthResult> {
    const { db } = this.config;

    // Check if social account exists
    const accounts = await db.client
      .select()
      .from(socialAccountsTable)
      .where((eb: any) => eb.and(
        eb.eq(socialAccountsTable.provider, provider),
        eb.eq(socialAccountsTable.providerAccountId, profile.id)
      ))
      .limit(1)
      .execute();

    let userId: string;

    if (accounts.length > 0) {
      // Account exists, update tokens
      const account = accounts[0];
      userId = account.userId;

      await db.client
        .update(socialAccountsTable)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          tokenType: tokens.token_type,
          scope: tokens.scope,
          idToken: tokens.id_token,
          profile: profile,
          updatedAt: new Date()
        })
        .where((eb: any) => eb.eq(socialAccountsTable.id, account.id))
        .execute();
    } else {
      // Account doesn't exist, check if user exists by email
      let user;

      if (profile.email) {
        const users = await db.client
          .select()
          .from(db.tables.users)
          .where((eb: any) => eb.eq(db.tables.users.email, profile.email?.toLowerCase()))
          .limit(1)
          .execute();

        if (users.length > 0) {
          // User exists, link account
          user = users[0];
        }
      }

      if (!user) {
        // Create new user
        const now = new Date();
        userId = crypto.randomUUID();

        // Generate a random password (user won't need this)
        const randomPassword = crypto.randomBytes(32).toString('hex');

        const newUser = {
          id: userId,
          email: profile.email?.toLowerCase() || `${provider}_${profile.id}@example.com`,
          password: randomPassword,
          createdAt: now,
          updatedAt: now
        };

        await db.client.insert(db.tables.users).values(newUser).execute();
        user = newUser;
      } else {
        userId = user.id;
      }

      // Create social account
      await db.client.insert(socialAccountsTable).values({
        id: crypto.randomUUID(),
        userId,
        provider,
        providerAccountId: profile.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        tokenType: tokens.token_type,
        scope: tokens.scope,
        idToken: tokens.id_token,
        profile,
        createdAt: new Date(),
        updatedAt: new Date()
      }).execute();
    }

    // Get user
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

    // Create session
    const session = await createSession(userId, this.config);

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
      },
      profile,
      account: {
        provider,
        providerAccountId: profile.id
      }
    };
  }

  /**
   * Generate state for CSRF protection
   * 
   * @param redirectUri - Redirect URI after authorization
   * @param callbackUrl - URL to redirect to after login
   * @returns OAuth state
   */
  protected generateState(redirectUri: string, callbackUrl?: string): OAuthState {
    return {
      provider: this.providerName,
      redirectUri,
      callbackUrl,
      createdAt: Date.now()
    };
  }

  /**
   * Encode state as string
   * 
   * @param state - OAuth state
   * @returns Encoded state
   */
  protected encodeState(state: OAuthState): string {
    return Buffer.from(JSON.stringify(state)).toString('base64');
  }

  /**
   * Decode state from string
   * 
   * @param encodedState - Encoded state
   * @returns Decoded OAuth state
   */
  protected decodeState(encodedState: string): OAuthState | null {
    try {
      return JSON.parse(Buffer.from(encodedState, 'base64').toString());
    } catch (error) {
      console.error('Error decoding state:', error);
      return null;
    }
  }

  /**
   * Get authorization endpoint
   * 
   * @returns Authorization endpoint URL
   */
  protected abstract getAuthorizationEndpoint(): string;

  /**
   * Get token endpoint
   * 
   * @returns Token endpoint URL
   */
  protected abstract getTokenEndpoint(): string;

  /**
   * Get user profile
   * 
   * @param accessToken - Access token
   * @returns User profile
   */
  protected abstract getUserProfile(accessToken: string): Promise<SocialProfile>;

  /**
   * Get default scope
   * 
   * @returns Default scope
   */
  protected abstract getDefaultScope(): string;
}
