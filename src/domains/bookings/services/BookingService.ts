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
import { ValidationError, NotFoundError, UnauthorizedError } from '../../../shared/errors/DomainError';
import { v4 as uuidv4 } from 'uuid';

export class BookingService {
  private bookingRepository: BookingRepository;
  private eventService!: EventService;
  private userService!: UserService;

  constructor() {
    this.bookingRepository = new BookingRepository();
    // TODO: Fix these service instantiations when circular dependencies are resolved
    // this.eventService = new EventService();
    // this.userService = new UserService();
  }

  async createBooking(userId: string, request: CreateBookingRequest): Promise<Booking> {
    try {
      // TODO: Implement when EventService is available
      // Validate event exists and is published
      // const event = await this.eventService.getEventById(request.eventId);
      // if (!event) {
      //   throw new NotFoundError('Event', request.eventId);
      // }

      // if (event.status !== 'published') {
      //   throw new ValidationError('Event is not available for booking');
      // }

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

      // Calculate total amount
      let totalAmount = 0;
      const bookingItems = [];

      for (const item of request.items) {
        const ticketPrice = this.getTicketPrice({}, item.ticketType); // Placeholder event object
        const itemTotal = ticketPrice * item.quantity;
        totalAmount += itemTotal;

        bookingItems.push({
          id: uuidv4(),
          eventId: request.eventId,
          ticketType: item.ticketType,
          quantity: item.quantity,
          unitPrice: ticketPrice,
          totalPrice: itemTotal,
          currency: 'USD', // Placeholder
          ticketDetails: item.ticketDetails
        });
      }

      // Create booking
      const booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        eventId: request.eventId,
        organizerId: 'placeholder-organizer-id', // TODO: Get from event
        status: BookingStatus.PENDING,
        items: bookingItems,
        totalAmount,
        currency: 'USD', // Placeholder
        paymentInfo: {
          paymentMethodId: request.paymentMethodId,
          amount: totalAmount,
          currency: 'USD', // Placeholder
          status: PaymentStatus.PENDING
        },
        attendeeInfo: request.attendeeInfo,
        bookingDate: new Date().toISOString(),
        eventDate: new Date().toISOString(), // TODO: Get from event
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        notes: request.notes
      };

      const createdBooking = await this.bookingRepository.createBooking(booking);

      // TODO: Process payment through Payment Service
      // await this.processPayment(createdBooking);

      return createdBooking;
    } catch (error: any) {
      console.error('Error creating booking:', error);
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

    // TODO: Process refund through Payment Service
    // await this.processRefund(cancelledBooking);

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
    // TODO: Implement when EventService and UserService are available
    // const event = await this.eventService.getEventById(booking.eventId);
    // if (!event) {
    //   throw new NotFoundError('Event', booking.eventId);
    // }
    // const organizer = await this.userService.getUserById(booking.organizerId);

    return {
      bookingId: booking.id,
      eventTitle: 'Event Title', // TODO: Get from event
      eventDate: booking.eventDate,
      eventLocation: 'Event Location', // TODO: Get from event
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
      organizerContact: {
        name: 'Organizer Name', // TODO: Get from organizer
        email: 'organizer@example.com', // TODO: Get from organizer
        phone: '123-456-7890' // TODO: Get from organizer
      }
    };
  }

  private getTicketPrice(event: any, ticketType: TicketType): number {
    // TODO: Implement when EventService is available
    // const pricing = event.pricing?.find(p => 
    //   p.tier.toLowerCase() === ticketType.toLowerCase()
    // );
    
    // if (!pricing) {
    //   throw new ValidationError(`No pricing found for ticket type: ${ticketType}`);
    // }

    // return pricing.price;
    
    // Placeholder pricing
    const pricingMap: Record<TicketType, number> = {
      [TicketType.GENERAL]: 50,
      [TicketType.VIP]: 150,
      [TicketType.EARLY_BIRD]: 35,
      [TicketType.STUDENT]: 25,
      [TicketType.SENIOR]: 30,
      [TicketType.CHILD]: 15
    };

    return pricingMap[ticketType] || 50;
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
    console.log('Processing payment for booking:', booking.id);
  }

  // TODO: Implement refund processing
  private async processRefund(booking: Booking): Promise<void> {
    // Integration with Payment Service
    console.log('Processing refund for booking:', booking.id);
  }
}
