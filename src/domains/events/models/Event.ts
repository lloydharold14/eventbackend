import { UserRole } from '../../../shared/types/common';

// Event Status Enum
export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  SOLD_OUT = 'sold_out',
  POSTPONED = 'postponed'
}

// Event Type Enum
export enum EventType {
  CONFERENCE = 'conference',
  WORKSHOP = 'workshop',
  SEMINAR = 'seminar',
  WEBINAR = 'webinar',
  CONCERT = 'concert',
  SPORTS = 'sports',
  EXHIBITION = 'exhibition',
  NETWORKING = 'networking',
  HACKATHON = 'hackathon',
  MEETUP = 'meetup',
  TRADE_SHOW = 'trade_show',
  FESTIVAL = 'festival',
  OTHER = 'other'
}

// Event Visibility Enum
export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  INVITE_ONLY = 'invite_only'
}

// Event Pricing Model Enum
export enum PricingModel {
  FREE = 'free',
  PAID = 'paid',
  DONATION = 'donation',
  TIERED = 'tiered'
}

// Event Media Type Enum
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio'
}

// Event Category Interface
export interface EventCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parentCategoryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Event Media Interface
export interface EventMedia {
  id: string;
  eventId: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
  altText?: string;
  caption?: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Event Location Interface
export interface EventLocation {
  type: 'physical' | 'virtual' | 'hybrid';
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  venue?: {
    name: string;
    description?: string;
    capacity?: number;
    amenities?: string[];
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  virtualMeetingUrl?: string;
  virtualMeetingPlatform?: string;
  virtualMeetingInstructions?: string;
}

// Event Pricing Interface
export interface EventPricing {
  model: PricingModel;
  currency: string;
  basePrice?: number;
  tiers?: Array<{
    name: string;
    price: number;
    description?: string;
    availableQuantity?: number;
    earlyBirdPrice?: number;
    earlyBirdEndDate?: string;
  }>;
  earlyBirdDiscount?: {
    percentage: number;
    endDate: string;
  };
  groupDiscount?: {
    minAttendees: number;
    percentage: number;
  };
  taxRate?: number;
  processingFee?: number;
}

// Event Settings Interface
export interface EventSettings {
  allowWaitlist: boolean;
  allowCancellations: boolean;
  cancellationPolicy?: string;
  refundPolicy?: string;
  requireApproval: boolean;
  maxAttendeesPerBooking: number;
  allowGroupBookings: boolean;
  maxGroupSize?: number;
  requirePaymentConfirmation: boolean;
  sendReminders: boolean;
  reminderSchedule?: {
    daysBefore: number[];
    hoursBefore: number[];
  };
  allowSocialSharing: boolean;
  allowComments: boolean;
  requireModeration: boolean;
  customFields?: Array<{
    name: string;
    type: 'text' | 'number' | 'email' | 'phone' | 'select' | 'checkbox';
    required: boolean;
    options?: string[];
    placeholder?: string;
  }>;
}

// Event Statistics Interface
export interface EventStats {
  totalViews: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating?: number;
  totalReviews: number;
  conversionRate: number;
  topReferrers: Array<{
    source: string;
    count: number;
  }>;
  attendanceRate: number;
  lastUpdated: string;
}

// Main Event Interface
export interface Event {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  categoryId: string;
  categoryName: string;
  type: EventType;
  status: EventStatus;
  visibility: EventVisibility;
  
  // Date and Time
  startDate: string;
  endDate: string;
  timezone: string;
  isAllDay: boolean;
  
  // Location
  location: EventLocation;
  
  // Capacity and Pricing
  maxAttendees: number;
  currentAttendees: number;
  pricing: EventPricing;
  
  // Content
  tags: string[];
  keywords: string[];
  primaryImageUrl?: string;
  gallery: EventMedia[];
  
  // Settings
  settings: EventSettings;
  
  // Statistics
  stats: EventStats;
  
  // Metadata
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  cancelledAt?: string;
}

// Request/Response Interfaces

export interface CreateEventRequest {
  title: string;
  description: string;
  shortDescription?: string;
  categoryId: string;
  type: EventType;
  visibility: EventVisibility;
  startDate: string;
  endDate: string;
  timezone: string;
  isAllDay: boolean;
  location: EventLocation;
  maxAttendees: number;
  pricing: EventPricing;
  tags?: string[];
  keywords?: string[];
  settings?: Partial<EventSettings>;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  type?: EventType;
  visibility?: EventVisibility;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  isAllDay?: boolean;
  location?: EventLocation;
  maxAttendees?: number;
  pricing?: EventPricing;
  tags?: string[];
  keywords?: string[];
  settings?: Partial<EventSettings>;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface EventSearchFilters {
  organizerId?: string;
  categoryId?: string;
  type?: EventType;
  status?: EventStatus;
  visibility?: EventVisibility;
  startDate?: string;
  endDate?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  priceRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  tags?: string[];
  keywords?: string[];
  hasAvailableSpots?: boolean;
  isFree?: boolean;
  isVirtual?: boolean;
  isHybrid?: boolean;
}

export interface EventListResponse {
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: EventSearchFilters;
}

export interface EventCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parentCategoryId?: string;
}

export interface EventMediaRequest {
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  isPrimary?: boolean;
  altText?: string;
  caption?: string;
}

export interface EventPublishRequest {
  publishNow?: boolean;
  scheduledPublishDate?: string;
}

export interface EventCancelRequest {
  reason: string;
  refundPolicy?: string;
  notifyAttendees?: boolean;
}

export interface EventDuplicateRequest {
  title?: string;
  startDate: string;
  endDate: string;
  keepSettings?: boolean;
  keepMedia?: boolean;
}

// Event Analytics Interfaces
export interface EventAnalytics {
  eventId: string;
  period: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  metrics: {
    views: number;
    bookings: number;
    revenue: number;
    conversionRate: number;
    averageRating?: number;
    reviews: number;
  };
  breakdown: {
    byDate: Array<{
      date: string;
      views: number;
      bookings: number;
      revenue: number;
    }>;
    bySource: Array<{
      source: string;
      views: number;
      bookings: number;
      revenue: number;
    }>;
    byLocation: Array<{
      location: string;
      bookings: number;
      revenue: number;
    }>;
  };
}

// Event Export Interfaces
export interface EventExportRequest {
  format: 'csv' | 'xlsx' | 'pdf';
  includeFields: string[];
  filters?: EventSearchFilters;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface EventExportResponse {
  downloadUrl: string;
  expiresAt: string;
  recordCount: number;
}
