import { User, UserRegistrationRequest } from '../models/User';
import { UserRepository } from '../repositories/UserRepository';
import { AuthService } from './AuthService';
import { UserRole, UserStatus } from '../../../shared/types/common';
import { logger } from '../../../shared/utils/logger';
import { ValidationError, UnauthorizedError } from '../../../shared/errors/DomainError';

export interface OAuthProvider {
  name: 'google' | 'facebook' | 'apple' | 'microsoft' | 'github';
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

export interface OAuthUserInfo {
  provider: string;
  providerUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  emailVerified: boolean;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
  expiresAt?: string;
}

export interface OAuthLoginRequest {
  provider: 'google' | 'facebook' | 'apple' | 'microsoft' | 'github';
  authorizationCode: string;
  redirectUri: string;
}

export class OAuthService {
  private readonly userRepository: UserRepository;
  private readonly authService: AuthService;
  private readonly providers: Map<string, OAuthProvider>;

  constructor(userRepository: UserRepository, authService: AuthService) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.providers = this.initializeProviders();
  }

  async handleOAuthLogin(oauthRequest: OAuthLoginRequest): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    isNewUser: boolean;
  }> {
    try {
      const provider = this.providers.get(oauthRequest.provider);
      if (!provider) {
        throw new ValidationError(`Unsupported OAuth provider: ${oauthRequest.provider}`);
      }

      // Exchange authorization code for access token
      const tokenResponse = await this.exchangeCodeForToken(
        provider,
        oauthRequest.authorizationCode,
        oauthRequest.redirectUri
      );

      // Get user information from OAuth provider
      const oauthUserInfo = await this.getUserInfo(provider, tokenResponse.accessToken);

      // Find or create user
      const { user, isNewUser } = await this.findOrCreateUser(oauthUserInfo);

      // Generate JWT tokens
      const tokens = await this.authService.generateTokenPair(user);

      logger.info('OAuth login successful', {
        provider: oauthRequest.provider,
        userId: user.id,
        isNewUser
      });

      return {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        isNewUser
      };
    } catch (error: any) {
      logger.error('OAuth login failed', {
        error: error.message,
        provider: oauthRequest.provider
      });
      throw error;
    }
  }

  async linkOAuthAccount(
    userId: string,
    provider: string,
    authorizationCode: string,
    redirectUri: string
  ): Promise<void> {
    try {
      const oauthProvider = this.providers.get(provider);
      if (!oauthProvider) {
        throw new ValidationError(`Unsupported OAuth provider: ${provider}`);
      }

      // Exchange code for token
      const tokenResponse = await this.exchangeCodeForToken(
        oauthProvider,
        authorizationCode,
        redirectUri
      );

      // Get user info
      const oauthUserInfo = await this.getUserInfo(oauthProvider, tokenResponse.accessToken);

      // Check if this OAuth account is already linked to another user
      const existingUser = await this.userRepository.getUserByOAuthProvider(
        provider,
        oauthUserInfo.providerUserId
      );

      if (existingUser && existingUser.id !== userId) {
        throw new ValidationError('This OAuth account is already linked to another user');
      }

      // Link OAuth account to user
      await this.userRepository.linkOAuthAccount(userId, {
        provider,
        providerUserId: oauthUserInfo.providerUserId,
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        expiresIn: tokenResponse.expiresIn,
        tokenType: tokenResponse.tokenType,
        scope: tokenResponse.scope,
        expiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString()
      });

      logger.info('OAuth account linked successfully', { userId, provider });
    } catch (error: any) {
      logger.error('Failed to link OAuth account', {
        error: error.message,
        userId,
        provider
      });
      throw error;
    }
  }

  async unlinkOAuthAccount(userId: string, provider: string): Promise<void> {
    try {
      await this.userRepository.unlinkOAuthAccount(userId, provider);
      logger.info('OAuth account unlinked successfully', { userId, provider });
    } catch (error: any) {
      logger.error('Failed to unlink OAuth account', {
        error: error.message,
        userId,
        provider
      });
      throw error;
    }
  }

  async getLinkedOAuthAccounts(userId: string): Promise<Array<{
    provider: string;
    providerUserId: string;
    linkedAt: string;
  }>> {
    try {
      return await this.userRepository.getLinkedOAuthAccounts(userId);
    } catch (error: any) {
      logger.error('Failed to get linked OAuth accounts', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  private async exchangeCodeForToken(
    provider: OAuthProvider,
    authorizationCode: string,
    redirectUri: string
  ): Promise<OAuthTokenResponse> {
    try {
      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
          code: authorizationCode,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        throw new UnauthorizedError(`Failed to exchange code for token: ${response.statusText}`);
      }

      const tokenData = await response.json() as any;
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
      };
    } catch (error: any) {
      logger.error('Failed to exchange code for token', {
        error: error.message,
        provider: provider.name
      });
      throw error;
    }
  }

  private async getUserInfo(provider: OAuthProvider, accessToken: string): Promise<OAuthUserInfo> {
    try {
      const response = await fetch(provider.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new UnauthorizedError(`Failed to get user info: ${response.statusText}`);
      }

      const userData = await response.json();
      return this.parseUserInfo(provider.name, userData);
    } catch (error: any) {
      logger.error('Failed to get user info', {
        error: error.message,
        provider: provider.name
      });
      throw error;
    }
  }

  private parseUserInfo(provider: string, userData: any): OAuthUserInfo {
    switch (provider) {
      case 'google':
        return {
          provider,
          providerUserId: userData.sub,
          email: userData.email,
          firstName: userData.given_name,
          lastName: userData.family_name,
          profilePicture: userData.picture,
          emailVerified: userData.email_verified,
        };
      case 'facebook':
        return {
          provider,
          providerUserId: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          profilePicture: userData.picture?.data?.url,
          emailVerified: true, // Facebook doesn't provide email verification status
        };
      case 'apple':
        return {
          provider,
          providerUserId: userData.sub,
          email: userData.email,
          firstName: userData.name?.firstName,
          lastName: userData.name?.lastName,
          emailVerified: true, // Apple emails are verified
        };
      case 'microsoft':
        return {
          provider,
          providerUserId: userData.id,
          email: userData.mail || userData.userPrincipalName,
          firstName: userData.givenName,
          lastName: userData.surname,
          profilePicture: userData.profilePicture,
          emailVerified: true, // Microsoft emails are verified
        };
      case 'github':
        return {
          provider,
          providerUserId: userData.id.toString(),
          email: userData.email,
          firstName: userData.name?.split(' ')[0],
          lastName: userData.name?.split(' ').slice(1).join(' '),
          profilePicture: userData.avatar_url,
          emailVerified: userData.email_verified,
        };
      default:
        throw new ValidationError(`Unsupported OAuth provider: ${provider}`);
    }
  }

  private async findOrCreateUser(oauthUserInfo: OAuthUserInfo): Promise<{
    user: User;
    isNewUser: boolean;
  }> {
    try {
      // Try to find existing user by OAuth provider
      let user = await this.userRepository.getUserByOAuthProvider(
        oauthUserInfo.provider,
        oauthUserInfo.providerUserId
      );

      if (user) {
        // Update last login
        await this.userRepository.updateLastLogin(user.id);
        return { user, isNewUser: false };
      }

      // Try to find user by email
      user = await this.userRepository.getUserByEmail(oauthUserInfo.email);
      if (user) {
        // Link OAuth account to existing user
        await this.userRepository.linkOAuthAccount(user.id, {
          provider: oauthUserInfo.provider,
          providerUserId: oauthUserInfo.providerUserId,
          accessToken: '', // Will be updated later
          refreshToken: '',
          expiresIn: 0,
          tokenType: 'Bearer',
          scope: '',
          expiresAt: new Date().toISOString()
        });
        return { user, isNewUser: false };
      }

      // Create new user
      const registrationData: UserRegistrationRequest = {
        email: oauthUserInfo.email,
        username: this.generateUsername(oauthUserInfo.email),
        firstName: oauthUserInfo.firstName || 'Unknown',
        lastName: oauthUserInfo.lastName || 'User',
        password: this.generateSecurePassword(), // Will be replaced by OAuth
        acceptTerms: true,
        marketingConsent: false,
      };

      const newUser = await this.authService.registerUser(registrationData);

      // Link OAuth account
      await this.userRepository.linkOAuthAccount(newUser.id, {
        provider: oauthUserInfo.provider,
        providerUserId: oauthUserInfo.providerUserId,
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        tokenType: 'Bearer',
        scope: '',
        expiresAt: new Date().toISOString()
      });

      // Mark email as verified if OAuth provider verified it
      if (oauthUserInfo.emailVerified) {
        await this.userRepository.verifyEmail(newUser.id);
        await this.userRepository.updateUser(newUser.id, { status: UserStatus.ACTIVE });
      }

      return { user: newUser, isNewUser: true };
    } catch (error: any) {
      logger.error('Failed to find or create user', {
        error: error.message,
        oauthUserInfo
      });
      throw error;
    }
  }

  private generateUsername(email: string): string {
    const baseUsername = email.split('@')[0];
    const timestamp = Date.now().toString().slice(-4);
    return `${baseUsername}${timestamp}`;
  }

  private generateSecurePassword(): string {
    return Math.random().toString(36).slice(-12) + 
           Math.random().toString(36).toUpperCase().slice(-4) + 
           Math.floor(Math.random() * 10) + 
           '!@#$%^&*'[Math.floor(Math.random() * 8)];
  }

  private initializeProviders(): Map<string, OAuthProvider> {
    const providers = new Map<string, OAuthProvider>();

    // Google OAuth
    providers.set('google', {
      name: 'google',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scope: 'openid email profile',
    });

    // Facebook OAuth
    providers.set('facebook', {
      name: 'facebook',
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      authorizationUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v12.0/oauth/access_token',
      userInfoUrl: 'https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture',
      scope: 'email public_profile',
    });

    // Apple OAuth
    providers.set('apple', {
      name: 'apple',
      clientId: process.env.APPLE_CLIENT_ID || '',
      clientSecret: process.env.APPLE_CLIENT_SECRET || '',
      authorizationUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      userInfoUrl: 'https://appleid.apple.com/auth/userinfo',
      scope: 'name email',
    });

    // Microsoft OAuth
    providers.set('microsoft', {
      name: 'microsoft',
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scope: 'openid email profile',
    });

    // GitHub OAuth
    providers.set('github', {
      name: 'github',
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scope: 'read:user user:email',
    });

    return providers;
  }
}
