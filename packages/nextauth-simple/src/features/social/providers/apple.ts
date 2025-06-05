import { OAuthProvider } from '../oauth-provider';
import { NextAuthSimpleConfigWithSocial, SocialProfile } from '../types';

/**
 * Apple OAuth provider
 */
export class AppleProvider extends OAuthProvider {
  constructor(config: NextAuthSimpleConfigWithSocial) {
    super(config, 'apple');
  }

  /**
   * Get authorization endpoint
   * 
   * @returns Authorization endpoint URL
   */
  protected getAuthorizationEndpoint(): string {
    return this.providerConfig.authorizationUrl || 'https://appleid.apple.com/auth/authorize';
  }

  /**
   * Get token endpoint
   * 
   * @returns Token endpoint URL
   */
  protected getTokenEndpoint(): string {
    return this.providerConfig.tokenUrl || 'https://appleid.apple.com/auth/token';
  }

  /**
   * Get user profile
   * 
   * @param accessToken - Access token
   * @returns User profile
   */
  protected async getUserProfile(accessToken: string): Promise<SocialProfile> {
    // Apple doesn't provide a profile endpoint, so we extract user info from the ID token
    const { idToken } = this.providerConfig;
    
    if (!idToken) {
      throw new Error('ID token is required for Apple authentication');
    }
    
    // Parse the JWT token
    const payload = this.parseJwt(idToken);
    
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name || '',
      emailVerified: payload.email_verified === 'true',
    };
  }

  /**
   * Parse JWT token
   * 
   * @param token - JWT token
   * @returns Parsed token payload
   */
  private parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        Buffer.from(base64, 'base64')
          .toString()
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      throw new Error('Failed to parse ID token');
    }
  }

  /**
   * Get default scope
   * 
   * @returns Default scope
   */
  protected getDefaultScope(): string {
    return 'name email';
  }
}
