import { OAuthProvider } from '../oauth-provider';
import { NextAuthSimpleConfigWithSocial, SocialProfile } from '../types';

/**
 * Google OAuth provider
 */
export class GoogleProvider extends OAuthProvider {
  constructor(config: NextAuthSimpleConfigWithSocial) {
    super(config, 'google');
  }

  /**
   * Get authorization endpoint
   * 
   * @returns Authorization endpoint URL
   */
  protected getAuthorizationEndpoint(): string {
    return this.providerConfig.authorizationUrl || 'https://accounts.google.com/o/oauth2/v2/auth';
  }

  /**
   * Get token endpoint
   * 
   * @returns Token endpoint URL
   */
  protected getTokenEndpoint(): string {
    return this.providerConfig.tokenUrl || 'https://oauth2.googleapis.com/token';
  }

  /**
   * Get user profile
   * 
   * @param accessToken - Access token
   * @returns User profile
   */
  protected async getUserProfile(accessToken: string): Promise<SocialProfile> {
    const profileUrl = this.providerConfig.profileUrl || 'https://www.googleapis.com/oauth2/v3/userinfo';
    
    const response = await fetch(profileUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get Google profile: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      image: data.picture,
      emailVerified: data.email_verified,
      givenName: data.given_name,
      familyName: data.family_name,
      locale: data.locale
    };
  }

  /**
   * Get default scope
   * 
   * @returns Default scope
   */
  protected getDefaultScope(): string {
    return 'openid email profile';
  }
}
