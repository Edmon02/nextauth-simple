import { OAuthProvider } from '../oauth-provider';
import { NextAuthSimpleConfigWithSocial, SocialProfile } from '../types';

/**
 * GitHub OAuth provider
 */
export class GitHubProvider extends OAuthProvider {
  constructor(config: NextAuthSimpleConfigWithSocial) {
    super(config, 'github');
  }

  /**
   * Get authorization endpoint
   * 
   * @returns Authorization endpoint URL
   */
  protected getAuthorizationEndpoint(): string {
    return this.providerConfig.authorizationUrl || 'https://github.com/login/oauth/authorize';
  }

  /**
   * Get token endpoint
   * 
   * @returns Token endpoint URL
   */
  protected getTokenEndpoint(): string {
    return this.providerConfig.tokenUrl || 'https://github.com/login/oauth/access_token';
  }

  /**
   * Get user profile
   * 
   * @param accessToken - Access token
   * @returns User profile
   */
  protected async getUserProfile(accessToken: string): Promise<SocialProfile> {
    const profileUrl = this.providerConfig.profileUrl || 'https://api.github.com/user';
    
    const response = await fetch(profileUrl, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get GitHub profile: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // GitHub doesn't return email in the profile by default, need to fetch it separately
    let email = data.email;
    
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/json'
        }
      });
      
      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        const primaryEmail = emails.find((e: any) => e.primary);
        
        if (primaryEmail) {
          email = primaryEmail.email;
        } else if (emails.length > 0) {
          email = emails[0].email;
        }
      }
    }
    
    return {
      id: data.id.toString(),
      email,
      name: data.name || data.login,
      image: data.avatar_url,
      login: data.login,
      url: data.html_url,
      bio: data.bio,
      location: data.location,
      company: data.company
    };
  }

  /**
   * Get default scope
   * 
   * @returns Default scope
   */
  protected getDefaultScope(): string {
    return 'user:email';
  }
}
