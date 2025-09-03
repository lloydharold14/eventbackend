import { BaseEntity } from '../../../shared/types/common';

// Financial Transaction Types
export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
  PAYOUT = 'payout',
  FEE = 'fee',
  TAX = 'tax',
  DISCOUNT = 'discount',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer'
}

// Transaction Status
export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded'
}

// Multi-Currency Financial Data
export interface FinancialData extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Multi-Currency Revenue
  revenue: {
    [currency: string]: {
      grossRevenue: number;
      netRevenue: number;
      processingFees: number;
      platformFees: number;
      taxes: number;
      refunds: number;
      chargebacks: number;
      discounts: number;
      adjustments: number;
    };
  };
  
  // Exchange Rate Management
  exchangeRates: {
    baseCurrency: string;
    rates: {
      [currency: string]: {
        rate: number;
        lastUpdated: string;
        source: string;
        margin: number;                // Conversion fee margin
      };
    };
  };
  
  // Regional Tax Breakdown
  taxBreakdown: {
    [country: string]: {
      [currency: string]: {
        gst?: number;                  // Canada, Australia
        hst?: number;                  // Canada
        vat?: number;                  // EU, UK
        icms?: number;                 // Brazil
        salesTax?: number;             // US
        totalTax: number;
        taxRate: number;
        taxInclusive: boolean;
      };
    };
  };
  
  // Multi-Currency Payouts
  payouts: {
    [currency: string]: {
      totalPayouts: number;
      pendingPayouts: number;
      nextPayoutDate: string;
      payoutMethod: string;
      exchangeRate: number;
      convertedAmount: number;
      fees: number;
      netAmount: number;
    };
  };
  
  // Regional Compliance
  compliance: {
    [country: string]: {
      taxRegistration: string;
      taxExemption?: string;
      reportingRequired: boolean;
      reportingFrequency: 'monthly' | 'quarterly' | 'annually';
      lastReported: string;
      nextReportDue: string;
    };
  };
  
  // Performance Metrics
  metrics: {
    totalEvents: number;
    totalTickets: number;
    averageTicketPrice: number;
    conversionRate: number;
    refundRate: number;
    chargebackRate: number;
    customerLifetimeValue: number;
  };
}

// Multi-Currency Transaction
export interface FinancialTransaction extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Transaction Information
  transactionId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  
  // Multi-Currency Details
  multiCurrency: {
    [currency: string]: {
      amount: number;
      exchangeRate: number;
      convertedAmount: number;
      fees: number;
      netAmount: number;
    };
  };
  
  // Event & Booking Information
  eventId?: string;
  eventTitle?: string;
  bookingId?: string;
  attendeeId?: string;
  attendeeEmail?: string;
  
  // Payment Details
  paymentMethod: string;
  paymentGateway: string;
  gatewayTransactionId?: string;
  processingFees: number;
  platformFees: number;
  
  // Regional Tax Information
  taxDetails: {
    country: string;
    region: string;
    taxRate: number;
    taxAmount: number;
    taxType: string;                  // GST, HST, VAT, etc.
    taxInclusive: boolean;
  };
  
  // Refund & Chargeback Details
  refundReason?: string;
  chargebackReason?: string;
  originalTransactionId?: string;
  disputeAmount?: number;
  
  // Timestamps
  processedAt: string;
  settledAt?: string;
  refundedAt?: string;
  disputedAt?: string;
  
  // Metadata
  description: string;
  notes?: string;
  tags: string[];
  customFields: Record<string, any>;
  
  // Compliance & Audit
  complianceFlags: {
    [regulation: string]: boolean;
  };
  auditTrail: Array<{
    action: string;
    timestamp: string;
    userId: string;
    details: string;
  }>;
}

// Multi-Country Organizer Payout Method
export interface OrganizerPayoutMethod extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Method Information
  type: 'bank' | 'paypal' | 'stripe' | 'local';
  name: string;
  isDefault: boolean;
  isActive: boolean;
  
  // Multi-Country Support
  supportedCountries: string[];
  supportedCurrencies: string[];
  defaultCountry: string;
  defaultCurrency: string;
  
  // Account Details
  accountDetails: {
    accountNumber?: string;
    routingNumber?: string;
    swiftCode?: string;
    iban?: string;
    paypalEmail?: string;
    stripeAccountId?: string;
    localBankCode?: string;
    localBranchCode?: string;
  };
  
  // Regional Settings
  regionalSettings: {
    [country: string]: {
      enabled: boolean;
      accountDetails: Record<string, any>;
      processingTime: number;         // Days to process
      minimumAmount: number;
      maximumAmount: number;
      fees: number;
      feeType: 'percentage' | 'fixed';
    };
  };
  
  // Verification Status
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDocuments: string[];
  verifiedAt?: string;
  rejectedReason?: string;
  
  // Performance Metrics
  totalPayouts: number;
  totalAmount: number;
  lastPayoutAt?: string;
  averageProcessingTime: number;
  
  // Security Settings
  twoFactorRequired: boolean;
  ipRestrictions?: string[];
  transactionLimits: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

// Multi-Currency Payout Schedule
export interface PayoutSchedule extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Schedule Information
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  isActive: boolean;
  
  // Multi-Currency Settings
  currencySettings: {
    [currency: string]: {
      enabled: boolean;
      minimumAmount: number;
      maximumAmount: number;
      processingDay?: number;         // Day of week/month
      processingTime?: string;        // Time of day
      timezone: string;
    };
  };
  
  // Regional Settings
  regionalSettings: {
    [country: string]: {
      enabled: boolean;
      processingDays: number[];       // 0=Sunday, 1=Monday, etc.
      processingTime: string;
      timezone: string;
      holidays: string[];             // Holiday exclusions
      businessHours: {
        startTime: string;
        endTime: string;
      };
    };
  };
  
  // Payout Rules
  rules: {
    minimumBalance: number;
    maximumPayout: number;
    autoPause: boolean;
    pauseThreshold: number;
    requireApproval: boolean;
    approvalThreshold: number;
  };
  
  // Performance Tracking
  lastProcessed: string;
  nextProcessing: string;
  totalProcessed: number;
  totalAmount: number;
  successRate: number;
}

// Multi-Country Tax Configuration
export interface TaxConfiguration extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Tax Information
  country: string;
  region: string;
  taxType: string;                    // GST, HST, VAT, etc.
  taxRate: number;
  taxInclusive: boolean;
  
  // Tax Registration
  taxRegistrationNumber: string;
  taxExemptionNumber?: string;
  isTaxExempt: boolean;
  exemptionReason?: string;
  
  // Tax Calculation Rules
  calculationRules: {
    applyToEvents: boolean;
    applyToServices: boolean;
    applyToProducts: boolean;
    minimumAmount: number;
    maximumAmount: number;
    roundingMethod: 'up' | 'down' | 'nearest';
  };
  
  // Regional Variations
  regionalVariations: {
    [subRegion: string]: {
      taxRate: number;
      specialRules?: string[];
      exemptions?: string[];
    };
  };
  
  // Compliance Requirements
  compliance: {
    reportingRequired: boolean;
    reportingFrequency: 'monthly' | 'quarterly' | 'annually';
    filingDeadline: number;           // Days after period end
    penalties: {
      lateFiling: number;
      underpayment: number;
      nonCompliance: number;
    };
  };
  
  // Tax Categories
  taxCategories: Array<{
    name: string;
    rate: number;
    description: string;
    isActive: boolean;
  }>;
  
  // Performance Tracking
  lastCalculated: string;
  totalCollected: number;
  totalReported: number;
  complianceScore: number;            // 0-100
}

// Multi-Currency Financial Report
export interface FinancialReport extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Report Information
  reportType: 'revenue' | 'payout' | 'tax' | 'comprehensive';
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  
  // Multi-Currency Summary
  summary: {
    [currency: string]: {
      grossRevenue: number;
      netRevenue: number;
      totalFees: number;
      totalTaxes: number;
      totalRefunds: number;
      totalPayouts: number;
      netProfit: number;
    };
  };
  
  // Regional Breakdown
  regionalBreakdown: Array<{
    country: string;
    region: string;
    revenue: number;
    taxes: number;
    fees: number;
    netAmount: number;
    currency: string;
  }>;
  
  // Event Performance
  eventPerformance: Array<{
    eventId: string;
    eventTitle: string;
    revenue: number;
    tickets: number;
    averagePrice: number;
    currency: string;
  }>;
  
  // Tax Summary
  taxSummary: {
    [country: string]: {
      [currency: string]: {
        totalTax: number;
        taxRate: number;
        taxableAmount: number;
        exemptions: number;
        netTax: number;
      };
    };
  };
  
  // Payout Summary
  payoutSummary: {
    [currency: string]: {
      totalPayouts: number;
      pendingPayouts: number;
      processingFees: number;
      netPayouts: number;
    };
  };
  
  // Compliance Status
  complianceStatus: {
    [country: string]: {
      compliant: boolean;
      reportingDue: boolean;
      nextReportDate: string;
      complianceScore: number;
      issues: string[];
    };
  };
  
  // Export Options
  exportFormats: string[];
  lastExported?: string;
  exportHistory: Array<{
    format: string;
    timestamp: string;
    userId: string;
    fileUrl: string;
  }>;
}

// Create Financial Transaction Request
export interface CreateFinancialTransactionRequest {
  organizerId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  eventId?: string;
  bookingId?: string;
  attendeeId?: string;
  paymentMethod: string;
  paymentGateway: string;
  description: string;
  country: string;
  region: string;
  taxRate: number;
  taxAmount: number;
  processingFees: number;
  platformFees: number;
}

// Update Financial Transaction Request
export interface UpdateFinancialTransactionRequest {
  status?: TransactionStatus;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

// Financial Transaction Search Filters
export interface FinancialTransactionSearchFilters {
  organizerId: string;
  type?: TransactionType;
  status?: TransactionStatus;
  currency?: string;
  country?: string;
  region?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

// Financial Transaction List Response
export interface FinancialTransactionListResponse {
  transactions: FinancialTransaction[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Financial Dashboard Data
export interface FinancialDashboard {
  organizerId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  
  // Revenue Overview
  totalRevenue: number;
  netRevenue: number;
  grossRevenue: number;
  totalFees: number;
  totalTaxes: number;
  
  // Multi-Currency Breakdown
  currencyBreakdown: Array<{
    currency: string;
    revenue: number;
    fees: number;
    taxes: number;
    netAmount: number;
    exchangeRate: number;
  }>;
  
  // Regional Performance
  regionalPerformance: Array<{
    country: string;
    region: string;
    revenue: number;
    events: number;
    tickets: number;
    currency: string;
  }>;
  
  // Transaction Trends
  transactionTrends: Array<{
    date: string;
    revenue: number;
    transactions: number;
    averageAmount: number;
  }>;
  
  // Top Performing Events
  topEvents: Array<{
    eventId: string;
    eventTitle: string;
    revenue: number;
    tickets: number;
    currency: string;
  }>;
  
  // Payout Status
  payoutStatus: {
    totalPayouts: number;
    pendingPayouts: number;
    nextPayoutDate: string;
    averageProcessingTime: number;
  };
  
  // Compliance Status
  complianceStatus: {
    compliantCountries: number;
    nonCompliantCountries: number;
    reportsDue: number;
    averageComplianceScore: number;
  };
}
