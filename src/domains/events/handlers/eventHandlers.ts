import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EventService } from '../services/EventService';
import { EventRepository } from '../repositories/EventRepository';
import { AuthService } from '../../users/services/AuthService';
import { UserRepository } from '../../users/repositories/UserRepository';
import { formatSuccessResponse, formatErrorResponse, ValidationError, UnauthorizedError } from '../../../shared/errors/DomainError';
import { logger } from '../../../shared/utils/logger';
import { validateSchemaTyped } from '../../../shared/validators/schemas';
import { 
  CreateEventRequest, 
  UpdateEventRequest, 
  EventSearchFilters, 
  EventPublishRequest, 
  EventCancelRequest, 
  EventDuplicateRequest,
  EventCategoryRequest,
  EventMediaRequest
} from '../models/Event';

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

const eventRepository = new EventRepository(
  process.env['AWS_REGION'] || 'ca-central-1',
  process.env['EVENT_TABLE_NAME'] || 'EventManagement-dev-Events'
);

const eventService = new EventService(eventRepository);

// Helper function to get user from JWT token
const getUserFromToken = async (event: APIGatewayProxyEvent) => {
  const token = event.headers.Authorization?.replace('Bearer ', '');
  if (!token) {
    throw new UnauthorizedError('Authorization token is required');
  }
  return await authService.validateToken(token);
};

// Event CRUD Handlers

export const createEvent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserFromToken(event);
    const body = JSON.parse(event.body || '{}');
    
    const validation = validateSchemaTyped<CreateEventRequest>(eventCreationSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Invalid event data', validation.errors));
    }

    const createdEvent = await eventService.createEvent(
      user.userId,
      user.name || 'Unknown Organizer',
      user.email,
      validation.data
    );

    logger.info('Event created successfully', {
      eventId: createdEvent.id,
      organizerId: user.userId,
      title: createdEvent.title
    });

    return formatSuccessResponse({
      message: 'Event created successfully',
      event: createdEvent
    });
  } catch (error: any) {
    logger.error('Failed to create event', { error: error.message, event });
    return formatErrorResponse(error);
  }
};

export const getEventById = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return formatErrorResponse(new ValidationError('Event ID is required'));
    }

    // Check if user is authenticated (for private events)
    let includePrivate = false;
    try {
      const user = await getUserFromToken(event);
      includePrivate = true; // Authenticated users can see private events
    } catch {
      // User not authenticated, only show public events
    }

    const eventData = await eventService.getEventById(eventId, includePrivate);

    return formatSuccessResponse({
      event: eventData
    });
  } catch (error: any) {
    logger.error('Failed to get event by ID', { error: error.message, eventId: event.pathParameters?.eventId });
    return formatErrorResponse(error);
  }
};

export const getEventBySlug = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const slug = event.pathParameters?.slug;
    if (!slug) {
      return formatErrorResponse(new ValidationError('Event slug is required'));
    }

    // Check if user is authenticated (for private events)
    let includePrivate = false;
    try {
      const user = await getUserFromToken(event);
      includePrivate = true; // Authenticated users can see private events
    } catch {
      // User not authenticated, only show public events
    }

    const eventData = await eventService.getEventBySlug(slug, includePrivate);

    return formatSuccessResponse({
      event: eventData
    });
  } catch (error: any) {
    logger.error('Failed to get event by slug', { error: error.message, slug: event.pathParameters?.slug });
    return formatErrorResponse(error);
  }
};

export const updateEvent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserFromToken(event);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return formatErrorResponse(new ValidationError('Event ID is required'));
    }

    const body = JSON.parse(event.body || '{}');
    
    const validation = validateSchemaTyped<UpdateEventRequest>(eventUpdateSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Invalid event data', validation.errors));
    }

    const updatedEvent = await eventService.updateEvent(eventId, user.userId, validation.data);

    logger.info('Event updated successfully', {
      eventId,
      organizerId: user.userId,
      updatedFields: Object.keys(validation.data)
    });

    return formatSuccessResponse({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error: any) {
    logger.error('Failed to update event', { error: error.message, eventId: event.pathParameters?.eventId });
    return formatErrorResponse(error);
  }
};

export const deleteEvent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserFromToken(event);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return formatErrorResponse(new ValidationError('Event ID is required'));
    }

    await eventService.deleteEvent(eventId, user.userId);

    logger.info('Event deleted successfully', {
      eventId,
      organizerId: user.userId
    });

    return formatSuccessResponse({
      message: 'Event deleted successfully'
    });
  } catch (error: any) {
    logger.error('Failed to delete event', { error: error.message, eventId: event.pathParameters?.eventId });
    return formatErrorResponse(error);
  }
};

// Event Status Management Handlers

export const publishEvent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserFromToken(event);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return formatErrorResponse(new ValidationError('Event ID is required'));
    }

    const body = JSON.parse(event.body || '{}');
    const publishRequest: EventPublishRequest = {
      publishNow: body.publishNow ?? true,
      scheduledPublishDate: body.scheduledPublishDate
    };

    const publishedEvent = await eventService.publishEvent(eventId, user.userId, publishRequest.publishNow);

    logger.info('Event published successfully', {
      eventId,
      organizerId: user.userId,
      publishNow: publishRequest.publishNow
    });

    return formatSuccessResponse({
      message: 'Event published successfully',
      event: publishedEvent
    });
  } catch (error: any) {
    logger.error('Failed to publish event', { error: error.message, eventId: event.pathParameters?.eventId });
    return formatErrorResponse(error);
  }
};

export const cancelEvent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserFromToken(event);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return formatErrorResponse(new ValidationError('Event ID is required'));
    }

    const body = JSON.parse(event.body || '{}');
    const cancelRequest: EventCancelRequest = {
      reason: body.reason,
      refundPolicy: body.refundPolicy,
      notifyAttendees: body.notifyAttendees ?? true
    };

    if (!cancelRequest.reason) {
      return formatErrorResponse(new ValidationError('Cancellation reason is required'));
    }

    const cancelledEvent = await eventService.cancelEvent(eventId, user.userId, cancelRequest.reason);

    logger.info('Event cancelled successfully', {
      eventId,
      organizerId: user.userId,
      reason: cancelRequest.reason
    });

    return formatSuccessResponse({
      message: 'Event cancelled successfully',
      event: cancelledEvent
    });
  } catch (error: any) {
    logger.error('Failed to cancel event', { error: error.message, eventId: event.pathParameters?.eventId });
    return formatErrorResponse(error);
  }
};

export const duplicateEvent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserFromToken(event);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return formatErrorResponse(new ValidationError('Event ID is required'));
    }

    const body = JSON.parse(event.body || '{}');
    const duplicateRequest: EventDuplicateRequest = {
      title: body.title,
      startDate: body.startDate,
      endDate: body.endDate,
      keepSettings: body.keepSettings ?? true,
      keepMedia: body.keepMedia ?? false
    };

    if (!duplicateRequest.title || !duplicateRequest.startDate || !duplicateRequest.endDate) {
      return formatErrorResponse(new ValidationError('Title, start date, and end date are required for duplication'));
    }

    const duplicatedEvent = await eventService.duplicateEvent(
      eventId,
      user.userId,
      duplicateRequest.title,
      duplicateRequest.startDate,
      duplicateRequest.endDate
    );

    logger.info('Event duplicated successfully', {
      originalEventId: eventId,
      newEventId: duplicatedEvent.id,
      organizerId: user.userId
    });

    return formatSuccessResponse({
      message: 'Event duplicated successfully',
      event: duplicatedEvent
    });
  } catch (error: any) {
    logger.error('Failed to duplicate event', { error: error.message, eventId: event.pathParameters?.eventId });
    return formatErrorResponse(error);
  }
};

// Event Search and Listing Handlers

export const searchEvents = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const limit = parseInt(queryParams.limit || '20');

    // Build search filters from query parameters
    const filters: EventSearchFilters = {
      organizerId: queryParams.organizerId,
      categoryId: queryParams.categoryId,
      type: queryParams.type as any,
      status: queryParams.status as any,
      visibility: queryParams.visibility as any,
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
      hasAvailableSpots: queryParams.hasAvailableSpots === 'true',
      isFree: queryParams.isFree === 'true',
      isVirtual: queryParams.isVirtual === 'true',
      isHybrid: queryParams.isHybrid === 'true',
      tags: queryParams.tags ? queryParams.tags.split(',') : undefined,
      keywords: queryParams.keywords ? queryParams.keywords.split(',') : undefined
    };

    const result = await eventService.searchEvents(filters, page, limit);

    return formatSuccessResponse({
      events: result.events,
      pagination: result.pagination,
      filters: result.filters
    });
  } catch (error: any) {
    logger.error('Failed to search events', { error: error.message, queryParams: event.queryStringParameters });
    return formatErrorResponse(error);
  }
};

export const getEventsByOrganizer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserFromToken(event);
    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const limit = parseInt(queryParams.limit || '20');

    const result = await eventService.getEventsByOrganizer(user.userId, page, limit);

    return formatSuccessResponse({
      events: result.events,
      pagination: result.pagination,
      filters: result.filters
    });
  } catch (error: any) {
    logger.error('Failed to get organizer events', { error: error.message });
    return formatErrorResponse(error);
  }
};

export const getEventsByCategory = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const categoryId = event.pathParameters?.categoryId;
    if (!categoryId) {
      return formatErrorResponse(new ValidationError('Category ID is required'));
    }

    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const limit = parseInt(queryParams.limit || '20');

    const result = await eventService.getEventsByCategory(categoryId, page, limit);

    return formatSuccessResponse({
      events: result.events,
      pagination: result.pagination,
      filters: result.filters
    });
  } catch (error: any) {
    logger.error('Failed to get category events', { error: error.message, categoryId: event.pathParameters?.categoryId });
    return formatErrorResponse(error);
  }
};

// Event Category Handlers

export const createCategory = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserFromToken(event);
    const body = JSON.parse(event.body || '{}');
    
    const validation = validateSchemaTyped<EventCategoryRequest>(eventCategorySchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Invalid category data', validation.errors));
    }

    const category = await eventService.createCategory(validation.data);

    logger.info('Event category created successfully', {
      categoryId: category.id,
      name: category.name,
      createdBy: user.userId
    });

    return formatSuccessResponse({
      message: 'Event category created successfully',
      category
    });
  } catch (error: any) {
    logger.error('Failed to create event category', { error: error.message });
    return formatErrorResponse(error);
  }
};

export const getAllCategories = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const categories = await eventService.getAllCategories();

    return formatSuccessResponse({
      categories
    });
  } catch (error: any) {
    logger.error('Failed to get all categories', { error: error.message });
    return formatErrorResponse(error);
  }
};

// Event Media Handlers

export const addEventMedia = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserFromToken(event);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return formatErrorResponse(new ValidationError('Event ID is required'));
    }

    const body = JSON.parse(event.body || '{}');
    
    const validation = validateSchemaTyped<EventMediaRequest>(eventMediaSchema, body);
    if (!validation.isValid) {
      return formatErrorResponse(new ValidationError('Invalid media data', validation.errors));
    }

    const media = await eventService.addEventMedia(eventId, user.userId, validation.data);

    logger.info('Event media added successfully', {
      mediaId: media.id,
      eventId,
      organizerId: user.userId,
      type: media.type
    });

    return formatSuccessResponse({
      message: 'Event media added successfully',
      media
    });
  } catch (error: any) {
    logger.error('Failed to add event media', { error: error.message, eventId: event.pathParameters?.eventId });
    return formatErrorResponse(error);
  }
};

export const getEventMedia = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return formatErrorResponse(new ValidationError('Event ID is required'));
    }

    const media = await eventService.getEventMedia(eventId);

    return formatSuccessResponse({
      media
    });
  } catch (error: any) {
    logger.error('Failed to get event media', { error: error.message, eventId: event.pathParameters?.eventId });
    return formatErrorResponse(error);
  }
};

export const deleteEventMedia = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserFromToken(event);
    const eventId = event.pathParameters?.eventId;
    const mediaId = event.pathParameters?.mediaId;
    
    if (!eventId) {
      return formatErrorResponse(new ValidationError('Event ID is required'));
    }
    if (!mediaId) {
      return formatErrorResponse(new ValidationError('Media ID is required'));
    }

    await eventService.deleteEventMedia(mediaId, eventId, user.userId);

    logger.info('Event media deleted successfully', {
      mediaId,
      eventId,
      organizerId: user.userId
    });

    return formatSuccessResponse({
      message: 'Event media deleted successfully'
    });
  } catch (error: any) {
    logger.error('Failed to delete event media', { error: error.message, mediaId: event.pathParameters?.mediaId });
    return formatErrorResponse(error);
  }
};

// Import validation schemas
import { 
  eventCreationSchema, 
  eventUpdateSchema, 
  eventCategorySchema, 
  eventMediaSchema 
} from '../../../shared/validators/schemas';
