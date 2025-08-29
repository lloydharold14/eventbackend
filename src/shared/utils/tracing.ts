import AWSXRay from 'aws-xray-sdk-core';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'tracing' });

// Note: AWSXRay is mocked by Jest in test environment

// X-Ray Tracing Configuration
export interface TracingConfig {
  serviceName: string;
  enableTracing: boolean;
  captureHTTP: boolean;
  captureAWS: boolean;
  captureSQL: boolean;
  capturePromise: boolean;
  captureError: boolean;
}

// Default tracing configuration
export const DEFAULT_TRACING_CONFIG: TracingConfig = {
  serviceName: 'event-management-platform',
  enableTracing: true,
  captureHTTP: true,
  captureAWS: true,
  captureSQL: true,
  capturePromise: true,
  captureError: true,
};

// Track if tracing has been initialized
let tracingInitialized = false;

// Initialize X-Ray tracing
export function initializeTracing(config: Partial<TracingConfig> = {}): void {
  // Prevent multiple initializations
  if (tracingInitialized) {
    return;
  }
  
  const tracingConfig = { ...DEFAULT_TRACING_CONFIG, ...config };
  
  if (!tracingConfig.enableTracing) {
    logger.info('X-Ray tracing disabled');
    tracingInitialized = true;
    return;
  }

  try {
    // Configure X-Ray SDK
    AWSXRay.captureHTTPsGlobal(require('https'));
    // Note: AWS SDK v3 is not captured by X-Ray automatically
    // Individual clients need to be captured manually if needed
    AWSXRay.capturePromise();
    
    // Set service name
    AWSXRay.setContextMissingStrategy('LOG_ERROR');
    
    logger.info('X-Ray tracing initialized', { config: tracingConfig });
    tracingInitialized = true;
  } catch (error) {
    logger.error('Failed to initialize X-Ray tracing', { error });
  }
}

// Get current segment
export function getCurrentSegment(): AWSXRay.Subsegment | undefined {
  try {
    const segment = AWSXRay.getSegment();
    // Check if AWSXRay.Subsegment is available and segment is an instance of it
    if (AWSXRay.Subsegment && segment instanceof AWSXRay.Subsegment) {
      return segment;
    }
    return undefined;
  } catch (error) {
    logger.warn('Failed to get current X-Ray segment', { error });
    return undefined;
  }
}

// Create new subsegment
export function createSubsegment(name: string): AWSXRay.Subsegment | undefined {
  try {
    const segment = getCurrentSegment();
    return segment?.addNewSubsegment(name);
  } catch (error) {
    logger.warn('Failed to create X-Ray subsegment', { name, error });
    return undefined;
  }
}

// Trace async operation with automatic error handling
export async function traceAsyncOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const subsegment = createSubsegment(operationName);
  
  if (metadata && subsegment) {
    subsegment.addMetadata('operation', metadata);
  }
  
  try {
    const result = await operation();
    
    if (subsegment) {
      subsegment.addMetadata('result', { success: true });
      subsegment.close();
    }
    
    return result;
  } catch (error) {
    if (subsegment) {
      subsegment.addError(error as Error);
      subsegment.addMetadata('result', { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      subsegment.close();
    }
    throw error;
  }
}

// Trace HTTP requests
export function traceHTTPRequest(
  method: string,
  url: string,
  headers?: Record<string, string>
): AWSXRay.Subsegment | undefined {
  const subsegment = createSubsegment(`HTTP ${method} ${new URL(url).hostname}`);
  
  if (subsegment) {
    subsegment.addMetadata('http', {
      method,
      url,
      headers: headers ? Object.keys(headers) : undefined,
    });
  }
  
  return subsegment;
}

// Trace database operations
export function traceDatabaseOperation(
  operation: string,
  table: string,
  query?: string
): AWSXRay.Subsegment | undefined {
  const subsegment = createSubsegment(`DB ${operation} ${table}`);
  
  if (subsegment) {
    subsegment.addMetadata('database', {
      operation,
      table,
      query: query ? query.substring(0, 100) + '...' : undefined,
    });
  }
  
  return subsegment;
}

// Trace external service calls
export function traceExternalService(
  serviceName: string,
  operation: string,
  endpoint?: string
): AWSXRay.Subsegment | undefined {
  const subsegment = createSubsegment(`${serviceName} ${operation}`);
  
  if (subsegment) {
    subsegment.addMetadata('external_service', {
      service: serviceName,
      operation,
      endpoint,
    });
  }
  
  return subsegment;
}

// Extract correlation ID from API Gateway event
export function extractCorrelationId(event: APIGatewayProxyEvent): string {
  return (
    event.headers['x-correlation-id'] ||
    event.headers['x-request-id'] ||
    event.requestContext.requestId ||
    `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
}

// Add correlation ID to current segment
export function addCorrelationId(correlationId: string): void {
  const segment = getCurrentSegment();
  if (segment) {
    segment.addMetadata('correlation_id', correlationId);
  }
}

// Trace Lambda function execution
export function traceLambdaExecution<T>(
  handler: (event: APIGatewayProxyEvent) => Promise<T>,
  event: APIGatewayProxyEvent
): (event: APIGatewayProxyEvent) => Promise<T> {
  return async (event: APIGatewayProxyEvent) => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    // Create root segment for Lambda execution
    const segment = new AWSXRay.Segment('Lambda Execution');
    segment.addMetadata('lambda', {
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
      memoryLimit: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
      correlationId,
    });
    
    segment.addMetadata('event', {
      httpMethod: event.httpMethod,
      path: event.path,
      queryStringParameters: event.queryStringParameters,
      headers: Object.keys(event.headers || {}),
    });
    
    AWSXRay.setSegment(segment);
    
    try {
      const result = await traceAsyncOperation(
        'Lambda Handler',
        () => handler(event),
        { correlationId }
      );
      
      segment.addMetadata('result', {
        success: true,
        duration: Date.now() - startTime,
      });
      
      return result;
    } catch (error) {
      segment.addError(error as Error);
      segment.addMetadata('result', {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      segment.close();
    }
  };
}

// Performance tracing utilities
export class PerformanceTracer {
  private startTime: number;
  private subsegment?: AWSXRay.Subsegment;
  
  constructor(operationName: string, metadata?: Record<string, any>) {
    this.startTime = Date.now();
    this.subsegment = createSubsegment(operationName);
    
    if (metadata && this.subsegment) {
      this.subsegment.addMetadata('performance', metadata);
    }
  }
  
  addMetadata(key: string, value: any): void {
    if (this.subsegment) {
      this.subsegment.addMetadata(key, value);
    }
  }
  
  addAnnotation(key: string, value: string | number | boolean): void {
    if (this.subsegment) {
      this.subsegment.addAnnotation(key, value);
    }
  }
  
  close(): void {
    if (this.subsegment) {
      const duration = Date.now() - this.startTime;
      this.subsegment.addMetadata('duration_ms', duration);
      this.subsegment.close();
    }
  }
  
  closeWithError(error: Error): void {
    if (this.subsegment) {
      const duration = Date.now() - this.startTime;
      this.subsegment.addError(error);
      this.subsegment.addMetadata('duration_ms', duration);
      this.subsegment.addMetadata('error', error.message);
      this.subsegment.close();
    }
  }
}

// Business operation tracing
export function traceBusinessOperation(
  operation: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, any>
): PerformanceTracer {
  const operationName = `Business ${operation} ${entityType}`;
  const tracer = new PerformanceTracer(operationName, {
    operation,
    entityType,
    entityId,
    ...metadata,
  });
  
  return tracer;
}

// Database operation tracing
export function traceDatabaseQuery(
  operation: string,
  table: string,
  query?: string,
  parameters?: any
): PerformanceTracer {
  const operationName = `DB ${operation} ${table}`;
  const tracer = new PerformanceTracer(operationName, {
    operation,
    table,
    query: query ? query.substring(0, 100) + '...' : undefined,
    parameterCount: parameters ? Object.keys(parameters).length : 0,
  });
  
  return tracer;
}

// External service tracing
export function traceExternalServiceCall(
  serviceName: string,
  operation: string,
  endpoint?: string,
  requestData?: any
): PerformanceTracer {
  const operationName = `${serviceName} ${operation}`;
  const tracer = new PerformanceTracer(operationName, {
    service: serviceName,
    operation,
    endpoint,
    requestData: requestData ? JSON.stringify(requestData).substring(0, 200) + '...' : undefined,
  });
  
  return tracer;
}

// Export X-Ray SDK for direct usage
export { AWSXRay };
