import { APIGatewayProxyResult } from 'aws-lambda';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export function formatSuccessResponse<T>(data: T, statusCode: number = 200): APIGatewayProxyResult {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(response)
  };
}

export function formatErrorResponse(
  message: string, 
  statusCode: number = 500, 
  details?: any
): APIGatewayProxyResult {
  const response: ApiResponse = {
    success: false,
    error: {
      code: getErrorCode(statusCode),
      message,
      details
    },
    timestamp: new Date().toISOString()
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(response)
  };
}

function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'RATE_LIMITED';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 502:
      return 'BAD_GATEWAY';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Creates a mobile-optimized user response by removing internal fields
 */
export const createMobileUserResponse = (user: any): any => {
  // Create a clean copy without DynamoDB and internal fields
  const mobileUser = {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePictureUrl: user.profilePictureUrl,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    preferences: user.preferences ? {
      emailNotifications: user.preferences.emailNotifications,
      smsNotifications: user.preferences.smsNotifications,
      pushNotifications: user.preferences.pushNotifications,
      timezone: user.preferences.timezone,
      language: user.preferences.language,
      currency: user.preferences.currency,
      marketingEmails: user.preferences.marketingEmails
    } : {}
  };

  return mobileUser;
};

/**
 * Creates a mobile-optimized login response
 */
export const createMobileLoginResponse = (user: any, accessToken: string, refreshToken: string, expiresIn: number): APIGatewayProxyResult => {
  const mobileUser = createMobileUserResponse(user);
  
  return formatSuccessResponse({
    message: 'Login successful',
    user: mobileUser,
    accessToken,
    refreshToken,
    expiresIn
  });
};

/**
 * Test function to demonstrate mobile optimization
 */
export const testMobileOptimization = (user: any): any => {
  const originalSize = JSON.stringify(user).length;
  const mobileUser = createMobileUserResponse(user);
  const mobileSize = JSON.stringify(mobileUser).length;
  
  return {
    original: {
      user,
      size: originalSize
    },
    mobile: {
      user: mobileUser,
      size: mobileSize,
      reduction: `${Math.round(((originalSize - mobileSize) / originalSize) * 100)}%`
    }
  };
};
