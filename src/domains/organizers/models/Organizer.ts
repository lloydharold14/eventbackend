import { BaseEntity } from '../../../shared/types/common';
import { OrganizerPayoutMethod } from './Finance';

// Multi-Country Business Types
export enum BusinessType {
  SOLE_PROPRIETOR = 'sole_proprietor',
  PARTNERSHIP = 'partnership',
  LLC = 'llc',
  CORPORATION = 'corporation',
  NON_PROFIT = 'non_profit',
  GOVERNMENT = 'government'
}

// Multi-Country Subscription Plans
export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

// Regional Compliance Settings
export interface ComplianceSettings {
  gdprCompliant: boolean;
  pipedaCompliant: boolean;
  ccpaCompliant: boolean;
  dataResidency: string;             // Country for data storage
  consentManagement: boolean;
  dataRetentionPolicy: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  cookiePolicyUrl?: string;
}

// Multi-Country Tax Settings
export interface TaxSettings {
  taxExempt: boolean;
  taxExemptionNumber?: string;
  automaticTaxCalculation: boolean;
  taxRates: Record<string, number>;  // Country/region -> tax rate
  taxInclusive: boolean;              // Prices include tax
  taxRegistrationNumbers: Record<string, string>; // Country -> Tax ID
}

// Multi-Country Payout Methods
export interface PayoutMethod {
  type: 'bank' | 'paypal' | 'stripe' | 'local';
  country: string;
  currency: string;
  accountDetails: {
    accountNumber?: string;
    routingNumber?: string;
    swiftCode?: string;
    iban?: string;
    paypalEmail?: string;
    stripeAccountId?: string;
  };
  isDefault: boolean;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

// Multi-Country Billing Address
export interface BillingAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  taxId?: string;
  companyName?: string;
}

// Multi-Country Localization Preferences
export interface LocalizationPreferences {
  preferredLanguages: string[];       // ['en', 'fr', 'es']
  defaultLocale: string;              // 'en-CA', 'fr-CA'
  autoLocalization: boolean;         // Auto-translate events
  localizePricing: boolean;          // Show prices in local currency
  dateFormat: string;                 // 'MM/DD/YYYY', 'DD/MM/YYYY'
  timeFormat: '12h' | '24h';
  numberFormat: 'comma' | 'dot';     // Decimal separator
}

// Multi-Country Business Profile
export interface BusinessProfile {
  industry: string;
  industryCategory: string;           // Standard industry classification
  companySize: string;
  foundedYear?: number;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
}

// Main Organizer Interface
export interface Organizer extends BaseEntity {
  userId: string;
  
  // Company Information
  companyName: string;
  companySize: string;
  industry: string;
  website?: string;
  
  // Multi-Country Support
  country: string;                    // ISO 3166-1 alpha-2
  region: string;                     // ISO 3166-2
  timezone: string;                   // IANA timezone
  locale: string;                     // e.g., 'en-CA', 'fr-CA'
  
  // Business Registration
  businessRegistrationNumber: string; // Tax ID, VAT, GST, etc.
  businessType: BusinessType;         // LLC, Corporation, Sole Proprietor
  industryCategory: string;           // Standard industry classification
  
  // Multi-Currency Support
  defaultCurrency: string;            // ISO 4217 currency code
  supportedCurrencies: string[];      // Multiple currencies for events
  exchangeRateProvider: string;       // Provider for real-time rates
  
  // Regional Compliance
  complianceSettings: ComplianceSettings;
  taxSettings: TaxSettings;
  privacySettings: Record<string, any>;
  
  // Subscription & Billing
  subscription: SubscriptionPlan;
  billingAddress: BillingAddress;
  payoutMethods: OrganizerPayoutMethod[];
  
  // Localization Preferences
  localizationPreferences: LocalizationPreferences;
  
  // Business Profile
  businessProfile: BusinessProfile;
  
  // Verification & Status
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDocuments: string[];
  verifiedAt?: string;
  
  // Performance Metrics
  totalEvents: number;
  totalRevenue: number;
  totalAttendees: number;
  averageRating: number;
  
  // Settings & Preferences
  settings: {
    allowTeamCollaboration: boolean;
    maxTeamMembers: number;
    advancedAnalytics: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
  };
}

// Create Organizer Request
export interface CreateOrganizerRequest {
  userId: string;
  companyName: string;
  companySize: string;
  industry: string;
  country: string;
  region: string;
  timezone: string;
  locale: string;
  businessType: BusinessType;
  businessRegistrationNumber: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
  website?: string;
  industryCategory?: string;
}

// Update Organizer Request
export interface UpdateOrganizerRequest {
  companyName?: string;
  companySize?: string;
  industry?: string;
  website?: string;
  country?: string;
  region?: string;
  timezone?: string;
  locale?: string;
  businessType?: BusinessType;
  businessRegistrationNumber?: string;
  defaultCurrency?: string;
  supportedCurrencies?: string[];
  complianceSettings?: Partial<ComplianceSettings>;
  taxSettings?: Partial<TaxSettings>;
  localizationPreferences?: Partial<LocalizationPreferences>;
  businessProfile?: Partial<BusinessProfile>;
  settings?: Partial<Organizer['settings']>;
}

// Organizer Search Filters
export interface OrganizerSearchFilters {
  country?: string;
  region?: string;
  industry?: string;
  businessType?: BusinessType;
  subscription?: SubscriptionPlan;
  verificationStatus?: string;
  supportedCurrency?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

// Organizer List Response
export interface OrganizerListResponse {
  organizers: Organizer[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Organizer Dashboard Data
export interface OrganizerDashboard {
  organizerId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  
  // Event Metrics
  totalEvents: number;
  activeEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  
  // Financial Metrics (Multi-Currency)
  revenue: {
    [currency: string]: {
      total: number;
      pending: number;
      processed: number;
      refunded: number;
    };
  };
  
  // Attendee Metrics
  totalAttendees: number;
  newAttendees: number;
  returningAttendees: number;
  averageAttendance: number;
  
  // Marketing Metrics
  totalCampaigns: number;
  activeCampaigns: number;
  emailSent: number;
  emailOpenRate: number;
  emailClickRate: number;
  
  // Performance Metrics
  conversionRate: number;
  averageRating: number;
  totalReviews: number;
  customerSatisfaction: number;
  
  // Regional Metrics
  topCountries: Array<{ country: string; events: number; revenue: number }>;
  topRegions: Array<{ region: string; events: number; revenue: number }>;
  topCurrencies: Array<{ currency: string; revenue: number; events: number }>;
}
