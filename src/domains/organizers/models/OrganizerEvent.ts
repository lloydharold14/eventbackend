import { Event, EventStatus, EventType, EventVisibility } from '../../events/models/Event';

// Multi-Country Event Settings
export interface RegionalEventSettings {
  country: string;
  region: string;
  timezone: string;
  locale: string;
  
  // Regional Compliance
  ageRestrictions: {
    [country: string]: number;        // Country-specific age limits
  };
  alcoholPolicy: {
    [country: string]: 'allowed' | 'restricted' | 'prohibited';
  };
  foodPolicy: {
    [country: string]: 'provided' | 'available' | 'not_available';
  };
  
  // Regional Business Rules
  businessHours: {
    [country: string]: {
      startTime: string;
      endTime: string;
      timezone: string;
    };
  };
  holidays: {
    [country: string]: string[];      // Country-specific holidays
  };
  
  // Regional Marketing
  marketingRestrictions: {
    [country: string]: string[];      // Country-specific marketing rules
  };
  socialMediaAvailability: {
    [country: string]: {
      facebook: boolean;
      twitter: boolean;
      linkedin: boolean;
      instagram: boolean;
      wechat?: boolean;               // China
      line?: boolean;                 // Japan
      kakao?: boolean;                // Korea
    };
  };
}

// Multi-Currency Pricing Structure
export interface MultiCurrencyPricing {
  baseCurrency: string;               // Primary currency
  pricing: {
    [currency: string]: {
      basePrice: number;
      earlyBirdPrice?: number;
      groupDiscounts?: GroupDiscount[];
      processingFees: number;
      taxRate: number;
      finalPrice: number;
      exchangeRate: number;
      lastUpdated: string;
    };
  };
  
  // Currency Conversion Settings
  autoConvert: boolean;               // Auto-convert prices
  conversionProvider: string;         // Exchange rate provider
  conversionMargin: number;           // Conversion fee margin
}

// Multi-Country Group Discounts
export interface GroupDiscount {
  minQuantity: number;
  maxQuantity?: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  currencies: {
    [currency: string]: number;
  };
  countries: string[];                // Applicable countries
  regions: string[];                  // Applicable regions
}

// Regional Marketing Settings
export interface RegionalMarketingSettings {
  // Social Media Integration
  socialMedia: {
    [country: string]: {
      facebook: boolean;
      twitter: boolean;
      linkedin: boolean;
      instagram: boolean;
      wechat?: boolean;
      line?: boolean;
      kakao?: boolean;
    };
  };
  
  // Email Campaigns
  emailCampaigns: {
    [locale: string]: {
      subject: string;
      content: string;
      sendTime: string;               // Local time
      timezone: string;
    };
  };
  
  // Regional Promotions
  regionalPromotions: {
    [country: string]: {
      discountCode?: string;
      discountPercentage?: number;
      validFrom: string;
      validTo: string;
      conditions: string[];
    };
  };
}

// Regional SEO Settings
export interface RegionalSEOSettings {
  [locale: string]: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage: string;
    structuredData: object;
    
    // Regional SEO
    hreflang: string;                 // Language/region tag
    canonicalUrl: string;             // Canonical URL for region
    alternateUrls: Record<string, string>; // Alternate language URLs
  };
}

// Multi-Country Event Localization
export interface EventLocalization {
  // Content Translations
  translations: {
    [locale: string]: {
      title: string;
      description: string;
      shortDescription?: string;
      tags: string[];
      customFields?: Record<string, string>;
      
      // Regional Content
      regionalInfo?: string;          // Country-specific information
      localAttractions?: string[];    // Local points of interest
      transportationInfo?: string;    // Local transportation details
      accommodationInfo?: string;     // Local accommodation options
    };
  };
  
  // Regional Formatting
  formatting: {
    [locale: string]: {
      dateFormat: string;             // Local date format
      timeFormat: '12h' | '24h';     // Local time format
      numberFormat: 'comma' | 'dot'; // Decimal separator
      currencyFormat: string;         // Currency display format
    };
  };
}

// Multi-Country Event Compliance
export interface EventCompliance {
  // Regional Regulations
  regulations: {
    [country: string]: {
      permits: string[];              // Required permits
      licenses: string[];             // Required licenses
      insurance: string[];            // Required insurance
      safety: string[];               // Safety requirements
      accessibility: string[];        // Accessibility requirements
    };
  };
  
  // Tax Compliance
  taxCompliance: {
    [country: string]: {
      taxRegistration: string;        // Tax registration number
      taxRate: number;                // Applicable tax rate
      taxInclusive: boolean;          // Prices include tax
      taxExemption?: string;          // Tax exemption number
    };
  };
  
  // Privacy Compliance
  privacyCompliance: {
    [regulation: string]: {
      compliant: boolean;
      consentRequired: boolean;
      dataRetention: string;
      dataProcessing: string[];
      thirdPartySharing: boolean;
    };
  };
}

// Main Organizer Event Interface
export interface OrganizerEvent extends Event {
  organizerId: string;
  
  // Multi-Country Settings
  regionalSettings: RegionalEventSettings;
  
  // Multi-Currency Pricing
  multiCurrencyPricing: MultiCurrencyPricing;
  
  // Regional Marketing
  regionalMarketing: RegionalMarketingSettings;
  
  // Regional SEO
  regionalSEO: RegionalSEOSettings;
  
  // Event Localization
  localization: EventLocalization;
  
  // Regional Compliance
  compliance: EventCompliance;
  
  // Team Collaboration
  teamMembers: string[];             // User IDs of team members
  teamRoles: Record<string, string>; // User ID -> Role mapping
  
  // Advanced Features
  advancedFeatures: {
    waitlistEnabled: boolean;
    refundPolicy: string;
    cancellationPolicy: string;
    transferPolicy: string;
    customFields: CustomField[];
    checkInRequired: boolean;
    checkInLocations: CheckInLocation[];
  };
  
  // Analytics & Performance
  analytics: {
    views: number;
    uniqueVisitors: number;
    conversionRate: number;
    socialShares: number;
    emailOpens: number;
    
    // Regional Analytics
    regionalViews: Record<string, number>;
    regionalConversions: Record<string, number>;
    regionalRevenue: Record<string, number>;
  };
}

// Custom Fields for Events
export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'select' | 'checkbox' | 'date';
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: string;
  translations: Record<string, string>; // Locale -> Display name
}

// Check-in Locations
export interface CheckInLocation {
  id: string;
  name: string;
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
  operatingHours: {
    startTime: string;
    endTime: string;
    days: number[];                   // 0=Sunday, 1=Monday, etc.
  };
  staffAssigned: string[];            // User IDs of assigned staff
}

// Create Organizer Event Request
export interface CreateOrganizerEventRequest {
  // Basic Event Information
  title: string;
  description: string;
  category: string;
  type: EventType;
  startDate: string;
  endDate: string;
  
  // Multi-Country Settings
  country: string;
  region: string;
  timezone: string;
  locale: string;
  
  // Multi-Currency Pricing
  baseCurrency: string;
  basePrice: number;
  supportedCurrencies: string[];
  
  // Location
  location: {
    type: 'physical' | 'virtual' | 'hybrid';
    address?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    virtualUrl?: string;
    virtualPlatform?: string;
  };
  
  // Capacity & Settings
  capacity: number;
  waitlistEnabled: boolean;
  refundPolicy: string;
  
  // Team & Collaboration
  teamMembers?: string[];
  
  // Advanced Settings
  customFields?: CustomField[];
  checkInRequired?: boolean;
  checkInLocations?: CheckInLocation[];
}

// Update Organizer Event Request
export interface UpdateOrganizerEventRequest {
  title?: string;
  description?: string;
  category?: string;
  type?: EventType;
  startDate?: string;
  endDate?: string;
  
  // Multi-Country Settings
  country?: string;
  region?: string;
  timezone?: string;
  locale?: string;
  
  // Multi-Currency Pricing
  basePrice?: number;
  supportedCurrencies?: string[];
  
  // Location
  location?: {
    type?: 'physical' | 'virtual' | 'hybrid';
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    virtualUrl?: string;
    virtualPlatform?: string;
  };
  
  // Capacity & Settings
  capacity?: number;
  waitlistEnabled?: boolean;
  refundPolicy?: string;
  
  // Team & Collaboration
  teamMembers?: string[];
  
  // Advanced Settings
  customFields?: CustomField[];
  checkInRequired?: boolean;
  checkInLocations?: CheckInLocation[];
}

// Organizer Event Search Filters
export interface OrganizerEventSearchFilters {
  organizerId: string;
  status?: EventStatus;
  type?: EventType;
  country?: string;
  region?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

// Organizer Event List Response
export interface OrganizerEventListResponse {
  events: OrganizerEvent[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
