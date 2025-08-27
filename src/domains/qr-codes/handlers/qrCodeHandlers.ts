import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QRCodeService } from '../services/QRCodeService';
import { QRCodeRepository } from '../repositories/QRCodeRepository';
import { generateQRCodeSchema, regenerateQRCodeSchema } from '../../../shared/validators/schemas';
import { validateRequest } from '../../../shared/utils/validators';
import { formatSuccessResponse, formatErrorResponse, ValidationError, NotFoundError } from '../../../shared/errors/DomainError';
import { logger } from '../../../shared/utils/logger';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';

const qrCodeRepository = new QRCodeRepository();
const qrCodeService = new QRCodeService(qrCodeRepository);
const metricsManager = MetricsManager.getInstance();

/**
 * Generate QR code for booking
 */
export const generateQRCode = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';

  try {
    // Parse and validate request
    const requestBody = JSON.parse(event.body || '{}');
    const { error, value } = validateRequest(requestBody, generateQRCodeSchema);
    
    if (error) {
      return formatErrorResponse(new ValidationError(error.message));
    }

    // Generate QR code
    const qrCode = await qrCodeService.generateQRCode(value);

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
      correlationId
    });

    return formatSuccessResponse(response);
  } catch (error: any) {
    logger.error('Failed to generate QR code', {
      error: error.message,
      correlationId
    });

    return formatErrorResponse(error);
  }
};

/**
 * Get QR code details
 */
export const getQRCode = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';

  try {
    const qrCodeId = event.pathParameters?.qrCodeId;
    
    if (!qrCodeId) {
      return formatErrorResponse(new ValidationError('QR code ID is required'));
    }

    const qrCode = await qrCodeRepository.getQRCode(qrCodeId);

    if (!qrCode) {
      return formatErrorResponse(new NotFoundError('QR Code', qrCodeId));
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
      correlationId
    });

    return formatSuccessResponse(response);
  } catch (error: any) {
    logger.error('Failed to get QR code', {
      error: error.message,
      correlationId
    });

    return formatErrorResponse(error);
  }
};

/**
 * Regenerate QR code
 */
export const regenerateQRCode = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';

  try {
    const qrCodeId = event.pathParameters?.qrCodeId;
    
    if (!qrCodeId) {
      return formatErrorResponse(new ValidationError('QR code ID is required'));
    }

    // Parse and validate request
    const requestBody = JSON.parse(event.body || '{}');
    const { error, value } = validateRequest(requestBody, regenerateQRCodeSchema);
    
    if (error) {
      return formatErrorResponse(new ValidationError(error.message));
    }

    // Regenerate QR code
    const qrCode = await qrCodeService.regenerateQRCode({ bookingId: qrCodeId, reason: value.reason });

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
      correlationId
    });

    return formatSuccessResponse(response);
  } catch (error: any) {
    logger.error('Failed to regenerate QR code', {
      error: error.message,
      correlationId
    });

    return formatErrorResponse(error);
  }
};

/**
 * Revoke QR code
 */
export const revokeQRCode = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';

  try {
    const qrCodeId = event.pathParameters?.qrCodeId;
    
    if (!qrCodeId) {
      return formatErrorResponse(new ValidationError('QR code ID is required'));
    }

    await qrCodeService.revokeQRCode(qrCodeId);

    const response = {
      success: true,
      data: {
        message: 'QR code revoked successfully'
      }
    };

    logger.info('QR code revoked successfully', {
      qrCodeId,
      correlationId
    });

    return formatSuccessResponse(response);
  } catch (error: any) {
    logger.error('Failed to revoke QR code', {
      error: error.message,
      correlationId
    });

    return formatErrorResponse(error);
  }
};

/**
 * Get QR codes for booking
 */
export const getBookingQRCodes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';

  try {
    const bookingId = event.pathParameters?.bookingId;
    
    if (!bookingId) {
      return formatErrorResponse(new ValidationError('Booking ID is required'));
    }

    const qrCode = await qrCodeRepository.getQRCodeByBooking(bookingId);

    if (!qrCode) {
      return formatErrorResponse(new NotFoundError('QR Code', bookingId));
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
      correlationId
    });

    return formatSuccessResponse(response);
  } catch (error: any) {
    logger.error('Failed to get booking QR codes', {
      error: error.message,
      correlationId
    });

    return formatErrorResponse(error);
  }
};

/**
 * Get QR codes for event
 */
export const getEventQRCodes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';

  try {
    const eventId = event.pathParameters?.eventId;
    
    if (!eventId) {
      return formatErrorResponse(new ValidationError('Event ID is required'));
    }

    const qrCodes = await qrCodeService.getEventQRCodes(eventId);

    const response = {
      success: true,
      data: {
        qrCodes: qrCodes.map((qrCode: any) => ({
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
      correlationId
    });

    return formatSuccessResponse(response);
  } catch (error: any) {
    logger.error('Failed to get event QR codes', {
      error: error.message,
      correlationId
    });

    return formatErrorResponse(error);
  }
};

/**
 * Batch generate QR codes
 */
export const batchGenerateQRCodes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['x-correlation-id'] || 'unknown';

  try {
    // Parse and validate request
    const requestBody = JSON.parse(event.body || '{}');
    
    if (!requestBody.bookingIds || !Array.isArray(requestBody.bookingIds)) {
      return formatErrorResponse(new ValidationError('Booking IDs array is required'));
    }

    if (requestBody.bookingIds.length > 50) {
      return formatErrorResponse(new ValidationError('Cannot generate more than 50 QR codes at once'));
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
      correlationId
    });

    return formatSuccessResponse(response);
  } catch (error: any) {
    logger.error('Failed to batch generate QR codes', {
      error: error.message,
      correlationId
    });

    return formatErrorResponse(error);
  }
};
