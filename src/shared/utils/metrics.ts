import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from '@aws-sdk/client-cloudwatch';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'metrics' });

// CloudWatch client
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Metric Namespace
export const METRIC_NAMESPACE = 'EventManagementPlatform';

// Metric Dimensions
export interface MetricDimensions {
  Service: string;
  Environment: string;
  [key: string]: string;
}

// Metric Data Point
export interface MetricDataPoint {
  MetricName: string;
  Value: number;
  Unit: string;
  Timestamp?: Date;
  Dimensions?: MetricDimensions;
}

// Metric Types
export enum MetricUnit {
  COUNT = 'Count',
  SECONDS = 'Seconds',
  MILLISECONDS = 'Milliseconds',
  BYTES = 'Bytes',
  PERCENT = 'Percent',
  BITS_PER_SECOND = 'Bits/Second',
  BYTES_PER_SECOND = 'Bytes/Second',
  COUNT_PER_SECOND = 'Count/Second',
  NONE = 'None',
}

// Business Metrics
export enum BusinessMetricName {
  // Event Metrics
  EVENTS_CREATED = 'EventsCreated',
  EVENTS_PUBLISHED = 'EventsPublished',
  EVENTS_CANCELLED = 'EventsCancelled',
  EVENTS_VIEWED = 'EventsViewed',
  
  // User Metrics
  USERS_REGISTERED = 'UsersRegistered',
  USERS_ACTIVE = 'UsersActive',
  USERS_VERIFIED = 'UsersVerified',
  
  // Booking Metrics
  BOOKINGS_CREATED = 'BookingsCreated',
  BOOKINGS_CONFIRMED = 'BookingsConfirmed',
  BOOKINGS_CANCELLED = 'BookingsCancelled',
  BOOKINGS_REFUNDED = 'BookingsRefunded',
  
  // Payment Metrics
  PAYMENTS_PROCESSED = 'PaymentsProcessed',
  PAYMENTS_SUCCEEDED = 'PaymentsSucceeded',
  PAYMENTS_FAILED = 'PaymentsFailed',
  PAYMENTS_REFUNDED = 'PaymentsRefunded',
  REVENUE_GENERATED = 'RevenueGenerated',
  
  // Notification Metrics
  NOTIFICATIONS_SENT = 'NotificationsSent',
  NOTIFICATIONS_DELIVERED = 'NotificationsDelivered',
  NOTIFICATIONS_FAILED = 'NotificationsFailed',
  
  // Search Metrics
  SEARCHES_PERFORMED = 'SearchesPerformed',
  SEARCH_RESULTS_RETURNED = 'SearchResultsReturned',
  SEARCH_INDEX_UPDATED = 'SearchIndexUpdated',
  SEARCH_SUGGESTIONS_REQUESTED = 'SearchSuggestionsRequested',
  
  // Analytics Metrics
  ANALYTICS_GENERATED = 'AnalyticsGenerated',
  DASHBOARD_GENERATED = 'DashboardGenerated',
  REPORT_GENERATED = 'ReportGenerated',
  ANALYTICS_EXPORTED = 'AnalyticsExported',
  REAL_TIME_METRICS_RETRIEVED = 'RealTimeMetricsRetrieved',
  ANALYTICS_RECORDS_STORED = 'AnalyticsRecordsStored',
  ANALYTICS_RECORDS_RETRIEVED = 'AnalyticsRecordsRetrieved',
  ANALYTICS_METRICS_STORED = 'AnalyticsMetricsStored',
  ANALYTICS_METRICS_RETRIEVED = 'AnalyticsMetricsRetrieved',
  EVENT_ANALYTICS_RETRIEVED = 'EventAnalyticsRetrieved',
  USER_ANALYTICS_RETRIEVED = 'UserAnalyticsRetrieved',
  REVENUE_ANALYTICS_RETRIEVED = 'RevenueAnalyticsRetrieved',
  TOP_EVENTS_RETRIEVED = 'TopEventsRetrieved',
  TOP_ORGANIZERS_RETRIEVED = 'TopOrganizersRetrieved',
  USER_GROWTH_RETRIEVED = 'UserGrowthRetrieved',
  ANALYTICS_RECORDS_UPDATED = 'AnalyticsRecordsUpdated',
  ANALYTICS_RECORDS_DELETED = 'AnalyticsRecordsDeleted',

  // Mobile App Metrics
  MOBILE_SYNC_COMPLETED = 'MobileSyncCompleted',
  PUSH_TOKEN_REGISTERED = 'PushTokenRegistered',
  PUSH_NOTIFICATION_SENT = 'PushNotificationSent',
  MOBILE_EVENTS_RETRIEVED = 'MobileEventsRetrieved',
  MOBILE_BOOKINGS_RETRIEVED = 'MobileBookingsRetrieved',
  MOBILE_PAYMENTS_RETRIEVED = 'MobilePaymentsRetrieved',
  MOBILE_USER_RETRIEVED = 'MobileUserRetrieved',
  MOBILE_SEARCH_PERFORMED = 'MobileSearchPerformed',
  MOBILE_NEARBY_EVENTS_RETRIEVED = 'MobileNearbyEventsRetrieved',
  MOBILE_ANALYTICS_RECORDED = 'MobileAnalyticsRecorded',
  MOBILE_OFFLINE_CHANGES_PROCESSED = 'MobileOfflineChangesProcessed',
  MOBILE_SESSION_STARTED = 'MobileSessionStarted',
  MOBILE_SESSION_ENDED = 'MobileSessionEnded',
  MOBILE_APP_CRASH = 'MobileAppCrash',
  MOBILE_PERFORMANCE_METRIC = 'MobilePerformanceMetric',
  
  // Performance Metrics
  API_RESPONSE_TIME = 'ApiResponseTime',
  DATABASE_QUERY_TIME = 'DatabaseQueryTime',
  CACHE_HIT_RATE = 'CacheHitRate',
  ERROR_RATE = 'ErrorRate',
  
  // Capacity Metrics
  CONCURRENT_USERS = 'ConcurrentUsers',
  ACTIVE_SESSIONS = 'ActiveSessions',
  DATABASE_CONNECTIONS = 'DatabaseConnections',
  
  // Security Metrics
  AUTHENTICATION_ATTEMPTS = 'AuthenticationAttempts',
  AUTHENTICATION_FAILURES = 'AuthenticationFailures',
  SUSPICIOUS_ACTIVITIES = 'SuspiciousActivities',
  RATE_LIMIT_VIOLATIONS = 'RateLimitViolations',
}

// Technical Metrics
export enum TechnicalMetricName {
  // Lambda Metrics
  LAMBDA_INVOCATIONS = 'LambdaInvocations',
  LAMBDA_DURATION = 'LambdaDuration',
  LAMBDA_ERRORS = 'LambdaErrors',
  LAMBDA_THROTTLES = 'LambdaThrottles',
  LAMBDA_COLD_STARTS = 'LambdaColdStarts',
  
  // DynamoDB Metrics
  DYNAMODB_READ_CAPACITY = 'DynamoDBReadCapacity',
  DYNAMODB_WRITE_CAPACITY = 'DynamoDBWriteCapacity',
  DYNAMODB_THROTTLED_REQUESTS = 'DynamoDBThrottledRequests',
  DYNAMODB_CONSISTENT_READS = 'DynamoDBConsistentReads',
  DYNAMODB_ITEM_COUNT = 'DynamoDBItemCount',
  
  // API Gateway Metrics
  API_GATEWAY_REQUESTS = 'ApiGatewayRequests',
  API_GATEWAY_4XX_ERRORS = 'ApiGateway4XXErrors',
  API_GATEWAY_5XX_ERRORS = 'ApiGateway5XXErrors',
  API_GATEWAY_LATENCY = 'ApiGatewayLatency',
  
  // External Service Metrics
  EXTERNAL_SERVICE_CALLS = 'ExternalServiceCalls',
  EXTERNAL_SERVICE_ERRORS = 'ExternalServiceErrors',
  EXTERNAL_SERVICE_LATENCY = 'ExternalServiceLatency',
  
  // Circuit Breaker Metrics
  CIRCUIT_BREAKER_OPEN = 'CircuitBreakerOpen',
  CIRCUIT_BREAKER_HALF_OPEN = 'CircuitBreakerHalfOpen',
  CIRCUIT_BREAKER_CLOSED = 'CircuitBreakerClosed',
  
  // Bulkhead Metrics
  BULKHEAD_QUEUE_SIZE = 'BulkheadQueueSize',
  BULKHEAD_CONCURRENT_EXECUTIONS = 'BulkheadConcurrentExecutions',
  BULKHEAD_REJECTED_REQUESTS = 'BulkheadRejectedRequests',
}

// Metrics Manager
export class MetricsManager {
  private static instance: MetricsManager;
  private metricsBuffer: MetricDataPoint[] = [];
  private readonly maxBufferSize = 20;
  private readonly flushInterval = 60000; // 1 minute
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.startPeriodicFlush();
  }

  public static getInstance(): MetricsManager {
    if (!MetricsManager.instance) {
      MetricsManager.instance = new MetricsManager();
    }
    return MetricsManager.instance;
  }

  // Record a single metric
  public recordMetric(
    metricName: string,
    value: number,
    unit: MetricUnit,
    dimensions?: MetricDimensions
  ): void {
    const metricDataPoint: MetricDataPoint = {
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
      Dimensions: this.getDefaultDimensions(dimensions),
    };

    this.metricsBuffer.push(metricDataPoint);

    if (this.metricsBuffer.length >= this.maxBufferSize) {
      this.flushMetrics();
    }
  }

  // Record business metrics
  public recordBusinessMetric(
    metricName: BusinessMetricName,
    value: number,
    additionalDimensions?: Record<string, string>
  ): void {
    const dimensions = {
      ...this.getDefaultDimensions(),
      MetricType: 'Business',
      ...additionalDimensions,
    };

    this.recordMetric(metricName, value, MetricUnit.COUNT, dimensions);
  }

  // Record technical metrics
  public recordTechnicalMetric(
    metricName: TechnicalMetricName,
    value: number,
    unit: MetricUnit = MetricUnit.COUNT,
    additionalDimensions?: Record<string, string>
  ): void {
    const dimensions = {
      ...this.getDefaultDimensions(),
      MetricType: 'Technical',
      ...additionalDimensions,
    };

    this.recordMetric(metricName, value, unit, dimensions);
  }

  // Record API performance metrics
  public recordApiPerformance(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number
  ): void {
    const dimensions = {
      ...this.getDefaultDimensions(),
      Endpoint: endpoint,
      Method: method,
      StatusCode: statusCode.toString(),
    };

    // Record response time
    this.recordMetric(
      TechnicalMetricName.API_GATEWAY_LATENCY,
      duration,
      MetricUnit.MILLISECONDS,
      dimensions
    );

    // Record request count
    this.recordMetric(
      TechnicalMetricName.API_GATEWAY_REQUESTS,
      1,
      MetricUnit.COUNT,
      dimensions
    );

    // Record errors
    if (statusCode >= 400) {
      const errorMetric = statusCode >= 500 
        ? TechnicalMetricName.API_GATEWAY_5XX_ERRORS 
        : TechnicalMetricName.API_GATEWAY_4XX_ERRORS;
      
      this.recordMetric(errorMetric, 1, MetricUnit.COUNT, dimensions);
    }
  }

  // Record database performance metrics
  public recordDatabasePerformance(
    table: string,
    operation: string,
    duration: number,
    success: boolean
  ): void {
    const dimensions = {
      ...this.getDefaultDimensions(),
      Table: table,
      Operation: operation,
    };

    // Record query time
    this.recordMetric(
      TechnicalMetricName.DYNAMODB_READ_CAPACITY,
      duration,
      MetricUnit.MILLISECONDS,
      dimensions
    );

    // Record success/failure
    if (!success) {
      this.recordMetric(
        TechnicalMetricName.DYNAMODB_THROTTLED_REQUESTS,
        1,
        MetricUnit.COUNT,
        dimensions
      );
    }
  }

  // Record external service metrics
  public recordExternalServicePerformance(
    serviceName: string,
    operation: string,
    duration: number,
    success: boolean
  ): void {
    const dimensions = {
      ...this.getDefaultDimensions(),
      Service: serviceName,
      Operation: operation,
    };

    // Record latency
    this.recordMetric(
      TechnicalMetricName.EXTERNAL_SERVICE_LATENCY,
      duration,
      MetricUnit.MILLISECONDS,
      dimensions
    );

    // Record calls
    this.recordMetric(
      TechnicalMetricName.EXTERNAL_SERVICE_CALLS,
      1,
      MetricUnit.COUNT,
      dimensions
    );

    // Record errors
    if (!success) {
      this.recordMetric(
        TechnicalMetricName.EXTERNAL_SERVICE_ERRORS,
        1,
        MetricUnit.COUNT,
        dimensions
      );
    }
  }

  // Record circuit breaker state
  public recordCircuitBreakerState(
    serviceName: string,
    state: 'OPEN' | 'HALF_OPEN' | 'CLOSED'
  ): void {
    const dimensions = {
      ...this.getDefaultDimensions(),
      Service: serviceName,
    };

    const metricName = state === 'OPEN' 
      ? TechnicalMetricName.CIRCUIT_BREAKER_OPEN
      : state === 'HALF_OPEN'
      ? TechnicalMetricName.CIRCUIT_BREAKER_HALF_OPEN
      : TechnicalMetricName.CIRCUIT_BREAKER_CLOSED;

    this.recordMetric(metricName, 1, MetricUnit.COUNT, dimensions);
  }

  // Record bulkhead metrics
  public recordBulkheadMetrics(
    serviceName: string,
    queueSize: number,
    concurrentExecutions: number,
    rejectedRequests: number
  ): void {
    const dimensions = {
      ...this.getDefaultDimensions(),
      Service: serviceName,
    };

    this.recordMetric(
      TechnicalMetricName.BULKHEAD_QUEUE_SIZE,
      queueSize,
      MetricUnit.COUNT,
      dimensions
    );

    this.recordMetric(
      TechnicalMetricName.BULKHEAD_CONCURRENT_EXECUTIONS,
      concurrentExecutions,
      MetricUnit.COUNT,
      dimensions
    );

    if (rejectedRequests > 0) {
      this.recordMetric(
        TechnicalMetricName.BULKHEAD_REJECTED_REQUESTS,
        rejectedRequests,
        MetricUnit.COUNT,
        dimensions
      );
    }
  }

  // Record error metrics
  public recordError(
    errorType: string,
    service: string,
    operation: string
  ): void {
    const dimensions = {
      ...this.getDefaultDimensions(),
      ErrorType: errorType,
      Service: service,
      Operation: operation,
    };

    this.recordMetric(
      TechnicalMetricName.LAMBDA_ERRORS,
      1,
      MetricUnit.COUNT,
      dimensions
    );
  }

  // Record custom metric
  public recordCustomMetric(
    metricName: string,
    value: number,
    unit: MetricUnit = MetricUnit.COUNT,
    customDimensions?: Record<string, string>
  ): void {
    const dimensions = {
      ...this.getDefaultDimensions(),
      ...customDimensions,
    };

    this.recordMetric(metricName, value, unit, dimensions);
  }

  // Flush metrics to CloudWatch
  public async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metricsToSend = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      const command = new PutMetricDataCommand({
        Namespace: METRIC_NAMESPACE,
        MetricData: metricsToSend.map(metric => ({
          MetricName: metric.MetricName,
          Value: metric.Value,
          Unit: metric.Unit as StandardUnit,
          Timestamp: metric.Timestamp,
          Dimensions: metric.Dimensions ? Object.entries(metric.Dimensions).map(([Name, Value]) => ({ Name, Value })) : undefined,
        })),
      });

      await cloudWatchClient.send(command);
      
      logger.info('Metrics flushed to CloudWatch', {
        metricCount: metricsToSend.length,
        namespace: METRIC_NAMESPACE,
      });
    } catch (error) {
      logger.error('Failed to flush metrics to CloudWatch', {
        error: error instanceof Error ? error.message : 'Unknown error',
        metricCount: metricsToSend.length,
      });

      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToSend);
    }
  }

  // Get default dimensions
  private getDefaultDimensions(additionalDimensions?: MetricDimensions): MetricDimensions {
    return {
      Service: process.env.SERVICE_NAME || 'unknown',
      Environment: process.env.ENVIRONMENT || 'dev',
      ...additionalDimensions,
    };
  }

  // Start periodic flush timer
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics().catch(error => {
        logger.error('Periodic metrics flush failed', { error });
      });
    }, this.flushInterval);
  }

  // Stop periodic flush timer
  public stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  // Get current buffer size
  public getBufferSize(): number {
    return this.metricsBuffer.length;
  }

  // Clear buffer
  public clearBuffer(): void {
    this.metricsBuffer = [];
  }
}

// Global metrics manager instance
export const metricsManager = MetricsManager.getInstance();

// Convenience functions for common metrics
export function recordEventCreated(eventType: string, organizerId: string): void {
  metricsManager.recordBusinessMetric(
    BusinessMetricName.EVENTS_CREATED,
    1,
    { EventType: eventType, OrganizerId: organizerId }
  );
}

export function recordUserRegistered(userType: string): void {
  metricsManager.recordBusinessMetric(
    BusinessMetricName.USERS_REGISTERED,
    1,
    { UserType: userType }
  );
}

export function recordBookingCreated(eventId: string, ticketCount: number): void {
  metricsManager.recordBusinessMetric(
    BusinessMetricName.BOOKINGS_CREATED,
    1,
    { EventId: eventId, TicketCount: ticketCount.toString() }
  );
}

export function recordPaymentProcessed(amount: number, currency: string, gateway: string): void {
  metricsManager.recordBusinessMetric(
    BusinessMetricName.PAYMENTS_PROCESSED,
    1,
    { Currency: currency, Gateway: gateway }
  );
  
  metricsManager.recordBusinessMetric(
    BusinessMetricName.REVENUE_GENERATED,
    amount,
    { Currency: currency, Gateway: gateway }
  );
}

export function recordApiRequest(endpoint: string, method: string, duration: number, statusCode: number): void {
  metricsManager.recordApiPerformance(endpoint, method, duration, statusCode);
}

export function recordDatabaseQuery(table: string, operation: string, duration: number, success: boolean): void {
  metricsManager.recordDatabasePerformance(table, operation, duration, success);
}

export function recordExternalServiceCall(serviceName: string, operation: string, duration: number, success: boolean): void {
  metricsManager.recordExternalServicePerformance(serviceName, operation, duration, success);
}

export function recordError(errorType: string, service: string, operation: string): void {
  metricsManager.recordError(errorType, service, operation);
}

// Performance measurement decorator
export function measurePerformance(metricName: string, dimensions?: Record<string, string>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        metricsManager.recordCustomMetric(
          metricName,
          duration,
          MetricUnit.MILLISECONDS,
          { ...dimensions, Method: propertyName, Success: 'true' }
        );
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        metricsManager.recordCustomMetric(
          metricName,
          duration,
          MetricUnit.MILLISECONDS,
          { ...dimensions, Method: propertyName, Success: 'false' }
        );
        
        throw error;
      }
    };
  };
}

// Auto-cleanup on process exit
process.on('beforeExit', async () => {
  await metricsManager.flushMetrics();
  metricsManager.stopPeriodicFlush();
});
