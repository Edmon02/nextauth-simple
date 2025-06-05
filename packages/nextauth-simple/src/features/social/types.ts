import { NextAuthSimpleConfig } from '../../core/types';
import { NextAuthSimpleConfigWithTwoFactor } from '../twoFactor/types';
import { NextAuthSimpleConfigWithMagicUrl } from '../magicUrl/types';

/**
 * Social provider configuration
 */
export interface SocialProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  profileUrl?: string;
  userInfoMapping?: Record<string, string>; // Maps provider profile fields to user fields
}

/**
 * Social login configuration
 */
export interface SocialLoginConfig {
  enabled: boolean;
  providers: {
    [key: string]: SocialProviderConfig | undefined; // Index signature
    google?: SocialProviderConfig;
    apple?: SocialProviderConfig;
    github?: SocialProviderConfig;
    facebook?: SocialProviderConfig;
    twitter?: SocialProviderConfig;
    // Add more providers as needed
  };
}

/**
 * Extended NextAuthSimpleConfig with Social Login
 */
export interface NextAuthSimpleConfigWithSocial extends NextAuthSimpleConfig {
  features?: {
    twoFactor?: NextAuthSimpleConfigWithTwoFactor['features'];
    magicUrl?: NextAuthSimpleConfigWithMagicUrl['features'];
    social?: SocialLoginConfig;
    // Other features will be added here
  };
}

/**
 * Social profile data
 */
export interface SocialProfile {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  [key: string]: any; // Additional profile data
}

/**
 * Social auth result
 */
export interface SocialAuthResult {
  success: boolean;
  error?: string;
  user?: any;
  session?: any;
  profile?: SocialProfile;
  account?: {
    provider: string;
    providerAccountId: string;
    [key: string]: any;
  };
}

/**
 * OAuth state data
 */
export interface OAuthState {
  provider: string;
  redirectUri: string;
  callbackUrl?: string;
  createdAt: number;
}

/**
 * OAuth token response
 */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}
