import { v4 as uuidv4 } from 'uuid';
import { 
  ValidationResult, 
  CheckInResult, 
  CheckOutResult, 
  ValidationLog, 
  ValidationScenario, 
  ValidationRequest, 
  BatchValidationRequest,
  ValidationStatistics,
  ValidationMetrics
} from '../models/ValidationResult';
import { QRCodeRepository } from '../../qr-codes/repositories/QRCodeRepository';
import { ValidationLogRepository } from '../repositories/ValidationLogRepository';
import { QRCodeService } from '../../qr-codes/services/QRCodeService';
import { QRCodeStatus, QRCodeError } from '../../qr-codes/models/QRCode';
import { logger } from '../../../shared/utils/logger';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ValidationError, NotFoundError } from '../../../shared/errors/DomainError';

export class AttendeeValidationService {
  private readonly qrCodeRepository: QRCodeRepository;
  private readonly validationLogRepository: ValidationLogRepository;
  private readonly qrCodeService: QRCodeService;
  private readonly metricsManager: MetricsManager;

  constructor(
    qrCodeRepository: QRCodeRepository,
    validationLogRepository: ValidationLogRepository,
    qrCodeService: QRCodeService
  ) {
    this.qrCodeRepository = qrCodeRepository;
    this.validationLogRepository = validationLogRepository;
    this.qrCodeService = qrCodeService;
    this.metricsManager = MetricsManager.getInstance();
  }

  /**
   * Validate QR code
   */
  async validateQRCode(request: ValidationRequest): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // 1. Check if QR code exists
      const qrCode = await this.qrCodeRepository.getQRCode(request.qrCodeId);
      if (!qrCode) {
        return await this.createFailedValidationResult(
          request.qrCodeId,
          QRCodeError.QR_CODE_NOT_FOUND,
          'QR code not found or invalid',
          request
        );
      }

      // 2. Check if QR code is active
      if (qrCode.status !== QRCodeStatus.ACTIVE) {
        return await this.createFailedValidationResult(
          request.qrCodeId,
          QRCodeError.QR_CODE_REVOKED,
          `QR code is ${qrCode.status.toLowerCase()}`,
          request
        );
      }

      // 3. Check expiration
      if (new Date() > new Date(qrCode.expiresAt)) {
        return await this.createFailedValidationResult(
          request.qrCodeId,
          QRCodeError.QR_CODE_EXPIRED,
          'QR code has expired',
          request
        );
      }

      // 4. Check if already used (if single-use)
      if (qrCode.validationCount > 0 && qrCode.singleUse) {
        return await this.createFailedValidationResult(
          request.qrCodeId,
          QRCodeError.QR_CODE_ALREADY_USED,
          'QR code has already been used',
          request
        );
      }

      // 5. Check validation limit
      if (qrCode.validationCount >= qrCode.maxValidations) {
        return await this.createFailedValidationResult(
          request.qrCodeId,
          QRCodeError.VALIDATION_LIMIT_EXCEEDED,
          'Validation limit exceeded',
          request
        );
      }

      // 6. Validate booking status (placeholder - would integrate with booking service)
      const booking = await this.getBookingDetails(qrCode.bookingId);
      if (!booking || booking.status !== 'CONFIRMED') {
        return await this.createFailedValidationResult(
          request.qrCodeId,
          QRCodeError.BOOKING_NOT_CONFIRMED,
          'Booking is not confirmed',
          request
        );
      }

      // 7. Check event timing (placeholder - would integrate with event service)
      const event = await this.getEventDetails(qrCode.eventId);
      if (!event) {
        return await this.createFailedValidationResult(
          request.qrCodeId,
          QRCodeError.EVENT_NOT_ACTIVE,
          'Event not found',
          request
        );
      }

      const now = new Date();
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);

      if (now < eventStart || now > eventEnd) {
        return await this.createFailedValidationResult(
          request.qrCodeId,
          QRCodeError.EVENT_NOT_ACTIVE,
          'Event is not active at this time',
          request
        );
      }

      // 8. Create successful validation result
      const validationResult = await this.createSuccessfulValidationResult(
        qrCode,
        booking,
        event,
        request
      );

      // 9. Update QR code validation count
      await this.qrCodeRepository.updateQRCodeStatus(
        qrCode.id,
        qrCode.singleUse && qrCode.validationCount === 0 ? QRCodeStatus.USED : QRCodeStatus.ACTIVE,
        qrCode.validationCount + 1
      );

      // 10. Log validation
      await this.logValidation(validationResult, request);

      const validationTime = Date.now() - startTime;
      this.metricsManager.recordBusinessMetric(BusinessMetricName.VALIDATIONS_SUCCESSFUL, 1);

      logger.info('QR code validated successfully', {
        qrCodeId: request.qrCodeId,
        validationTime,
        scenario: request.scenario,
        validatorId: request.validatorId
      });

      return validationResult;
    } catch (error: any) {
      const validationTime = Date.now() - startTime;
      this.metricsManager.recordBusinessMetric(BusinessMetricName.VALIDATIONS_FAILED, 1);

      logger.error('QR code validation failed', {
        error: error.message,
        qrCodeId: request.qrCodeId,
        validationTime
      });

      return await this.createFailedValidationResult(
        request.qrCodeId,
        QRCodeError.INVALID_QR_DATA,
        'Validation failed due to system error',
        request
      );
    }
  }

  /**
   * Validate offline (with cached data)
   */
  async validateOffline(qrCodeData: string): Promise<ValidationResult> {
    try {
      // Decrypt QR code data
      const decryptedData = this.qrCodeService.decryptQRData(qrCodeData);
      
      // Basic offline validation
      const now = new Date();
      const validFrom = new Date(decryptedData.validFrom);
      const validUntil = new Date(decryptedData.validUntil);

      if (now < validFrom || now > validUntil) {
        return {
          valid: false,
          qrCodeId: decryptedData.bookingId,
          bookingId: decryptedData.bookingId,
          eventId: decryptedData.eventId,
          attendeeId: decryptedData.attendeeId,
          attendeeName: decryptedData.attendeeName,
          eventName: decryptedData.eventName,
          ticketType: decryptedData.ticketType,
          validationTime: now.toISOString(),
          validationId: uuidv4(),
          reason: 'QR code expired or not yet valid',
          status: 'OFFLINE_VALIDATION'
        };
      }

      this.metricsManager.recordBusinessMetric(BusinessMetricName.OFFLINE_VALIDATIONS, 1);

      return {
        valid: true,
        qrCodeId: decryptedData.bookingId,
        bookingId: decryptedData.bookingId,
        eventId: decryptedData.eventId,
        attendeeId: decryptedData.attendeeId,
        attendeeName: decryptedData.attendeeName,
        eventName: decryptedData.eventName,
        ticketType: decryptedData.ticketType,
        validationTime: now.toISOString(),
        validationId: uuidv4(),
        status: 'OFFLINE_VALIDATION',
        warnings: ['Offline validation - limited verification performed']
      };
    } catch (error: any) {
      logger.error('Offline validation failed', {
        error: error.message
      });

      return {
        valid: false,
        qrCodeId: 'unknown',
        bookingId: 'unknown',
        eventId: 'unknown',
        attendeeId: 'unknown',
        attendeeName: 'unknown',
        eventName: 'unknown',
        ticketType: 'unknown',
        validationTime: new Date().toISOString(),
        validationId: uuidv4(),
        reason: 'Failed to decrypt QR code data',
        status: 'OFFLINE_VALIDATION_FAILED'
      };
    }
  }

  /**
   * Batch validation
   */
  async validateMultiple(request: BatchValidationRequest): Promise<ValidationResult[]> {
    const results = await Promise.all(
      request.qrCodeIds.map(qrCodeId => 
        this.validateQRCode({
          qrCodeId,
          validatorId: request.validatorId,
          scenario: request.scenario,
          location: request.location,
          deviceInfo: request.deviceInfo
        })
      )
    );

    logger.info('Batch validation completed', {
      total: request.qrCodeIds.length,
      successful: results.filter(r => r.valid).length,
      failed: results.filter(r => !r.valid).length,
      validatorId: request.validatorId
    });

    return results;
  }

  /**
   * Check-in attendee
   */
  async checkInAttendee(qrCodeId: string, validatorId: string, location?: string): Promise<CheckInResult> {
    const validationResult = await this.validateQRCode({
      qrCodeId,
      validatorId,
      scenario: ValidationScenario.ENTRY,
      location,
      deviceInfo: 'check-in-device'
    });

    if (!validationResult.valid) {
      return {
        ...validationResult,
        checkInTime: validationResult.validationTime,
        checkInLocation: location,
        validatorId,
        deviceInfo: 'check-in-device'
      };
    }

    const checkInResult: CheckInResult = {
      ...validationResult,
      checkInTime: validationResult.validationTime,
      checkInLocation: location,
      validatorId,
      deviceInfo: 'check-in-device'
    };

    logger.info('Attendee checked in successfully', {
      qrCodeId,
      attendeeName: checkInResult.attendeeName,
      eventName: checkInResult.eventName,
      validatorId
    });

    return checkInResult;
  }

  /**
   * Check-out attendee
   */
  async checkOutAttendee(qrCodeId: string, validatorId: string, location?: string): Promise<CheckOutResult> {
    const validationResult = await this.validateQRCode({
      qrCodeId,
      validatorId,
      scenario: ValidationScenario.EXIT,
      location,
      deviceInfo: 'check-out-device'
    });

    if (!validationResult.valid) {
      return {
        ...validationResult,
        checkOutTime: validationResult.validationTime,
        checkOutLocation: location,
        validatorId,
        deviceInfo: 'check-out-device'
      };
    }

    // Calculate duration if check-in time is available
    const checkInLog = await this.getCheckInLog(qrCodeId);
    let duration: number | undefined;
    
    if (checkInLog) {
      const checkInTime = new Date(checkInLog.validationTime);
      const checkOutTime = new Date(validationResult.validationTime);
      duration = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60)); // minutes
    }

    const checkOutResult: CheckOutResult = {
      ...validationResult,
      checkOutTime: validationResult.validationTime,
      checkOutLocation: location,
      validatorId,
      deviceInfo: 'check-out-device',
      duration
    };

    logger.info('Attendee checked out successfully', {
      qrCodeId,
      attendeeName: checkOutResult.attendeeName,
      eventName: checkOutResult.eventName,
      duration,
      validatorId
    });

    return checkOutResult;
  }

  /**
   * Get validation history
   */
  async getValidationHistory(qrCodeId: string): Promise<ValidationLog[]> {
    try {
      const history = await this.validationLogRepository.getValidationHistory(qrCodeId);
      
      logger.info('Retrieved validation history', {
        qrCodeId,
        count: history.length
      });

      return history;
    } catch (error: any) {
      logger.error('Failed to get validation history', {
        error: error.message,
        qrCodeId
      });
      throw error;
    }
  }

  /**
   * Get validation statistics for event
   */
  async getEventValidationStatistics(eventId: string, startDate?: string, endDate?: string): Promise<ValidationStatistics> {
    try {
      const statistics = await this.validationLogRepository.getValidationStatistics(eventId, startDate, endDate);
      
      logger.info('Retrieved event validation statistics', {
        eventId,
        totalValidations: statistics.totalValidations,
        validationRate: statistics.validationRate
      });

      return statistics;
    } catch (error: any) {
      logger.error('Failed to get event validation statistics', {
        error: error.message,
        eventId
      });
      throw error;
    }
  }

  /**
   * Get validation metrics
   */
  async getValidationMetrics(): Promise<ValidationMetrics> {
    try {
      // This would typically aggregate metrics from various sources
      // For now, return basic metrics
      const metrics: ValidationMetrics = {
        totalValidations: 0,
        successfulValidations: 0,
        failedValidations: 0,
        averageValidationTime: 0,
        qrCodesGenerated: 0,
        qrCodesExpired: 0,
        offlineValidations: 0,
        concurrentValidations: 0
      };

      return metrics;
    } catch (error: any) {
      logger.error('Failed to get validation metrics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create successful validation result
   */
  private async createSuccessfulValidationResult(
    qrCode: any,
    booking: any,
    event: any,
    request: ValidationRequest
  ): Promise<ValidationResult> {
    return {
      valid: true,
      qrCodeId: qrCode.id,
      bookingId: qrCode.bookingId,
      eventId: qrCode.eventId,
      attendeeId: qrCode.attendeeId,
      attendeeName: booking.attendeeName,
      eventName: event.name,
      ticketType: booking.ticketType,
      validationTime: new Date().toISOString(),
      validationId: uuidv4(),
      status: 'VALID',
      metadata: {
        scenario: request.scenario,
        location: request.location,
        deviceInfo: request.deviceInfo
      }
    };
  }

  /**
   * Create failed validation result
   */
  private async createFailedValidationResult(
    qrCodeId: string,
    error: QRCodeError,
    reason: string,
    request: ValidationRequest
  ): Promise<ValidationResult> {
    return {
      valid: false,
      qrCodeId,
      bookingId: 'unknown',
      eventId: 'unknown',
      attendeeId: 'unknown',
      attendeeName: 'unknown',
      eventName: 'unknown',
      ticketType: 'unknown',
      validationTime: new Date().toISOString(),
      validationId: uuidv4(),
      reason,
      status: 'INVALID',
      metadata: {
        error,
        scenario: request.scenario,
        location: request.location,
        deviceInfo: request.deviceInfo
      }
    };
  }

  /**
   * Log validation attempt
   */
  private async logValidation(validationResult: ValidationResult, request: ValidationRequest): Promise<void> {
    try {
      const log: ValidationLog = {
        validationId: validationResult.validationId,
        qrCodeId: validationResult.qrCodeId,
        bookingId: validationResult.bookingId,
        eventId: validationResult.eventId,
        attendeeId: validationResult.attendeeId,
        validatorId: request.validatorId,
        validationResult: validationResult.valid ? 'SUCCESS' : 'FAILED',
        validationTime: validationResult.validationTime,
        location: request.location,
        deviceInfo: request.deviceInfo,
        notes: request.notes,
        scenario: request.scenario
      };

      await this.validationLogRepository.createValidationLog(log);
    } catch (error: any) {
      logger.error('Failed to log validation', {
        error: error.message,
        validationId: validationResult.validationId
      });
    }
  }

  /**
   * Get check-in log for duration calculation
   */
  private async getCheckInLog(qrCodeId: string): Promise<ValidationLog | null> {
    try {
      const history = await this.validationLogRepository.getValidationHistory(qrCodeId);
      return history.find(log => log.scenario === ValidationScenario.ENTRY && log.validationResult === 'SUCCESS') || null;
    } catch (error: any) {
      logger.error('Failed to get check-in log', {
        error: error.message,
        qrCodeId
      });
      return null;
    }
  }

  /**
   * Get booking details (placeholder - would integrate with booking service)
   */
  private async getBookingDetails(bookingId: string): Promise<any> {
    // This would integrate with the actual booking service
    return {
      id: bookingId,
      eventId: 'event-uuid',
      attendeeId: 'attendee-uuid',
      attendeeName: 'John Doe',
      ticketType: 'VIP',
      status: 'CONFIRMED'
    };
  }

  /**
   * Get event details (placeholder - would integrate with event service)
   */
  private async getEventDetails(eventId: string): Promise<any> {
    // This would integrate with the actual event service
    return {
      id: eventId,
      name: 'Tech Conference 2024',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    };
  }
}
