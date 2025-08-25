import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MobileService } from '../services/MobileService';
import { EventService } from '../../events/services/EventService';
import { BookingService } from '../../bookings/services/BookingService';
import { PaymentService } from '../../payments/services/PaymentService';
import { UserService } from '../../users/services/UserService';
import { NotificationService } from '../../notifications/services/NotificationService';
import { EventRepository } from '../../events/repositories/EventRepository';
import { BookingRepository } from '../../bookings/repositories/BookingRepository';
import { PaymentRepository } from '../../payments/repositories/PaymentRepository';
import { UserRepository } from '../../users/repositories/UserRepository';
import { AuthService } from '../../users/services/AuthService';
import { formatSuccessResponse, formatErrorResponse } from '../../../shared/utils/responseUtils';
import { validateSchemaTyped } from '../../../shared/validators/schemas';
import { mobileSyncSchema, pushNotificationTokenSchema, pushNotificationRequestSchema, mobileSearchSchema, mobileLocationSchema, mobileAnalyticsSchema } from '../validators/mobileSchemas';
import {
  MobileSyncRequest,
  PushNotificationToken,
  PushNotificationRequest,
  MobileSearchRequest,
  MobileLocationRequest,
  MobileAnalytics
} from '../models/Mobile';
import { initializeTracing, traceLambdaExecution, extractCorrelationId } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';
import { Logger } from '@aws-lambda-powertools/logger';
import { getUserFromToken } from '../../../shared/utils/authUtils';

// Initialize tracing, metrics, and resilience
initializeTracing({
  serviceName: 'MobileService',
  enableTracing: process.env.ENABLE_TRACING === 'true',
  captureHTTP: true,
  captureAWS: true,
  captureSQL: true,
  capturePromise: true,
  captureError: true
});

const logger = new Logger({ serviceName: 'MobileService' });
const metricsManager = MetricsManager.getInstance();
const resilienceManager = new ResilienceManager();

// Initialize services
const eventRepository = new EventRepository(
  process.env['AWS_REGION'] || 'ca-central-1',
  process.env['EVENT_TABLE_NAME'] || 'EventManagement-dev-dev-events'
);

const bookingRepository = new BookingRepository();
const paymentRepository = new PaymentRepository(process.env['PAYMENT_TABLE_NAME'] || 'EventPlatform-Payments-dev');
const userRepository = new UserRepository(
  process.env['AWS_REGION'] || 'ca-central-1',
  process.env['USER_TABLE_NAME'] || 'UserManagement-dev-dev-users'
);

const authService = new AuthService(
  userRepository,
  process.env['JWT_SECRET'] || 'default-secret-key',
  process.env['JWT_EXPIRES_IN'] || '1h',
  process.env['REFRESH_TOKEN_EXPIRES_IN'] || '7d'
);

const eventService = new EventService(eventRepository);
const bookingService = new BookingService();
const paymentService = new PaymentService(process.env['PAYMENT_TABLE_NAME'] || 'EventPlatform-Payments-dev');
const userService = new UserService(userRepository, authService);
const notificationService = new NotificationService();

const mobileService = new MobileService(
  eventService,
  bookingService,
  paymentService,
  userService,
  notificationService
);

// Mobile Data Sync
export const syncData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();

    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(mobileSyncSchema, body);
      if (!validation.isValid) {
        return formatErrorResponse('Invalid sync request data', 400);
      }

      const syncResult = await resilienceManager.executeWithResilience(
        () => mobileService.syncData(validation.data as MobileSyncRequest),
        {
          circuitBreakerKey: 'mobile-sync',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 30000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/mobile/sync', 'POST', duration, 200);
      const syncData = validation.data as MobileSyncRequest;
      metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_SYNC_COMPLETED, 1, {
        deviceId: syncData.deviceId,
        syncTypes: syncData.syncTypes.join(',')
      });

      logger.info('Mobile data sync completed', {
        deviceId: syncData.deviceId,
        correlationId,
        duration,
        changesCount: Object.values(syncResult.changes).flat().length
      });

      return formatSuccessResponse(syncResult);
    } catch (error: any) {
      logger.error('Mobile data sync failed', { error: error.message, correlationId });
      return formatErrorResponse(error);
    }
  }, event)(event);
};

// Register Push Notification Token
export const registerPushToken = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();

    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(pushNotificationTokenSchema, body);
      if (!validation.isValid) {
        return formatErrorResponse('Invalid push token data', 400);
      }

      const tokenData = validation.data as PushNotificationToken;
      await resilienceManager.executeWithResilience(
        () => mobileService.registerPushNotificationToken(tokenData),
        {
          circuitBreakerKey: 'push-token-registration',
          retryConfig: { maxRetries: 2, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/mobile/push-token', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.PUSH_TOKEN_REGISTERED, 1, {
        platform: tokenData.platform,
        userId: tokenData.userId
      });

      logger.info('Push notification token registered', {
        userId: tokenData.userId,
        deviceId: tokenData.deviceId,
        platform: tokenData.platform,
        correlationId,
        duration
      });

      return formatSuccessResponse({ message: 'Push notification token registered successfully' });
    } catch (error: any) {
      logger.error('Push notification token registration failed', { error: error.message, correlationId });
      return formatErrorResponse(error);
    }
  }, event)(event);
};

// Send Push Notification
export const sendPushNotification = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();

    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(pushNotificationRequestSchema, body);
      if (!validation.isValid) {
        return formatErrorResponse('Invalid push notification data', 400);
      }

      const notificationData = validation.data as PushNotificationRequest;
      await resilienceManager.executeWithResilience(
        () => mobileService.sendPushNotification(notificationData),
        {
          circuitBreakerKey: 'push-notification',
          retryConfig: { maxRetries: 2, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 15000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/mobile/push-notification', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.PUSH_NOTIFICATION_SENT, 1, {
        category: notificationData.category,
        priority: notificationData.priority
      });

      logger.info('Push notification sent', {
        category: notificationData.category,
        priority: notificationData.priority,
        userId: notificationData.userId,
        deviceId: notificationData.deviceId,
        correlationId,
        duration
      });

      return formatSuccessResponse({ message: 'Push notification sent successfully' });
    } catch (error: any) {
      logger.error('Push notification failed', { error: error.message, correlationId });
      return formatErrorResponse(error);
    }
  }, event)(event);
};

// Get Mobile Optimized Events
export const getMobileEvents = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();

    try {
      const locale = event.queryStringParameters?.locale || 'en-CA';
      const currency = event.queryStringParameters?.currency || 'CAD';
      const page = parseInt(event.queryStringParameters?.page || '1');
      const limit = parseInt(event.queryStringParameters?.limit || '20');
      const filters = event.queryStringParameters?.filters ? JSON.parse(event.queryStringParameters.filters) : {};

      const events = await resilienceManager.executeWithResilience(
        () => mobileService.getMobileOptimizedEvents(locale, currency, filters, page, limit),
        {
          circuitBreakerKey: 'mobile-events',
          retryConfig: { maxRetries: 2, baseDelay: 500 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/mobile/events', 'GET', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_EVENTS_RETRIEVED, events.length, {
        locale,
        currency
      });

      logger.info('Mobile events retrieved', {
        count: events.length,
        locale,
        currency,
        page,
        limit,
        correlationId,
        duration
      });

      return formatSuccessResponse({ events });
    } catch (error: any) {
      logger.error('Mobile events retrieval failed', { error: error.message, correlationId });
      return formatErrorResponse(error);
    }
  }, event)(event);
};

// Get Mobile Optimized User Data
export const getMobileUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();

    try {
      const user = getUserFromToken(event);
      if (!user) {
        return formatErrorResponse('Unauthorized', 401);
      }

      const locale = event.queryStringParameters?.locale || 'en-CA';
      const currency = event.queryStringParameters?.currency || 'CAD';

      const mobileUser = await resilienceManager.executeWithResilience(
        () => mobileService.getMobileOptimizedUser(user.userId, locale, currency),
        {
          circuitBreakerKey: 'mobile-user',
          retryConfig: { maxRetries: 2, baseDelay: 500 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/mobile/user', 'GET', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_USER_RETRIEVED, 1, {
        userId: user.userId,
        locale,
        currency
      });

      logger.info('Mobile user data retrieved', {
        userId: user.userId,
        locale,
        currency,
        correlationId,
        duration
      });

      return formatSuccessResponse({ user: mobileUser });
    } catch (error: any) {
      logger.error('Mobile user data retrieval failed', { error: error.message, correlationId });
      return formatErrorResponse(error);
    }
  }, event)(event);
};

// Get Mobile Optimized Bookings
export const getMobileBookings = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();

    try {
      const user = getUserFromToken(event);
      if (!user) {
        return formatErrorResponse('Unauthorized', 401);
      }

      const locale = event.queryStringParameters?.locale || 'en-CA';
      const currency = event.queryStringParameters?.currency || 'CAD';

      const bookings = await resilienceManager.executeWithResilience(
        () => mobileService.getMobileOptimizedBookings(user.userId, locale, currency),
        {
          circuitBreakerKey: 'mobile-bookings',
          retryConfig: { maxRetries: 2, baseDelay: 500 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/mobile/bookings', 'GET', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_BOOKINGS_RETRIEVED, bookings.length, {
        userId: user.userId,
        locale,
        currency
      });

      logger.info('Mobile bookings retrieved', {
        userId: user.userId,
        count: bookings.length,
        locale,
        currency,
        correlationId,
        duration
      });

      return formatSuccessResponse({ bookings });
    } catch (error: any) {
      logger.error('Mobile bookings retrieval failed', { error: error.message, correlationId });
      return formatErrorResponse(error);
    }
  }, event)(event);
};

// Get Mobile Optimized Payments
export const getMobilePayments = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();

    try {
      const user = getUserFromToken(event);
      if (!user) {
        return formatErrorResponse('Unauthorized', 401);
      }

      const locale = event.queryStringParameters?.locale || 'en-CA';
      const currency = event.queryStringParameters?.currency || 'CAD';

      const payments = await resilienceManager.executeWithResilience(
        () => mobileService.getMobileOptimizedPayments(user.userId, locale, currency),
        {
          circuitBreakerKey: 'mobile-payments',
          retryConfig: { maxRetries: 2, baseDelay: 500 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/mobile/payments', 'GET', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_PAYMENTS_RETRIEVED, payments.length, {
        userId: user.userId,
        locale,
        currency
      });

      logger.info('Mobile payments retrieved', {
        userId: user.userId,
        count: payments.length,
        locale,
        currency,
        correlationId,
        duration
      });

      return formatSuccessResponse({ payments });
    } catch (error: any) {
      logger.error('Mobile payments retrieval failed', { error: error.message, correlationId });
      return formatErrorResponse(error);
    }
  }, event)(event);
};

// Mobile Event Search
export const searchEventsMobile = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();

    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(mobileSearchSchema, body);
      if (!validation.isValid) {
        return formatErrorResponse('Invalid search request data', 400);
      }

      const searchData = validation.data as MobileSearchRequest;
      const searchResult = await resilienceManager.executeWithResilience(
        () => mobileService.searchEventsMobile(searchData),
        {
          circuitBreakerKey: 'mobile-search',
          retryConfig: { maxRetries: 2, baseDelay: 500 },
          timeoutConfig: { timeoutMs: 15000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/mobile/search', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_SEARCH_PERFORMED, 1, {
        query: searchData.query,
        locale: searchData.locale,
        currency: searchData.currency
      });

      logger.info('Mobile event search completed', {
        query: searchData.query,
        resultsCount: searchResult.events.length,
        total: searchResult.total,
        locale: searchData.locale,
        currency: searchData.currency,
        correlationId,
        duration
      });

      return formatSuccessResponse(searchResult);
    } catch (error: any) {
      logger.error('Mobile event search failed', { error: error.message, correlationId });
      return formatErrorResponse(error);
    }
  }, event)(event);
};

// Get Nearby Events
export const getNearbyEvents = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();

    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(mobileLocationSchema, body);
      if (!validation.isValid) {
        return formatErrorResponse('Invalid location request data', 400);
      }

      const locationData = validation.data as MobileLocationRequest;
      const nearbyEvents = await resilienceManager.executeWithResilience(
        () => mobileService.getNearbyEvents(locationData),
        {
          circuitBreakerKey: 'mobile-nearby',
          retryConfig: { maxRetries: 2, baseDelay: 500 },
          timeoutConfig: { timeoutMs: 15000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/mobile/nearby', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_NEARBY_EVENTS_RETRIEVED, nearbyEvents.events.length, {
        locale: locationData.locale,
        currency: locationData.currency
      });

      logger.info('Nearby events retrieved', {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        radius: locationData.radius,
        resultsCount: nearbyEvents.events.length,
        locale: locationData.locale,
        currency: locationData.currency,
        correlationId,
        duration
      });

      return formatSuccessResponse(nearbyEvents);
    } catch (error: any) {
      logger.error('Nearby events retrieval failed', { error: error.message, correlationId });
      return formatErrorResponse(error);
    }
  }, event)(event);
};

// Record Mobile Analytics
export const recordAnalytics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();

    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(mobileAnalyticsSchema, body);
      if (!validation.isValid) {
        return formatErrorResponse('Invalid analytics data', 400);
      }

      const analyticsData = validation.data as MobileAnalytics;
      await resilienceManager.executeWithResilience(
        () => mobileService.recordAnalytics(analyticsData),
        {
          circuitBreakerKey: 'mobile-analytics',
          retryConfig: { maxRetries: 1, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 5000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/mobile/analytics', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_ANALYTICS_RECORDED, 1, {
        platform: analyticsData.platform,
        sessionId: analyticsData.sessionId
      });

      logger.info('Mobile analytics recorded', {
        sessionId: analyticsData.sessionId,
        userId: analyticsData.userId,
        deviceId: analyticsData.deviceId,
        platform: analyticsData.platform,
        eventsCount: analyticsData.events.length,
        screenViewsCount: analyticsData.screenViews.length,
        userActionsCount: analyticsData.userActions.length,
        correlationId,
        duration
      });

      return formatSuccessResponse({ message: 'Analytics recorded successfully' });
    } catch (error: any) {
      logger.error('Mobile analytics recording failed', { error: error.message, correlationId });
      // Don't return error for analytics failures
      return formatSuccessResponse({ message: 'Analytics processing completed' });
    }
  }, event)(event);
};

// Mobile Health Check
export const mobileHealthCheck = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();

    try {
      const healthCheck = await resilienceManager.executeWithResilience(
        () => mobileService.getMobileHealthCheck(),
        {
          circuitBreakerKey: 'mobile-health',
          retryConfig: { maxRetries: 1, baseDelay: 500 },
          timeoutConfig: { timeoutMs: 5000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/mobile/health', 'GET', duration, 200);

      logger.info('Mobile health check completed', {
        status: healthCheck.status,
        correlationId,
        duration
      });

      return formatSuccessResponse(healthCheck);
    } catch (error: any) {
      logger.error('Mobile health check failed', { error: error.message, correlationId });
      return formatErrorResponse(error);
    }
  }, event)(event);
};
