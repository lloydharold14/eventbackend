import { BookingService, IEventService, IUserService } from './BookingService';
import { EventService } from '../../events/services/EventService';
import { EventRepository } from '../../events/repositories/EventRepository';
import { UserService } from '../../users/services/UserService';
import { UserRepository } from '../../users/repositories/UserRepository';
import { AuthService } from '../../users/services/AuthService';
import { logger } from '../../../shared/utils/logger';

// Adapter classes to implement the interfaces
export class EventServiceAdapter implements IEventService {
  private eventService: EventService;

  constructor(eventService: EventService) {
    this.eventService = eventService;
  }

  async getEventById(eventId: string): Promise<any> {
    return await this.eventService.getEventById(eventId);
  }

  async getEventBySlug(slug: string): Promise<any> {
    return await this.eventService.getEventBySlug(slug);
  }
}

export class UserServiceAdapter implements IUserService {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  async getUserById(userId: string): Promise<any> {
    return await this.userService.getUserById(userId);
  }

  async validateUserPermissions(userId: string, requiredRole?: string): Promise<boolean> {
    try {
      const user = await this.userService.getUserById(userId);
      if (!user) {
        return false;
      }

      // Check if user is active
      if (user.status !== 'active') {
        return false;
      }

      // Check role if required
      if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error validating user permissions', { userId, requiredRole, error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }
}

export class BookingServiceFactory {
  private static instance: BookingServiceFactory;
  private bookingService: BookingService | null = null;

  private constructor() {}

  public static getInstance(): BookingServiceFactory {
    if (!BookingServiceFactory.instance) {
      BookingServiceFactory.instance = new BookingServiceFactory();
    }
    return BookingServiceFactory.instance;
  }

  public createBookingService(
    eventService?: EventService,
    userService?: UserService
  ): BookingService {
    // Create adapters if services are provided
    const eventServiceAdapter = eventService ? new EventServiceAdapter(eventService) : undefined;
    const userServiceAdapter = userService ? new UserServiceAdapter(userService) : undefined;

    // Create BookingService with injected dependencies
    const bookingService = new BookingService(eventServiceAdapter, userServiceAdapter);
    
    this.bookingService = bookingService;
    return bookingService;
  }

  public createBookingServiceWithRepositories(
    eventRepository?: EventRepository,
    userRepository?: UserRepository,
    authService?: AuthService
  ): BookingService {
    // Create services with repositories if provided
    const eventService = eventRepository ? new EventService(eventRepository) : undefined;
    const userService = userRepository && authService ? new UserService(userRepository, authService) : undefined;

    return this.createBookingService(eventService, userService);
  }

  public getBookingService(): BookingService | null {
    return this.bookingService;
  }

  public updateBookingServiceDependencies(
    eventService?: EventService,
    userService?: UserService
  ): void {
    if (!this.bookingService) {
      throw new Error('BookingService not initialized. Call createBookingService first.');
    }

    const eventServiceAdapter = eventService ? new EventServiceAdapter(eventService) : null;
    const userServiceAdapter = userService ? new UserServiceAdapter(userService) : null;

    if (eventServiceAdapter) {
      this.bookingService.setEventService(eventServiceAdapter);
    }
    if (userServiceAdapter) {
      this.bookingService.setUserService(userServiceAdapter);
    }
  }
}

// Convenience function for creating BookingService with default configuration
export function createBookingService(
  eventRepository?: EventRepository,
  userRepository?: UserRepository,
  authService?: AuthService
): BookingService {
  return BookingServiceFactory.getInstance().createBookingServiceWithRepositories(
    eventRepository,
    userRepository,
    authService
  );
}
