// Simplified logging utility for the Event Management Platform

import { DomainError } from '../errors/DomainError';

// Simple logger class
export class LoggingService {
  private static instance: LoggingService;
  private serviceName: string;

  private constructor() {
    this.serviceName = 'event-management-platform';
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  // Simple logging methods for compatibility
  public info(message: string, data?: any): void {
    console.log(message, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  public error(message: string, data?: any): void {
    console.error(message, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  public warn(message: string, data?: any): void {
    console.warn(message, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  // Business operation logging
  public logBusinessOperation(
    operation: string,
    data: any,
    correlationId: string,
    userId?: string
  ): void {
    console.log('Business operation executed', {
      service: this.serviceName,
      operation,
      correlationId,
      userId,
      timestamp: new Date().toISOString(),
      data: this.sanitizeLogData(data)
    });
  }

  // Error logging
  public logError(
    error: Error | DomainError,
    context: any,
    correlationId: string,
    userId?: string
  ): void {
    const baseErrorData = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };

    const errorData = {
      service: this.serviceName,
      error: error instanceof DomainError 
        ? {
            ...baseErrorData,
            code: error.code,
            statusCode: error.statusCode,
            details: error.details
          }
        : baseErrorData,
      context,
      correlationId,
      userId,
      timestamp: new Date().toISOString()
    };

    console.error('Operation failed', errorData);
  }

  // Security event logging
  public logSecurityEvent(
    event: string,
    details: any,
    correlationId: string,
    userId?: string,
    ipAddress?: string
  ): void {
    console.warn('Security event detected', {
      service: this.serviceName,
      securityEvent: event,
      details: this.sanitizeLogData(details),
      correlationId,
      userId,
      ipAddress,
      timestamp: new Date().toISOString()
    });
  }

  // Performance logging
  public logPerformance(
    operation: string,
    duration: number,
    correlationId: string,
    metadata?: any
  ): void {
    console.info('Performance measurement', {
      service: this.serviceName,
      operation,
      duration,
      correlationId,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  // API request/response logging
  public logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    correlationId: string,
    userId?: string
  ): void {
    console.info('API request processed', {
      service: this.serviceName,
      method,
      path,
      statusCode,
      duration,
      correlationId,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  // Database operation logging
  public logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    correlationId: string,
    success: boolean
  ): void {
    console.info('Database operation executed', {
      service: this.serviceName,
      operation,
      table,
      duration,
      success,
      correlationId,
      timestamp: new Date().toISOString()
    });
  }

  // External service integration logging
  public logExternalServiceCall(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    correlationId: string,
    error?: any
  ): void {
    console.info('External service call', {
      service: this.serviceName,
      externalService: service,
      operation,
      duration,
      success,
      correlationId,
      error: error ? this.sanitizeLogData(error) : undefined,
      timestamp: new Date().toISOString()
    });
  }

  // Payment processing logging
  public logPaymentEvent(
    event: string,
    paymentId: string,
    amount: number,
    currency: string,
    status: string,
    correlationId: string,
    userId?: string
  ): void {
    console.info('Payment event processed', {
      service: this.serviceName,
      paymentEvent: event,
      paymentId,
      amount,
      currency,
      status,
      correlationId,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  // Event management logging
  public logEventManagement(
    action: string,
    eventId: string,
    organizerId: string,
    correlationId: string,
    metadata?: any
  ): void {
    console.info('Event management action', {
      service: this.serviceName,
      action,
      eventId,
      organizerId,
      correlationId,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  // Booking management logging
  public logBookingEvent(
    event: string,
    bookingId: string,
    eventId: string,
    attendeeId: string,
    correlationId: string,
    metadata?: any
  ): void {
    console.info('Booking event processed', {
      service: this.serviceName,
      bookingEvent: event,
      bookingId,
      eventId,
      attendeeId,
      correlationId,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  // Sanitize sensitive data for logging
  private sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'creditCard',
      'cardNumber',
      'cvv',
      'ssn',
      'socialSecurity'
    ];

    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

// Convenience functions for direct logging
export const logBusinessOperation = (
  operation: string,
  data: any,
  correlationId: string,
  userId?: string
): void => {
  LoggingService.getInstance().logBusinessOperation(operation, data, correlationId, userId);
};

export const logError = (
  error: Error | DomainError,
  context: any,
  correlationId: string,
  userId?: string
): void => {
  LoggingService.getInstance().logError(error, context, correlationId, userId);
};

export const logSecurityEvent = (
  event: string,
  details: any,
  correlationId: string,
  userId?: string,
  ipAddress?: string
): void => {
  LoggingService.getInstance().logSecurityEvent(event, details, correlationId, userId, ipAddress);
};

export const logPerformance = (
  operation: string,
  duration: number,
  correlationId: string,
  metadata?: any
): void => {
  LoggingService.getInstance().logPerformance(operation, duration, correlationId, metadata);
};

export const logApiRequest = (
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  correlationId: string,
  userId?: string
): void => {
  LoggingService.getInstance().logApiRequest(method, path, statusCode, duration, correlationId, userId);
};

// Export singleton instance
export const logger = LoggingService.getInstance();
