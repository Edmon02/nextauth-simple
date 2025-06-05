import { GoogleProvider } from './providers/google';
import { AppleProvider } from './providers/apple';
import { GitHubProvider } from './providers/github';
import { NextAuthSimpleConfigWithSocial, SocialAuthResult } from './types';

/**
 * Create a social login provider instance
 * 
 * @param provider - Provider name
 * @param config - NextAuth-Simple configuration with social
 * @returns Provider instance
 */
export function createProvider(provider: string, config: NextAuthSimpleConfigWithSocial) {
  switch (provider.toLowerCase()) {
    case 'google':
      return new GoogleProvider(config);
    case 'apple':
      return new AppleProvider(config);
    case 'github':
      return new GitHubProvider(config);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Get authorization URL for social login
 * 
 * @param provider - Provider name
 * @param config - NextAuth-Simple configuration with social
 * @param redirectUri - Redirect URI after authorization
 * @param callbackUrl - URL to redirect to after login
 * @returns Authorization URL and state
 */
export function getSocialAuthorizationUrl(
  provider: string,
  config: NextAuthSimpleConfigWithSocial,
  redirectUri: string,
  callbackUrl?: string
): { url: string; state: string } {
  const providerInstance = createProvider(provider, config);
  return providerInstance.getAuthorizationUrl(redirectUri, callbackUrl);
}

/**
 * Handle social login callback
 * 
 * @param provider - Provider name
 * @param code - Authorization code
 * @param state - State parameter
 * @param config - NextAuth-Simple configuration with social
 * @returns Social auth result
 */
export async function handleSocialCallback(
  provider: string,
  code: string,
  state: string,
  config: NextAuthSimpleConfigWithSocial
): Promise<SocialAuthResult> {
  try {
    const providerInstance = createProvider(provider, config);
    return await providerInstance.handleCallback(code, state);
  } catch (error) {
    console.error(`Error handling ${provider} callback:`, error);
    return { success: false, error: `Authentication with ${provider} failed` };
  }
}

/**
 * Get available social providers
 * 
 * @param config - NextAuth-Simple configuration with social
 * @returns Array of available provider names
 */
export function getAvailableSocialProviders(config: NextAuthSimpleConfigWithSocial): string[] {
  const providers = [];
  const socialConfig = config.features?.social;
  
  if (!socialConfig?.enabled) {
    return [];
  }
  
  if (socialConfig.providers.google?.clientId) {
    providers.push('google');
  }
  
  if (socialConfig.providers.apple?.clientId) {
    providers.push('apple');
  }
  
  if (socialConfig.providers.github?.clientId) {
    providers.push('github');
  }
  
  // Add more providers as they are implemented
  
  return providers;
}
