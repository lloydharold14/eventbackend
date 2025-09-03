import { OrganizerService } from './OrganizerService';
import { UserService } from '../../../users/services/UserService';
import { EventService } from '../../../events/services/EventService';
import { BookingService } from '../../../bookings/services/BookingService';
import { PaymentService } from '../../../payments/services/PaymentService';
import { OrganizerRepository } from '../../repositories/OrganizerRepository';

export class OrganizerServiceFactory {
  private static instance: OrganizerServiceFactory;
  private organizerService: OrganizerService | null = null;

  private constructor() {}

  public static getInstance(): OrganizerServiceFactory {
    if (!OrganizerServiceFactory.instance) {
      OrganizerServiceFactory.instance = new OrganizerServiceFactory();
    }
    return OrganizerServiceFactory.instance;
  }

  public createOrganizerService(
    userService: UserService,
    eventService: EventService,
    bookingService: BookingService,
    paymentService: PaymentService,
    organizerRepository?: OrganizerRepository
  ): OrganizerService {
    if (!this.organizerService) {
      this.organizerService = new OrganizerService(
        userService,
        eventService,
        bookingService,
        paymentService
      );
    }
    return this.organizerService;
  }

  public getOrganizerService(): OrganizerService | null {
    return this.organizerService;
  }

  public reset(): void {
    this.organizerService = null;
  }
}
