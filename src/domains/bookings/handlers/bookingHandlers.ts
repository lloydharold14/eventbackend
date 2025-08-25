import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BookingService } from '../services/BookingService';
import { validateSchemaTyped } from '../../../shared/validators/schemas';
import { 
  createBookingSchema, 
  updateBookingSchema, 
  bookingFiltersSchema 
} from '../../../shared/validators/schemas';
import { CreateBookingRequest, UpdateBookingRequest, BookingFilters } from '../models/Booking';
import { formatSuccessResponse, formatErrorResponse } from '../../../shared/utils/responseUtils';
import { getUserIdFromToken } from '../../../shared/utils/authUtils';

const bookingService = new BookingService();

export const createBooking = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserIdFromToken(event);
    if (!userId) {
      return formatErrorResponse('Unauthorized', 401);
    }

    const body = JSON.parse(event.body || '{}');
    const validation = validateSchemaTyped<CreateBookingRequest>(createBookingSchema, body);
    
    if (!validation.isValid) {
      return formatErrorResponse('Validation failed', 400, validation.errors);
    }

    const booking = await bookingService.createBooking(userId, validation.data);
    return formatSuccessResponse(booking, 201);
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return formatErrorResponse(error.message, error.statusCode || 500);
  }
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
