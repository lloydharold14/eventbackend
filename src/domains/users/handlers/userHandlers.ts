import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserService } from '../services/UserService';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { 
  userRegistrationSchema, 
  userLoginSchema, 
  userUpdateSchema,
  userSearchSchema,
  emailVerificationSchema,
  phoneVerificationSchema,
  passwordChangeSchema,
  passwordResetSchema,
  passwordResetConfirmSchema
} from '../../../shared/validators/schemas';
import { validateSchemaTyped } from '../../../shared/validators/schemas';
import { formatSuccessResponse, formatErrorResponse, ValidationError } from '../../../shared/errors/DomainError';
import { createMobileLoginResponse } from '../../../shared/utils/responseUtils';
import { logger } from '../../../shared/utils/logger';
import { UserRole } from '../../../shared/types/common';
import { UserRegistrationRequest, UserLoginRequest, UpdateUserRequest, UserSearchFilters, EmailVerificationConfirmRequest, PhoneVerificationConfirmRequest } from '../models/User';
import { initializeTracing, traceLambdaExecution, extractCorrelationId } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';

// Initialize tracing, metrics, and resilience
initializeTracing({
  serviceName: 'UserManagementService',
  enableTracing: process.env.ENABLE_TRACING === 'true',
  captureHTTP: true,
  captureAWS: true,
  captureSQL: true,
  capturePromise: true,
  captureError: true
});

const metricsManager = MetricsManager.getInstance();
const resilienceManager = new ResilienceManager();

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

const userService = new UserService(userRepository, authService);

// Authentication handlers
export const registerUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped<UserRegistrationRequest>(userRegistrationSchema, body);
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'UserManagementService', 'registerUser');
        return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
      }

      const user = await resilienceManager.executeWithResilience(
        () => authService.registerUser(validation.data),
        {
          circuitBreakerKey: 'user-registration',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/users/register', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.USERS_REGISTERED, 1, { userType: 'new' });
      
      logger.info('User registration successful', { 
        userId: user.id, 
        email: user.email, 
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'User registered successfully. Please check your email for verification.',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          createdAt: user.createdAt
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/users/register', 'POST', duration, 500);
      metricsManager.recordError('REGISTRATION_ERROR', 'UserManagementService', 'registerUser');
      
      logger.error('User registration failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error);
    }
  }, event)(event);
};

export const loginUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validation = validateSchemaTyped<UserLoginRequest>(userLoginSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
    }

    const loginResponse = await authService.loginUser(validation.data!);
    
    logger.info('User login successful', { userId: loginResponse.user.id, email: loginResponse.user.email });
    
    // Enhanced mobile detection logic
    const userAgent = event.headers['User-Agent'] || '';
    const userAgentLower = userAgent.toLowerCase();
    
    // More comprehensive mobile detection
    const isMobileRequest = userAgentLower.includes('mobile') || 
                           userAgentLower.includes('android') || 
                           userAgentLower.includes('ios') ||
                           userAgentLower.includes('iphone') ||
                           userAgentLower.includes('ipad') ||
                           userAgentLower.includes('reactnative') ||
                           userAgentLower.includes('eventsmobile') ||
                           userAgentLower.includes('eventsmobileapp') ||
                           userAgentLower.includes('postman') && userAgentLower.includes('mobile') ||
                           // Check for common mobile app patterns
                           userAgentLower.includes('app/') ||
                           userAgentLower.includes('mobileapp') ||
                           userAgentLower.includes('native') ||
                           // Check for mobile-specific headers
                           event.headers['X-Platform'] === 'mobile' ||
                           event.headers['X-Client-Type'] === 'mobile';
    
    logger.info('Login request details', { 
      userAgent, 
      userAgentLower,
      isMobileRequest, 
      userId: loginResponse.user.id,
      xPlatform: event.headers['X-Platform'],
      xClientType: event.headers['X-Client-Type']
    });
    
    if (isMobileRequest) {
      logger.info('Returning mobile-optimized response', { userId: loginResponse.user.id });
      return createMobileLoginResponse(
        loginResponse.user,
        loginResponse.accessToken,
        loginResponse.refreshToken,
        loginResponse.expiresIn
      );
    }
    
    return formatSuccessResponse({
      message: 'Login successful',
      ...loginResponse
    });
  } catch (error: any) {
    logger.error('User login failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const refreshToken = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { refreshToken } = body;

    if (!refreshToken) {
      return formatErrorResponse(new Error('Refresh token is required'));
    }

    const tokens = await authService.refreshToken(refreshToken);
    
    logger.info('Token refresh successful');
    return formatSuccessResponse({
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error: any) {
    logger.error('Token refresh failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const changePassword = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validation = validateSchemaTyped<any>(passwordChangeSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
    }

    // Get user from JWT token
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new ValidationError('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);
    await authService.changePassword(payload.userId, validation.data!.currentPassword, validation.data!.newPassword);
    
    logger.info('Password change successful', { userId: payload.userId });
    return formatSuccessResponse({
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    logger.error('Password change failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const resetPassword = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validation = validateSchemaTyped<any>(passwordResetSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
    }

    // Extract locale from Accept-Language header
    const acceptLanguage = event.headers['accept-language'] || event.headers['Accept-Language'] || 'en-US';
    const locale = acceptLanguage.split(',')[0].trim();
    
    // Extract base URL from request or use default
    const baseUrl = process.env.FRONTEND_URL || 'https://eventmanagementplatform.com';

    await authService.resetPassword(validation.data!.email, baseUrl, locale);
    
    logger.info('Password reset initiated', { email: validation.data!.email, locale });
    return formatSuccessResponse({
      message: 'If an account with this email exists, a password reset link has been sent.'
    });
  } catch (error: any) {
    logger.error('Password reset failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const confirmPasswordReset = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validation = validateSchemaTyped<any>(passwordResetConfirmSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
    }

    await authService.confirmPasswordReset(validation.data!.token, validation.data!.newPassword);
    
    logger.info('Password reset confirmed');
    return formatSuccessResponse({
      message: 'Password reset successfully'
    });
  } catch (error: any) {
    logger.error('Password reset confirmation failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

// User profile handlers
export const getUserProfile = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Get user from JWT token
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new Error('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);
    const user = await userService.getUserById(payload.userId);
    
    return formatSuccessResponse({
      user
    });
  } catch (error: any) {
    logger.error('Get user profile failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const updateUserProfile = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validation = validateSchemaTyped<UpdateUserRequest>(userUpdateSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
    }

    // Get user from JWT token
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new ValidationError('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);
    const updatedUser = await userService.updateUserProfile(payload.userId, validation.data!);
    
    logger.info('User profile updated', { userId: payload.userId });
    return formatSuccessResponse({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    logger.error('Update user profile failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const getUserById = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return formatErrorResponse(new ValidationError('User ID is required'));
    }

    // Check permissions
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new ValidationError('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);
    
    // Users can only view their own profile unless they're admin
    if (payload.userId !== userId && payload.role !== UserRole.ADMIN) {
      return formatErrorResponse(new ValidationError('Insufficient permissions'));
    }

    const user = await userService.getUserById(userId);
    
    return formatSuccessResponse({
      user
    });
  } catch (error: any) {
    logger.error('Get user by ID failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};



// Admin handlers
export const listUsers = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Check admin permissions
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new Error('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);
    if (payload.role !== UserRole.ADMIN) {
      return formatErrorResponse(new Error('Admin access required'));
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const pageSize = parseInt(queryParams.pageSize || '20');
    
    // Validate search parameters
    const searchParams = {
      role: queryParams.role as UserRole,
      status: queryParams.status,
      emailVerified: queryParams.emailVerified === 'true',
      phoneVerified: queryParams.phoneVerified === 'true',
      createdAfter: queryParams.createdAfter,
      createdBefore: queryParams.createdBefore,
      searchTerm: queryParams.searchTerm,
    };

    const validation = validateSchemaTyped<UserSearchFilters>(userSearchSchema, searchParams);
    if (!validation.isValid) {
      return formatErrorResponse(validation.errors);
    }

    const users = await userService.listUsers(validation.data, page, pageSize);
    
    return formatSuccessResponse({
      users: users.users,
      pagination: {
        totalCount: users.totalCount,
        page: users.page,
        pageSize: users.pageSize,
        hasNextPage: users.hasNextPage,
        hasPreviousPage: users.hasPreviousPage,
      }
    });
  } catch (error: any) {
    logger.error('List users failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const deleteUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return formatErrorResponse(new Error('User ID is required'));
    }

    // Check permissions
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new Error('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);
    await userService.deleteUser(userId, payload.userId, payload.role);
    
    logger.info('User deleted', { userId, deletedBy: payload.userId });
    return formatSuccessResponse({
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    logger.error('Delete user failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const changeUserRole = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return formatErrorResponse(new Error('User ID is required'));
    }

    const body = JSON.parse(event.body || '{}');
    const { role } = body;

    if (!role || !Object.values(UserRole).includes(role)) {
      return formatErrorResponse(new Error('Valid role is required'));
    }

    // Check admin permissions
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new Error('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);
    const updatedUser = await userService.changeUserRole(userId, role, payload.userId, payload.role);
    
    logger.info('User role changed', { userId, newRole: role, changedBy: payload.userId });
    return formatSuccessResponse({
      message: 'User role changed successfully',
      user: updatedUser
    });
  } catch (error: any) {
    logger.error('Change user role failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const getUserStats = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Check admin permissions
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new Error('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);
    if (payload.role !== UserRole.ADMIN) {
      return formatErrorResponse(new Error('Admin access required'));
    }

    const stats = await userService.getUserStats();
    
    return formatSuccessResponse({
      stats
    });
  } catch (error: any) {
    logger.error('Get user stats failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

// Verification handlers
export const verifyEmail = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = extractCorrelationId(event);
  const startTime = Date.now();
  
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validation = validateSchemaTyped<EmailVerificationConfirmRequest>(emailVerificationSchema, body);
    if (!validation.isValid) {
      metricsManager.recordError('VALIDATION_ERROR', 'UserManagementService', 'verifyEmail');
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []), correlationId);
    }

    const user = await resilienceManager.executeWithResilience(
      () => authService.verifyEmail(validation.data.userId, validation.data.code),
      {
        circuitBreakerKey: 'email-verification',
        retryConfig: { maxRetries: 3, baseDelay: 1000 },
        timeoutConfig: { timeoutMs: 10000 }
      }
    );
    
    const duration = Date.now() - startTime;
    metricsManager.recordApiPerformance('/auth/verify-email', 'POST', duration, 200);
    metricsManager.recordBusinessMetric(BusinessMetricName.EMAILS_VERIFIED, 1);
    
    logger.info('Email verification successful', { 
      userId: user.id, 
      email: user.email, 
      correlationId,
      duration 
    });
    
    return formatSuccessResponse({
      message: 'Email verified successfully. Your account is now active.',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        status: user.status
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    metricsManager.recordError('EMAIL_VERIFICATION_ERROR', 'UserManagementService', 'verifyEmail');
    
    logger.error('Email verification failed', { 
      error: error.message, 
      correlationId,
      duration 
    });
    
    return formatErrorResponse(error, correlationId);
  }
};

export const resendEmailVerification = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = extractCorrelationId(event);
  const startTime = Date.now();
  
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return formatErrorResponse(new ValidationError('User ID is required'), correlationId);
    }

    const verificationId = await resilienceManager.executeWithResilience(
      () => authService.resendEmailVerification(userId),
      {
        circuitBreakerKey: 'resend-email-verification',
        retryConfig: { maxRetries: 2, baseDelay: 2000 },
        timeoutConfig: { timeoutMs: 10000 }
      }
    );
    
    const duration = Date.now() - startTime;
    metricsManager.recordApiPerformance('/auth/resend-email-verification/{userId}', 'POST', duration, 200);
    
    logger.info('Email verification resent successfully', { 
      userId, 
      verificationId,
      correlationId,
      duration 
    });
    
    return formatSuccessResponse({
      message: 'Email verification code sent successfully. Please check your email.',
      verificationId
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    metricsManager.recordError('RESEND_EMAIL_VERIFICATION_ERROR', 'UserManagementService', 'resendEmailVerification');
    
    logger.error('Resend email verification failed', { 
      error: error.message, 
      userId: event.pathParameters?.userId,
      correlationId,
      duration 
    });
    
    return formatErrorResponse(error, correlationId);
  }
};

export const sendSMSVerification = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = extractCorrelationId(event);
  const startTime = Date.now();
  
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return formatErrorResponse(new ValidationError('User ID is required'), correlationId);
    }

    const verificationId = await resilienceManager.executeWithResilience(
      () => authService.sendSMSVerification(userId),
      {
        circuitBreakerKey: 'sms-verification',
        retryConfig: { maxRetries: 2, baseDelay: 2000 },
        timeoutConfig: { timeoutMs: 10000 }
      }
    );
    
    const duration = Date.now() - startTime;
    metricsManager.recordApiPerformance('/auth/send-sms-verification/{userId}', 'POST', duration, 200);
    
    logger.info('SMS verification sent successfully', { 
      userId, 
      verificationId,
      correlationId,
      duration 
    });
    
    return formatSuccessResponse({
      message: 'SMS verification code sent successfully. Please check your phone.',
      verificationId
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    metricsManager.recordError('SMS_VERIFICATION_ERROR', 'UserManagementService', 'sendSMSVerification');
    
    logger.error('SMS verification failed', { 
      error: error.message, 
      userId: event.pathParameters?.userId,
      correlationId,
      duration 
    });
    
    return formatErrorResponse(error, correlationId);
  }
};

export const verifySMS = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = extractCorrelationId(event);
  const startTime = Date.now();
  
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validation = validateSchemaTyped<PhoneVerificationConfirmRequest>(phoneVerificationSchema, body);
    if (!validation.isValid) {
      metricsManager.recordError('VALIDATION_ERROR', 'UserManagementService', 'verifySMS');
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []), correlationId);
    }

    const user = await resilienceManager.executeWithResilience(
      () => authService.verifySMS(validation.data.userId, validation.data.code),
      {
        circuitBreakerKey: 'sms-verification',
        retryConfig: { maxRetries: 3, baseDelay: 1000 },
        timeoutConfig: { timeoutMs: 10000 }
      }
    );
    
    const duration = Date.now() - startTime;
    metricsManager.recordApiPerformance('/auth/verify-sms', 'POST', duration, 200);
    metricsManager.recordBusinessMetric(BusinessMetricName.PHONES_VERIFIED, 1);
    
    logger.info('SMS verification successful', { 
      userId: user.id, 
      phoneNumber: user.phoneNumber, 
      correlationId,
      duration 
    });
    
    return formatSuccessResponse({
      message: 'SMS verified successfully.',
      user: {
        id: user.id,
        phoneVerified: user.phoneVerified
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    metricsManager.recordError('SMS_VERIFICATION_ERROR', 'UserManagementService', 'verifySMS');
    
    logger.error('SMS verification failed', { 
      error: error.message, 
      correlationId,
      duration 
    });
    
    return formatErrorResponse(error, correlationId);
  }
};


