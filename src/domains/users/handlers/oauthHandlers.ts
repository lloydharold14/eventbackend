import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { OAuthService } from '../services/OAuthService';
import { UserRepository } from '../repositories/UserRepository';
import { AuthService } from '../services/AuthService';
import { formatSuccessResponse, formatErrorResponse, ValidationError } from '../../../shared/errors/DomainError';
import { logger } from '../../../shared/utils/logger';

// Initialize services
const userRepository = new UserRepository(
  process.env['AWS_REGION'] || 'ca-central-1',
  process.env['USER_TABLE_NAME'] || 'UserManagement-dev-Users'
);

const authService = new AuthService(
  userRepository,
  process.env['JWT_SECRET'] || 'default-secret-key',
  process.env['JWT_EXPIRES_IN'] || '1h',
  process.env['REFRESH_TOKEN_EXPIRES_IN'] || '7d'
);

const oauthService = new OAuthService(userRepository, authService);

// OAuth login handler
export const oauthLogin = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { provider, authorizationCode, redirectUri } = body;

    if (!provider || !authorizationCode || !redirectUri) {
      return formatErrorResponse(new ValidationError('Provider, authorization code, and redirect URI are required'));
    }

    const result = await oauthService.handleOAuthLogin({
      provider,
      authorizationCode,
      redirectUri
    });

    logger.info('OAuth login successful', {
      provider,
      userId: result.user.id,
      isNewUser: result.isNewUser
    });

    return formatSuccessResponse({
      message: result.isNewUser ? 'Account created and logged in successfully' : 'Login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        profilePictureUrl: result.user.profilePictureUrl,
        role: result.user.role,
        status: result.user.status,
        emailVerified: result.user.emailVerified,
        phoneVerified: result.user.phoneVerified,
        createdAt: result.user.createdAt
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      isNewUser: result.isNewUser
    });
  } catch (error: any) {
    logger.error('OAuth login failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

// Link OAuth account handler
export const linkOAuthAccount = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { provider, authorizationCode, redirectUri } = body;

    if (!provider || !authorizationCode || !redirectUri) {
      return formatErrorResponse(new ValidationError('Provider, authorization code, and redirect URI are required'));
    }

    // Get user from JWT token
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new ValidationError('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);

    await oauthService.linkOAuthAccount(payload.userId, provider, authorizationCode, redirectUri);

    logger.info('OAuth account linked successfully', {
      userId: payload.userId,
      provider
    });

    return formatSuccessResponse({
      message: 'OAuth account linked successfully'
    });
  } catch (error: any) {
    logger.error('Link OAuth account failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

// Unlink OAuth account handler
export const unlinkOAuthAccount = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { provider } = JSON.parse(event.body || '{}');

    if (!provider) {
      return formatErrorResponse(new ValidationError('Provider is required'));
    }

    // Get user from JWT token
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new ValidationError('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);

    await oauthService.unlinkOAuthAccount(payload.userId, provider);

    logger.info('OAuth account unlinked successfully', {
      userId: payload.userId,
      provider
    });

    return formatSuccessResponse({
      message: 'OAuth account unlinked successfully'
    });
  } catch (error: any) {
    logger.error('Unlink OAuth account failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

// Get linked OAuth accounts handler
export const getLinkedOAuthAccounts = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Get user from JWT token
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new ValidationError('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);

    const linkedAccounts = await oauthService.getLinkedOAuthAccounts(payload.userId);

    logger.info('Retrieved linked OAuth accounts', {
      userId: payload.userId,
      accountCount: linkedAccounts.length
    });

    return formatSuccessResponse({
      linkedAccounts
    });
  } catch (error: any) {
    logger.error('Get linked OAuth accounts failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

// Get OAuth authorization URL handler
export const getOAuthAuthorizationUrl = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { provider, redirectUri, state } = event.queryStringParameters || {};

    if (!provider || !redirectUri) {
      return formatErrorResponse(new ValidationError('Provider and redirect URI are required'));
    }

    const providers = new Map([
      ['google', {
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        scope: 'openid email profile'
      }],
      ['facebook', {
        authorizationUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
        clientId: process.env.FACEBOOK_CLIENT_ID || '',
        scope: 'email public_profile'
      }],
      ['apple', {
        authorizationUrl: 'https://appleid.apple.com/auth/authorize',
        clientId: process.env.APPLE_CLIENT_ID || '',
        scope: 'name email'
      }],
      ['microsoft', {
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        scope: 'openid email profile'
      }],
      ['github', {
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        clientId: process.env.GITHUB_CLIENT_ID || '',
        scope: 'read:user user:email'
      }]
    ]);

    const providerConfig = providers.get(provider);
    if (!providerConfig) {
      return formatErrorResponse(new ValidationError(`Unsupported OAuth provider: ${provider}`));
    }

    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: providerConfig.scope,
      ...(state && { state })
    });

    const authorizationUrl = `${providerConfig.authorizationUrl}?${params.toString()}`;

    logger.info('Generated OAuth authorization URL', { provider, redirectUri });

    return formatSuccessResponse({
      authorizationUrl,
      provider,
      redirectUri
    });
  } catch (error: any) {
    logger.error('Get OAuth authorization URL failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};
