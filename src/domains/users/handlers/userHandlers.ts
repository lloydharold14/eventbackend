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
import { logger } from '../../../shared/utils/logger';
import { UserRole } from '../../../shared/types/common';
import { UserRegistrationRequest, UserLoginRequest, UpdateUserRequest, UserSearchFilters, EmailVerificationConfirmRequest, PhoneVerificationConfirmRequest } from '../models/User';

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
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validation = validateSchemaTyped<UserRegistrationRequest>(userRegistrationSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
    }

    const user = await authService.registerUser(validation.data);
    
    logger.info('User registration successful', { userId: user.id, email: user.email });
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
    logger.error('User registration failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const loginUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validation = validateSchema(userLoginSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
    }

    const loginResponse = await authService.loginUser(validation.data!);
    
    logger.info('User login successful', { userId: loginResponse.user.id, email: loginResponse.user.email });
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
    const validation = validateSchema(passwordChangeSchema, body);
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
    const validation = validateSchema(passwordResetSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
    }

    await authService.resetPassword(validation.data!.email);
    
    logger.info('Password reset initiated', { email: validation.data!.email });
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
    const validation = validateSchema(passwordResetConfirmSchema, body);
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
    const validation = validateSchema(userUpdateSchema, body);
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

// Verification handlers
export const verifyEmail = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validation = validateSchema(emailVerificationSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
    }

    // Get user from JWT token
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new ValidationError('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);
    await userService.verifyEmail(payload.userId, validation.data!);
    
    logger.info('Email verification successful', { userId: payload.userId });
    return formatSuccessResponse({
      message: 'Email verified successfully'
    });
  } catch (error: any) {
    logger.error('Email verification failed', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const verifyPhone = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validation = validateSchema(phoneVerificationSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
    }

    // Get user from JWT token
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse(new ValidationError('Authorization token is required'));
    }

    const payload = await authService.validateToken(token);
    await userService.verifyPhone(payload.userId, validation.data!);
    
    logger.info('Phone verification successful', { userId: payload.userId });
    return formatSuccessResponse({
      message: 'Phone number verified successfully'
    });
  } catch (error: any) {
    logger.error('Phone verification failed', { error: error.message, event });
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

    const validation = validateSchema(userSearchSchema, searchParams);
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
