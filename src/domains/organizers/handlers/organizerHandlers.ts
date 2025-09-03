import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { OrganizerService } from '../services/organizer/OrganizerService';
import { UserService } from '../../users/services/UserService';
import { EventService } from '../../events/services/EventService';
import { BookingService } from '../../bookings/services/BookingService';
import { PaymentService } from '../../payments/services/PaymentService';
import { formatSuccessResponse, formatErrorResponse, ValidationError, NotFoundError, UnauthorizedError } from '../../../shared/errors/DomainError';
import { logger } from '../../../shared/utils/logger';
import { validateSchemaTyped } from '../../../shared/validators/schemas';
import { 
  CreateOrganizerRequest, 
  UpdateOrganizerRequest, 
  OrganizerSearchFilters 
} from '../models/Organizer';
import { initializeTracing, traceLambdaExecution, extractCorrelationId } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';

// Initialize tracing, metrics, and resilience (will be disabled if DISABLE_XRAY/DISABLE_CLOUDWATCH are true)
initializeTracing({
  serviceName: 'OrganizerManagementService',
  enableTracing: process.env.ENABLE_TRING === 'true',
  captureHTTP: true,
  captureAWS: true,
  captureSQL: true,
  capturePromise: true,
  captureError: true
});

const metricsManager = MetricsManager.getInstance();
const resilienceManager = new ResilienceManager();

// Initialize services
const userService = new UserService(
  // TODO: Initialize with proper dependencies
  {} as any, // UserRepository
  {} as any  // AuthService
);

const eventService = new EventService(
  // TODO: Initialize with proper dependencies
  {} as any  // EventRepository
);

const bookingService = new BookingService(
  // TODO: Initialize with proper dependencies
  {} as any  // BookingRepository
);

const paymentService = new PaymentService(
  // TODO: Initialize with proper dependencies
  {} as any  // PaymentRepository
);

const organizerService = new OrganizerService(
  userService,
  eventService,
  bookingService,
  paymentService
);

// Helper function to get user from JWT token
const getUserFromToken = async (event: APIGatewayProxyEvent) => {
  const token = event.headers.Authorization?.replace('Bearer ', '');
  if (!token) {
    throw new UnauthorizedError('Authorization token is required');
  }
  
  // TODO: Implement proper token validation
  return {
    userId: 'mock-user-id',
    email: 'user@example.com',
    name: 'Mock User'
  };
};

// Helper function to detect mobile request
const detectMobileRequest = (event: APIGatewayProxyEvent): boolean => {
  const userAgent = event.headers['User-Agent'] || '';
  return userAgent.toLowerCase().includes('mobile') || 
         userAgent.toLowerCase().includes('android') || 
         userAgent.toLowerCase().includes('ios');
};

// Helper function to detect user locale
const detectUserLocale = (event: APIGatewayProxyEvent): string => {
  // Priority 1: Accept-Language header
  const acceptLanguage = event.headers['Accept-Language'];
  if (acceptLanguage) {
    const preferredLanguage = acceptLanguage.split(',')[0].trim();
    if (preferredLanguage) {
      return preferredLanguage;
    }
  }
  
  // Priority 2: Default locale
  return 'en-US';
};

// Helper function to detect user currency
const detectUserCurrency = (event: APIGatewayProxyEvent): string => {
  // Priority 1: Accept-Currency header
  const acceptCurrency = event.headers['Accept-Currency'];
  if (acceptCurrency) {
    return acceptCurrency;
  }
  
  // Priority 2: Default currency
  return 'USD';
};

// Create organizer
export const createOrganizer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const body = JSON.parse(event.body || '{}');
      
      if (!body.companyName) {
        return formatErrorResponse(new ValidationError('Company name is required'));
      }

      // TODO: Implement actual organizer creation
      const organizer = {
        id: `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        companyName: body.companyName,
        userId: user.userId,
        createdAt: new Date().toISOString()
      };
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers', 'POST', duration, 201);
      metricsManager.recordBusinessMetric(BusinessMetricName.ORGANIZERS_CREATED, 1, { userId: user.userId });
      
      logger.info('Organizer created successfully', { 
        organizerId: organizer.id, 
        userId: user.userId,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Organizer created successfully',
        organizer
      }, 201);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('ORGANIZER_CREATION_ERROR', 'OrganizerManagementService', 'createOrganizer');
      
      logger.error('Failed to create organizer', { error, correlationId, duration });
      
      if (error instanceof ValidationError) {
        return formatErrorResponse(error);
      } else if (error instanceof UnauthorizedError) {
        return formatErrorResponse(error);
      } else {
        return formatErrorResponse(new Error('Internal server error'));
      }
    }
  }, event);
  
  return handler(event);
};

// Get organizer by ID
export const getOrganizer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const organizerId = event.pathParameters?.organizerId;
      
      if (!organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }
      
      // TODO: Implement actual organizer retrieval
      const organizer = {
        id: organizerId,
        companyName: 'Mock Company',
        userId: user.userId,
        createdAt: new Date().toISOString()
      };
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}', 'GET', duration, 200);
      
      logger.info('Organizer retrieved successfully', {
        organizerId,
        userId: user.userId,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({ organizer });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('ORGANIZER_RETRIEVAL_ERROR', 'OrganizerManagementService', 'getOrganizer');
      
      logger.error('Failed to get organizer', { error, correlationId, duration });
      
      if (error instanceof NotFoundError) {
        return formatErrorResponse(error);
      } else if (error instanceof UnauthorizedError) {
        return formatErrorResponse(error);
      } else {
        return formatErrorResponse(new Error('Internal server error'));
      }
    }
  }, event);
  
  return handler(event);
};

// Get organizer by user ID
export const getOrganizerByUserId = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const userId = event.pathParameters?.userId;
      
      if (!userId) {
        return formatErrorResponse(new ValidationError('User ID is required'));
      }
      
      // Check if user is requesting their own organizer profile
      if (userId !== user.userId) {
        return formatErrorResponse(new UnauthorizedError('Access denied'));
      }
      
      const organizer = await resilienceManager.executeWithResilience(
        () => organizerService.getOrganizerByUserId(userId),
        {
          circuitBreakerKey: 'organizer-user-retrieval',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/user/{userId}', 'GET', duration, 200);
      
      if (!organizer) {
        return formatSuccessResponse({
          message: 'No organizer profile found for this user',
          organizer: null
        });
      }
      
      logger.info('Organizer retrieved by user ID successfully', {
        organizerId: organizer.id,
        userId,
        correlationId,
        duration
      });
      
      // Check if mobile request and optimize response
      const isMobile = detectMobileRequest(event);
      
      if (isMobile) {
        // Return mobile-optimized response
        return formatSuccessResponse({
          organizer: {
            id: organizer.id,
            companyName: organizer.companyName,
            country: organizer.country,
            region: organizer.region,
            timezone: organizer.timezone,
            locale: organizer.locale,
            businessType: organizer.businessType,
            industry: organizer.industry,
            website: organizer.website,
            verificationStatus: organizer.verificationStatus,
            subscription: organizer.subscription,
            totalEvents: organizer.totalEvents,
            totalRevenue: organizer.totalRevenue,
            totalAttendees: organizer.totalAttendees,
            averageRating: organizer.averageRating,
            // Mobile-optimized fields
            businessProfile: {
              industry: organizer.businessProfile.industry,
              companySize: organizer.businessProfile.companySize
            }
          }
        });
      } else {
        // Return full response for web
        return formatSuccessResponse({ organizer });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('ORGANIZER_USER_RETRIEVAL_ERROR', 'OrganizerManagementService', 'getOrganizerByUserId');
      
      logger.error('Failed to get organizer by user ID', { error, correlationId, duration });
      
      if (error instanceof UnauthorizedError) {
        return formatErrorResponse(error);
      } else {
        return formatErrorResponse(new Error('Internal server error'));
      }
    }
  }, event);
  
  return handler(event);
};

// Update organizer profile
export const updateOrganizer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const organizerId = event.pathParameters?.organizerId;
      
      if (!organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }
      
      const body = JSON.parse(event.body || '{}');
      
      // TODO: Add proper validation schema
      // const validation = validateSchemaTyped<UpdateOrganizerRequest>(updateOrganizerSchema, body);
      // if (!validation.isValid) {
      //   metricsManager.recordError('VALIDATION_ERROR', 'OrganizerManagementService', 'updateOrganizer');
      //   return formatErrorResponse(new ValidationError('Validation failed', validation.errors?.details || []));
      // }

      const organizer = await resilienceManager.executeWithResilience(
        () => organizerService.updateOrganizer(organizerId, body),
        {
          circuitBreakerKey: 'organizer-update',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 15000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}', 'PUT', duration, 200);
      
      logger.info('Organizer updated successfully', {
        organizerId,
        userId: user.userId,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({
        message: 'Organizer profile updated successfully',
        organizer: {
          id: organizer.id,
          companyName: organizer.companyName,
          country: organizer.country,
          region: organizer.region,
          status: organizer.verificationStatus,
          subscription: organizer.subscription,
          updatedAt: organizer.updatedAt
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('ORGANIZER_UPDATE_ERROR', 'OrganizerManagementService', 'updateOrganizer');
      
      logger.error('Failed to update organizer', { error, correlationId, duration });
      
      if (error instanceof ValidationError) {
        return formatErrorResponse(error);
      } else if (error instanceof NotFoundError) {
        return formatErrorResponse(error);
      } else if (error instanceof UnauthorizedError) {
        return formatErrorResponse(error);
      } else {
        return formatErrorResponse(new Error('Internal server error'));
      }
    }
  }, event);
  
  return handler(event);
};

// Get organizer dashboard
export const getOrganizerDashboard = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const organizerId = event.pathParameters?.organizerId;
      
      if (!organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }
      
      // Get query parameters
      const queryParams = event.queryStringParameters || {};
      const period = (queryParams.period as 'day' | 'week' | 'month' | 'quarter' | 'year') || 'month';
      const startDate = queryParams.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = queryParams.endDate || new Date().toISOString();
      
      const dashboard = await resilienceManager.executeWithResilience(
        () => organizerService.getOrganizerDashboard(organizerId, period, startDate, endDate),
        {
          circuitBreakerKey: 'organizer-dashboard',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 20000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/dashboard', 'GET', duration, 200);
      
      logger.info('Organizer dashboard retrieved successfully', {
        organizerId,
        userId: user.userId,
        period,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({ dashboard });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('ORGANIZER_DASHBOARD_ERROR', 'OrganizerManagementService', 'getOrganizerDashboard');
      
      logger.error('Failed to get organizer dashboard', { error, correlationId, duration });
      
      if (error instanceof NotFoundError) {
        return formatErrorResponse(error);
      } else if (error instanceof UnauthorizedError) {
        return formatErrorResponse(error);
      } else {
        return formatErrorResponse(new Error('Internal server error'));
      }
    }
  }, event);
  
  return handler(event);
};

// Search organizers
export const searchOrganizers = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      // Get query parameters
      const queryParams = event.queryStringParameters || {};
      const filters: OrganizerSearchFilters = {
        country: queryParams.country,
        region: queryParams.region,
        industry: queryParams.industry,
        businessType: queryParams.businessType as any,
        subscription: queryParams.subscription as any,
        verificationStatus: queryParams.verificationStatus,
        supportedCurrency: queryParams.supportedCurrency,
        searchTerm: queryParams.searchTerm,
        page: queryParams.page ? parseInt(queryParams.page) : 1,
        pageSize: queryParams.pageSize ? parseInt(queryParams.pageSize) : 10
      };
      
      const result = await resilienceManager.executeWithResilience(
        () => organizerService.searchOrganizers(filters),
        {
          circuitBreakerKey: 'organizer-search',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 15000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/search', 'GET', duration, 200);
      
      logger.info('Organizer search completed successfully', {
        filters,
        resultCount: result.totalCount,
        correlationId,
        duration
      });
      
      return formatSuccessResponse(result);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('ORGANIZER_SEARCH_ERROR', 'OrganizerManagementService', 'searchOrganizers');
      
      logger.error('Failed to search organizers', { error, correlationId, duration });
      
      return formatErrorResponse(new Error('Internal server error'));
    }
  }, event);
  
  return handler(event);
};

// Health check for organizer service
export const healthCheck = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/health', 'GET', duration, 200);
      
      logger.info('Organizer service health check completed', {
        correlationId,
        duration,
        timestamp: new Date().toISOString()
      });
      
      return formatSuccessResponse({
        service: 'OrganizerManagementService',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: [
          'Multi-country organizer profiles',
          'Regional compliance management',
          'Multi-currency support',
          'Localization preferences',
          'Business verification',
          'Subscription management'
        ]
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('ORGANIZER_HEALTH_CHECK_ERROR', 'OrganizerManagementService', 'healthCheck');
      
      logger.error('Organizer service health check failed', { error, correlationId, duration });
      
      return formatErrorResponse(new Error('Service unhealthy'));
    }
  }, event);
  
  return handler(event);
};
