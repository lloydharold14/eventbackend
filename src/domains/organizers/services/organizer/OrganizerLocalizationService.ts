import { 
  Organizer, 
  LocalizationPreferences, 
  ComplianceSettings, 
  TaxSettings 
} from '../../models/Organizer';

// Multi-Country Localization Service
export class OrganizerLocalizationService {
  private static instance: OrganizerLocalizationService;
  
  // Supported Countries and Currencies
  private readonly supportedCountries = {
    'US': { currency: 'USD', timezone: 'America/New_York', locale: 'en-US' },
    'CA': { currency: 'CAD', timezone: 'America/Toronto', locale: 'en-CA' },
    'GB': { currency: 'GBP', timezone: 'Europe/London', locale: 'en-GB' },
    'FR': { currency: 'EUR', timezone: 'Europe/Paris', locale: 'fr-FR' },
    'DE': { currency: 'EUR', timezone: 'Europe/Berlin', locale: 'de-DE' },
    'ES': { currency: 'EUR', timezone: 'Europe/Madrid', locale: 'es-ES' },
    'IT': { currency: 'EUR', timezone: 'Europe/Rome', locale: 'it-IT' },
    'AU': { currency: 'AUD', timezone: 'Australia/Sydney', locale: 'en-AU' },
    'JP': { currency: 'JPY', timezone: 'Asia/Tokyo', locale: 'ja-JP' },
    'BR': { currency: 'BRL', timezone: 'America/Sao_Paulo', locale: 'pt-BR' },
    'MX': { currency: 'MXN', timezone: 'America/Mexico_City', locale: 'es-MX' },
    'IN': { currency: 'INR', timezone: 'Asia/Kolkata', locale: 'en-IN' },
    'SG': { currency: 'SGD', timezone: 'Asia/Singapore', locale: 'en-SG' },
    'BJ': { currency: 'XOF', timezone: 'Africa/Porto-Novo', locale: 'fr-BJ' },
    'TG': { currency: 'XOF', timezone: 'Africa/Lome', locale: 'fr-TG' },
    'GH': { currency: 'GHS', timezone: 'Africa/Accra', locale: 'en-GH' },
    'NG': { currency: 'NGN', timezone: 'Africa/Lagos', locale: 'en-NG' }
  };

  // Regional Tax Rates
  private readonly regionalTaxRates = {
    'CA': {
      'ON': { gst: 0.05, hst: 0.13 },
      'BC': { gst: 0.05, pst: 0.07 },
      'AB': { gst: 0.05 },
      'QC': { gst: 0.05, qst: 0.09975 },
      'NS': { gst: 0.05, hst: 0.15 },
      'NB': { gst: 0.05, hst: 0.15 },
      'NL': { gst: 0.05, hst: 0.15 },
      'PE': { gst: 0.05, hst: 0.15 },
      'MB': { gst: 0.05, pst: 0.07 },
      'SK': { gst: 0.05, pst: 0.06 },
      'NT': { gst: 0.05 },
      'NU': { gst: 0.05 },
      'YT': { gst: 0.05 }
    },
    'US': {
      'CA': { salesTax: 0.0725 },
      'NY': { salesTax: 0.08 },
      'TX': { salesTax: 0.0625 },
      'FL': { salesTax: 0.06 },
      'IL': { salesTax: 0.0625 }
    },
    'EU': {
      'DE': { vat: 0.19 },
      'FR': { vat: 0.20 },
      'IT': { vat: 0.22 },
      'ES': { vat: 0.21 },
      'NL': { vat: 0.21 }
    }
  };

  // Regional Compliance Requirements
  private readonly complianceRequirements = {
    'CA': {
      gdprCompliant: false,
      pipedaCompliant: true,
      ccpaCompliant: false,
      dataResidency: 'CA',
      consentManagement: true,
      dataRetentionPolicy: '7 years',
      taxRegistration: 'GST/HST',
      businessRegistration: 'Provincial + Federal'
    },
    'US': {
      gdprCompliant: false,
      pipedaCompliant: false,
      ccpaCompliant: true,
      dataResidency: 'US',
      consentManagement: false,
      dataRetentionPolicy: '3 years',
      taxRegistration: 'EIN',
      businessRegistration: 'State + Federal'
    },
    'EU': {
      gdprCompliant: true,
      pipedaCompliant: false,
      ccpaCompliant: false,
      dataResidency: 'EU',
      consentManagement: true,
      dataRetentionPolicy: '5 years',
      taxRegistration: 'VAT',
      businessRegistration: 'National + EU'
    }
  };

  // Regional Business Hours
  private readonly regionalBusinessHours = {
    'CA': {
      default: { startTime: '09:00', endTime: '17:00', timezone: 'America/Toronto' },
      'ON': { startTime: '09:00', endTime: '17:00', timezone: 'America/Toronto' },
      'BC': { startTime: '08:00', endTime: '16:00', timezone: 'America/Vancouver' }
    },
    'US': {
      default: { startTime: '09:00', endTime: '17:00', timezone: 'America/New_York' },
      'CA': { startTime: '08:00', endTime: '16:00', timezone: 'America/Los_Angeles' },
      'TX': { startTime: '08:00', endTime: '16:00', timezone: 'America/Chicago' }
    },
    'EU': {
      default: { startTime: '09:00', endTime: '17:00', timezone: 'Europe/Paris' },
      'DE': { startTime: '08:00', endTime: '16:00', timezone: 'Europe/Berlin' },
      'IT': { startTime: '09:00', endTime: '18:00', timezone: 'Europe/Rome' }
    }
  };

  private constructor() {}

  public static getInstance(): OrganizerLocalizationService {
    if (!OrganizerLocalizationService.instance) {
      OrganizerLocalizationService.instance = new OrganizerLocalizationService();
    }
    return OrganizerLocalizationService.instance;
  }

  // Detect user's locale based on various factors
  public detectLocale(params: {
    headers?: Record<string, string>;
    country?: string;
    userPreferences?: { language?: string; locale?: string };
    ipLocation?: { country: string; region: string };
  }): string {
    // Priority 1: User preferences
    if (params.userPreferences?.locale) {
      return params.userPreferences.locale;
    }

    // Priority 2: Country-based default
    if (params.country) {
      const countryInfo = this.supportedCountries[params.country as keyof typeof this.supportedCountries];
      if (countryInfo) {
        return countryInfo.locale;
      }
    }

    // Priority 3: IP location
    if (params.ipLocation?.country) {
      const countryInfo = this.supportedCountries[params.ipLocation.country as keyof typeof this.supportedCountries];
      if (countryInfo) {
        return countryInfo.locale;
      }
    }

    // Priority 4: Accept-Language header
    if (params.headers?.['accept-language']) {
      const preferredLanguage = this.parseAcceptLanguage(params.headers['accept-language']);
      if (preferredLanguage) {
        return preferredLanguage;
      }
    }

    // Priority 5: Default fallback
    return 'en-US';
  }

  // Get default localization preferences for a country
  public getDefaultLocalizationPreferences(country: string): LocalizationPreferences {
    const countryInfo = this.supportedCountries[country as keyof typeof this.supportedCountries];
    
    if (!countryInfo) {
      throw new Error(`Unsupported country: ${country}`);
    }

    const locale = countryInfo.locale;
    const [language] = locale.split('-');

    return {
      preferredLanguages: [language, 'en'],
      defaultLocale: locale,
      autoLocalization: true,
      localizePricing: true,
      dateFormat: this.getDateFormatForCountry(country),
      timeFormat: this.getTimeFormatForCountry(country),
      numberFormat: this.getNumberFormatForCountry(country)
    };
  }

  // Get compliance settings for a country
  public getComplianceSettings(country: string): ComplianceSettings {
    const compliance = this.complianceRequirements[country as keyof typeof this.complianceRequirements];
    
    if (!compliance) {
      // Return default compliance settings
      return {
        gdprCompliant: false,
        pipedaCompliant: false,
        ccpaCompliant: false,
        dataResidency: country,
        consentManagement: false,
        dataRetentionPolicy: '3 years'
      };
    }

    return compliance;
  }

  // Get tax settings for a country and region
  public getTaxSettings(country: string, region?: string): TaxSettings {
    const countryTaxRates = this.regionalTaxRates[country as keyof typeof this.regionalTaxRates];
    
    if (!countryTaxRates) {
      return {
        taxExempt: false,
        automaticTaxCalculation: true,
        taxRates: {},
        taxInclusive: false,
        taxRegistrationNumbers: {}
      };
    }

    const taxRates: Record<string, number> = {};
    
    if (region && countryTaxRates[region as keyof typeof countryTaxRates]) {
      const regionalRates = countryTaxRates[region as keyof typeof countryTaxRates];
      Object.entries(regionalRates).forEach(([taxType, rate]) => {
        taxRates[taxType] = rate as number;
      });
    }

    return {
      taxExempt: false,
      automaticTaxCalculation: true,
      taxRates,
      taxInclusive: false,
      taxRegistrationNumbers: {}
    };
  }

  // Get business hours for a country and region
  public getBusinessHours(country: string, region?: string) {
    const countryBusinessHours = this.regionalBusinessHours[country as keyof typeof this.regionalBusinessHours];
    
    if (!countryBusinessHours) {
      return {
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'UTC'
      };
    }

    if (region && countryBusinessHours[region as keyof typeof countryBusinessHours]) {
      return countryBusinessHours[region as keyof typeof countryBusinessHours];
    }

    return countryBusinessHours.default || {
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'UTC'
    };
  }

  // Get supported currencies for a country
  public getSupportedCurrencies(country: string): string[] {
    const countryInfo = this.supportedCountries[country as keyof typeof this.supportedCountries];
    
    if (!countryInfo) {
      return ['USD'];
    }

    // Return primary currency + major international currencies
    return [
      countryInfo.currency,
      'USD',
      'EUR',
      'GBP',
      'CAD'
    ].filter((currency, index, array) => array.indexOf(currency) === index);
  }

  // Get exchange rate for currency conversion
  public async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // This would integrate with a real exchange rate service
    // For now, return mock rates
    const mockRates: Record<string, Record<string, number>> = {
      'USD': {
        'CAD': 1.35,
        'EUR': 0.85,
        'GBP': 0.73,
        'JPY': 110.0
      },
      'CAD': {
        'USD': 0.74,
        'EUR': 0.63,
        'GBP': 0.54,
        'JPY': 81.5
      },
      'EUR': {
        'USD': 1.18,
        'CAD': 1.59,
        'GBP': 0.86,
        'JPY': 129.4
      }
    };

    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    if (mockRates[fromCurrency]?.[toCurrency]) {
      return mockRates[fromCurrency][toCurrency];
    }

    // Fallback: try reverse rate
    if (mockRates[toCurrency]?.[fromCurrency]) {
      return 1 / mockRates[toCurrency][fromCurrency];
    }

    // Default fallback
    return 1.0;
  }

  // Format currency for display
  public formatCurrency(amount: number, currency: string, locale: string): string {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return formatter.format(amount);
  }

  // Format date for locale
  public formatDate(date: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    const formatter = new Intl.DateTimeFormat(locale, options || defaultOptions);
    return formatter.format(date);
  }

  // Format number for locale
  public formatNumber(number: number, locale: string, options?: Intl.NumberFormatOptions): string {
    const defaultOptions: Intl.NumberFormatOptions = {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    };

    const formatter = new Intl.NumberFormat(locale, options || defaultOptions);
    return formatter.format(number);
  }

  // Get localized text
  public getLocalizedText(key: string, locale: string, fallback?: string): string {
    // This would integrate with a translation service
    // For now, return the key or fallback
    return fallback || key;
  }

  // Validate locale
  public isValidLocale(locale: string): boolean {
    try {
      new Intl.NumberFormat(locale);
      return true;
    } catch {
      return false;
    }
  }

  // Get all supported countries
  public getSupportedCountries(): Record<string, { currency: string; timezone: string; locale: string }> {
    return this.supportedCountries;
  }

  // Private helper methods
  private parseAcceptLanguage(acceptLanguage: string): string | null {
    const languages = acceptLanguage.split(',').map(lang => {
      const [language, quality = '1'] = lang.trim().split(';q=');
      return { language: language.trim(), quality: parseFloat(quality) };
    });

    // Sort by quality and find first supported language
    languages.sort((a, b) => b.quality - a.quality);
    
    for (const lang of languages) {
      if (this.isValidLocale(lang.language)) {
        return lang.language;
      }
    }

    return null;
  }

  private getDateFormatForCountry(country: string): string {
    const dateFormats: Record<string, string> = {
      'US': 'MM/DD/YYYY',
      'CA': 'MM/DD/YYYY',
      'GB': 'DD/MM/YYYY',
      'EU': 'DD/MM/YYYY',
      'JP': 'YYYY/MM/DD'
    };

    return dateFormats[country] || 'MM/DD/YYYY';
  }

  private getTimeFormatForCountry(country: string): '12h' | '24h' {
    const timeFormats: Record<string, '12h' | '24h'> = {
      'US': '12h',
      'CA': '12h',
      'GB': '24h',
      'EU': '24h',
      'JP': '24h'
    };

    return timeFormats[country] || '12h';
  }

  private getNumberFormatForCountry(country: string): 'comma' | 'dot' {
    const numberFormats: Record<string, 'comma' | 'dot'> = {
      'US': 'comma',
      'CA': 'comma',
      'GB': 'comma',
      'EU': 'dot',
      'JP': 'dot'
    };

    return numberFormats[country] || 'comma';
  }
}
