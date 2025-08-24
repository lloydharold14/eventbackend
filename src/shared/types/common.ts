// Common types and interfaces shared across all microservices

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  profileImageUrl?: string;
}

export enum UserRole {
  ADMIN = 'admin',
  ORGANIZER = 'organizer',
  ATTENDEE = 'attendee'
}

export enum UserStatus {
  ACTIVE = 'active',
  PENDING_VERIFICATION = 'pending_verification',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

export interface Event extends BaseEntity {
  organizerId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: EventLocation;
  category: string;
  maxAttendees: number;
  currentAttendees: number;
  status: EventStatus;
  bannerImageUrl?: string;
  price: number;
  currency: string;
  isPublished: boolean;
  settings: EventSettings;
}

export interface EventLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export interface EventSettings {
  allowWaitlist: boolean;
  requireApproval: boolean;
  maxTicketsPerOrder: number;
  refundPolicy: RefundPolicy;
  checkInRequired: boolean;
}

export enum RefundPolicy {
  NO_REFUNDS = 'no_refunds',
  FULL_REFUND_7_DAYS = 'full_refund_7_days',
  PARTIAL_REFUND_24_HOURS = 'partial_refund_24_hours'
}

export interface Booking extends BaseEntity {
  eventId: string;
  attendeeId: string;
  ticketQuantity: number;
  totalAmount: number;
  currency: string;
  status: BookingStatus;
  paymentId?: string;
  checkInStatus: CheckInStatus;
  ticketCodes: string[];
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum CheckInStatus {
  NOT_CHECKED_IN = 'not_checked_in',
  CHECKED_IN = 'checked_in',
  NO_SHOW = 'no_show'
}

export interface Payment extends BaseEntity {
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  stripePaymentIntentId?: string;
  refundAmount?: number;
  refundReason?: string;
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet'
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    correlationId: string;
    version: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Domain Event types
export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: string;
  correlationId: string;
  causationId: string;
  data: any;
  metadata?: any;
}

// Configuration types
export interface EnvironmentConfig {
  environment: string;
  region: string;
  database: {
    tablePrefix: string;
    readCapacity: number;
    writeCapacity: number;
  };
  security: {
    jwtSecret: string;
    encryptionKey: string;
    corsOrigins: string[];
  };
  integrations: {
    stripeSecretKey: string;
    stripeWebhookSecret: string;
    sesRegion: string;
    snsRegion: string;
  };
  monitoring: {
    logLevel: string;
    enableTracing: boolean;
    enableMetrics: boolean;
  };
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
