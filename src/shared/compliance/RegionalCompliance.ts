// Regional Compliance Framework
// Based on architecture rules for GDPR, PIPEDA, and regional compliance

export interface TaxRequirements {
  gstRate?: number;
  hstProvinces?: string[];
  pstProvinces?: string[];
  vatRate?: number;
  vatRegistrationRequired?: boolean;
  reverseCharge?: boolean;
  ossCompliance?: boolean;
  taxIdRequired?: boolean;
  businessNumberRequired?: boolean;
  euVatNumber?: boolean;
}

export interface PrivacyRequirements {
  regulation: string;
  dataResidency: boolean;
  consentRequired: boolean;
  rightToForget: boolean;
  dataPortability: boolean;
  dpoRequired?: boolean;
  breachNotificationHours?: number;
  dataRetentionDays?: number;
  crossBorderTransfer?: boolean;
  automatedDecisionMaking?: boolean;
  profiling?: boolean;
}

export interface PaymentRequirements {
  requiredMethods: string[];
  localBanking: boolean;
  cadRequired?: boolean;
  eurRequired?: boolean;
  sca3dsRequired?: boolean;
  pciCompliance: boolean;
  fraudDetection: boolean;
  chargebackProtection: boolean;
}

export interface BusinessRequirements {
  businessRegistration: boolean;
  provincialLicenses?: string[];
  languageRequirements?: string[];
  gdprCompliance?: boolean;
  pipedaCompliance?: boolean;
  ccpaCompliance?: boolean;
  taxRegistration: boolean;
  insuranceRequired?: boolean;
  dataProtectionOfficer?: boolean;
}

export interface RegionalCompliance {
  region: string;
  country: string;
  currency: string;
  timezone: string;
  requirements: {
    taxation: TaxRequirements;
    privacy: PrivacyRequirements;
    payment: PaymentRequirements;
    business: BusinessRequirements;
  };
}

// Regional Compliance Configuration
export const REGIONAL_COMPLIANCE: RegionalCompliance[] = [
  // Primary Markets
  {
    region: 'CA',
    country: 'Canada',
    currency: 'CAD',
    timezone: 'America/Toronto',
    requirements: {
      taxation: {
        gstRate: 5,
        hstProvinces: ['ON', 'NB', 'NL', 'NS', 'PE'],
        pstProvinces: ['BC', 'MB', 'QC', 'SK'],
        vatRegistrationRequired: false,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'PIPEDA',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        dpoRequired: false,
        breachNotificationHours: 72,
        dataRetentionDays: 2555, // 7 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['credit_card', 'debit_card', 'bank_transfer'],
        localBanking: true,
        cadRequired: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: true
      },
      business: {
        businessRegistration: true,
        provincialLicenses: ['ON', 'BC', 'AB', 'QC'],
        languageRequirements: ['en', 'fr'],
        pipedaCompliance: true,
        taxRegistration: true,
        insuranceRequired: true,
        dataProtectionOfficer: false
      }
    }
  },
  {
    region: 'BJ',
    country: 'Benin',
    currency: 'XOF',
    timezone: 'Africa/Porto-Novo',
    requirements: {
      taxation: {
        vatRate: 18,
        vatRegistrationRequired: true,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'WAEMU',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 1825, // 5 years
        crossBorderTransfer: false,
        automatedDecisionMaking: false,
        profiling: false
      },
      payment: {
        requiredMethods: ['bank_transfer', 'mobile_money', 'credit_card'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: false
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['fr'],
        taxRegistration: true,
        insuranceRequired: false
      }
    }
  },
  {
    region: 'TG',
    country: 'Togo',
    currency: 'XOF',
    timezone: 'Africa/Lome',
    requirements: {
      taxation: {
        vatRate: 18,
        vatRegistrationRequired: true,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'WAEMU',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 1825, // 5 years
        crossBorderTransfer: false,
        automatedDecisionMaking: false,
        profiling: false
      },
      payment: {
        requiredMethods: ['bank_transfer', 'mobile_money', 'credit_card'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: false
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['fr'],
        taxRegistration: true,
        insuranceRequired: false
      }
    }
  },
  {
    region: 'GH',
    country: 'Ghana',
    currency: 'GHS',
    timezone: 'Africa/Accra',
    requirements: {
      taxation: {
        vatRate: 12.5,
        vatRegistrationRequired: true,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'Ghana Data Protection Act',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 1825, // 5 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['bank_transfer', 'mobile_money', 'credit_card'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: false
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['en'],
        taxRegistration: true,
        insuranceRequired: false
      }
    }
  },
  {
    region: 'NG',
    country: 'Nigeria',
    currency: 'NGN',
    timezone: 'Africa/Lagos',
    requirements: {
      taxation: {
        vatRate: 7.5,
        vatRegistrationRequired: true,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'Nigeria Data Protection Regulation',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 1825, // 5 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['bank_transfer', 'mobile_money', 'credit_card'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: false
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['en'],
        taxRegistration: true,
        insuranceRequired: false
      }
    }
  },
  {
    region: 'WAEMU',
    country: 'West African Economic and Monetary Union',
    currency: 'XOF',
    timezone: 'Africa/Dakar',
    requirements: {
      taxation: {
        vatRate: 18,
        vatRegistrationRequired: true,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'WAEMU Data Protection',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 1825, // 5 years
        crossBorderTransfer: false,
        automatedDecisionMaking: false,
        profiling: false
      },
      payment: {
        requiredMethods: ['bank_transfer', 'mobile_money'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: false
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['fr'],
        taxRegistration: true,
        insuranceRequired: false
      }
    }
  },
  {
    region: 'US',
    country: 'United States',
    currency: 'USD',
    timezone: 'America/New_York',
    requirements: {
      taxation: {
        vatRate: 0, // No federal VAT, state-specific
        vatRegistrationRequired: false,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'CCPA/CPRA',
        dataResidency: false,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 2555, // 7 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['credit_card', 'debit_card', 'bank_transfer'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: true
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['en'],
        ccpaCompliance: true,
        taxRegistration: true,
        insuranceRequired: true
      }
    }
  },
  {
    region: 'UK',
    country: 'United Kingdom',
    currency: 'GBP',
    timezone: 'Europe/London',
    requirements: {
      taxation: {
        vatRate: 20,
        vatRegistrationRequired: true,
        reverseCharge: true,
        ossCompliance: true,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'UK-GDPR',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        dpoRequired: true,
        breachNotificationHours: 72,
        dataRetentionDays: 2555, // 7 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['credit_card', 'debit_card', 'bank_transfer'],
        localBanking: true,
        sca3dsRequired: true,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: true
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['en'],
        gdprCompliance: true,
        taxRegistration: true,
        insuranceRequired: true,
        dataProtectionOfficer: true
      }
    }
  },
  {
    region: 'EU',
    country: 'European Union',
    currency: 'EUR',
    timezone: 'Europe/Brussels',
    requirements: {
      taxation: {
        vatRate: 21, // Average EU VAT rate
        vatRegistrationRequired: true,
        reverseCharge: true,
        ossCompliance: true,
        taxIdRequired: true,
        businessNumberRequired: true,
        euVatNumber: true
      },
      privacy: {
        regulation: 'GDPR',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        dpoRequired: true,
        breachNotificationHours: 72,
        dataRetentionDays: 2555, // 7 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['credit_card', 'debit_card', 'bank_transfer'],
        localBanking: true,
        eurRequired: true,
        sca3dsRequired: true,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: true
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['en', 'fr', 'de', 'es', 'it'],
        gdprCompliance: true,
        taxRegistration: true,
        insuranceRequired: true,
        dataProtectionOfficer: true
      }
    }
  },
  {
    region: 'AU',
    country: 'Australia',
    currency: 'AUD',
    timezone: 'Australia/Sydney',
    requirements: {
      taxation: {
        vatRate: 10, // GST
        vatRegistrationRequired: true,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'Privacy Act 1988',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 2555, // 7 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['credit_card', 'debit_card', 'bank_transfer'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: true
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['en'],
        taxRegistration: true,
        insuranceRequired: true
      }
    }
  },
  // Secondary Markets
  {
    region: 'MX',
    country: 'Mexico',
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    requirements: {
      taxation: {
        vatRate: 16,
        vatRegistrationRequired: true,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'LFPDPPP',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 1825, // 5 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['credit_card', 'debit_card', 'bank_transfer'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: false
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['es'],
        taxRegistration: true,
        insuranceRequired: false
      }
    }
  },
  {
    region: 'BR',
    country: 'Brazil',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    requirements: {
      taxation: {
        vatRate: 17, // ICMS varies by state
        vatRegistrationRequired: true,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'LGPD',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 1825, // 5 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['credit_card', 'debit_card', 'bank_transfer'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: false
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['pt'],
        taxRegistration: true,
        insuranceRequired: false
      }
    }
  },
  {
    region: 'JP',
    country: 'Japan',
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
    requirements: {
      taxation: {
        vatRate: 10,
        vatRegistrationRequired: true,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'APPI',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 1825, // 5 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['credit_card', 'debit_card', 'bank_transfer'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: false
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['ja'],
        taxRegistration: true,
        insuranceRequired: false
      }
    }
  },
  {
    region: 'IN',
    country: 'India',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    requirements: {
      taxation: {
        vatRate: 18, // GST
        vatRegistrationRequired: true,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'PDPB',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 1825, // 5 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['credit_card', 'debit_card', 'bank_transfer', 'upi'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: false
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['en', 'hi'],
        taxRegistration: true,
        insuranceRequired: false
      }
    }
  },
  {
    region: 'SG',
    country: 'Singapore',
    currency: 'SGD',
    timezone: 'Asia/Singapore',
    requirements: {
      taxation: {
        vatRate: 7, // GST
        vatRegistrationRequired: true,
        reverseCharge: false,
        ossCompliance: false,
        taxIdRequired: true,
        businessNumberRequired: true
      },
      privacy: {
        regulation: 'PDPA',
        dataResidency: true,
        consentRequired: true,
        rightToForget: true,
        dataPortability: true,
        breachNotificationHours: 72,
        dataRetentionDays: 1825, // 5 years
        crossBorderTransfer: true,
        automatedDecisionMaking: true,
        profiling: true
      },
      payment: {
        requiredMethods: ['credit_card', 'debit_card', 'bank_transfer'],
        localBanking: true,
        sca3dsRequired: false,
        pciCompliance: true,
        fraudDetection: true,
        chargebackProtection: false
      },
      business: {
        businessRegistration: true,
        languageRequirements: ['en'],
        taxRegistration: true,
        insuranceRequired: false
      }
    }
  }
];

// Compliance Validation Result
export interface ComplianceValidation {
  isCompliant: boolean;
  violations: ComplianceViolation[];
  recommendations: string[];
  warnings: string[];
}

export interface ComplianceViolation {
  type: 'taxation' | 'privacy' | 'payment' | 'business';
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  requirement: string;
  suggestion?: string;
}

// Compliance Service
export class ComplianceService {
  private static instance: ComplianceService;

  public static getInstance(): ComplianceService {
    if (!ComplianceService.instance) {
      ComplianceService.instance = new ComplianceService();
    }
    return ComplianceService.instance;
  }

  public getRegionalCompliance(region: string): RegionalCompliance | undefined {
    return REGIONAL_COMPLIANCE.find(c => c.region === region);
  }

  public async validateTransaction(
    booking: any,
    event: any,
    user: any
  ): Promise<ComplianceValidation> {
    const attendeeCompliance = this.getRegionalCompliance(booking.attendeeCountry || user.country);
    const organizerCompliance = this.getRegionalCompliance(event.organizerCountry);
    
    const validations: ComplianceViolation[] = [];
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Tax validation
    if (attendeeCompliance?.requirements.taxation) {
      const taxValidation = await this.validateTaxation(booking, attendeeCompliance);
      validations.push(...taxValidation.violations);
      recommendations.push(...taxValidation.recommendations);
    }

    // Privacy validation
    if (attendeeCompliance?.requirements.privacy) {
      const privacyValidation = await this.validatePrivacyConsent(booking, user, attendeeCompliance);
      validations.push(...privacyValidation.violations);
      recommendations.push(...privacyValidation.recommendations);
    }

    // Payment method validation
    if (attendeeCompliance?.requirements.payment) {
      const paymentValidation = await this.validatePaymentMethod(booking, attendeeCompliance);
      validations.push(...paymentValidation.violations);
      recommendations.push(...paymentValidation.recommendations);
    }

    // Business compliance validation
    if (organizerCompliance?.requirements.business) {
      const businessValidation = await this.validateBusinessCompliance(event.organizer, organizerCompliance);
      validations.push(...businessValidation.violations);
      recommendations.push(...businessValidation.recommendations);
    }

    return {
      isCompliant: validations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
      violations: validations,
      recommendations,
      warnings
    };
  }

  private async validateTaxation(booking: any, compliance: RegionalCompliance): Promise<ComplianceValidation> {
    const violations: ComplianceViolation[] = [];
    const recommendations: string[] = [];

    const { taxation } = compliance.requirements;

    // Check if tax calculation is required
    if (taxation.gstRate || taxation.vatRate) {
      if (!booking.taxAmount || booking.taxAmount === 0) {
        violations.push({
          type: 'taxation',
          code: 'TAX_CALCULATION_MISSING',
          message: `Tax calculation is required for ${compliance.country}`,
          severity: 'high',
          requirement: 'Tax calculation',
          suggestion: 'Calculate and include appropriate tax amount'
        });
      }
    }

    // Check tax ID requirements
    if (taxation.taxIdRequired && !booking.taxId) {
      violations.push({
        type: 'taxation',
        code: 'TAX_ID_MISSING',
        message: `Tax ID is required for ${compliance.country}`,
        severity: 'medium',
        requirement: 'Tax ID',
        suggestion: 'Collect and validate tax ID'
      });
    }

    return { isCompliant: violations.length === 0, violations, recommendations, warnings: [] };
  }

  private async validatePrivacyConsent(booking: any, user: any, compliance: RegionalCompliance): Promise<ComplianceValidation> {
    const violations: ComplianceViolation[] = [];
    const recommendations: string[] = [];

    const { privacy } = compliance.requirements;

    // Check consent requirements
    if (privacy.consentRequired && !user.privacyConsent) {
      violations.push({
        type: 'privacy',
        code: 'CONSENT_MISSING',
        message: `Privacy consent is required for ${compliance.country}`,
        severity: 'high',
        requirement: 'Privacy consent',
        suggestion: 'Obtain explicit consent for data processing'
      });
    }

    // Check data residency
    if (privacy.dataResidency && user.dataRegion !== compliance.region) {
      violations.push({
        type: 'privacy',
        code: 'DATA_RESIDENCY_VIOLATION',
        message: `Data must be stored in ${compliance.country}`,
        severity: 'critical',
        requirement: 'Data residency',
        suggestion: 'Ensure data is stored in compliant region'
      });
    }

    return { isCompliant: violations.length === 0, violations, recommendations, warnings: [] };
  }

  private async validatePaymentMethod(booking: any, compliance: RegionalCompliance): Promise<ComplianceValidation> {
    const violations: ComplianceViolation[] = [];
    const recommendations: string[] = [];

    const { payment } = compliance.requirements;

    // Check required payment methods
    if (payment.requiredMethods.length > 0) {
      const hasRequiredMethod = payment.requiredMethods.some(method => 
        booking.paymentMethods?.includes(method)
      );
      
      if (!hasRequiredMethod) {
        violations.push({
          type: 'payment',
          code: 'REQUIRED_PAYMENT_METHOD_MISSING',
          message: `Required payment method not available for ${compliance.country}`,
          severity: 'medium',
          requirement: 'Payment method',
          suggestion: `Add one of: ${payment.requiredMethods.join(', ')}`
        });
      }
    }

    // Check currency requirements
    if (payment.cadRequired && booking.currency !== 'CAD') {
      violations.push({
        type: 'payment',
        code: 'CURRENCY_NOT_SUPPORTED',
        message: 'CAD currency is required for Canada',
        severity: 'high',
        requirement: 'Currency support',
        suggestion: 'Add CAD currency support'
      });
    }

    return { isCompliant: violations.length === 0, violations, recommendations, warnings: [] };
  }

  private async validateBusinessCompliance(organizer: any, compliance: RegionalCompliance): Promise<ComplianceValidation> {
    const violations: ComplianceViolation[] = [];
    const recommendations: string[] = [];

    const { business } = compliance.requirements;

    // Check business registration
    if (business.businessRegistration && !organizer.businessNumber) {
      violations.push({
        type: 'business',
        code: 'BUSINESS_REGISTRATION_MISSING',
        message: `Business registration is required for ${compliance.country}`,
        severity: 'high',
        requirement: 'Business registration',
        suggestion: 'Verify business registration status'
      });
    }

    // Check language requirements
    if (business.languageRequirements && business.languageRequirements.length > 0) {
      const hasRequiredLanguage = business.languageRequirements.some(lang => 
        organizer.supportedLanguages?.includes(lang)
      );
      
      if (!hasRequiredLanguage) {
        violations.push({
          type: 'business',
          code: 'LANGUAGE_REQUIREMENT_MISSING',
          message: `Language support required: ${business.languageRequirements.join(', ')}`,
          severity: 'medium',
          requirement: 'Language support',
          suggestion: `Add support for: ${business.languageRequirements.join(', ')}`
        });
      }
    }

    return { isCompliant: violations.length === 0, violations, recommendations, warnings: [] };
  }

  public async generateComplianceReport(region: string): Promise<any> {
    const compliance = this.getRegionalCompliance(region);
    if (!compliance) {
      throw new Error(`Compliance configuration not found for region: ${region}`);
    }

    return {
      region: compliance.region,
      country: compliance.country,
      currency: compliance.currency,
      timezone: compliance.timezone,
      requirements: compliance.requirements,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}
