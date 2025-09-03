import { BaseEntity } from '../../../shared/types/common';

// Support Message Categories
export enum SupportCategory {
  REFUND = 'refund',
  SCHEDULE = 'schedule',
  LOGISTICS = 'logistics',
  TECHNICAL = 'technical',
  BILLING = 'billing',
  REGIONAL = 'regional',              // Country-specific issues
  COMPLIANCE = 'compliance',          // Regulatory issues
  ACCESSIBILITY = 'accessibility',    // Accessibility concerns
  SECURITY = 'security',              // Security issues
  INTEGRATION = 'integration'         // Third-party integrations
}

// Support Priority Levels
export enum SupportPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

// Support Message Status
export enum SupportStatus {
  UNREAD = 'unread',
  READ = 'read',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_CUSTOMER = 'waiting_for_customer',
  WAITING_FOR_THIRD_PARTY = 'waiting_for_third_party',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ESCALATED = 'escalated'
}

// Multi-Country Support Message
export interface SupportMessage extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Multi-Country Information
  locale: string;
  language: string;
  country: string;
  region: string;
  timezone: string;
  
  // Message Details
  attendeeId?: string;
  attendeeEmail: string;
  attendeeName: string;
  eventId?: string;
  eventTitle?: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  
  // Message Content
  subject: string;
  message: string;
  attachments: string[];              // File URLs
  
  // Regional Classification
  regionalIssues: string[];           // Country-specific problems
  complianceFlags: {
    [regulation: string]: boolean;     // GDPR, PIPEDA, etc.
  };
  
  // Multi-Language Responses
  responses: {
    [locale: string]: {
      message: string;
      responderId: string;
      responderName: string;
      responderRole: string;
      timestamp: string;
      language: string;
      isInternal: boolean;            // Internal note vs customer response
    };
  };
  
  // Regional Compliance
  complianceNotes: {
    [regulation: string]: {
      compliant: boolean;
      notes: string;
      timestamp: string;
      reviewedBy: string;
    };
  };
  
  // Assignment & Escalation
  assignedTo?: string;                // Team member ID
  assignedAt?: string;
  escalatedTo?: string;               // Escalated team member ID
  escalatedAt?: string;
  escalationReason?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  
  // Performance Metrics
  firstResponseTime?: number;         // Minutes to first response
  resolutionTime?: number;            // Minutes to resolution
  customerSatisfaction?: number;      // 1-5 rating
  customerFeedback?: string;
  
  // Metadata
  tags: string[];
  customFields: Record<string, any>;
  source: 'web' | 'email' | 'phone' | 'chat' | 'mobile';
  urgency: 'normal' | 'high' | 'urgent';
}

// Multi-Country Auto-Reply Templates
export interface AutoReplyTemplate extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Template Information
  name: string;
  description?: string;
  category: SupportCategory;
  isActive: boolean;
  
  // Multi-Language Content
  content: {
    [locale: string]: {
      subject: string;
      message: string;
      footer?: string;
      signature?: string;
    };
  };
  
  // Trigger Conditions
  triggers: {
    keywords: string[];               // Keywords that trigger this auto-reply
    categories: SupportCategory[];    // Categories that trigger this auto-reply
    countries: string[];              // Countries where this applies
    regions: string[];                // Regions where this applies
    languages: string[];              // Languages where this applies
    priority: SupportPriority[];      // Priority levels that trigger this
  };
  
  // Regional Settings
  regionalSettings: {
    [country: string]: {
      enabled: boolean;
      customMessage?: string;         // Country-specific customization
      businessHours?: {
        startTime: string;
        endTime: string;
        timezone: string;
        days: number[];               // 0=Sunday, 1=Monday, etc.
      };
      holidays?: string[];            // Country-specific holidays
    };
  };
  
  // Response Settings
  responseSettings: {
    delayMinutes?: number;            // Delay before sending
    maxResponses: number;             // Maximum auto-replies per ticket
    escalationThreshold: number;      // Escalate after X auto-replies
    escalationMessage?: string;       // Message when escalating
  };
  
  // Performance Tracking
  usageCount: number;
  lastUsed?: string;
  effectiveness: number;              // 0-100 score based on resolution rate
  
  // Team & Collaboration
  createdBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
}

// Multi-Country FAQ Management
export interface FAQCategory extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Category Information
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  isActive: boolean;
  
  // Multi-Language Support
  translations: {
    [locale: string]: {
      name: string;
      description?: string;
    };
  };
  
  // Regional Availability
  availableCountries: string[];
  availableRegions: string[];
  availableLanguages: string[];
  
  // Access Control
  visibility: 'public' | 'private' | 'restricted';
  restrictedRoles?: string[];
  restrictedCountries?: string[];
}

// Multi-Country FAQ Entry
export interface FAQEntry extends BaseEntity {
  id: string;
  organizerId: string;
  categoryId: string;
  
  // FAQ Information
  question: string;
  answer: string;
  keywords: string[];
  order: number;
  isActive: boolean;
  isFeatured: boolean;
  
  // Multi-Language Support
  translations: {
    [locale: string]: {
      question: string;
      answer: string;
      keywords: string[];
    };
  };
  
  // Regional Availability
  availableCountries: string[];
  availableRegions: string[];
  availableLanguages: string[];
  availableCurrencies: string[];
  
  // Regional Customization
  regionalCustomizations: {
    [country: string]: {
      question?: string;
      answer?: string;
      additionalInfo?: string;
      localExamples?: string[];
      localContacts?: string[];
    };
  };
  
  // Performance Metrics
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  lastViewed?: string;
  
  // Access Control
  visibility: 'public' | 'private' | 'restricted';
  restrictedRoles?: string[];
  restrictedCountries?: string[];
  
  // Team & Collaboration
  createdBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
}

// Multi-Country Support Ticket
export interface SupportTicket extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Ticket Information
  ticketNumber: string;
  title: string;
  description: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  
  // Multi-Country Information
  locale: string;
  language: string;
  country: string;
  region: string;
  timezone: string;
  
  // Customer Information
  customerId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  
  // Event Information
  eventId?: string;
  eventTitle?: string;
  ticketId?: string;
  bookingId?: string;
  
  // Ticket Details
  attachments: string[];
  tags: string[];
  customFields: Record<string, any>;
  
  // Multi-Language Communication
  communications: {
    [locale: string]: {
      messages: Array<{
        id: string;
        senderId: string;
        senderName: string;
        senderType: 'customer' | 'staff' | 'system';
        message: string;
        timestamp: string;
        isInternal: boolean;
        attachments?: string[];
      }>;
    };
  };
  
  // Assignment & Escalation
  assignedTo?: string;
  assignedAt?: string;
  escalatedTo?: string;
  escalatedAt?: string;
  escalationReason?: string;
  
  // SLA & Performance
  slaTarget?: number;                 // Minutes to resolution
  firstResponseSla?: number;          // Minutes to first response
  firstResponseTime?: number;
  resolutionTime?: number;
  
  // Customer Satisfaction
  satisfactionRating?: number;        // 1-5 rating
  satisfactionFeedback?: string;
  followUpRequired: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  lastCustomerResponse?: string;
  lastStaffResponse?: string;
  
  // Regional Compliance
  complianceFlags: {
    [regulation: string]: boolean;
  };
  complianceNotes: {
    [regulation: string]: {
      compliant: boolean;
      notes: string;
      timestamp: string;
      reviewedBy: string;
    };
  };
}

// Create Support Message Request
export interface CreateSupportMessageRequest {
  organizerId: string;
  attendeeEmail: string;
  attendeeName: string;
  category: SupportCategory;
  priority: SupportPriority;
  subject: string;
  message: string;
  locale: string;
  language: string;
  country: string;
  region: string;
  timezone: string;
  eventId?: string;
  attendeeId?: string;
  attachments?: string[];
  tags?: string[];
  customFields?: Record<string, any>;
}

// Update Support Message Request
export interface UpdateSupportMessageRequest {
  status?: SupportStatus;
  priority?: SupportPriority;
  category?: SupportCategory;
  assignedTo?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

// Support Message Search Filters
export interface SupportMessageSearchFilters {
  organizerId: string;
  status?: SupportStatus;
  priority?: SupportPriority;
  category?: SupportCategory;
  country?: string;
  region?: string;
  language?: string;
  assignedTo?: string;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

// Support Message List Response
export interface SupportMessageListResponse {
  messages: SupportMessage[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Support Dashboard Data
export interface SupportDashboard {
  organizerId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  
  // Message Overview
  totalMessages: number;
  unreadMessages: number;
  inProgressMessages: number;
  resolvedMessages: number;
  escalatedMessages: number;
  
  // Performance Metrics
  averageResponseTime: number;        // Minutes
  averageResolutionTime: number;      // Minutes
  customerSatisfaction: number;       // 1-5 average
  resolutionRate: number;             // Percentage
  
  // Regional Breakdown
  regionalMetrics: Array<{
    country: string;
    region: string;
    messageCount: number;
    averageResponseTime: number;
    satisfaction: number;
  }>;
  
  // Category Breakdown
  categoryMetrics: Array<{
    category: SupportCategory;
    messageCount: number;
    averageResolutionTime: number;
    escalationRate: number;
  }>;
  
  // Team Performance
  teamPerformance: Array<{
    memberId: string;
    memberName: string;
    assignedMessages: number;
    resolvedMessages: number;
    averageResponseTime: number;
    customerSatisfaction: number;
  }>;
  
  // Auto-Reply Effectiveness
  autoReplyMetrics: {
    totalSent: number;
    successfulResolutions: number;
    escalationRate: number;
    customerSatisfaction: number;
  };
}

// Auto-Reply Request Types
export interface CreateAutoReplyRequest {
  name: string;
  description?: string;
  category: SupportCategory;
  content: {
    [locale: string]: {
      subject: string;
      message: string;
      footer?: string;
      signature?: string;
    };
  };
  triggers: {
    keywords: string[];
    categories: SupportCategory[];
    countries: string[];
    regions: string[];
    languages: string[];
    priority: SupportPriority[];
  };
  regionalSettings: {
    [country: string]: {
      enabled: boolean;
      customMessage?: string;
      businessHours?: {
        startTime: string;
        endTime: string;
        timezone: string;
        days: number[];
      };
      holidays?: string[];
    };
  };
  responseSettings: {
    delayMinutes?: number;
    maxResponses: number;
    escalationThreshold: number;
    escalationMessage?: string;
  };
}

export interface UpdateAutoReplyRequest {
  name?: string;
  description?: string;
  category?: SupportCategory;
  content?: {
    [locale: string]: {
      subject: string;
      message: string;
      footer?: string;
      signature?: string;
    };
  };
  triggers?: {
    keywords: string[];
    categories: SupportCategory[];
    countries: string[];
    regions: string[];
    languages: string[];
    priority: SupportPriority[];
  };
  regionalSettings?: {
    [country: string]: {
      enabled: boolean;
      customMessage?: string;
      businessHours?: {
        startTime: string;
        endTime: string;
        timezone: string;
        days: number[];
      };
      holidays?: string[];
    };
  };
  responseSettings?: {
    delayMinutes?: number;
    maxResponses: number;
    escalationThreshold: number;
    escalationMessage?: string;
  };
}

// FAQ Request Types
export interface CreateFAQRequest {
  question: string;
  answer: string;
  keywords: string[];
  categoryId: string;
  order: number;
  isActive: boolean;
  isFeatured: boolean;
  translations: {
    [locale: string]: {
      question: string;
      answer: string;
      keywords: string[];
    };
  };
  availableCountries: string[];
  availableRegions: string[];
  availableLanguages: string[];
  availableCurrencies: string[];
  regionalCustomizations: {
    [country: string]: {
      question?: string;
      answer?: string;
      additionalInfo?: string;
      localExamples?: string[];
      localContacts?: string[];
    };
  };
  visibility: 'public' | 'private' | 'restricted';
  restrictedRoles?: string[];
  restrictedCountries?: string[];
}

export interface UpdateFAQRequest {
  question?: string;
  answer?: string;
  keywords?: string[];
  categoryId?: string;
  order?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  translations?: {
    [locale: string]: {
      question: string;
      answer: string;
      keywords: string[];
    };
  };
  availableCountries?: string[];
  availableRegions?: string[];
  availableLanguages?: string[];
  availableCurrencies?: string[];
  regionalCustomizations?: {
    [country: string]: {
      question?: string;
      answer?: string;
      additionalInfo?: string;
      localExamples?: string[];
      localContacts?: string[];
    };
  };
  visibility?: 'public' | 'private' | 'restricted';
  restrictedRoles?: string[];
  restrictedCountries?: string[];
}

// Support Message Request Types
export interface CreateMessageRequest {
  attendeeId?: string;
  attendeeEmail: string;
  attendeeName: string;
  eventId?: string;
  eventTitle?: string;
  category: SupportCategory;
  priority: SupportPriority;
  subject: string;
  message: string;
  attachments?: string[];
  tags?: string[];
  customFields?: Record<string, any>;
}
