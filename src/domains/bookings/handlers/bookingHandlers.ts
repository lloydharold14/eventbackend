import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BookingService } from '../services/BookingService';
import { CreateBookingRequest, UpdateBookingRequest, BookingFilters } from '../models/Booking';
import { validateSchemaTyped } from '../../../shared/validators/schemas';
import { createBookingSchema, updateBookingSchema, bookingFiltersSchema } from '../../../shared/validators/schemas';
import { formatSuccessResponse, formatErrorResponse } from '../../../shared/utils/responseUtils';
import { ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '../../../shared/errors/DomainError';
import { logger } from '../../../shared/utils/logger';
import { getUserIdFromToken } from '../../../shared/utils/authUtils';
import { initializeTracing, traceLambdaExecution, extractCorrelationId } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';

// Initialize tracing, metrics, and resilience
initializeTracing({
  serviceName: 'BookingService',
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
const bookingService = new BookingService();

export const createBooking = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const userId = getUserIdFromToken(event);
      if (!userId) {
        metricsManager.recordError('AUTHENTICATION_ERROR', 'BookingService', 'createBooking');
        return formatErrorResponse('Unauthorized', 401);
      }

      const body = JSON.parse(event.body || '{}');
      const validation = validateSchemaTyped<CreateBookingRequest>(createBookingSchema, body);
      
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'BookingService', 'createBooking');
        return formatErrorResponse('Validation failed', 400, validation.errors);
      }

      const booking = await resilienceManager.executeWithResilience(
        () => bookingService.createBooking(userId, validation.data),
        {
          circuitBreakerKey: 'booking-creation',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 20000 }
        }
      );

      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/bookings', 'POST', duration, 201);
      metricsManager.recordBusinessMetric(BusinessMetricName.BOOKINGS_CREATED, 1, { 
        eventId: validation.data.eventId,
        ticketCount: validation.data.items.reduce((sum, item) => sum + item.quantity, 0).toString()
      });
      
      logger.info('Booking created successfully', { 
        bookingId: booking.id, 
        eventId: booking.eventId, 
        userId,
        correlationId,
        duration 
      });

      return formatSuccessResponse(booking, 201);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/bookings', 'POST', duration, 500);
      metricsManager.recordError('BOOKING_CREATION_ERROR', 'BookingService', 'createBooking');
      
      logger.error('Failed to create booking', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message, error.statusCode || 500);
    }
  }, event)(event);
};

export const getBookingById = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserIdFromToken(event);
    if (!userId) {
      return formatErrorResponse('Unauthorized', 401);
    }

    const bookingId = event.pathParameters?.bookingId;
    if (!bookingId) {
      return formatErrorResponse('Booking ID is required', 400);
    }

    const booking = await bookingService.getBookingById(bookingId, userId);
    return formatSuccessResponse(booking);
  } catch (error: any) {
    console.error('Error getting booking:', error);
    return formatErrorResponse(error.message, error.statusCode || 500);
  }
};

export const updateBooking = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserIdFromToken(event);
    if (!userId) {
      return formatErrorResponse('Unauthorized', 401);
    }

    const bookingId = event.pathParameters?.bookingId;
    if (!bookingId) {
      return formatErrorResponse('Booking ID is required', 400);
    }

    const body = JSON.parse(event.body || '{}');
    const validation = validateSchemaTyped<UpdateBookingRequest>(updateBookingSchema, body);
    
    if (!validation.isValid) {
      return formatErrorResponse('Validation failed', 400, validation.errors);
    }

    const booking = await bookingService.updateBooking(bookingId, validation.data, userId);
    return formatSuccessResponse(booking);
  } catch (error: any) {
    console.error('Error updating booking:', error);
    return formatErrorResponse(error.message, error.statusCode || 500);
  }
};

export const cancelBooking = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserIdFromToken(event);
    if (!userId) {
      return formatErrorResponse('Unauthorized', 401);
    }

    const bookingId = event.pathParameters?.bookingId;
    if (!bookingId) {
      return formatErrorResponse('Booking ID is required', 400);
    }

    const body = JSON.parse(event.body || '{}');
    const reason = body.reason;

    const booking = await bookingService.cancelBooking(bookingId, userId, reason);
    return formatSuccessResponse(booking);
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return formatErrorResponse(error.message, error.statusCode || 500);
  }
};

export const getBookingsByUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserIdFromToken(event);
    if (!userId) {
      return formatErrorResponse('Unauthorized', 401);
    }

    const queryParams = event.queryStringParameters || {};
    const filters: BookingFilters = {
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
      status: queryParams.status as any,
      startDate: queryParams.startDate,
      endDate: queryParams.endDate
    };

    const validation = validateSchemaTyped<BookingFilters>(bookingFiltersSchema, filters);
    if (!validation.isValid) {
      return formatErrorResponse('Validation failed', 400, validation.errors);
    }

    const bookings = await bookingService.getBookingsByUser(userId, validation.data);
    return formatSuccessResponse({ bookings });
  } catch (error: any) {
    console.error('Error getting user bookings:', error);
    return formatErrorResponse(error.message, error.statusCode || 500);
  }
};

export const getBookingsByEvent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserIdFromToken(event);
    if (!userId) {
      return formatErrorResponse('Unauthorized', 401);
    }

    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return formatErrorResponse('Event ID is required', 400);
    }

    const queryParams = event.queryStringParameters || {};
    const filters: BookingFilters = {
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
      status: queryParams.status as any
    };

    const validation = validateSchemaTyped<BookingFilters>(bookingFiltersSchema, filters);
    if (!validation.isValid) {
      return formatErrorResponse('Validation failed', 400, validation.errors);
    }

    const bookings = await bookingService.getBookingsByEvent(eventId, validation.data);
    return formatSuccessResponse({ bookings });
  } catch (error: any) {
    console.error('Error getting event bookings:', error);
    return formatErrorResponse(error.message, error.statusCode || 500);
  }
};

export const getBookingsByOrganizer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserIdFromToken(event);
    if (!userId) {
      return formatErrorResponse('Unauthorized', 401);
    }

    const organizerId = event.pathParameters?.organizerId;
    if (!organizerId) {
      return formatErrorResponse('Organizer ID is required', 400);
    }

    const queryParams = event.queryStringParameters || {};
    const filters: BookingFilters = {
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
      status: queryParams.status as any,
      startDate: queryParams.startDate,
      endDate: queryParams.endDate
    };

    const validation = validateSchemaTyped<BookingFilters>(bookingFiltersSchema, filters);
    if (!validation.isValid) {
      return formatErrorResponse('Validation failed', 400, validation.errors);
    }

    const bookings = await bookingService.getBookingsByOrganizer(organizerId, validation.data);
    return formatSuccessResponse({ bookings });
  } catch (error: any) {
    console.error('Error getting organizer bookings:', error);
    return formatErrorResponse(error.message, error.statusCode || 500);
  }
};

export const getBookingStatistics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserIdFromToken(event);
    if (!userId) {
      return formatErrorResponse('Unauthorized', 401);
    }

    const queryParams = event.queryStringParameters || {};
    const organizerId = queryParams.organizerId;
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;

    const statistics = await bookingService.getBookingStatistics(organizerId, startDate, endDate);
    return formatSuccessResponse(statistics);
  } catch (error: any) {
    console.error('Error getting booking statistics:', error);
    return formatErrorResponse(error.message, error.statusCode || 500);
  }
};

export const getEventCapacity = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return formatErrorResponse('Event ID is required', 400);
    }

    const capacity = await bookingService.getEventCapacity(eventId);
    return formatSuccessResponse(capacity);
  } catch (error: any) {
    console.error('Error getting event capacity:', error);
    return formatErrorResponse(error.message, error.statusCode || 500);
  }
};

export const generateBookingConfirmation = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserIdFromToken(event);
    if (!userId) {
      return formatErrorResponse('Unauthorized', 401);
    }

    const bookingId = event.pathParameters?.bookingId;
    if (!bookingId) {
      return formatErrorResponse('Booking ID is required', 400);
    }

    const confirmation = await bookingService.generateBookingConfirmation(bookingId);
    return formatSuccessResponse(confirmation);
  } catch (error: any) {
    console.error('Error generating booking confirmation:', error);
    return formatErrorResponse(error.message, error.statusCode || 500);
  }
};

export const healthCheck = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return formatSuccessResponse({
    status: 'healthy',
    service: 'booking-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
};
