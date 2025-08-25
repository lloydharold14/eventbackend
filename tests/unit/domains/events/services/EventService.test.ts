import { jest } from '@jest/globals';
import { EventService } from '../../../../src/domains/events/services/EventService';
import { EventRepository } from '../../../../src/domains/events/repositories/EventRepository';
import { Event, EventType, EventStatus, EventVisibility, PricingModel } from '../../../../src/domains/events/models/Event';
import { CreateEventRequest, UpdateEventRequest } from '../../../../src/domains/events/models/Event';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../../../src/shared/errors/DomainError';
import { testUtils, testPerf, testData } from '../../../../src/shared/utils/testing';

// Mock dependencies
jest.mock('../../../../src/domains/events/repositories/EventRepository');
jest.mock('../../../../src/shared/utils/logger');

const MockEventRepository = EventRepository as jest.MockedClass<typeof EventRepository>;

describe('EventService', () => {
  let eventService: EventService;
  let mockEventRepository: jest.Mocked<EventRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventRepository = new MockEventRepository('us-east-1', 'test-events-table') as jest.Mocked<EventRepository>;
    eventService = new EventService(mockEventRepository);
  });

  describe('createEvent', () => {
    const validEventData: CreateEventRequest = {
      title: 'Test Event',
      description: 'A test event description',
      categoryId: 'test-category',
      type: EventType.CONFERENCE,
      visibility: EventVisibility.PUBLIC,
      startDate: '2024-12-01T10:00:00Z',
      endDate: '2024-12-01T18:00:00Z',
      timezone: 'UTC',
      isAllDay: false,
      location: {
        type: 'physical',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          postalCode: '12345'
        }
      },
      maxAttendees: 100,
      pricing: {
        model: PricingModel.PAID,
        currency: 'USD',
        basePrice: 50
      }
    };

    it('should create an event successfully', async () => {
      // Arrange
      const organizerId = 'test-organizer-id';
      const organizerName = 'Test Organizer';
      const organizerEmail = 'organizer@test.com';
      
      const expectedEvent: Event = {
        id: 'test-event-id',
        title: validEventData.title,
        description: validEventData.description,
        organizerId,
        organizerName,
        organizerEmail,
        categoryId: validEventData.categoryId,
        categoryName: 'Test Category',
        type: validEventData.type,
        status: EventStatus.DRAFT,
        visibility: validEventData.visibility,
        startDate: validEventData.startDate,
        endDate: validEventData.endDate,
        timezone: validEventData.timezone,
        isAllDay: validEventData.isAllDay,
        location: validEventData.location,
        maxAttendees: validEventData.maxAttendees,
        currentAttendees: 0,
        pricing: validEventData.pricing,
        tags: [],
        keywords: [],
        gallery: [],
        settings: {
          allowWaitlist: false,
          allowCancellations: true,
          requireApproval: false,
          maxAttendeesPerBooking: 10,
          allowGroupBookings: true,
          requirePaymentConfirmation: true,
          sendReminders: true,
          allowSocialSharing: true,
          allowComments: true,
          requireModeration: false
        },
        stats: {
          totalViews: 0,
          totalBookings: 0,
          totalRevenue: 0,
          conversionRate: 0,
          topReferrers: [],
          attendanceRate: 0,
          lastUpdated: new Date().toISOString()
        },
        slug: 'test-event',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockEventRepository.createEvent.mockResolvedValue(expectedEvent);

      // Act
      const { result, duration } = await testPerf.measureExecutionTime(() =>
        eventService.createEvent(organizerId, organizerName, organizerEmail, validEventData)
      );

      // Assert
      expect(result).toEqual(expectedEvent);
      expect(mockEventRepository.createEvent).toHaveBeenCalledWith(expect.objectContaining({
        title: validEventData.title,
        organizerId,
        organizerName,
        organizerEmail
      }));
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should throw ValidationError for invalid event data', async () => {
      // Arrange
      const invalidEventData = {
        ...validEventData,
        startDate: 'invalid-date',
        endDate: 'invalid-date'
      };

      // Act & Assert
      await expect(
        eventService.createEvent('organizer-id', 'Organizer', 'email@test.com', invalidEventData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when end date is before start date', async () => {
      // Arrange
      const invalidEventData = {
        ...validEventData,
        startDate: '2024-12-01T18:00:00Z',
        endDate: '2024-12-01T10:00:00Z'
      };

      // Act & Assert
      await expect(
        eventService.createEvent('organizer-id', 'Organizer', 'email@test.com', invalidEventData)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      mockEventRepository.createEvent.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(
        eventService.createEvent('organizer-id', 'Organizer', 'email@test.com', validEventData)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getEventById', () => {
    it('should return event when found', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const expectedEvent = testData.createTestEvent({ id: eventId });
      mockEventRepository.getEventById.mockResolvedValue(expectedEvent);

      // Act
      const result = await eventService.getEventById(eventId);

      // Assert
      expect(result).toEqual(expectedEvent);
      expect(mockEventRepository.getEventById).toHaveBeenCalledWith(eventId);
    });

    it('should throw NotFoundError when event not found', async () => {
      // Arrange
      const eventId = 'non-existent-event-id';
      mockEventRepository.getEventById.mockResolvedValue(null);

      // Act & Assert
      await expect(eventService.getEventById(eventId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateEvent', () => {
    const updateData: UpdateEventRequest = {
      title: 'Updated Event Title',
      description: 'Updated description'
    };

    it('should update event successfully', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const organizerId = 'test-organizer-id';
      const existingEvent = testData.createTestEvent({ 
        id: eventId, 
        organizerId,
        status: EventStatus.DRAFT 
      });
      const updatedEvent = { ...existingEvent, ...updateData };

      mockEventRepository.getEventById.mockResolvedValue(existingEvent);
      mockEventRepository.updateEvent.mockResolvedValue(updatedEvent);

      // Act
      const result = await eventService.updateEvent(eventId, organizerId, updateData);

      // Assert
      expect(result).toEqual(updatedEvent);
      expect(mockEventRepository.updateEvent).toHaveBeenCalledWith(
        eventId,
        expect.objectContaining(updateData)
      );
    });

    it('should throw UnauthorizedError when organizer does not own the event', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const organizerId = 'test-organizer-id';
      const differentOrganizerId = 'different-organizer-id';
      const existingEvent = testData.createTestEvent({ 
        id: eventId, 
        organizerId: differentOrganizerId 
      });

      mockEventRepository.getEventById.mockResolvedValue(existingEvent);

      // Act & Assert
      await expect(
        eventService.updateEvent(eventId, organizerId, updateData)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when event does not exist', async () => {
      // Arrange
      const eventId = 'non-existent-event-id';
      const organizerId = 'test-organizer-id';
      mockEventRepository.getEventById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        eventService.updateEvent(eventId, organizerId, updateData)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('publishEvent', () => {
    it('should publish event successfully', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const organizerId = 'test-organizer-id';
      const existingEvent = testData.createTestEvent({ 
        id: eventId, 
        organizerId,
        status: EventStatus.DRAFT 
      });
      const publishedEvent = { 
        ...existingEvent, 
        status: EventStatus.PUBLISHED,
        publishedAt: new Date().toISOString()
      };

      mockEventRepository.getEventById.mockResolvedValue(existingEvent);
      mockEventRepository.updateEvent.mockResolvedValue(publishedEvent);

      // Act
      const result = await eventService.publishEvent(eventId, organizerId);

      // Assert
      expect(result.status).toBe(EventStatus.PUBLISHED);
      expect(result.publishedAt).toBeDefined();
      expect(mockEventRepository.updateEvent).toHaveBeenCalledWith(
        eventId,
        expect.objectContaining({
          status: EventStatus.PUBLISHED,
          publishedAt: expect.any(String)
        })
      );
    });

    it('should throw UnauthorizedError when organizer does not own the event', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const organizerId = 'test-organizer-id';
      const differentOrganizerId = 'different-organizer-id';
      const existingEvent = testData.createTestEvent({ 
        id: eventId, 
        organizerId: differentOrganizerId 
      });

      mockEventRepository.getEventById.mockResolvedValue(existingEvent);

      // Act & Assert
      await expect(
        eventService.publishEvent(eventId, organizerId)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('searchEvents', () => {
    it('should return filtered events', async () => {
      // Arrange
      const filters = {
        organizerId: 'test-organizer-id',
        type: EventType.CONFERENCE
      };
      const expectedResponse = {
        events: testData.generateEvents(5),
        pagination: {
          page: 1,
          limit: 20,
          total: 5,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        },
        filters
      };

      mockEventRepository.searchEvents.mockResolvedValue(expectedResponse);

      // Act
      const result = await eventService.searchEvents(filters);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockEventRepository.searchEvents).toHaveBeenCalledWith(filters, 1, 20);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const filters = {};
      const page = 2;
      const limit = 10;
      const expectedResponse = {
        events: testData.generateEvents(10),
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true
        },
        filters
      };

      mockEventRepository.searchEvents.mockResolvedValue(expectedResponse);

      // Act
      const result = await eventService.searchEvents(filters, page, limit);

      // Assert
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(mockEventRepository.searchEvents).toHaveBeenCalledWith(filters, page, limit);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent event creation efficiently', async () => {
      // Arrange
      const organizerId = 'test-organizer-id';
      const organizerName = 'Test Organizer';
      const organizerEmail = 'organizer@test.com';
      const eventData = testData.createTestEvent();
      
      mockEventRepository.createEvent.mockResolvedValue(eventData);

      // Act
      const { totalDuration, averageDuration, errors } = await testPerf.loadTest(
        () => eventService.createEvent(organizerId, organizerName, organizerEmail, eventData),
        10, // concurrency
        50  // iterations
      );

      // Assert
      expect(errors).toBe(0);
      expect(averageDuration).toBeLessThan(500); // Average should be under 500ms
      expect(totalDuration).toBeLessThan(10000); // Total should be under 10 seconds
    });

    it('should handle bulk event retrieval efficiently', async () => {
      // Arrange
      const events = testData.generateEvents(100);
      const expectedResponse = {
        events,
        pagination: {
          page: 1,
          limit: 100,
          total: 100,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        },
        filters: {}
      };

      mockEventRepository.searchEvents.mockResolvedValue(expectedResponse);

      // Act
      const { result, duration } = await testPerf.measureExecutionTime(() =>
        eventService.searchEvents({}, 1, 100)
      );

      // Assert
      expect(result.events).toHaveLength(100);
      testPerf.assertPerformanceThreshold(duration, 1000); // Should complete within 1 second
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Arrange
      const dbError = new Error('Connection timeout');
      mockEventRepository.getEventById.mockRejectedValue(dbError);

      // Act & Assert
      await expect(eventService.getEventById('test-id')).rejects.toThrow('Connection timeout');
    });

    it('should handle validation errors with detailed messages', async () => {
      // Arrange
      const invalidEventData = {
        title: '', // Invalid: empty title
        description: 'Test description',
        categoryId: 'test-category',
        type: EventType.CONFERENCE,
        visibility: EventVisibility.PUBLIC,
        startDate: '2024-12-01T10:00:00Z',
        endDate: '2024-12-01T18:00:00Z',
        timezone: 'UTC',
        isAllDay: false,
        location: {
          type: 'physical',
          address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345'
          }
        },
        maxAttendees: 100,
        pricing: {
          model: PricingModel.PAID,
          currency: 'USD',
          basePrice: 50
        }
      };

      // Act & Assert
      await expect(
        eventService.createEvent('organizer-id', 'Organizer', 'email@test.com', invalidEventData)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Data Validation', () => {
    it('should validate event title is not empty', async () => {
      // Arrange
      const invalidEventData = {
        ...testData.createTestEvent(),
        title: ''
      };

      // Act & Assert
      await expect(
        eventService.createEvent('organizer-id', 'Organizer', 'email@test.com', invalidEventData)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate maxAttendees is positive', async () => {
      // Arrange
      const invalidEventData = {
        ...testData.createTestEvent(),
        maxAttendees: -1
      };

      // Act & Assert
      await expect(
        eventService.createEvent('organizer-id', 'Organizer', 'email@test.com', invalidEventData)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate event dates are in the future', async () => {
      // Arrange
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      
      const invalidEventData = {
        ...testData.createTestEvent(),
        startDate: pastDate.toISOString(),
        endDate: pastDate.toISOString()
      };

      // Act & Assert
      await expect(
        eventService.createEvent('organizer-id', 'Organizer', 'email@test.com', invalidEventData)
      ).rejects.toThrow(ValidationError);
    });
  });
});
