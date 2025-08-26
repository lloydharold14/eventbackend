export interface ValidationResult {
  valid: boolean;
  qrCodeId: string;
  bookingId: string;
  eventId: string;
  attendeeId: string;
  attendeeName: string;
  eventName: string;
  ticketType: string;
  validationTime: string;
  validationId: string;
  reason?: string;
  status?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface CheckInResult extends ValidationResult {
  checkInTime: string;
  checkInLocation?: string;
  validatorId: string;
  deviceInfo?: string;
}

export interface CheckOutResult extends ValidationResult {
  checkOutTime: string;
  checkOutLocation?: string;
  validatorId: string;
  deviceInfo?: string;
  duration?: number; // Duration in minutes
}

export interface ValidationLog {
  validationId: string;
  qrCodeId: string;
  bookingId: string;
  eventId: string;
  attendeeId: string;
  validatorId: string;
  validationResult: 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'ALREADY_USED';
  validationTime: string;
  location?: string;
  deviceInfo?: string;
  notes?: string;
  scenario?: ValidationScenario;
}

export enum ValidationScenario {
  ENTRY = 'entry',           // First entry
  RE_ENTRY = 're_entry',     // Multiple entries allowed
  EXIT = 'exit',             // Check-out
  TRANSFER = 'transfer',     // Transfer to another person
  REPLACEMENT = 'replacement' // Lost ticket replacement
}

export interface ValidationRequest {
  qrCodeId: string;
  validatorId: string;
  scenario?: ValidationScenario;
  location?: string;
  deviceInfo?: string;
  notes?: string;
}

export interface BatchValidationRequest {
  qrCodeIds: string[];
  validatorId: string;
  scenario?: ValidationScenario;
  location?: string;
  deviceInfo?: string;
}

export interface ValidationResponse {
  success: boolean;
  data?: {
    valid: boolean;
    qrCodeId: string;
    bookingId: string;
    attendeeName: string;
    eventName: string;
    ticketType: string;
    validationTime: string;
    validationId: string;
    message: string;
    warnings?: string[];
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ValidationStatistics {
  eventId: string;
  totalBookings: number;
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  checkIns: number;
  checkOuts: number;
  averageValidationTime: number;
  validationRate: number; // Percentage of successful validations
  lastValidationTime?: string;
  peakValidationTime?: string;
}

export interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageValidationTime: number;
  qrCodesGenerated: number;
  qrCodesExpired: number;
  offlineValidations: number;
  concurrentValidations: number;
}
