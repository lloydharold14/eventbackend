import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AttendeeValidationService } from '../services/AttendeeValidationService';
import { QRCodeRepository } from '../../qr-codes/repositories/QRCodeRepository';
import { ValidationLogRepository } from '../repositories/ValidationLogRepository';
import { QRCodeService } from '../../qr-codes/services/QRCodeService';
import { 
  validateQRCodeSchema, 
  batchValidationSchema, 
  checkInSchema, 
  checkOutSchema, 
  offlineValidationSchema 
} from '../../../shared/validators/schemas';
import { validateRequest } from '../../../shared/utils/validators';
import { formatSuccessResponse, formatErrorResponse } from '../../../shared/errors/DomainError';
import { logger } from '../../../shared/utils/logger';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';
import { TracingManager } from '../../../shared/utils/tracing';

const qrCodeRepository = new QRCodeRepository();
const validationLogRepository = new ValidationLogRepository();
const qrCodeService = new QRCodeService(qrCodeRepository);
const attendeeValidationService = new AttendeeValidationService(
  qrCodeRepository,
  validationLogRepository,
  qrCodeService
);

const metricsManager = MetricsManager.getInstance();
const resilienceManager = ResilienceManager.getInstance();
const tracingManager = TracingManager.getInstance();

/**
 * Validate QR code
 */
export const validateQRCode = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('validateQRCode', correlationId);

  try {
    // Parse and validate request
    const requestBody = JSON.parse(event.body || '{}');
    const { error, value } = validateRequest(requestBody, validateQRCodeSchema);
    
    if (error) {
      return formatErrorResponse('VALIDATION_ERROR', error.message, correlationId);
    }

    // Validate QR code
    const result = await resilienceManager.executeWithRetry(
      () => attendeeValidationService.validateQRCode(value),
      'validateQRCode'
    );

    // Record metrics
    if (result.valid) {
      metricsManager.recordBusinessMetric(BusinessMetricName.VALIDATIONS_SUCCESSFUL, 1);
    } else {
      metricsManager.recordBusinessMetric(BusinessMetricName.VALIDATIONS_FAILED, 1);
    }

    const response = {
      success: true,
      data: {
        valid: result.valid,
        qrCodeId: result.qrCodeId,
        bookingId: result.bookingId,
        attendeeName: result.attendeeName,
        eventName: result.eventName,
        ticketType: result.ticketType,
        validationTime: result.validationTime,
        validationId: result.validationId,
        message: result.valid ? 'QR code validated successfully' : `Validation failed: ${result.reason}`,
        warnings: result.warnings,
        metadata: result.metadata
      }
    };

    logger.info('QR code validation completed', {
      qrCodeId: result.qrCodeId,
      valid: result.valid,
      reason: result.reason,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to validate QR code', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to validate QR code',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Check-in attendee
 */
export const checkInAttendee = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('checkInAttendee', correlationId);

  try {
    // Parse and validate request
    const requestBody = JSON.parse(event.body || '{}');
    const { error, value } = validateRequest(requestBody, checkInSchema);
    
    if (error) {
      return formatErrorResponse('VALIDATION_ERROR', error.message, correlationId);
    }

    // Check-in attendee
    const result = await resilienceManager.executeWithRetry(
      () => attendeeValidationService.checkInAttendee(value.qrCodeId, value.validatorId, value.location),
      'checkInAttendee'
    );

    const response = {
      success: true,
      data: {
        valid: result.valid,
        qrCodeId: result.qrCodeId,
        bookingId: result.bookingId,
        attendeeName: result.attendeeName,
        eventName: result.eventName,
        ticketType: result.ticketType,
        checkInTime: result.checkInTime,
        checkInLocation: result.checkInLocation,
        validatorId: result.validatorId,
        validationId: result.validationId,
        message: result.valid ? 'Attendee checked in successfully' : `Check-in failed: ${result.reason}`,
        warnings: result.warnings
      }
    };

    logger.info('Attendee check-in completed', {
      qrCodeId: result.qrCodeId,
      attendeeName: result.attendeeName,
      valid: result.valid,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to check-in attendee', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to check-in attendee',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Check-out attendee
 */
export const checkOutAttendee = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('checkOutAttendee', correlationId);

  try {
    // Parse and validate request
    const requestBody = JSON.parse(event.body || '{}');
    const { error, value } = validateRequest(requestBody, checkOutSchema);
    
    if (error) {
      return formatErrorResponse('VALIDATION_ERROR', error.message, correlationId);
    }

    // Check-out attendee
    const result = await resilienceManager.executeWithRetry(
      () => attendeeValidationService.checkOutAttendee(value.qrCodeId, value.validatorId, value.location),
      'checkOutAttendee'
    );

    const response = {
      success: true,
      data: {
        valid: result.valid,
        qrCodeId: result.qrCodeId,
        bookingId: result.bookingId,
        attendeeName: result.attendeeName,
        eventName: result.eventName,
        ticketType: result.ticketType,
        checkOutTime: result.checkOutTime,
        checkOutLocation: result.checkOutLocation,
        duration: result.duration,
        validatorId: result.validatorId,
        validationId: result.validationId,
        message: result.valid ? 'Attendee checked out successfully' : `Check-out failed: ${result.reason}`,
        warnings: result.warnings
      }
    };

    logger.info('Attendee check-out completed', {
      qrCodeId: result.qrCodeId,
      attendeeName: result.attendeeName,
      valid: result.valid,
      duration: result.duration,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to check-out attendee', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to check-out attendee',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Get validation history
 */
export const getValidationHistory = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('getValidationHistory', correlationId);

  try {
    const qrCodeId = event.pathParameters?.qrCodeId;
    
    if (!qrCodeId) {
      return formatErrorResponse('VALIDATION_ERROR', 'QR code ID is required', correlationId);
    }

    const history = await resilienceManager.executeWithRetry(
      () => attendeeValidationService.getValidationHistory(qrCodeId),
      'getValidationHistory'
    );

    const response = {
      success: true,
      data: {
        qrCodeId,
        history: history.map(log => ({
          validationId: log.validationId,
          validationResult: log.validationResult,
          validationTime: log.validationTime,
          validatorId: log.validatorId,
          location: log.location,
          deviceInfo: log.deviceInfo,
          scenario: log.scenario,
          notes: log.notes
        })),
        count: history.length
      }
    };

    logger.info('Validation history retrieved successfully', {
      qrCodeId,
      count: history.length,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to get validation history', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to get validation history',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Batch validation
 */
export const batchValidate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('batchValidate', correlationId);

  try {
    // Parse and validate request
    const requestBody = JSON.parse(event.body || '{}');
    const { error, value } = validateRequest(requestBody, batchValidationSchema);
    
    if (error) {
      return formatErrorResponse('VALIDATION_ERROR', error.message, correlationId);
    }

    // Batch validate QR codes
    const results = await resilienceManager.executeWithRetry(
      () => attendeeValidationService.validateMultiple(value),
      'batchValidate'
    );

    const successful = results.filter(r => r.valid).length;
    const failed = results.filter(r => !r.valid).length;

    // Record metrics
    metricsManager.recordBusinessMetric(BusinessMetricName.VALIDATIONS_SUCCESSFUL, successful);
    metricsManager.recordBusinessMetric(BusinessMetricName.VALIDATIONS_FAILED, failed);

    const response = {
      success: true,
      data: {
        results: results.map(result => ({
          qrCodeId: result.qrCodeId,
          valid: result.valid,
          attendeeName: result.attendeeName,
          eventName: result.eventName,
          ticketType: result.ticketType,
          validationTime: result.validationTime,
          reason: result.reason,
          warnings: result.warnings
        })),
        summary: {
          total: results.length,
          successful,
          failed
        }
      }
    };

    logger.info('Batch validation completed', {
      total: results.length,
      successful,
      failed,
      validatorId: value.validatorId,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to batch validate', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to batch validate',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Get validation statistics for event
 */
export const getEventValidationStatistics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('getEventValidationStatistics', correlationId);

  try {
    const eventId = event.pathParameters?.eventId;
    
    if (!eventId) {
      return formatErrorResponse('VALIDATION_ERROR', 'Event ID is required', correlationId);
    }

    const startDate = event.queryStringParameters?.startDate;
    const endDate = event.queryStringParameters?.endDate;

    const statistics = await resilienceManager.executeWithRetry(
      () => attendeeValidationService.getEventValidationStatistics(eventId, startDate, endDate),
      'getEventValidationStatistics'
    );

    const response = {
      success: true,
      data: {
        eventId,
        statistics: {
          totalBookings: statistics.totalBookings,
          totalValidations: statistics.totalValidations,
          successfulValidations: statistics.successfulValidations,
          failedValidations: statistics.failedValidations,
          checkIns: statistics.checkIns,
          checkOuts: statistics.checkOuts,
          averageValidationTime: statistics.averageValidationTime,
          validationRate: statistics.validationRate,
          lastValidationTime: statistics.lastValidationTime,
          peakValidationTime: statistics.peakValidationTime
        }
      }
    };

    logger.info('Event validation statistics retrieved successfully', {
      eventId,
      totalValidations: statistics.totalValidations,
      validationRate: statistics.validationRate,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to get event validation statistics', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to get event validation statistics',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Offline validation
 */
export const offlineValidate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('offlineValidate', correlationId);

  try {
    // Parse and validate request
    const requestBody = JSON.parse(event.body || '{}');
    const { error, value } = validateRequest(requestBody, offlineValidationSchema);
    
    if (error) {
      return formatErrorResponse('VALIDATION_ERROR', error.message, correlationId);
    }

    // Perform offline validation
    const result = await resilienceManager.executeWithRetry(
      () => attendeeValidationService.validateOffline(value.qrCodeData),
      'offlineValidate'
    );

    // Record offline validation metric
    metricsManager.recordBusinessMetric(BusinessMetricName.OFFLINE_VALIDATIONS, 1);

    const response = {
      success: true,
      data: {
        valid: result.valid,
        qrCodeId: result.qrCodeId,
        bookingId: result.bookingId,
        attendeeName: result.attendeeName,
        eventName: result.eventName,
        ticketType: result.ticketType,
        validationTime: result.validationTime,
        validationId: result.validationId,
        status: result.status,
        message: result.valid ? 'Offline validation successful' : `Offline validation failed: ${result.reason}`,
        warnings: result.warnings
      }
    };

    logger.info('Offline validation completed', {
      qrCodeId: result.qrCodeId,
      valid: result.valid,
      status: result.status,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to perform offline validation', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to perform offline validation',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Get validation metrics
 */
export const getValidationMetrics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('getValidationMetrics', correlationId);

  try {
    const metrics = await resilienceManager.executeWithRetry(
      () => attendeeValidationService.getValidationMetrics(),
      'getValidationMetrics'
    );

    const response = {
      success: true,
      data: {
        metrics: {
          totalValidations: metrics.totalValidations,
          successfulValidations: metrics.successfulValidations,
          failedValidations: metrics.failedValidations,
          averageValidationTime: metrics.averageValidationTime,
          qrCodesGenerated: metrics.qrCodesGenerated,
          qrCodesExpired: metrics.qrCodesExpired,
          offlineValidations: metrics.offlineValidations,
          concurrentValidations: metrics.concurrentValidations
        }
      }
    };

    logger.info('Validation metrics retrieved successfully', {
      totalValidations: metrics.totalValidations,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to get validation metrics', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to get validation metrics',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};
