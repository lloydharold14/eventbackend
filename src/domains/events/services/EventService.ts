import { Event, EventCategory, EventMedia, EventSearchFilters, EventListResponse, CreateEventRequest, UpdateEventRequest, EventStatus, EventVisibility, EventType } from '../models/Event';
import { EventRepository } from '../repositories/EventRepository';
import { logger } from '../../../shared/utils/logger';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../../shared/errors/DomainError';
import { v4 as uuidv4 } from 'uuid';

export class EventService {
  private readonly eventRepository: EventRepository;

  constructor(eventRepository: EventRepository) {
    this.eventRepository = eventRepository;
  }

  // Event CRUD Operations
  async createEvent(organizerId: string, organizerName: string, organizerEmail: string, eventData: CreateEventRequest): Promise<Event> {
    try {
      // Validate event data
      this.validateEventData(eventData);

      // Check if organizer has permission to create events
      await this.validateOrganizerPermissions(organizerId);

      // Generate unique event ID and slug
      const eventId = uuidv4();
      const slug = this.generateEventSlug(eventData.title);

      // Create event object
      const event: Event = {
        id: eventId,
        title: eventData.title,
        description: eventData.description,
        shortDescription: eventData.shortDescription,
        organizerId,
        organizerName,
        organizerEmail,
        categoryId: eventData.categoryId,
        categoryName: '', // Will be populated from category lookup
        type: eventData.type,
        status: EventStatus.DRAFT,
        visibility: eventData.visibility,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        timezone: eventData.timezone,
        isAllDay: eventData.isAllDay,
        location: eventData.location,
        maxAttendees: eventData.maxAttendees,
        currentAttendees: 0,
        pricing: eventData.pricing,
        tags: eventData.tags || [],
        keywords: eventData.keywords || [],
        primaryImageUrl: undefined,
        gallery: [],
        settings: {
          allowWaitlist: true,
          allowCancellations: true,
          requireApproval: false,
          maxAttendeesPerBooking: 10,
          allowGroupBookings: true,
          requirePaymentConfirmation: true,
          sendReminders: true,
          allowSocialSharing: true,
          allowComments: true,
          requireModeration: false,
          ...eventData.settings
        },
        stats: {
          totalViews: 0,
          totalBookings: 0,
          totalRevenue: 0,
          totalReviews: 0,
          conversionRate: 0,
          topReferrers: [],
          attendanceRate: 0,
          lastUpdated: new Date().toISOString()
        },
        slug,
        seoTitle: eventData.seoTitle,
        seoDescription: eventData.seoDescription,
        seoKeywords: eventData.seoKeywords,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Get category name
      const category = await this.eventRepository.getCategoryById(eventData.categoryId);
      if (category) {
        event.categoryName = category.name;
      }

      // Create event in database
      const createdEvent = await this.eventRepository.createEvent(event);

      logger.info('Event created successfully', {
        eventId: createdEvent.id,
        organizerId,
        title: createdEvent.title,
        status: createdEvent.status
      });

      return createdEvent;
    } catch (error: any) {
      logger.error('Failed to create event', {
        error: error.message,
        organizerId,
        eventData: { title: eventData.title, type: eventData.type }
      });
      throw error;
    }
  }

  async getEventById(eventId: string, includePrivate: boolean = false): Promise<Event> {
    try {
      const event = await this.eventRepository.getEventById(eventId);
      
      if (!event) {
        throw new NotFoundError('Event', eventId);
      }

      // Check visibility permissions
      if (!includePrivate && event.visibility === EventVisibility.PRIVATE) {
        throw new UnauthorizedError('Access denied to private event');
      }

      return event;
    } catch (error: any) {
      logger.error('Failed to get event by ID', { error: error.message, eventId });
      throw error;
    }
  }

  async getEventBySlug(slug: string, includePrivate: boolean = false): Promise<Event> {
    try {
      const event = await this.eventRepository.getEventBySlug(slug);
      
      if (!event) {
        throw new NotFoundError('Event', slug);
      }

      // Check visibility permissions
      if (!includePrivate && event.visibility === EventVisibility.PRIVATE) {
        throw new UnauthorizedError('Access denied to private event');
      }

      return event;
    } catch (error: any) {
      logger.error('Failed to get event by slug', { error: error.message, slug });
      throw error;
    }
  }

  async updateEvent(eventId: string, organizerId: string, updates: UpdateEventRequest): Promise<Event> {
    try {
      // Get existing event
      const existingEvent = await this.eventRepository.getEventById(eventId);
      if (!existingEvent) {
        throw new NotFoundError('Event', eventId);
      }

      // Check if user is the organizer
      if (existingEvent.organizerId !== organizerId) {
        throw new UnauthorizedError('Only the event organizer can update this event');
      }

      // Validate updates
      if (updates.startDate || updates.endDate) {
        this.validateEventDates(updates.startDate || existingEvent.startDate, updates.endDate || existingEvent.endDate);
      }

      // Update category name if category is being changed
      // Convert UpdateEventRequest to Partial<Event>
      const eventUpdates: Partial<Event> = { 
        ...updates,
        settings: updates.settings ? { ...existingEvent.settings, ...updates.settings } : undefined
      };
      
      if (updates.categoryId && updates.categoryId !== existingEvent.categoryId) {
        const category = await this.eventRepository.getCategoryById(updates.categoryId);
        if (category) {
          eventUpdates.categoryName = category.name;
        }
      }

      // Update event
      const updatedEvent = await this.eventRepository.updateEvent(eventId, eventUpdates);

      logger.info('Event updated successfully', {
        eventId,
        organizerId,
        updatedFields: Object.keys(updates)
      });

      return updatedEvent;
    } catch (error: any) {
      logger.error('Failed to update event', { error: error.message, eventId, organizerId });
      throw error;
    }
  }

  async deleteEvent(eventId: string, organizerId: string): Promise<void> {
    try {
      // Get existing event
      const existingEvent = await this.eventRepository.getEventById(eventId);
      if (!existingEvent) {
        throw new NotFoundError('Event', eventId);
      }

      // Check if user is the organizer
      if (existingEvent.organizerId !== organizerId) {
        throw new UnauthorizedError('Only the event organizer can delete this event');
      }

      // Check if event can be deleted (not published with bookings)
      if (existingEvent.status === EventStatus.PUBLISHED && existingEvent.currentAttendees > 0) {
        throw new ValidationError('Cannot delete published event with attendees. Cancel the event instead.');
      }

      await this.eventRepository.deleteEvent(eventId);

      logger.info('Event deleted successfully', { eventId, organizerId });
    } catch (error: any) {
      logger.error('Failed to delete event', { error: error.message, eventId, organizerId });
      throw error;
    }
  }

  // Event Status Management
  async publishEvent(eventId: string, organizerId: string, publishNow: boolean = true): Promise<Event> {
    try {
      const existingEvent = await this.eventRepository.getEventById(eventId);
      if (!existingEvent) {
        throw new NotFoundError('Event', eventId);
      }

      if (existingEvent.organizerId !== organizerId) {
        throw new UnauthorizedError('Only the event organizer can publish this event');
      }

      if (existingEvent.status !== EventStatus.DRAFT) {
        throw new ValidationError('Only draft events can be published');
      }

      const updates: Partial<Event> = {
        status: EventStatus.PUBLISHED,
        publishedAt: publishNow ? new Date().toISOString() : undefined
      };

      const updatedEvent = await this.eventRepository.updateEvent(eventId, updates);

      logger.info('Event published successfully', { eventId, organizerId, publishNow });
      return updatedEvent;
    } catch (error: any) {
      logger.error('Failed to publish event', { error: error.message, eventId, organizerId });
      throw error;
    }
  }

  async cancelEvent(eventId: string, organizerId: string, reason: string): Promise<Event> {
    try {
      const existingEvent = await this.eventRepository.getEventById(eventId);
      if (!existingEvent) {
        throw new NotFoundError('Event', eventId);
      }

      if (existingEvent.organizerId !== organizerId) {
        throw new UnauthorizedError('Only the event organizer can cancel this event');
      }

      if (existingEvent.status === EventStatus.CANCELLED) {
        throw new ValidationError('Event is already cancelled');
      }

      const updates: Partial<Event> = {
        status: EventStatus.CANCELLED,
        cancelledAt: new Date().toISOString()
      };

      const updatedEvent = await this.eventRepository.updateEvent(eventId, updates);

      logger.info('Event cancelled successfully', { eventId, organizerId, reason });
      return updatedEvent;
    } catch (error: any) {
      logger.error('Failed to cancel event', { error: error.message, eventId, organizerId });
      throw error;
    }
  }

  async duplicateEvent(eventId: string, organizerId: string, newTitle: string, newStartDate: string, newEndDate: string): Promise<Event> {
    try {
      const existingEvent = await this.eventRepository.getEventById(eventId);
      if (!existingEvent) {
        throw new NotFoundError('Event', eventId);
      }

      if (existingEvent.organizerId !== organizerId) {
        throw new UnauthorizedError('Only the event organizer can duplicate this event');
      }

      // Create new event data
      const eventData: CreateEventRequest = {
        title: newTitle,
        description: existingEvent.description,
        shortDescription: existingEvent.shortDescription,
        categoryId: existingEvent.categoryId,
        type: existingEvent.type,
        visibility: EventVisibility.PRIVATE, // Start as private
        startDate: newStartDate,
        endDate: newEndDate,
        timezone: existingEvent.timezone,
        isAllDay: existingEvent.isAllDay,
        location: existingEvent.location,
        maxAttendees: existingEvent.maxAttendees,
        pricing: existingEvent.pricing,
        tags: existingEvent.tags,
        keywords: existingEvent.keywords,
        settings: existingEvent.settings,
        seoTitle: existingEvent.seoTitle,
        seoDescription: existingEvent.seoDescription,
        seoKeywords: existingEvent.seoKeywords
      };

      const duplicatedEvent = await this.createEvent(
        organizerId,
        existingEvent.organizerName,
        existingEvent.organizerEmail,
        eventData
      );

      logger.info('Event duplicated successfully', {
        originalEventId: eventId,
        newEventId: duplicatedEvent.id,
        organizerId
      });

      return duplicatedEvent;
    } catch (error: any) {
      logger.error('Failed to duplicate event', { error: error.message, eventId, organizerId });
      throw error;
    }
  }

  // Event Search and Listing
  async searchEvents(filters: EventSearchFilters, page: number = 1, limit: number = 20): Promise<EventListResponse> {
    try {
      // Use the filters as provided, but don't filter by visibility since events don't have this field yet
      const searchFilters = {
        ...filters
      };
      // Remove visibility filter since events don't have this field in the database
      delete searchFilters.visibility;

      const result = await this.eventRepository.searchEvents(searchFilters, page, limit);

      logger.info('Events searched successfully', {
        filters: Object.keys(filters),
        resultCount: result.events.length,
        page,
        limit
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to search events', { error: error.message, filters });
      throw error;
    }
  }

  async getEventsByOrganizer(organizerId: string, page: number = 1, limit: number = 20): Promise<EventListResponse> {
    try {
      const result = await this.eventRepository.getEventsByOrganizer(organizerId, page, limit);

      logger.info('Organizer events retrieved successfully', {
        organizerId,
        resultCount: result.events.length,
        page,
        limit
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to get organizer events', { error: error.message, organizerId });
      throw error;
    }
  }

  async getEventsByCategory(categoryId: string, page: number = 1, limit: number = 20): Promise<EventListResponse> {
    try {
      const result = await this.eventRepository.getEventsByCategory(categoryId, page, limit);

      logger.info('Category events retrieved successfully', {
        categoryId,
        resultCount: result.events.length,
        page,
        limit
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to get category events', { error: error.message, categoryId });
      throw error;
    }
  }

  // Event Category Management
  async createCategory(categoryData: { name: string; description?: string; icon?: string; color?: string; parentCategoryId?: string }): Promise<EventCategory> {
    try {
      const category: EventCategory = {
        id: uuidv4(),
        name: categoryData.name,
        description: categoryData.description,
        icon: categoryData.icon,
        color: categoryData.color,
        parentCategoryId: categoryData.parentCategoryId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const createdCategory = await this.eventRepository.createCategory(category);

      logger.info('Event category created successfully', { categoryId: createdCategory.id, name: createdCategory.name });
      return createdCategory;
    } catch (error: any) {
      logger.error('Failed to create event category', { error: error.message, categoryData });
      throw error;
    }
  }

  async getAllCategories(): Promise<EventCategory[]> {
    try {
      const categories = await this.eventRepository.getAllCategories();
      return categories.filter(category => category.isActive);
    } catch (error: any) {
      logger.error('Failed to get all categories', { error: error.message });
      throw error;
    }
  }

  // Event Media Management
  async addEventMedia(eventId: string, organizerId: string, mediaData: {
    type: EventMedia['type'];
    url: string;
    thumbnailUrl?: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    isPrimary?: boolean;
    altText?: string;
    caption?: string;
  }): Promise<EventMedia> {
    try {
      const existingEvent = await this.eventRepository.getEventById(eventId);
      if (!existingEvent) {
        throw new NotFoundError('Event', eventId);
      }

      if (existingEvent.organizerId !== organizerId) {
        throw new UnauthorizedError('Only the event organizer can add media to this event');
      }

      const media: EventMedia = {
        id: uuidv4(),
        eventId,
        type: mediaData.type,
        url: mediaData.url,
        thumbnailUrl: mediaData.thumbnailUrl,
        filename: mediaData.filename,
        fileSize: mediaData.fileSize,
        mimeType: mediaData.mimeType,
        isPrimary: mediaData.isPrimary || false,
        altText: mediaData.altText,
        caption: mediaData.caption,
        uploadedBy: organizerId,
        uploadedAt: new Date().toISOString()
      };

      const createdMedia = await this.eventRepository.addEventMedia(media);

      // Update primary image if this is the first image
      if (mediaData.isPrimary || (mediaData.type === 'image' && !existingEvent.primaryImageUrl)) {
        await this.eventRepository.updateEvent(eventId, {
          primaryImageUrl: mediaData.url
        });
      }

      logger.info('Event media added successfully', {
        mediaId: createdMedia.id,
        eventId,
        organizerId,
        type: mediaData.type
      });

      return createdMedia;
    } catch (error: any) {
      logger.error('Failed to add event media', { error: error.message, eventId, organizerId });
      throw error;
    }
  }

  async getEventMedia(eventId: string): Promise<EventMedia[]> {
    try {
      const media = await this.eventRepository.getEventMedia(eventId);
      return media;
    } catch (error: any) {
      logger.error('Failed to get event media', { error: error.message, eventId });
      throw error;
    }
  }

  async deleteEventMedia(mediaId: string, eventId: string, organizerId: string): Promise<void> {
    try {
      const existingEvent = await this.eventRepository.getEventById(eventId);
      if (!existingEvent) {
        throw new NotFoundError('Event', eventId);
      }

      if (existingEvent.organizerId !== organizerId) {
        throw new UnauthorizedError('Only the event organizer can delete media from this event');
      }

      await this.eventRepository.deleteEventMedia(mediaId, eventId);

      logger.info('Event media deleted successfully', { mediaId, eventId, organizerId });
    } catch (error: any) {
      logger.error('Failed to delete event media', { error: error.message, mediaId, eventId });
      throw error;
    }
  }

  // Statistics and Analytics
  async updateEventStats(eventId: string, stats: Partial<Event['stats']>): Promise<void> {
    try {
      await this.eventRepository.updateEventStats(eventId, stats);
    } catch (error: any) {
      logger.error('Failed to update event stats', { error: error.message, eventId });
      throw error;
    }
  }

  // Validation Methods
  private validateEventData(eventData: CreateEventRequest): void {
    if (!eventData.title || eventData.title.trim().length < 3) {
      throw new ValidationError('Event title must be at least 3 characters long');
    }

    if (!eventData.description || eventData.description.trim().length < 10) {
      throw new ValidationError('Event description must be at least 10 characters long');
    }

    if (!eventData.categoryId) {
      throw new ValidationError('Event category is required');
    }

    if (!eventData.startDate || !eventData.endDate) {
      throw new ValidationError('Event start and end dates are required');
    }

    this.validateEventDates(eventData.startDate, eventData.endDate);

    if (eventData.maxAttendees <= 0) {
      throw new ValidationError('Maximum attendees must be greater than 0');
    }

    if (!eventData.location) {
      throw new ValidationError('Event location is required');
    }

    if (!eventData.pricing) {
      throw new ValidationError('Event pricing is required');
    }
  }

  private validateEventDates(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
      throw new ValidationError('Event start date cannot be in the past');
    }

    if (end <= start) {
      throw new ValidationError('Event end date must be after start date');
    }
  }

  private async validateOrganizerPermissions(organizerId: string): Promise<void> {
    // TODO: Implement organizer permission validation
    // This could check if the user has the 'organizer' role
    // or if they have permission to create events
  }

  private generateEventSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50) + '-' + Date.now().toString().slice(-6);
  }
}
