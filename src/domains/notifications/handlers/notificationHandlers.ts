import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { NotificationService, NotificationType, NotificationChannel, NotificationRequest } from '../services/NotificationService';
import { formatSuccessResponse, formatErrorResponse } from '../../../shared/utils/responseUtils';
import { ValidationError } from '../../../shared/errors/DomainError';
import { validateSchemaTyped } from '../../../shared/validators/schemas';
import { notificationRequestSchema } from '../validators/notificationSchemas';
import { initializeTracing, traceLambdaExecution, extractCorrelationId } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';
import { Logger } from '@aws-lambda-powertools/logger';

// Initialize tracing, metrics, and resilience
initializeTracing({
  serviceName: 'NotificationService',
  enableTracing: process.env.ENABLE_TRACING === 'true',
  captureHTTP: true,
  captureAWS: true,
  captureSQL: true,
  capturePromise: true,
  captureError: true
});

const logger = new Logger({ serviceName: 'notification-handlers' });
const metricsManager = MetricsManager.getInstance();
const resilienceManager = new ResilienceManager();

// Initialize notification service
const notificationService = new NotificationService();

/**
 * Send a notification
 */
export const sendNotification = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped<NotificationRequest>(notificationRequestSchema, body);
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'NotificationService', 'sendNotification');
        return formatErrorResponse('Validation failed: ' + JSON.stringify(validation.errors?.details || []));
      }

      const result = await resilienceManager.executeWithResilience(
        () => notificationService.sendNotification(validation.data),
        {
          circuitBreakerKey: 'notification-sending',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/send', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.NOTIFICATIONS_SENT, 1, { 
        type: validation.data.type,
        channel: validation.data.channel 
      });
      
      logger.info('Notification sent successfully', { 
        notificationId: result.notificationId, 
        type: validation.data.type,
        channel: validation.data.channel,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Notification sent successfully',
        notificationId: result.notificationId,
        success: result.success
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/send', 'POST', duration, 500);
      metricsManager.recordError('NOTIFICATION_ERROR', 'NotificationService', 'sendNotification');
      
      logger.error('Notification sending failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Notification sending failed');
    }
  }, event)(event);
};

/**
 * Send booking confirmation notification
 */
export const sendBookingConfirmation = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      const { userId, bookingData } = body;
      
      if (!userId || !bookingData) {
        return formatErrorResponse('userId and bookingData are required');
      }

      const result = await resilienceManager.executeWithResilience(
        () => notificationService.sendBookingConfirmation(userId, bookingData),
        {
          circuitBreakerKey: 'booking-confirmation',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/booking-confirmation', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.NOTIFICATIONS_SENT, 1, { 
        type: 'booking_confirmation',
        channel: 'email' 
      });
      
      logger.info('Booking confirmation sent successfully', { 
        notificationId: result.notificationId, 
        userId,
        bookingId: bookingData.bookingId,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Booking confirmation sent successfully',
        notificationId: result.notificationId,
        success: result.success
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/booking-confirmation', 'POST', duration, 500);
      metricsManager.recordError('NOTIFICATION_ERROR', 'NotificationService', 'sendBookingConfirmation');
      
      logger.error('Booking confirmation sending failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Booking confirmation sending failed');
    }
  }, event)(event);
};

/**
 * Send booking cancellation notification
 */
export const sendBookingCancellation = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      const { userId, bookingData } = body;
      
      if (!userId || !bookingData) {
        return formatErrorResponse('userId and bookingData are required');
      }

      const result = await resilienceManager.executeWithResilience(
        () => notificationService.sendBookingCancellation(userId, bookingData),
        {
          circuitBreakerKey: 'booking-cancellation',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/booking-cancellation', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.NOTIFICATIONS_SENT, 1, { 
        type: 'booking_cancellation',
        channel: 'email' 
      });
      
      logger.info('Booking cancellation sent successfully', { 
        notificationId: result.notificationId, 
        userId,
        bookingId: bookingData.bookingId,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Booking cancellation sent successfully',
        notificationId: result.notificationId,
        success: result.success
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/booking-cancellation', 'POST', duration, 500);
      metricsManager.recordError('NOTIFICATION_ERROR', 'NotificationService', 'sendBookingCancellation');
      
      logger.error('Booking cancellation sending failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Booking cancellation sending failed');
    }
  }, event)(event);
};

/**
 * Send payment confirmation notification
 */
export const sendPaymentConfirmation = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      const { userId, paymentData } = body;
      
      if (!userId || !paymentData) {
        return formatErrorResponse('userId and paymentData are required');
      }

      const result = await resilienceManager.executeWithResilience(
        () => notificationService.sendPaymentConfirmation(userId, paymentData),
        {
          circuitBreakerKey: 'payment-confirmation',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/payment-confirmation', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.NOTIFICATIONS_SENT, 1, { 
        type: 'payment_confirmation',
        channel: 'email' 
      });
      
      logger.info('Payment confirmation sent successfully', { 
        notificationId: result.notificationId, 
        userId,
        paymentId: paymentData.paymentId,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Payment confirmation sent successfully',
        notificationId: result.notificationId,
        success: result.success
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/payment-confirmation', 'POST', duration, 500);
      metricsManager.recordError('NOTIFICATION_ERROR', 'NotificationService', 'sendPaymentConfirmation');
      
      logger.error('Payment confirmation sending failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Payment confirmation sending failed');
    }
  }, event)(event);
};

/**
 * Send payment failed notification
 */
export const sendPaymentFailed = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      const { userId, paymentData } = body;
      
      if (!userId || !paymentData) {
        return formatErrorResponse('userId and paymentData are required');
      }

      const result = await resilienceManager.executeWithResilience(
        () => notificationService.sendPaymentFailed(userId, paymentData),
        {
          circuitBreakerKey: 'payment-failed',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/payment-failed', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.NOTIFICATIONS_SENT, 1, { 
        type: 'payment_failed',
        channel: 'email' 
      });
      
      logger.info('Payment failed notification sent successfully', { 
        notificationId: result.notificationId, 
        userId,
        paymentId: paymentData.paymentId,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Payment failed notification sent successfully',
        notificationId: result.notificationId,
        success: result.success
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/payment-failed', 'POST', duration, 500);
      metricsManager.recordError('NOTIFICATION_ERROR', 'NotificationService', 'sendPaymentFailed');
      
      logger.error('Payment failed notification sending failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Payment failed notification sending failed');
    }
  }, event)(event);
};

/**
 * Health check endpoint
 */
export const healthCheck = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      // Check notification service health
      const healthStatus = {
        service: 'NotificationService',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        correlationId
      };
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/health', 'GET', duration, 200);
      
      logger.info('Health check completed', { 
        status: 'healthy',
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(healthStatus);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/notifications/health', 'GET', duration, 500);
      metricsManager.recordError('HEALTH_CHECK_ERROR', 'NotificationService', 'healthCheck');
      
      logger.error('Health check failed', { 
        error: error.message, 
        correlationId,
        duration 
      });
      
      return formatErrorResponse('Service unhealthy: ' + error.message, 503);
    }
  }, event)(event);
};
