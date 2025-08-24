// Custom error classes for domain-specific error handling

export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = 'Access forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class BusinessRuleError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'BUSINESS_RULE_VIOLATION', 422, details);
  }
}

export class PaymentError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_ERROR', 400, details);
  }
}

export class EventCapacityError extends DomainError {
  constructor(message: string = 'Event capacity exceeded') {
    super(message, 'EVENT_CAPACITY_EXCEEDED', 422);
  }
}

export class BookingError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'BOOKING_ERROR', 400, details);
  }
}

export class ExternalServiceError extends DomainError {
  constructor(service: string, message: string, details?: any) {
    super(`External service error (${service}): ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, details);
  }
}

export class DatabaseError extends DomainError {
  constructor(message: string, details?: any) {
    super(`Database error: ${message}`, 'DATABASE_ERROR', 500, details);
  }
}

export class ConfigurationError extends DomainError {
  constructor(message: string, details?: any) {
    super(`Configuration error: ${message}`, 'CONFIGURATION_ERROR', 500, details);
  }
}

// Error factory for creating consistent error responses
export class ErrorFactory {
  static createValidationError(field: string, message: string): ValidationError {
    return new ValidationError(`Validation failed for field '${field}': ${message}`, {
      field,
      message
    });
  }

  static createNotFoundError(resource: string, id: string): NotFoundError {
    return new NotFoundError(resource, id);
  }

  static createUnauthorizedError(message?: string): UnauthorizedError {
    return new UnauthorizedError(message);
  }

  static createForbiddenError(message?: string): ForbiddenError {
    return new ForbiddenError(message);
  }

  static createConflictError(resource: string, reason: string): ConflictError {
    return new ConflictError(`${resource} conflict: ${reason}`);
  }

  static createBusinessRuleError(rule: string, details?: any): BusinessRuleError {
    return new BusinessRuleError(`Business rule violation: ${rule}`, details);
  }

  static createPaymentError(message: string, stripeError?: any): PaymentError {
    return new PaymentError(message, stripeError);
  }

  static createEventCapacityError(currentCapacity: number, maxCapacity: number): EventCapacityError {
    return new EventCapacityError(
      `Event capacity exceeded. Current: ${currentCapacity}, Maximum: ${maxCapacity}`
    );
  }

  static createBookingError(message: string, bookingId?: string): BookingError {
    return new BookingError(message, { bookingId });
  }

  static createExternalServiceError(service: string, error: any): ExternalServiceError {
    return new ExternalServiceError(service, error.message || 'Unknown error', error);
  }

  static createDatabaseError(operation: string, error: any): DatabaseError {
    return new DatabaseError(`${operation} failed`, error);
  }

  static createConfigurationError(missingKey: string): ConfigurationError {
    return new ConfigurationError(`Missing required configuration: ${missingKey}`);
  }
}

import { APIGatewayProxyResult } from 'aws-lambda';

// Error response formatter
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    correlationId?: string;
  };
}

export function formatErrorResponse(error: DomainError | Error, correlationId?: string): APIGatewayProxyResult {
  const statusCode = error instanceof DomainError ? error.statusCode : 500;
  const code = error instanceof DomainError ? error.code : 'INTERNAL_SERVER_ERROR';
  const details = error instanceof DomainError ? error.details : undefined;

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({
      success: false,
      error: {
        code,
        message: error.message,
        details,
        timestamp: new Date().toISOString(),
        correlationId
      }
    })
  };
}

export function formatSuccessResponse(data: any, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString()
    })
  };
}

// Error mapping for HTTP status codes
export const ERROR_STATUS_MAP: Record<string, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  BUSINESS_RULE_VIOLATION: 422,
  PAYMENT_ERROR: 400,
  EVENT_CAPACITY_EXCEEDED: 422,
  BOOKING_ERROR: 400,
  EXTERNAL_SERVICE_ERROR: 502,
  DATABASE_ERROR: 500,
  CONFIGURATION_ERROR: 500
};

// Error logging utility
export function logError(error: DomainError, context?: any): void {
  console.error('Domain Error:', {
    name: error.name,
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    details: error.details,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
}
