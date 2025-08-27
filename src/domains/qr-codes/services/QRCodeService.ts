import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { QRCode as QRCodeModel, QRCodeData, QRCodeFormat, QRCodeStatus, QRCodeError, GenerateQRCodeRequest, RegenerateQRCodeRequest } from '../models/QRCode';
import { QRCodeRepository } from '../repositories/QRCodeRepository';
import { logger } from '../../../shared/utils/logger';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ValidationError, NotFoundError } from '../../../shared/errors/DomainError';

export class QRCodeService {
  private readonly qrCodeRepository: QRCodeRepository;
  private readonly metricsManager: MetricsManager;
  private readonly secretKey: string;
  private readonly qrCodeExpiryHours: number;
  private readonly qrCodeImageSize: number;
  private readonly qrCodeErrorCorrectionLevel: string;

  constructor(
    qrCodeRepository: QRCodeRepository,
    secretKey?: string,
    qrCodeExpiryHours: number = 24,
    qrCodeImageSize: number = 300,
    qrCodeErrorCorrectionLevel: string = 'H'
  ) {
    this.qrCodeRepository = qrCodeRepository;
    this.metricsManager = MetricsManager.getInstance();
    this.secretKey = secretKey || process.env.QR_CODE_SECRET_KEY || 'default-secret-key';
    this.qrCodeExpiryHours = qrCodeExpiryHours;
    this.qrCodeImageSize = qrCodeImageSize;
    this.qrCodeErrorCorrectionLevel = qrCodeErrorCorrectionLevel;
  }

  /**
   * Generate QR code for booking
   */
  async generateQRCode(request: GenerateQRCodeRequest): Promise<QRCodeModel> {
    try {
      // Validate booking exists and is confirmed
      const booking = await this.getBookingDetails(request.bookingId);
      if (!booking) {
        throw new NotFoundError('Booking', request.bookingId);
      }

      if (booking.status !== 'CONFIRMED') {
        throw new ValidationError('Booking must be confirmed to generate QR code');
      }

      // Check if QR code already exists
      const existingQRCode = await this.qrCodeRepository.getQRCodeByBooking(request.bookingId);
      if (existingQRCode && existingQRCode.status === QRCodeStatus.ACTIVE) {
        throw new ValidationError('QR code already exists for this booking');
      }

      // Generate QR code data
      const qrCodeData = await this.generateQRCodeData(booking, request.format || QRCodeFormat.HYBRID);
      
      // Encrypt QR code data
      const encryptedData = this.encryptQRData(qrCodeData);
      
      // Generate QR code image
      const qrCodeImage = await this.generateQRCodeImage(qrCodeData, request.format || QRCodeFormat.HYBRID);
      
      // Create QR code record
      const qrCode: QRCodeModel = {
        id: uuidv4(),
        bookingId: request.bookingId,
        eventId: booking.eventId,
        attendeeId: booking.attendeeId,
        qrCodeData: encryptedData,
        qrCodeUrl: `${process.env.API_BASE_URL || 'https://api.eventplatform.com'}/qr-codes/${qrCodeData.bookingId}`,
        qrCodeImage: qrCodeImage,
        format: request.format || QRCodeFormat.HYBRID,
        status: QRCodeStatus.ACTIVE,
        singleUse: request.singleUse ?? true,
        maxValidations: request.maxValidations ?? 1,
        validationCount: 0,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (request.expiryHours || this.qrCodeExpiryHours) * 60 * 60 * 1000).toISOString(),
        metadata: {
          eventName: booking.eventName,
          attendeeName: booking.attendeeName,
          ticketType: booking.ticketType
        }
      };

      // Save to database
      const savedQRCode = await this.qrCodeRepository.createQRCode(qrCode);
      
      logger.info('QR code generated successfully', {
        qrCodeId: savedQRCode.id,
        bookingId: request.bookingId,
        eventId: booking.eventId,
        format: savedQRCode.format
      });

      return savedQRCode;
    } catch (error: any) {
      logger.error('Failed to generate QR code', {
        error: error.message,
        bookingId: request.bookingId
      });
      throw error;
    }
  }

  /**
   * Generate validation URL for QR code
   */
  async generateValidationURL(qrCodeId: string): Promise<string> {
    const qrCode = await this.qrCodeRepository.getQRCode(qrCodeId);
    if (!qrCode) {
      throw new NotFoundError('QR Code', qrCodeId);
    }

    return `${process.env.API_BASE_URL || 'https://api.eventplatform.com'}/validation/validate/${qrCodeId}`;
  }

  /**
   * Regenerate QR code (for lost/stolen tickets)
   */
  async regenerateQRCode(request: RegenerateQRCodeRequest): Promise<QRCodeModel> {
    try {
      // Revoke existing QR code
      const existingQRCode = await this.qrCodeRepository.getQRCodeByBooking(request.bookingId);
      if (existingQRCode) {
        await this.qrCodeRepository.revokeQRCode(existingQRCode.id);
        logger.info('Existing QR code revoked for regeneration', {
          qrCodeId: existingQRCode.id,
          bookingId: request.bookingId,
          reason: request.reason
        });
      }

      // Generate new QR code
      const newQRCode = await this.generateQRCode({
        bookingId: request.bookingId,
        format: QRCodeFormat.HYBRID,
        singleUse: true,
        maxValidations: 1
      });

      logger.info('QR code regenerated successfully', {
        oldQRCodeId: existingQRCode?.id,
        newQRCodeId: newQRCode.id,
        bookingId: request.bookingId,
        reason: request.reason
      });

      return newQRCode;
    } catch (error: any) {
      logger.error('Failed to regenerate QR code', {
        error: error.message,
        bookingId: request.bookingId
      });
      throw error;
    }
  }

  /**
   * Revoke QR code
   */
  async revokeQRCode(qrCodeId: string): Promise<void> {
    try {
      const qrCode = await this.qrCodeRepository.getQRCode(qrCodeId);
      if (!qrCode) {
        throw new NotFoundError('QR Code', qrCodeId);
      }

      await this.qrCodeRepository.revokeQRCode(qrCodeId);
      
      this.metricsManager.recordBusinessMetric(BusinessMetricName.QR_CODES_REVOKED, 1);
      
      logger.info('QR code revoked successfully', { qrCodeId });
    } catch (error: any) {
      logger.error('Failed to revoke QR code', {
        error: error.message,
        qrCodeId
      });
      throw error;
    }
  }

  /**
   * Get QR code status
   */
  async getQRCodeStatus(qrCodeId: string): Promise<QRCodeStatus> {
    try {
      const qrCode = await this.qrCodeRepository.getQRCode(qrCodeId);
      if (!qrCode) {
        throw new NotFoundError('QR Code', qrCodeId);
      }

      return qrCode.status;
    } catch (error: any) {
      logger.error('Failed to get QR code status', {
        error: error.message,
        qrCodeId
      });
      throw error;
    }
  }

  /**
   * Get QR codes for event
   */
  async getEventQRCodes(eventId: string): Promise<QRCodeModel[]> {
    try {
      const qrCodes = await this.qrCodeRepository.getEventQRCodes(eventId);
      
      logger.info('Retrieved QR codes for event', {
        eventId,
        count: qrCodes.length
      });

      return qrCodes;
    } catch (error: any) {
      logger.error('Failed to get event QR codes', {
        error: error.message,
        eventId
      });
      throw error;
    }
  }

  /**
   * Clean up expired QR codes
   */
  async cleanupExpiredQRCodes(): Promise<void> {
    try {
      const expiredQRCodes = await this.qrCodeRepository.getExpiredQRCodes();
      
      for (const qrCode of expiredQRCodes) {
        await this.qrCodeRepository.updateQRCodeStatus(qrCode.id, QRCodeStatus.EXPIRED);
      }

      this.metricsManager.recordBusinessMetric(BusinessMetricName.QR_CODES_EXPIRED, expiredQRCodes.length);
      
      logger.info('Expired QR codes cleaned up', {
        count: expiredQRCodes.length
      });
    } catch (error: any) {
      logger.error('Failed to cleanup expired QR codes', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate QR code data
   */
  private async generateQRCodeData(booking: any, format: QRCodeFormat): Promise<QRCodeData> {
    const checksum = this.generateChecksum(booking);
    
    const qrCodeData: QRCodeData = {
      bookingId: booking.id,
      eventId: booking.eventId,
      attendeeId: booking.attendeeId,
      eventName: booking.eventName,
      attendeeName: booking.attendeeName,
      ticketType: booking.ticketType,
      validFrom: booking.validFrom || new Date().toISOString(),
      validUntil: booking.validUntil || new Date(Date.now() + this.qrCodeExpiryHours * 60 * 60 * 1000).toISOString(),
      checksum
    };

    return qrCodeData;
  }

  /**
   * Generate QR code image
   */
  private async generateQRCodeImage(qrCodeData: QRCodeData, format: QRCodeFormat): Promise<string> {
    let qrCodeContent: string;

    switch (format) {
      case QRCodeFormat.URL:
        qrCodeContent = `${process.env.API_BASE_URL || 'https://api.eventplatform.com'}/validation/validate/${qrCodeData.bookingId}`;
        break;
      case QRCodeFormat.JSON:
        qrCodeContent = JSON.stringify(qrCodeData);
        break;
      case QRCodeFormat.TEXT:
        qrCodeContent = `${qrCodeData.bookingId}-${qrCodeData.eventId}-${qrCodeData.attendeeId}`;
        break;
      case QRCodeFormat.HYBRID:
      default:
        qrCodeContent = JSON.stringify({
          url: `${process.env.API_BASE_URL || 'https://api.eventplatform.com'}/validation/validate/${qrCodeData.bookingId}`,
          data: qrCodeData
        });
        break;
    }

    try {
      const qrCodeImage = await QRCode.toDataURL(qrCodeContent, {
        errorCorrectionLevel: this.qrCodeErrorCorrectionLevel as any,
        type: 'image/png',
        margin: 1,
        width: this.qrCodeImageSize,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeImage;
    } catch (error: any) {
      logger.error('Failed to generate QR code image', {
        error: error.message,
        format
      });
      throw new Error('Failed to generate QR code image');
    }
  }

  /**
   * Encrypt QR code data
   */
  private encryptQRData(data: QRCodeData): string {
    try {
      const jsonData = JSON.stringify(data);
      const cipher = crypto.createCipher('aes-256-gcm', this.secretKey);
      let encrypted = cipher.update(jsonData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      return `${encrypted}:${authTag.toString('hex')}`;
    } catch (error: any) {
      logger.error('Failed to encrypt QR code data', {
        error: error.message
      });
      throw new Error('Failed to encrypt QR code data');
    }
  }

  /**
   * Decrypt QR code data
   */
  decryptQRData(encryptedData: string): QRCodeData {
    try {
      const [encrypted, authTagHex] = encryptedData.split(':');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher('aes-256-gcm', this.secretKey);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error: any) {
      logger.error('Failed to decrypt QR code data', {
        error: error.message
      });
      throw new Error('Failed to decrypt QR code data');
    }
  }

  /**
   * Generate checksum for data integrity
   */
  private generateChecksum(data: any): string {
    const content = `${data.id}-${data.eventId}-${data.attendeeId}-${data.eventName}-${data.attendeeName}`;
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Verify checksum
   */
  private verifyChecksum(data: any, checksum: string): boolean {
    const expectedChecksum = this.generateChecksum(data);
    return expectedChecksum === checksum;
  }

  /**
   * Get booking details (placeholder - would integrate with booking service)
   */
  private async getBookingDetails(bookingId: string): Promise<any> {
    // This would integrate with the actual booking service
    // For now, return a mock booking
    return {
      id: bookingId,
      eventId: 'event-uuid',
      attendeeId: 'attendee-uuid',
      eventName: 'Tech Conference 2024',
      attendeeName: 'John Doe',
      ticketType: 'VIP',
      status: 'CONFIRMED',
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + this.qrCodeExpiryHours * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Get error message for QR code errors
   */
  getErrorMessage(error: QRCodeError): string {
    const messages = {
      [QRCodeError.QR_CODE_NOT_FOUND]: 'QR code not found or invalid',
      [QRCodeError.QR_CODE_EXPIRED]: 'QR code has expired',
      [QRCodeError.QR_CODE_ALREADY_USED]: 'QR code has already been used',
      [QRCodeError.QR_CODE_REVOKED]: 'QR code has been revoked',
      [QRCodeError.BOOKING_NOT_CONFIRMED]: 'Booking is not confirmed',
      [QRCodeError.EVENT_NOT_ACTIVE]: 'Event is not active',
      [QRCodeError.INVALID_QR_DATA]: 'Invalid QR code data',
      [QRCodeError.DECRYPTION_FAILED]: 'Failed to decrypt QR code data',
      [QRCodeError.VALIDATION_LIMIT_EXCEEDED]: 'Validation limit exceeded'
    };
    
    return messages[error] || 'Unknown error occurred';
  }
}
