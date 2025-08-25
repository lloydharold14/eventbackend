import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SearchService } from '../services/SearchService';
import { formatSuccessResponse, formatErrorResponse } from '../../../shared/utils/responseUtils';
import { validateSchemaTyped } from '../../../shared/validators/schemas';
import { searchRequestSchema, searchSuggestionRequestSchema, indexEventRequestSchema, bulkIndexRequestSchema } from '../validators/searchSchemas';
import { SearchRequest, IndexEventRequest, BulkIndexRequest, SearchSuggestionRequest } from '../models/Search';
import { initializeTracing, traceLambdaExecution, extractCorrelationId } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';
import { Logger } from '@aws-lambda-powertools/logger';

// Initialize tracing, metrics, and resilience
initializeTracing({
  serviceName: 'SearchService',
  enableTracing: process.env.ENABLE_TRACING === 'true',
  captureHTTP: true,
  captureAWS: true,
  captureSQL: true,
  capturePromise: true,
  captureError: true
});

const logger = new Logger({ serviceName: 'search-handlers' });
const metricsManager = MetricsManager.getInstance();
const resilienceManager = new ResilienceManager();

// Initialize search service
const searchService = new SearchService(
  process.env.OPENSEARCH_ENDPOINT!,
  process.env.OPENSEARCH_INDEX_NAME || 'events'
);

/**
 * Search events
 */
export const searchEvents = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(searchRequestSchema, body);
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'SearchService', 'searchEvents');
        return formatErrorResponse('Validation failed: ' + JSON.stringify(validation.errors?.details || []));
      }

      const result = await resilienceManager.executeWithResilience(
        () => searchService.searchEvents(validation.data as SearchRequest),
        {
          circuitBreakerKey: 'search-events',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 15000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/events', 'POST', duration, 200);
      
      logger.info('Search completed successfully', { 
        query: (validation.data as SearchRequest).query,
        resultsCount: result.total.value,
        processingTimeMs: result.processingTimeMs,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/events', 'POST', duration, 500);
      metricsManager.recordError('SEARCH_ERROR', 'SearchService', 'searchEvents');
      
      logger.error('Search failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Search failed');
    }
  }, event)(event);
};

/**
 * Index a single event
 */
export const indexEvent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(indexEventRequestSchema, body);
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'SearchService', 'indexEvent');
        return formatErrorResponse('Validation failed: ' + JSON.stringify(validation.errors?.details || []));
      }

      await resilienceManager.executeWithResilience(
        () => searchService.indexEvent(validation.data as IndexEventRequest),
        {
          circuitBreakerKey: 'index-event',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/index', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.SEARCH_INDEX_UPDATED, 1);
      
      logger.info('Event indexed successfully', { 
        eventId: (validation.data as IndexEventRequest).event.id,
        operation: (validation.data as IndexEventRequest).operation,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Event indexed successfully',
        eventId: (validation.data as IndexEventRequest).event.id,
        operation: (validation.data as IndexEventRequest).operation
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/index', 'POST', duration, 500);
      metricsManager.recordError('INDEXING_ERROR', 'SearchService', 'indexEvent');
      
      logger.error('Event indexing failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Event indexing failed');
    }
  }, event)(event);
};

/**
 * Update event index
 */
export const updateEventIndex = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(indexEventRequestSchema, body);
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'SearchService', 'updateEventIndex');
        return formatErrorResponse('Validation failed: ' + JSON.stringify(validation.errors?.details || []));
      }

      await resilienceManager.executeWithResilience(
        () => searchService.indexEvent({ ...(validation.data as IndexEventRequest), operation: 'update' }),
        {
          circuitBreakerKey: 'update-event-index',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/update', 'PUT', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.SEARCH_INDEX_UPDATED, 1);
      
      logger.info('Event index updated successfully', { 
        eventId: (validation.data as IndexEventRequest).event.id,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Event index updated successfully',
        eventId: (validation.data as IndexEventRequest).event.id
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/update', 'PUT', duration, 500);
      metricsManager.recordError('INDEXING_ERROR', 'SearchService', 'updateEventIndex');
      
      logger.error('Event index update failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Event index update failed');
    }
  }, event)(event);
};

/**
 * Delete event from index
 */
export const deleteEventIndex = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const eventId = event.pathParameters?.eventId;
      if (!eventId) {
        return formatErrorResponse('Event ID is required', 400);
      }

      await resilienceManager.executeWithResilience(
        () => searchService.indexEvent({
          event: { id: eventId } as any,
          operation: 'delete'
        }),
        {
          circuitBreakerKey: 'delete-event-index',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/delete', 'DELETE', duration, 200);
      
      logger.info('Event deleted from index successfully', { 
        eventId,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Event deleted from index successfully',
        eventId
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/delete', 'DELETE', duration, 500);
      metricsManager.recordError('INDEXING_ERROR', 'SearchService', 'deleteEventIndex');
      
      logger.error('Event index deletion failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Event index deletion failed');
    }
  }, event)(event);
};

/**
 * Bulk index events
 */
export const bulkIndexEvents = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(bulkIndexRequestSchema, body);
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'SearchService', 'bulkIndexEvents');
        return formatErrorResponse('Validation failed: ' + JSON.stringify(validation.errors?.details || []));
      }

      const result = await resilienceManager.executeWithResilience(
        () => searchService.bulkIndexEvents(validation.data as BulkIndexRequest),
        {
          circuitBreakerKey: 'bulk-index-events',
          retryConfig: { maxRetries: 2, baseDelay: 2000 },
          timeoutConfig: { timeoutMs: 300000 } // 5 minutes for bulk operations
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/bulk-index', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.SEARCH_INDEX_UPDATED, result.indexed);
      
      logger.info('Bulk indexing completed', { 
        total: (validation.data as BulkIndexRequest).events.length,
        indexed: result.indexed,
        failed: result.failed,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/bulk-index', 'POST', duration, 500);
      metricsManager.recordError('BULK_INDEXING_ERROR', 'SearchService', 'bulkIndexEvents');
      
      logger.error('Bulk indexing failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Bulk indexing failed');
    }
  }, event)(event);
};

/**
 * Search suggestions
 */
export const searchSuggestions = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate input
      const validation = validateSchemaTyped(searchSuggestionRequestSchema, body);
      if (!validation.isValid) {
        metricsManager.recordError('VALIDATION_ERROR', 'SearchService', 'searchSuggestions');
        return formatErrorResponse('Validation failed: ' + JSON.stringify(validation.errors?.details || []));
      }

      const result = await resilienceManager.executeWithResilience(
        () => searchService.searchSuggestions(validation.data as SearchSuggestionRequest),
        {
          circuitBreakerKey: 'search-suggestions',
          retryConfig: { maxRetries: 2, baseDelay: 500 },
          timeoutConfig: { timeoutMs: 5000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/suggestions', 'POST', duration, 200);
      
      logger.info('Search suggestions completed', { 
        query: (validation.data as SearchSuggestionRequest).query,
        suggestionsCount: result.suggestions.length,
        processingTimeMs: result.processingTimeMs,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/suggestions', 'POST', duration, 500);
      metricsManager.recordError('SUGGESTION_ERROR', 'SearchService', 'searchSuggestions');
      
      logger.error('Search suggestions failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Search suggestions failed');
    }
  }, event)(event);
};

/**
 * Health check
 */
export const healthCheck = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const healthStatus = await resilienceManager.executeWithResilience(
        () => searchService.getHealthStatus(),
        {
          circuitBreakerKey: 'search-health',
          retryConfig: { maxRetries: 2, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/health', 'GET', duration, 200);
      
      logger.info('Search health check completed', { 
        status: healthStatus.status,
        openSearchStatus: healthStatus.openSearchStatus,
        documentCount: healthStatus.documentCount,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse(healthStatus);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/search/health', 'GET', duration, 500);
      metricsManager.recordError('HEALTH_CHECK_ERROR', 'SearchService', 'healthCheck');
      
      logger.error('Search health check failed', { 
        error: error.message, 
        event, 
        correlationId,
        duration 
      });
      return formatErrorResponse(error.message || 'Search health check failed');
    }
  }, event)(event);
};
