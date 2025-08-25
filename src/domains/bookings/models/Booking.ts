import { UserRole } from '../../../shared/types/common';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  EXPIRED = 'expired'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

export enum TicketType {
  GENERAL = 'general',
  VIP = 'vip',
  EARLY_BIRD = 'early_bird',
  STUDENT = 'student',
  SENIOR = 'senior',
  CHILD = 'child'
}

export interface BookingItem {
  id: string;
  eventId: string;
  ticketType: TicketType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  ticketDetails?: {
    seatNumber?: string;
    section?: string;
    row?: string;
    specialRequirements?: string[];
  };
}

export interface PaymentInfo {
  paymentMethodId: string;
  paymentIntentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  processedAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  failureReason?: string;
}

export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  organizerId: string;
  status: BookingStatus;
  items: BookingItem[];
  totalAmount: number;
  currency: string;
  paymentInfo: PaymentInfo;
  attendeeInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    specialRequirements?: string[];
  };
  bookingDate: string;
  eventDate: string;
  expiresAt: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  refundAmount?: number;
  refundedAt?: string;
  refundedBy?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingRequest {
  eventId: string;
  items: {
    ticketType: TicketType;
    quantity: number;
    ticketDetails?: {
      seatNumber?: string;
      section?: string;
      row?: string;
      specialRequirements?: string[];
    };
  }[];
  attendeeInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    specialRequirements?: string[];
  };
  paymentMethodId: string;
  notes?: string;
}

export interface UpdateBookingRequest {
  status?: BookingStatus;
  attendeeInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    specialRequirements?: string[];
  };
  notes?: string;
  metadata?: Record<string, any>;
}

export interface BookingFilters {
  userId?: string;
  eventId?: string;
  organizerId?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface BookingStatistics {
  totalBookings: number;
  totalRevenue: number;
  currency: string;
  bookingsByStatus: Record<BookingStatus, number>;
  bookingsByMonth: Array<{
    month: string;
    count: number;
    revenue: number;
  }>;
  averageBookingValue: number;
  topEvents: Array<{
    eventId: string;
    eventTitle: string;
    bookingCount: number;
    revenue: number;
  }>;
}

export interface BookingCapacity {
  eventId: string;
  totalCapacity: number;
  bookedCapacity: number;
  availableCapacity: number;
  ticketTypeAvailability: Record<TicketType, {
    total: number;
    booked: number;
    available: number;
  }>;
  isSoldOut: boolean;
  waitlistEnabled: boolean;
  waitlistCount: number;
}

export interface BookingConfirmation {
  bookingId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  attendeeName: string;
  ticketDetails: Array<{
    ticketType: TicketType;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    seatInfo?: string;
  }>;
  totalAmount: number;
  currency: string;
  bookingDate: string;
  qrCode?: string;
  ticketUrl?: string;
  organizerContact?: {
    name: string;
    email: string;
    phone?: string;
  };
}
