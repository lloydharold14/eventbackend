import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AnalyticsService } from '../services/AnalyticsService';
import { formatSuccessResponse, formatErrorResponse } from '../../../shared/utils/responseUtils';
import { validateSchemaTyped } from '../../../shared/validators/schemas';
import { 
  analyticsRequestSchema, 
  dashboardRequestSchema, 
  reportRequestSchema, 
  analyticsExportRequestSchema 
} from '../validators/analyticsSchemas';
import { 
  AnalyticsRequest, 
  DashboardRequest, 
  ReportRequest, 
  AnalyticsExportRequest 
} from '../models/Analytics';
import { initializeTracing, traceLambdaExecution, extractCorrelationId } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';
import { Logger } from '@aws-lambda-powertools/logger';

// Initialize tracing, metrics, and resilience
initializeTracing({
  serviceName: 'AnalyticsService',
  enableTracing: process.env.ENABLE_TRACING === 'true',
  captureHTTP: true,
  captureAWS: true,
  captureSQL: true,
  capturePromise: true,
  captureError: true
});

const logger = new Logger({ serviceName: 'analytics-handlers' });
const metricsManager = MetricsManager.getInstance();
const resilienceManager = new ResilienceManager();

// Initialize analytics service
const analyticsService = new AnalyticsService(process.env.ANALYTICS_TABLE_NAME!);

/**
 * Generate analytics data
 */
export const generateAnalytics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(analyticsRequestSchema, body);
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'AnalyticsService', 'generateAnalytics');
        return formatErrorResponse('Validation failed: ' + JSON.stringify(validation.errors?.details || []));
      }

      const result = await resilienceManager.executeWithResilience(
        () => analyticsService.generateAnalytics(validation.data as AnalyticsRequest),
        {
          circuitBreakerKey: 'generate-analytics',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 30000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/generate', 'POST', duration, 200);
      
      logger.info('Analytics generated successfully', { 
        requestId: result.metadata.requestId,
        recordCount: result.metadata.recordCount,
        processingTimeMs: result.metadata.processingTime,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/generate', 'POST', duration, 500);
      metricsManager.recordError('ANALYTICS_GENERATION_ERROR', 'AnalyticsService', 'generateAnalytics');
      
      logger.error('Analytics generation failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Analytics generation failed');
    }
  }, event)(event);
};

/**
 * Generate dashboard
 */
export const generateDashboard = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(dashboardRequestSchema, body);
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'AnalyticsService', 'generateDashboard');
        return formatErrorResponse('Validation failed: ' + JSON.stringify(validation.errors?.details || []));
      }

      const result = await resilienceManager.executeWithResilience(
        () => analyticsService.generateDashboard(validation.data as DashboardRequest),
        {
          circuitBreakerKey: 'generate-dashboard',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 30000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/dashboard', 'POST', duration, 200);
      
      logger.info('Dashboard generated successfully', { 
        dashboardType: (validation.data as DashboardRequest).dashboardType,
        timeRange: (validation.data as DashboardRequest).timeRange,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/dashboard', 'POST', duration, 500);
      metricsManager.recordError('DASHBOARD_GENERATION_ERROR', 'AnalyticsService', 'generateDashboard');
      
      logger.error('Dashboard generation failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Dashboard generation failed');
    }
  }, event)(event);
};

/**
 * Generate report
 */
export const generateReport = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(reportRequestSchema, body);
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'AnalyticsService', 'generateReport');
        return formatErrorResponse('Validation failed: ' + JSON.stringify(validation.errors?.details || []));
      }

      const result = await resilienceManager.executeWithResilience(
        () => analyticsService.generateReport(validation.data as ReportRequest),
        {
          circuitBreakerKey: 'generate-report',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 60000 } // Longer timeout for report generation
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/report', 'POST', duration, 200);
      
      logger.info('Report generated successfully', { 
        reportId: result.metadata.reportId,
        reportType: (validation.data as ReportRequest).reportType,
        format: (validation.data as ReportRequest).format,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/report', 'POST', duration, 500);
      metricsManager.recordError('REPORT_GENERATION_ERROR', 'AnalyticsService', 'generateReport');
      
      logger.error('Report generation failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Report generation failed');
    }
  }, event)(event);
};

/**
 * Get real-time metrics
 */
export const getRealTimeMetrics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const result = await resilienceManager.executeWithResilience(
        () => analyticsService.getRealTimeMetrics(),
        {
          circuitBreakerKey: 'real-time-metrics',
          retryConfig: { maxRetries: 2, baseDelay: 500 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/realtime', 'GET', duration, 200);
      
      logger.info('Real-time metrics retrieved successfully', { 
        activeUsers: result.activeUsers,
        activeEvents: result.activeEvents,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/realtime', 'GET', duration, 500);
      metricsManager.recordError('REAL_TIME_METRICS_ERROR', 'AnalyticsService', 'getRealTimeMetrics');
      
      logger.error('Real-time metrics retrieval failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Real-time metrics retrieval failed');
    }
  }, event)(event);
};

/**
 * Export analytics data
 */
export const exportAnalytics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(analyticsExportRequestSchema, body);
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'AnalyticsService', 'exportAnalytics');
        return formatErrorResponse('Validation failed: ' + JSON.stringify(validation.errors?.details || []));
      }

      const result = await resilienceManager.executeWithResilience(
        () => analyticsService.exportAnalytics(validation.data as AnalyticsExportRequest),
        {
          circuitBreakerKey: 'export-analytics',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 60000 } // Longer timeout for exports
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/export', 'POST', duration, 200);
      
      logger.info('Analytics export created successfully', { 
        exportId: result.exportId,
        exportType: (validation.data as AnalyticsExportRequest).exportType,
        format: (validation.data as AnalyticsExportRequest).format,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/export', 'POST', duration, 500);
      metricsManager.recordError('ANALYTICS_EXPORT_ERROR', 'AnalyticsService', 'exportAnalytics');
      
      logger.error('Analytics export failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Analytics export failed');
    }
  }, event)(event);
};

/**
 * Get analytics health status
 */
export const getHealthStatus = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const result = await resilienceManager.executeWithResilience(
        () => analyticsService.getHealthStatus(),
        {
          circuitBreakerKey: 'health-status',
          retryConfig: { maxRetries: 2, baseDelay: 500 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/health', 'GET', duration, 200);
      
      logger.info('Health status retrieved successfully', { 
        status: result.status,
        servicesCount: result.services.length,
        dataSourcesCount: result.dataSources.length,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/health', 'GET', duration, 500);
      metricsManager.recordError('HEALTH_STATUS_ERROR', 'AnalyticsService', 'getHealthStatus');
      
      logger.error('Health status retrieval failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Health status retrieval failed');
    }
  }, event)(event);
};

/**
 * Get analytics configuration
 */
export const getAnalyticsConfig = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      // Return analytics configuration
      const config = {
        retentionDays: 365,
        aggregationIntervals: ['hour', 'day', 'week', 'month', 'quarter', 'year'],
        realTimeEnabled: true,
        alertThresholds: {
          errorRate: 5.0,
          responseTime: 5000,
          revenueDrop: 10.0,
          userDrop: 5.0,
          bookingDrop: 15.0
        },
        exportFormats: ['json', 'csv', 'excel'],
        maxExportRecords: 100000
      };
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/config', 'GET', duration, 200);
      
      logger.info('Analytics configuration retrieved successfully', { 
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(config);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/analytics/config', 'GET', duration, 500);
      metricsManager.recordError('CONFIG_RETRIEVAL_ERROR', 'AnalyticsService', 'getAnalyticsConfig');
      
      logger.error('Analytics configuration retrieval failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Analytics configuration retrieval failed');
    }
  }, event)(event);
};
