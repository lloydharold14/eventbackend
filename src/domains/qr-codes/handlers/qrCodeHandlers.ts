import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QRCodeService } from '../services/QRCodeService';
import { QRCodeRepository } from '../repositories/QRCodeRepository';
import { generateQRCodeSchema, regenerateQRCodeSchema } from '../../../shared/validators/schemas';
import { validateRequest } from '../../../shared/utils/validators';
import { formatSuccessResponse, formatErrorResponse } from '../../../shared/errors/DomainError';
import { logger } from '../../../shared/utils/logger';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';
import { TracingManager } from '../../../shared/utils/tracing';

const qrCodeRepository = new QRCodeRepository();
const qrCodeService = new QRCodeService(qrCodeRepository);
const metricsManager = MetricsManager.getInstance();
const resilienceManager = ResilienceManager.getInstance();
const tracingManager = TracingManager.getInstance();

/**
 * Generate QR code for booking
 */
export const generateQRCode = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('generateQRCode', correlationId);

  try {
    // Parse and validate request
    const requestBody = JSON.parse(event.body || '{}');
    const { error, value } = validateRequest(requestBody, generateQRCodeSchema);
    
    if (error) {
      return formatErrorResponse('VALIDATION_ERROR', error.message, correlationId);
    }

    // Generate QR code
    const qrCode = await resilienceManager.executeWithRetry(
      () => qrCodeService.generateQRCode(value),
      'generateQRCode'
    );

    // Record metrics
    metricsManager.recordBusinessMetric(BusinessMetricName.QR_CODES_GENERATED, 1);

    const response = {
      success: true,
      data: {
        qrCode: {
          id: qrCode.id,
          bookingId: qrCode.bookingId,
          eventId: qrCode.eventId,
          format: qrCode.format,
          status: qrCode.status,
          expiresAt: qrCode.expiresAt,
          qrCodeUrl: qrCode.qrCodeUrl,
          qrCodeImage: qrCode.qrCodeImage
        },
        message: 'QR code generated successfully'
      }
    };

    logger.info('QR code generated successfully', {
      qrCodeId: qrCode.id,
      bookingId: qrCode.bookingId,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to generate QR code', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to generate QR code',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Get QR code details
 */
export const getQRCode = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('getQRCode', correlationId);

  try {
    const qrCodeId = event.pathParameters?.qrCodeId;
    
    if (!qrCodeId) {
      return formatErrorResponse('VALIDATION_ERROR', 'QR code ID is required', correlationId);
    }

    const qrCode = await resilienceManager.executeWithRetry(
      () => qrCodeRepository.getQRCode(qrCodeId),
      'getQRCode'
    );

    if (!qrCode) {
      return formatErrorResponse('NOT_FOUND', 'QR code not found', correlationId);
    }

    const response = {
      success: true,
      data: {
        qrCode: {
          id: qrCode.id,
          bookingId: qrCode.bookingId,
          eventId: qrCode.eventId,
          format: qrCode.format,
          status: qrCode.status,
          validationCount: qrCode.validationCount,
          maxValidations: qrCode.maxValidations,
          createdAt: qrCode.createdAt,
          expiresAt: qrCode.expiresAt,
          qrCodeUrl: qrCode.qrCodeUrl,
          qrCodeImage: qrCode.qrCodeImage,
          metadata: qrCode.metadata
        }
      }
    };

    logger.info('QR code retrieved successfully', {
      qrCodeId,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to get QR code', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to get QR code',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Regenerate QR code
 */
export const regenerateQRCode = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('regenerateQRCode', correlationId);

  try {
    const qrCodeId = event.pathParameters?.qrCodeId;
    
    if (!qrCodeId) {
      return formatErrorResponse('VALIDATION_ERROR', 'QR code ID is required', correlationId);
    }

    // Parse and validate request
    const requestBody = JSON.parse(event.body || '{}');
    const { error, value } = validateRequest(requestBody, regenerateQRCodeSchema);
    
    if (error) {
      return formatErrorResponse('VALIDATION_ERROR', error.message, correlationId);
    }

    // Regenerate QR code
    const qrCode = await resilienceManager.executeWithRetry(
      () => qrCodeService.regenerateQRCode({ bookingId: qrCodeId, reason: value.reason }),
      'regenerateQRCode'
    );

    const response = {
      success: true,
      data: {
        qrCode: {
          id: qrCode.id,
          bookingId: qrCode.bookingId,
          eventId: qrCode.eventId,
          format: qrCode.format,
          status: qrCode.status,
          expiresAt: qrCode.expiresAt,
          qrCodeUrl: qrCode.qrCodeUrl,
          qrCodeImage: qrCode.qrCodeImage
        },
        message: 'QR code regenerated successfully'
      }
    };

    logger.info('QR code regenerated successfully', {
      qrCodeId: qrCode.id,
      bookingId: qrCode.bookingId,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to regenerate QR code', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to regenerate QR code',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Revoke QR code
 */
export const revokeQRCode = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('revokeQRCode', correlationId);

  try {
    const qrCodeId = event.pathParameters?.qrCodeId;
    
    if (!qrCodeId) {
      return formatErrorResponse('VALIDATION_ERROR', 'QR code ID is required', correlationId);
    }

    await resilienceManager.executeWithRetry(
      () => qrCodeService.revokeQRCode(qrCodeId),
      'revokeQRCode'
    );

    const response = {
      success: true,
      data: {
        message: 'QR code revoked successfully'
      }
    };

    logger.info('QR code revoked successfully', {
      qrCodeId,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to revoke QR code', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to revoke QR code',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Get QR codes for booking
 */
export const getBookingQRCodes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('getBookingQRCodes', correlationId);

  try {
    const bookingId = event.pathParameters?.bookingId;
    
    if (!bookingId) {
      return formatErrorResponse('VALIDATION_ERROR', 'Booking ID is required', correlationId);
    }

    const qrCode = await resilienceManager.executeWithRetry(
      () => qrCodeRepository.getQRCodeByBooking(bookingId),
      'getBookingQRCodes'
    );

    if (!qrCode) {
      return formatErrorResponse('NOT_FOUND', 'QR code not found for booking', correlationId);
    }

    const response = {
      success: true,
      data: {
        qrCode: {
          id: qrCode.id,
          bookingId: qrCode.bookingId,
          eventId: qrCode.eventId,
          format: qrCode.format,
          status: qrCode.status,
          validationCount: qrCode.validationCount,
          maxValidations: qrCode.maxValidations,
          createdAt: qrCode.createdAt,
          expiresAt: qrCode.expiresAt,
          qrCodeUrl: qrCode.qrCodeUrl,
          qrCodeImage: qrCode.qrCodeImage,
          metadata: qrCode.metadata
        }
      }
    };

    logger.info('Booking QR code retrieved successfully', {
      bookingId,
      qrCodeId: qrCode.id,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to get booking QR codes', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to get booking QR codes',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Get QR codes for event
 */
export const getEventQRCodes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('getEventQRCodes', correlationId);

  try {
    const eventId = event.pathParameters?.eventId;
    
    if (!eventId) {
      return formatErrorResponse('VALIDATION_ERROR', 'Event ID is required', correlationId);
    }

    const qrCodes = await resilienceManager.executeWithRetry(
      () => qrCodeService.getEventQRCodes(eventId),
      'getEventQRCodes'
    );

    const response = {
      success: true,
      data: {
        qrCodes: qrCodes.map(qrCode => ({
          id: qrCode.id,
          bookingId: qrCode.bookingId,
          eventId: qrCode.eventId,
          format: qrCode.format,
          status: qrCode.status,
          validationCount: qrCode.validationCount,
          maxValidations: qrCode.maxValidations,
          createdAt: qrCode.createdAt,
          expiresAt: qrCode.expiresAt,
          metadata: qrCode.metadata
        })),
        count: qrCodes.length
      }
    };

    logger.info('Event QR codes retrieved successfully', {
      eventId,
      count: qrCodes.length,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to get event QR codes', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to get event QR codes',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};

/**
 * Batch generate QR codes
 */
export const batchGenerateQRCodes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';
  const traceId = tracingManager.startTrace('batchGenerateQRCodes', correlationId);

  try {
    // Parse and validate request
    const requestBody = JSON.parse(event.body || '{}');
    
    if (!requestBody.bookingIds || !Array.isArray(requestBody.bookingIds)) {
      return formatErrorResponse('VALIDATION_ERROR', 'Booking IDs array is required', correlationId);
    }

    if (requestBody.bookingIds.length > 50) {
      return formatErrorResponse('VALIDATION_ERROR', 'Cannot generate more than 50 QR codes at once', correlationId);
    }

    const qrCodes = [];
    const errors = [];

    // Generate QR codes for each booking
    for (const bookingId of requestBody.bookingIds) {
      try {
        const qrCode = await qrCodeService.generateQRCode({
          bookingId,
          format: requestBody.format,
          singleUse: requestBody.singleUse,
          maxValidations: requestBody.maxValidations,
          expiryHours: requestBody.expiryHours
        });

        qrCodes.push({
          id: qrCode.id,
          bookingId: qrCode.bookingId,
          eventId: qrCode.eventId,
          format: qrCode.format,
          status: qrCode.status,
          expiresAt: qrCode.expiresAt,
          qrCodeUrl: qrCode.qrCodeUrl,
          qrCodeImage: qrCode.qrCodeImage
        });
      } catch (error: any) {
        errors.push({
          bookingId,
          error: error.message
        });
      }
    }

    const response = {
      success: true,
      data: {
        qrCodes,
        errors,
        summary: {
          total: requestBody.bookingIds.length,
          successful: qrCodes.length,
          failed: errors.length
        }
      }
    };

    logger.info('Batch QR code generation completed', {
      total: requestBody.bookingIds.length,
      successful: qrCodes.length,
      failed: errors.length,
      correlationId,
      traceId
    });

    return formatSuccessResponse(response, correlationId);
  } catch (error: any) {
    logger.error('Failed to batch generate QR codes', {
      error: error.message,
      correlationId,
      traceId
    });

    return formatErrorResponse(
      error.code || 'INTERNAL_SERVER_ERROR',
      error.message || 'Failed to batch generate QR codes',
      correlationId
    );
  } finally {
    tracingManager.endTrace(traceId);
  }
};
