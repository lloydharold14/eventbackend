import { BookingRepository } from '../repositories/BookingRepository';
import { 
  Booking, 
  CreateBookingRequest, 
  UpdateBookingRequest, 
  BookingFilters, 
  BookingStatus, 
  PaymentStatus,
  BookingCapacity,
  BookingConfirmation,
  TicketType
} from '../models/Booking';
import { EventService } from '../../events/services/EventService';
import { UserService } from '../../users/services/UserService';
import { PaymentService } from '../../payments/services/PaymentService';
import { PaymentMethod, RefundReason } from '../../payments/models/Payment';
import { NotificationService } from '../../notifications/services/NotificationService';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../../shared/errors/DomainError';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../shared/utils/logger';

// Service interfaces to avoid circular dependencies
export interface IEventService {
  getEventById(eventId: string): Promise<any>;
  getEventBySlug(slug: string): Promise<any>;
}

export interface IUserService {
  getUserById(userId: string): Promise<any>;
  validateUserPermissions(userId: string, requiredRole?: string): Promise<boolean>;
}

export class BookingService {
  private bookingRepository: BookingRepository;
  private eventService: IEventService | null = null;
  private userService: IUserService | null = null;
  private paymentService: PaymentService;
  private notificationService: NotificationService;

  constructor(
    eventService?: IEventService,
    userService?: IUserService
  ) {
    this.bookingRepository = new BookingRepository();
    this.paymentService = new PaymentService(process.env.PAYMENT_TABLE_NAME || 'Payments');
    this.notificationService = new NotificationService();
    
    // Inject services if provided
    if (eventService) {
      this.eventService = eventService;
    }
    if (userService) {
      this.userService = userService;
    }
  }

  // Method to set services after construction (for dependency injection)
  setEventService(eventService: IEventService): void {
    this.eventService = eventService;
  }

  setUserService(userService: IUserService): void {
    this.userService = userService;
  }

  async createBooking(userId: string, request: CreateBookingRequest): Promise<Booking> {
    try {
      logger.info('Creating booking', { userId, eventId: request.eventId });

      // Validate event exists and is published
      if (this.eventService) {
        const event = await this.eventService.getEventById(request.eventId);
        if (!event) {
          throw new NotFoundError('Event', request.eventId);
        }

        if (event.status !== 'published') {
          throw new ValidationError('Event is not available for booking');
        }
      }

      // Validate user permissions
      if (this.userService) {
        const hasPermission = await this.userService.validateUserPermissions(userId, 'attendee');
        if (!hasPermission) {
          throw new UnauthorizedError('User does not have permission to create bookings');
        }
      }

      // Check event capacity
      const capacity = await this.getEventCapacity(request.eventId);
      if (capacity.isSoldOut) {
        throw new ValidationError('Event is sold out');
      }

      // Validate ticket quantities
      for (const item of request.items) {
        const ticketAvailability = capacity.ticketTypeAvailability[item.ticketType];
        if (!ticketAvailability || ticketAvailability.available < item.quantity) {
          throw new ValidationError(`Insufficient tickets available for ${item.ticketType}`);
        }
      }

      // Get event details for pricing and organizer info
      let eventDetails: any = {};
      let organizerId = 'placeholder-organizer-id';
      let eventDate = new Date().toISOString();
      let currency = 'USD';

      if (this.eventService) {
        const event = await this.eventService.getEventById(request.eventId);
        if (event) {
          eventDetails = event;
          organizerId = event.organizerId;
          eventDate = event.startDate;
          currency = event.pricing?.currency || 'USD';
        }
      }

      // Calculate total amount
      let totalAmount = 0;
      const bookingItems = [];

      for (const item of request.items) {
        const ticketPrice = this.getTicketPrice(eventDetails, item.ticketType);
        const itemTotal = ticketPrice * item.quantity;
        totalAmount += itemTotal;

        bookingItems.push({
          id: uuidv4(),
          eventId: request.eventId,
          ticketType: item.ticketType,
          quantity: item.quantity,
          unitPrice: ticketPrice,
          totalPrice: itemTotal,
          currency,
          ticketDetails: item.ticketDetails
        });
      }

      // Create booking
      const booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        eventId: request.eventId,
        organizerId,
        status: BookingStatus.PENDING,
        items: bookingItems,
        totalAmount,
        currency,
        paymentInfo: {
          paymentMethodId: request.paymentMethodId,
          amount: totalAmount,
          currency,
          status: PaymentStatus.PENDING
        },
        attendeeInfo: request.attendeeInfo,
        bookingDate: new Date().toISOString(),
        eventDate,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        notes: request.notes
      };

      const createdBooking = await this.bookingRepository.createBooking(booking);

      // Process payment through Payment Service
      await this.processPayment(createdBooking);

      // Send booking confirmation notification
      await this.sendBookingConfirmationNotification(createdBooking);

      logger.info('Booking created successfully', { 
        bookingId: createdBooking.id, 
        eventId: createdBooking.eventId,
        userId,
        totalAmount 
      });

      return createdBooking;
    } catch (error: any) {
      logger.error('Error creating booking:', { error: error.message, userId, eventId: request.eventId });
      throw error;
    }
  }

  async getBookingById(bookingId: string, userId?: string): Promise<Booking> {
    const booking = await this.bookingRepository.getBookingById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }

    // TODO: Add authorization check when UserService is available
    // Check authorization
    // if (userId && booking.userId !== userId) {
    //   // Check if user is organizer or admin
    //   const user = await this.userService.getUserById(userId);
    //   if (user.role !== 'admin' && booking.organizerId !== userId) {
    //     throw new UnauthorizedError('Not authorized to view this booking');
    //   }
    // }

    return booking;
  }

  async updateBooking(bookingId: string, updates: UpdateBookingRequest, userId: string): Promise<Booking> {
    const booking = await this.getBookingById(bookingId, userId);
    
    // TODO: Add authorization check when UserService is available
    // Check authorization for updates
    // const user = await this.userService.getUserById(userId);
    // if (user.role !== 'admin' && booking.organizerId !== userId && booking.userId !== userId) {
    //   throw new UnauthorizedError('Not authorized to update this booking');
    // }

    // Validate status transitions
    if (updates.status) {
      this.validateStatusTransition(booking.status, updates.status);
    }

    const updatedBooking = await this.bookingRepository.updateBooking(bookingId, updates as any);
    return updatedBooking;
  }

  async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<Booking> {
    const booking = await this.getBookingById(bookingId, userId);
    
    // TODO: Add authorization check when UserService is available
    // Check authorization
    // const user = await this.userService.getUserById(userId);
    // if (user.role !== 'admin' && booking.organizerId !== userId && booking.userId !== userId) {
    //   throw new UnauthorizedError('Not authorized to cancel this booking');
    // }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ValidationError('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.REFUNDED) {
      throw new ValidationError('Cannot cancel a refunded booking');
    }

    const updates: UpdateBookingRequest = {
      status: BookingStatus.CANCELLED,
      notes: reason ? `Cancelled: ${reason}` : 'Booking cancelled'
    };

    const cancelledBooking = await this.bookingRepository.updateBooking(bookingId, {
      ...updates,
      cancelledAt: new Date().toISOString(),
      cancelledBy: userId,
      cancellationReason: reason
    } as any);

    // Process refund through Payment Service
    await this.processRefund(cancelledBooking);

    // Send booking cancellation notification
    await this.sendBookingCancellationNotification(cancelledBooking);

    return cancelledBooking;
  }

  async getBookingsByUser(userId: string, filters?: BookingFilters): Promise<Booking[]> {
    return await this.bookingRepository.getBookingsByUser(userId, filters);
  }

  async getBookingsByEvent(eventId: string, filters?: BookingFilters): Promise<Booking[]> {
    return await this.bookingRepository.getBookingsByEvent(eventId, filters);
  }

  async getBookingsByOrganizer(organizerId: string, filters?: BookingFilters): Promise<Booking[]> {
    return await this.bookingRepository.getBookingsByOrganizer(organizerId, filters);
  }

  async getBookingStatistics(organizerId?: string, startDate?: string, endDate?: string): Promise<any> {
    return await this.bookingRepository.getBookingStatistics(organizerId, startDate, endDate);
  }

  async getEventCapacity(eventId: string): Promise<BookingCapacity> {
    // TODO: Implement when EventService is available
    // const event = await this.eventService.getEventById(eventId);
    // if (!event) {
    //   throw new NotFoundError('Event', eventId);
    // }

    const bookings = await this.bookingRepository.getBookingsByEvent(eventId, {
      status: BookingStatus.CONFIRMED
    });

    // Placeholder implementation
    const totalCapacity = 100; // TODO: Get from event
    const bookedCapacity = bookings.reduce((sum, booking) => {
      return sum + booking.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    const availableCapacity = totalCapacity - bookedCapacity;

    // Calculate ticket type availability
    const ticketTypeAvailability: Record<TicketType, { total: number; booked: number; available: number }> = {
      [TicketType.GENERAL]: { total: 50, booked: 0, available: 50 },
      [TicketType.VIP]: { total: 20, booked: 0, available: 20 },
      [TicketType.EARLY_BIRD]: { total: 30, booked: 0, available: 30 },
      [TicketType.STUDENT]: { total: 10, booked: 0, available: 10 },
      [TicketType.SENIOR]: { total: 10, booked: 0, available: 10 },
      [TicketType.CHILD]: { total: 5, booked: 0, available: 5 }
    };

    // Calculate booked tickets by type
    bookings.forEach(booking => {
      booking.items.forEach(item => {
        if (ticketTypeAvailability[item.ticketType]) {
          ticketTypeAvailability[item.ticketType].booked += item.quantity;
        }
      });
    });

    // Update available counts
    Object.keys(ticketTypeAvailability).forEach(ticketType => {
      const type = ticketType as TicketType;
      ticketTypeAvailability[type].available = Math.max(0, ticketTypeAvailability[type].total - ticketTypeAvailability[type].booked);
    });

    return {
      eventId,
      totalCapacity,
      bookedCapacity,
      availableCapacity,
      ticketTypeAvailability,
      isSoldOut: availableCapacity <= 0,
      waitlistEnabled: false, // TODO: Implement waitlist functionality
      waitlistCount: 0
    };
  }

  async generateBookingConfirmation(bookingId: string): Promise<BookingConfirmation> {
    const booking = await this.getBookingById(bookingId);
    
    // Get event and organizer details if services are available
    let eventTitle = 'Event Title';
    let eventLocation = 'Event Location';
    let organizerContact = {
      name: 'Organizer Name',
      email: 'organizer@example.com',
      phone: '123-456-7890'
    };

    if (this.eventService) {
      try {
        const event = await this.eventService.getEventById(booking.eventId);
        if (event) {
          eventTitle = event.title;
          eventLocation = event.location?.address || 'Event Location';
          
          // Get organizer details if user service is available
          if (this.userService) {
            try {
              const organizer = await this.userService.getUserById(booking.organizerId);
              if (organizer) {
                organizerContact = {
                  name: `${organizer.firstName} ${organizer.lastName}`,
                  email: organizer.email,
                  phone: organizer.phoneNumber || '123-456-7890'
                };
              }
            } catch (error: any) {
              logger.warn('Could not fetch organizer details', { organizerId: booking.organizerId, error: error.message });
            }
          }
        }
      } catch (error: any) {
        logger.warn('Could not fetch event details', { eventId: booking.eventId, error: error.message });
      }
    }

    return {
      bookingId: booking.id,
      eventTitle,
      eventDate: booking.eventDate,
      eventLocation,
      attendeeName: `${booking.attendeeInfo.firstName} ${booking.attendeeInfo.lastName}`,
      ticketDetails: booking.items.map(item => ({
        ticketType: item.ticketType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        seatInfo: item.ticketDetails?.seatNumber ? 
          `Seat ${item.ticketDetails.seatNumber}${item.ticketDetails.section ? `, Section ${item.ticketDetails.section}` : ''}` : 
          undefined
      })),
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      bookingDate: booking.bookingDate,
      qrCode: `booking-${booking.id}`, // TODO: Generate actual QR code
      ticketUrl: `${process.env.FRONTEND_URL}/tickets/${booking.id}`,
      organizerContact
    };
  }

  private getTicketPrice(event: any, ticketType: TicketType): number {
    // Try to get pricing from event object first
    if (event && event.pricing) {
      // Handle different pricing models
      if (event.pricing.model === 'tiered' && event.pricing.tiers) {
        const tier = event.pricing.tiers.find((t: any) => 
          t.name.toLowerCase() === ticketType.toLowerCase()
        );
        if (tier) {
          return tier.price;
        }
      } else if (event.pricing.model === 'paid' && event.pricing.basePrice) {
        // For simple paid events, use base price with multipliers
        const priceMultipliers: Record<TicketType, number> = {
          [TicketType.GENERAL]: 1.0,
          [TicketType.VIP]: 3.0,
          [TicketType.EARLY_BIRD]: 0.7,
          [TicketType.STUDENT]: 0.5,
          [TicketType.SENIOR]: 0.6,
          [TicketType.CHILD]: 0.3
        };
        return event.pricing.basePrice * (priceMultipliers[ticketType] || 1.0);
      }
    }
    
    // Fallback to default pricing if event pricing is not available
    const defaultPricingMap: Record<TicketType, number> = {
      [TicketType.GENERAL]: 50,
      [TicketType.VIP]: 150,
      [TicketType.EARLY_BIRD]: 35,
      [TicketType.STUDENT]: 25,
      [TicketType.SENIOR]: 30,
      [TicketType.CHILD]: 15
    };

    return defaultPricingMap[ticketType] || 50;
  }

  private validateStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): void {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.EXPIRED],
      [BookingStatus.CONFIRMED]: [BookingStatus.CANCELLED, BookingStatus.REFUNDED],
      [BookingStatus.CANCELLED]: [BookingStatus.REFUNDED],
      [BookingStatus.REFUNDED]: [],
      [BookingStatus.EXPIRED]: [BookingStatus.CANCELLED]
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new ValidationError(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  // TODO: Implement payment processing
  private async processPayment(booking: Booking): Promise<void> {
    // Integration with Payment Service
    logger.info('Processing payment for booking:', { bookingId: booking.id });
    try {
      // Create payment intent first
      const paymentIntent = await this.paymentService.createPaymentIntent({
        bookingId: booking.id,
        userId: booking.userId,
        eventId: booking.eventId,
        amount: booking.totalAmount,
        currency: booking.currency,
        paymentMethod: PaymentMethod.CREDIT_CARD, // Default payment method
        metadata: {
          bookingId: booking.id,
          eventId: booking.eventId,
          organizerId: booking.organizerId
        }
      });

      // Update booking with payment intent ID
      await this.bookingRepository.updateBooking(booking.id, {
        paymentInfo: {
          ...booking.paymentInfo,
          paymentIntentId: paymentIntent.id,
          status: PaymentStatus.PROCESSING
        }
      });

      logger.info('Payment intent created successfully', { 
        bookingId: booking.id, 
        paymentIntentId: paymentIntent.id 
      });

      // Note: Payment confirmation will be handled by the payment webhook
      // or through a separate API call from the frontend
    } catch (error: any) {
      logger.error('Error processing payment:', { bookingId: booking.id, error: error.message });
      await this.bookingRepository.updateBooking(booking.id, {
        paymentInfo: {
          ...booking.paymentInfo,
          status: PaymentStatus.FAILED,
          failureReason: error.message
        }
      });
      throw new ValidationError(`Payment failed: ${error.message}`);
    }
  }

  // TODO: Implement refund processing
  private async processRefund(booking: Booking): Promise<void> {
    // Integration with Payment Service
    logger.info('Processing refund for booking:', { bookingId: booking.id });
    try {
      // Get the payment for this booking
      const payments = await this.paymentService.getBookingPayments(booking.id);
      if (payments.length === 0) {
        throw new ValidationError('No payment found for this booking');
      }

      const payment = payments[0]; // Get the first payment
      
      // Process refund
      const refund = await this.paymentService.processRefund({
        paymentId: payment.id,
        amount: payment.amount,
        reason: RefundReason.REQUESTED_BY_CUSTOMER,
        metadata: {
          bookingId: booking.id,
          cancelledBy: booking.cancelledBy || 'system'
        }
      });

      // Update booking with refund information
      await this.bookingRepository.updateBooking(booking.id, {
        paymentInfo: {
          ...booking.paymentInfo,
          status: PaymentStatus.REFUNDED,
          refundAmount: refund.amount
        },
        refundAmount: refund.amount,
        refundedAt: new Date().toISOString(),
        refundedBy: booking.cancelledBy
      });

      logger.info('Refund completed successfully', { 
        bookingId: booking.id, 
        refundId: refund.id 
      });
    } catch (error: any) {
      logger.error('Error processing refund:', { bookingId: booking.id, error: error.message });
      // Update booking status even if refund fails
      await this.bookingRepository.updateBooking(booking.id, {
        paymentInfo: {
          ...booking.paymentInfo,
          status: PaymentStatus.REFUNDED
        },
        refundedAt: new Date().toISOString(),
        refundedBy: booking.cancelledBy
      });
      throw new ValidationError(`Refund failed: ${error.message}`);
    }
  }

  // Notification methods
  private async sendBookingConfirmationNotification(booking: Booking): Promise<void> {
    try {
      // Generate booking confirmation data
      const bookingConfirmation = await this.generateBookingConfirmation(booking.id);
      
      await this.notificationService.sendBookingConfirmation(booking.userId, {
        bookingId: booking.id,
        eventTitle: bookingConfirmation.eventTitle,
        eventDate: bookingConfirmation.eventDate,
        eventLocation: bookingConfirmation.eventLocation || 'TBD',
        attendeeName: bookingConfirmation.attendeeName,
        ticketDetails: bookingConfirmation.ticketDetails,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        bookingDate: booking.bookingDate,
        qrCode: bookingConfirmation.qrCode || `booking-${booking.id}`,
        ticketUrl: bookingConfirmation.ticketUrl || `${process.env.FRONTEND_URL}/tickets/${booking.id}`,
        organizerContact: {
          name: bookingConfirmation.organizerContact?.name || 'Event Organizer',
          email: bookingConfirmation.organizerContact?.email || 'organizer@example.com',
          phone: bookingConfirmation.organizerContact?.phone || 'N/A'
        }
      });

      logger.info('Booking confirmation notification sent', { bookingId: booking.id });
    } catch (error: any) {
      logger.error('Failed to send booking confirmation notification', { 
        bookingId: booking.id, 
        error: error.message 
      });
      // Don't throw error to avoid breaking the booking flow
    }
  }

  private async sendBookingCancellationNotification(booking: Booking): Promise<void> {
    try {
      // Generate booking confirmation data for cancellation
      const bookingConfirmation = await this.generateBookingConfirmation(booking.id);
      
      await this.notificationService.sendBookingCancellation(booking.userId, {
        bookingId: booking.id,
        eventTitle: bookingConfirmation.eventTitle,
        eventDate: bookingConfirmation.eventDate,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        refundAmount: booking.refundAmount,
        cancellationReason: booking.cancellationReason
      });

      logger.info('Booking cancellation notification sent', { bookingId: booking.id });
    } catch (error: any) {
      logger.error('Failed to send booking cancellation notification', { 
        bookingId: booking.id, 
        error: error.message 
      });
      // Don't throw error to avoid breaking the cancellation flow
    }
  }
}
