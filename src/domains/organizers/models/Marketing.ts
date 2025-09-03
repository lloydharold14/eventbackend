import { BaseEntity } from '../../../shared/types/common';

// Marketing Campaign Types
export enum CampaignType {
  EMAIL = 'email',
  SOCIAL_MEDIA = 'social_media',
  PAID_ADVERTISING = 'paid_advertising',
  SMS = 'sms',
  PUSH_NOTIFICATION = 'push_notification',
  IN_APP = 'in_app',
  DIRECT_MAIL = 'direct_mail',
  INFLUENCER = 'influencer',
  AFFILIATE = 'affiliate',
  REFERRAL = 'referral'
}

// Campaign Status
export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Multi-Country Campaign Targeting
export interface CampaignTargeting {
  // Geographic Targeting
  countries: string[];                // ISO country codes
  regions: string[];                  // ISO region codes
  cities: string[];                   // City names
  postalCodes: string[];              // Postal code ranges
  
  // Demographic Targeting
  ageRange: {
    min: number;
    max: number;
  };
  gender?: 'male' | 'female' | 'all';
  languages: string[];                // Language codes
  interests: string[];                // Interest categories
  
  // Behavioral Targeting
  previousEvents: string[];           // Event IDs
  ticketTypes: string[];              // Ticket type IDs
  spendingRange: {
    min: number;
    max: number;
    currency: string;
  };
  engagementLevel: 'low' | 'medium' | 'high' | 'all';
  
  // Custom Targeting
  customSegments: string[];           // Custom segment IDs
  tags: string[];                     // User tags
  customFields: Record<string, any>;  // Custom field values
}

// Multi-Locale Campaign Content
export interface CampaignContent {
  [locale: string]: {
    subject: string;
    title: string;
    message: string;
    callToAction: string;
    callToActionUrl: string;
    
    // Visual Content
    images: string[];
    videos?: string[];
    logo?: string;
    banner?: string;
    
    // Social Media Content
    socialMediaText?: string;
    hashtags?: string[];
    
    // Email Content
    emailSubject?: string;
    emailPreview?: string;
    emailBody?: string;
    
    // SMS Content
    smsText?: string;
    
    // Push Notification
    pushTitle?: string;
    pushBody?: string;
    pushImage?: string;
    
    // Localized URLs
    localizedUrls?: Record<string, string>; // Country -> URL mapping
  };
}

// Multi-Country Campaign Scheduling
export interface CampaignScheduling {
  // Global Schedule
  startDate: string;
  endDate: string;
  timezone: string;
  
  // Regional Scheduling
  regionalSchedule: {
    [country: string]: {
      startDate: string;
      endDate: string;
      timezone: string;
      sendTime: string;               // Local time
      dayOfWeek?: number[];           // 0=Sunday, 1=Monday, etc.
      dayOfMonth?: number[];          // 1-31
      excludeDates?: string[];        // Holiday exclusions
    };
  };
  
  // Frequency Settings
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  frequencyValue?: number;            // Every X days/weeks/months
  maxSends?: number;                  // Maximum number of sends
  
  // Time Optimization
  optimalSendTime: boolean;           // Use AI to determine best send time
  timeZoneOptimization: boolean;      // Optimize for recipient timezone
}

// Multi-Currency Campaign Budget
export interface CampaignBudget {
  baseCurrency: string;
  totalBudget: number;
  
  // Currency Breakdown
  currencyBudgets: {
    [currency: string]: {
      allocated: number;
      spent: number;
      remaining: number;
      exchangeRate: number;
    };
  };
  
  // Budget Allocation
  dailyBudget?: number;
  weeklyBudget?: number;
  monthlyBudget?: number;
  
  // Budget Controls
  autoPause: boolean;                 // Pause when budget exceeded
  budgetAlertThreshold: number;       // Alert at X% of budget
  budgetAlertEmails: string[];        // Email addresses for alerts
}

// Multi-Country Campaign Performance
export interface CampaignPerformance {
  // Global Metrics
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  totalRevenue: number;
  
  // Multi-Currency Performance
  currencyPerformance: {
    [currency: string]: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      converted: number;
      revenue: number;
      cost: number;
      roi: number;
    };
  };
  
  // Regional Performance
  regionalPerformance: {
    [country: string]: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      converted: number;
      revenue: number;
      cost: number;
      roi: number;
    };
  };
  
  // Channel Performance
  channelPerformance: {
    email?: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      bounced: number;
      unsubscribed: number;
    };
    sms?: {
      sent: number;
      delivered: number;
      clicked: number;
      failed: number;
    };
    push?: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    };
    social?: {
      impressions: number;
      reach: number;
      clicks: number;
      shares: number;
      likes: number;
    };
  };
  
  // Engagement Metrics
  openRate: number;
  clickRate: number;
  conversionRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  
  // Financial Metrics
  costPerClick: number;
  costPerConversion: number;
  returnOnInvestment: number;
  customerAcquisitionCost: number;
  lifetimeValue: number;
}

// Multi-Country Campaign Settings
export interface CampaignSettings {
  // General Settings
  name: string;
  description?: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Multi-Country Settings
  defaultCountry: string;
  defaultLanguage: string;
  defaultCurrency: string;
  
  // Compliance Settings
  compliance: {
    gdprCompliant: boolean;
    canSpamCompliant: boolean;
    tcpaCompliant: boolean;
    consentRequired: boolean;
    unsubscribeRequired: boolean;
    privacyPolicyUrl?: string;
  };
  
  // Branding Settings
  branding: {
    senderName: string;
    senderEmail: string;
    replyToEmail?: string;
    logoUrl?: string;
    brandColors?: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  
  // Automation Settings
  automation: {
    autoResponders: boolean;
    dripCampaigns: boolean;
    triggerBased: boolean;
    segmentation: boolean;
    personalization: boolean;
  };
}

// Main Marketing Campaign Interface
export interface MarketingCampaign extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Basic Information
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  
  // Multi-Country Targeting
  targeting: CampaignTargeting;
  
  // Multi-Locale Content
  content: CampaignContent;
  
  // Multi-Country Scheduling
  scheduling: CampaignScheduling;
  
  // Multi-Currency Budget
  budget: CampaignBudget;
  
  // Multi-Country Performance
  performance: CampaignPerformance;
  
  // Multi-Country Settings
  settings: CampaignSettings;
  
  // Campaign Metadata
  tags: string[];
  categories: string[];
  customFields: Record<string, any>;
  
  // Team & Collaboration
  createdBy: string;
  teamMembers: string[];
  approvals: Array<{
    memberId: string;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    timestamp: string;
  }>;
  
  // Tracking & Analytics
  trackingCode?: string;
  utmParameters?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  
  // Integration Settings
  integrations: {
    emailService?: string;
    smsService?: string;
    socialMedia?: string[];
    analytics?: string[];
    crm?: string;
  };
}

// Create Campaign Request
export interface CreateCampaignRequest {
  organizerId: string;
  name: string;
  description?: string;
  type: CampaignType;
  targeting: CampaignTargeting;
  content: CampaignContent;
  scheduling: CampaignScheduling;
  budget: CampaignBudget;
  settings: CampaignSettings;
  tags?: string[];
  categories?: string[];
  teamMembers?: string[];
}

// Update Campaign Request
export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  type?: CampaignType;
  status?: CampaignStatus;
  targeting?: Partial<CampaignTargeting>;
  content?: Partial<CampaignContent>;
  scheduling?: Partial<CampaignScheduling>;
  budget?: Partial<CampaignBudget>;
  settings?: Partial<CampaignSettings>;
  tags?: string[];
  categories?: string[];
  teamMembers?: string[];
}

// Campaign Search Filters
export interface CampaignSearchFilters {
  organizerId: string;
  type?: CampaignType;
  status?: CampaignStatus;
  country?: string;
  region?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  tags?: string[];
  categories?: string[];
  page?: number;
  pageSize?: number;
}

// Campaign List Response
export interface CampaignListResponse {
  campaigns: MarketingCampaign[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Campaign Analytics Request
export interface CampaignAnalyticsRequest {
  campaignId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  countries?: string[];
  regions?: string[];
  currencies?: string[];
  channels?: string[];
}

// Campaign Performance Summary
export interface CampaignPerformanceSummary {
  campaignId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  
  // Overall Performance
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  totalRevenue: number;
  totalCost: number;
  
  // Key Metrics
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  roi: number;
  
  // Regional Breakdown
  topCountries: Array<{
    country: string;
    sent: number;
    revenue: number;
    roi: number;
  }>;
  
  // Currency Breakdown
  topCurrencies: Array<{
    currency: string;
    revenue: number;
    cost: number;
    roi: number;
  }>;
  
  // Channel Performance
  channelBreakdown: Array<{
    channel: string;
    sent: number;
    revenue: number;
    roi: number;
  }>;
  
  // Trend Analysis
  dailyTrends: Array<{
    date: string;
    sent: number;
    revenue: number;
    roi: number;
  }>;
}
