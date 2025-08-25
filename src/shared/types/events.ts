// Event-Driven Architecture Foundation
// Based on architecture rules for microservices communication

export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: Date;
  correlationId: string;
  causationId: string;
  data: any;
  metadata?: {
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    region?: string;
    locale?: string;
  };
}

// Event Types Enum
export enum EventType {
  // User Management Events
  USER_REGISTERED = 'USER_REGISTERED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_EMAIL_VERIFIED = 'USER_EMAIL_VERIFIED',
  USER_PHONE_VERIFIED = 'USER_PHONE_VERIFIED',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_OAUTH_LINKED = 'USER_OAUTH_LINKED',
  USER_OAUTH_UNLINKED = 'USER_OAUTH_UNLINKED',

  // Event Management Events
  EVENT_CREATED = 'EVENT_CREATED',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_DELETED = 'EVENT_DELETED',
  EVENT_PUBLISHED = 'EVENT_PUBLISHED',
  EVENT_UNPUBLISHED = 'EVENT_UNPUBLISHED',
  EVENT_CATEGORY_CREATED = 'EVENT_CATEGORY_CREATED',
  EVENT_CATEGORY_UPDATED = 'EVENT_CATEGORY_UPDATED',
  EVENT_MEDIA_UPLOADED = 'EVENT_MEDIA_UPLOADED',
  EVENT_MEDIA_DELETED = 'EVENT_MEDIA_DELETED',

  // Booking Events
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_UPDATED = 'BOOKING_UPDATED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_REFUNDED = 'BOOKING_REFUNDED',
  BOOKING_WAITLISTED = 'BOOKING_WAITLISTED',
  BOOKING_WAITLIST_CONFIRMED = 'BOOKING_WAITLIST_CONFIRMED',

  // Payment Events
  PAYMENT_INTENT_CREATED = 'PAYMENT_INTENT_CREATED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_DISPUTED = 'PAYMENT_DISPUTED',
  PAYMENT_WEBHOOK_RECEIVED = 'PAYMENT_WEBHOOK_RECEIVED',

  // Notification Events
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  NOTIFICATION_DELIVERED = 'NOTIFICATION_DELIVERED',
  NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',
  EMAIL_SENT = 'EMAIL_SENT',
  SMS_SENT = 'SMS_SENT',
  PUSH_NOTIFICATION_SENT = 'PUSH_NOTIFICATION_SENT',

  // Search Events
  SEARCH_INDEX_UPDATED = 'SEARCH_INDEX_UPDATED',
  SEARCH_QUERY_EXECUTED = 'SEARCH_QUERY_EXECUTED',
  SEARCH_ANALYTICS_RECORDED = 'SEARCH_ANALYTICS_RECORDED',

  // Analytics Events
  ANALYTICS_EVENT_RECORDED = 'ANALYTICS_EVENT_RECORDED',
  USER_BEHAVIOR_TRACKED = 'USER_BEHAVIOR_TRACKED',
  BUSINESS_METRIC_UPDATED = 'BUSINESS_METRIC_UPDATED',

  // Compliance Events
  GDPR_REQUEST_RECEIVED = 'GDPR_REQUEST_RECEIVED',
  GDPR_REQUEST_PROCESSED = 'GDPR_REQUEST_PROCESSED',
  DATA_DELETION_REQUESTED = 'DATA_DELETION_REQUESTED',
  DATA_DELETION_COMPLETED = 'DATA_DELETION_COMPLETED',
  CONSENT_UPDATED = 'CONSENT_UPDATED',
  AUDIT_LOG_CREATED = 'AUDIT_LOG_CREATED'
}

// Specific Event Interfaces
export interface UserRegisteredEvent extends DomainEvent {
  eventType: EventType.USER_REGISTERED;
  data: {
    userId: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    createdAt: string;
    preferences: {
      language: string;
      timezone: string;
      currency: string;
      marketingConsent: boolean;
    };
  };
}

export interface EventCreatedEvent extends DomainEvent {
  eventType: EventType.EVENT_CREATED;
  data: {
    eventId: string;
    organizerId: string;
    title: string;
    description: string;
    slug: string;
    startDate: string;
    endDate: string;
    location: {
      address: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    category: string;
    maxAttendees: number;
    ticketTypes: Array<{
      id: string;
      name: string;
      price: number;
      currency: string;
      quantity: number;
    }>;
    status: string;
    visibility: string;
    createdAt: string;
  };
}

export interface BookingCreatedEvent extends DomainEvent {
  eventType: EventType.BOOKING_CREATED;
  data: {
    bookingId: string;
    eventId: string;
    attendeeId: string;
    organizerId: string;
    ticketQuantity: number;
    totalAmount: number;
    currency: string;
    status: string;
    bookingDate: string;
    tickets: Array<{
      ticketId: string;
      ticketTypeId: string;
      price: number;
      currency: string;
    }>;
  };
}

export interface PaymentConfirmedEvent extends DomainEvent {
  eventType: EventType.PAYMENT_CONFIRMED;
  data: {
    paymentId: string;
    bookingId: string;
    eventId: string;
    attendeeId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentGateway: string;
    transactionId: string;
    status: string;
    confirmedAt: string;
    fees: {
      amount: number;
      currency: string;
    };
    taxes: {
      amount: number;
      currency: string;
      rate: number;
    };
  };
}

// Event Store Interface
export interface EventStore {
  appendEvents(aggregateId: string, events: DomainEvent[]): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
  getEventsByType(eventType: string, fromDate?: Date, toDate?: Date): Promise<DomainEvent[]>;
  getEventsByCorrelationId(correlationId: string): Promise<DomainEvent[]>;
}

// Event Publisher Interface
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
}

// Event Handler Interface
export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
  canHandle(eventType: string): boolean;
}

// Event Bus Interface
export interface EventBus {
  subscribe(eventType: string, handler: EventHandler): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
}

// CQRS Command Interface
export interface Command {
  commandId: string;
  aggregateId: string;
  timestamp: Date;
  correlationId: string;
  causationId: string;
  data: any;
  metadata?: any;
}

// CQRS Query Interface
export interface Query {
  queryId: string;
  timestamp: Date;
  correlationId: string;
  data: any;
  metadata?: any;
}

// CQRS Command Handler Interface
export interface CommandHandler<T extends Command = Command> {
  handle(command: T): Promise<any>;
  canHandle(commandType: string): boolean;
}

// CQRS Query Handler Interface
export interface QueryHandler<T extends Query = Query> {
  handle(query: T): Promise<any>;
  canHandle(queryType: string): boolean;
}

// Event Sourcing Aggregate Base
export abstract class EventSourcedAggregate {
  protected events: DomainEvent[] = [];
  protected version: number = 0;

  constructor(protected readonly aggregateId: string) {}

  protected apply(event: DomainEvent): void {
    this.events.push(event);
    this.version++;
  }

  public getUncommittedEvents(): DomainEvent[] {
    return [...this.events];
  }

  public markEventsAsCommitted(): void {
    this.events = [];
  }

  public loadFromHistory(events: DomainEvent[]): void {
    events.forEach(event => {
      this.applyEvent(event);
      this.version = event.version;
    });
  }

  protected abstract applyEvent(event: DomainEvent): void;
}

// Event Metadata
export interface EventMetadata {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  region?: string;
  locale?: string;
  source?: string;
  version?: string;
}

// Event Envelope for Transport
export interface EventEnvelope {
  event: DomainEvent;
  metadata: EventMetadata;
  routingKey: string;
  timestamp: Date;
  ttl?: number;
}

// Event Replay Interface
export interface EventReplay {
  replayEvents(fromDate: Date, toDate: Date, eventTypes?: string[]): Promise<void>;
  replayEventsForAggregate(aggregateId: string, fromVersion?: number): Promise<void>;
  getReplayStatus(): Promise<{
    isReplaying: boolean;
    progress: number;
    totalEvents: number;
    processedEvents: number;
  }>;
}
