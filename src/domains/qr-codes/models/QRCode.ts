export interface QRCodeData {
  bookingId: string;
  eventId: string;
  attendeeId: string;
  eventName: string;
  attendeeName: string;
  ticketType: string;
  validFrom: string;
  validUntil: string;
  checksum: string; // For integrity verification
}

export interface QRCode {
  id: string;
  bookingId: string;
  eventId: string;
  attendeeId: string;
  qrCodeData: string; // Encrypted data
  qrCodeUrl: string; // Generated image URL
  qrCodeImage: string; // Base64 image data
  format: QRCodeFormat;
  status: QRCodeStatus;
  singleUse: boolean;
  maxValidations: number;
  validationCount: number;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  usedBy?: string;
  lastValidatedAt?: string;
  metadata?: Record<string, any>;
}

export enum QRCodeFormat {
  URL = 'url',           // Direct validation URL
  JSON = 'json',         // Encrypted JSON data
  TEXT = 'text',         // Simple text format
  HYBRID = 'hybrid'      // Both URL and encrypted data
}

export enum QRCodeStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  PENDING = 'PENDING'
}

export enum QRCodeError {
  QR_CODE_NOT_FOUND = 'QR_CODE_NOT_FOUND',
  QR_CODE_EXPIRED = 'QR_CODE_EXPIRED',
  QR_CODE_ALREADY_USED = 'QR_CODE_ALREADY_USED',
  QR_CODE_REVOKED = 'QR_CODE_REVOKED',
  BOOKING_NOT_CONFIRMED = 'BOOKING_NOT_CONFIRMED',
  EVENT_NOT_ACTIVE = 'EVENT_NOT_ACTIVE',
  INVALID_QR_DATA = 'INVALID_QR_DATA',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  VALIDATION_LIMIT_EXCEEDED = 'VALIDATION_LIMIT_EXCEEDED'
}

export interface GenerateQRCodeRequest {
  bookingId: string;
  format?: QRCodeFormat;
  singleUse?: boolean;
  maxValidations?: number;
  expiryHours?: number;
}

export interface RegenerateQRCodeRequest {
  bookingId: string;
  reason?: string;
}

export interface QRCodeResponse {
  success: boolean;
  data?: {
    qrCode: QRCode;
    qrCodeUrl: string;
    qrCodeImage: string;
    message: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
