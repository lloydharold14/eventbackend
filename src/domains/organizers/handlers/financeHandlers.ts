import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatSuccessResponse, formatErrorResponse, ValidationError, NotFoundError, UnauthorizedError } from '../../../shared/errors/DomainError';
import { logger } from '../../../shared/utils/logger';
import { initializeTracing, traceLambdaExecution, extractCorrelationId } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';

// Initialize tracing, metrics, and resilience
initializeTracing({
  serviceName: 'FinanceManagementService',
  enableTracing: process.env.ENABLE_TRING === 'true',
  captureHTTP: true,
  captureAWS: true,
  captureSQL: true,
  capturePromise: true,
  captureError: true
});

const metricsManager = MetricsManager.getInstance();
const resilienceManager = new ResilienceManager();

// Helper function to get user from JWT token
const getUserFromToken = async (event: APIGatewayProxyEvent) => {
  const token = event.headers.Authorization?.replace('Bearer ', '');
  if (!token) {
    throw new UnauthorizedError('Authorization token is required');
  }
  
  // TODO: Implement proper token validation
  return {
    userId: 'mock-user-id',
    email: 'user@example.com',
    name: 'Mock User'
  };
};

// Create financial data
export const createFinancialData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const body = JSON.parse(event.body || '{}');
      
      const organizerId = body.organizerId || event.pathParameters?.organizerId;
      
      if (!organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }

      // TODO: Implement actual financial data creation
      const financialData = {
        id: `fin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizerId,
        createdAt: new Date().toISOString()
      };
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/finance', 'POST', duration, 201);
      metricsManager.recordBusinessMetric(BusinessMetricName.FINANCIAL_RECORDS_CREATED, 1, { organizerId });
      
      logger.info('Financial data created successfully', { 
        financialDataId: financialData.id, 
        organizerId,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Financial data created successfully',
        financialData
      }, 201);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('FINANCIAL_DATA_CREATION_ERROR', 'FinanceManagementService', 'createFinancialData');
      
      logger.error('Failed to create financial data', { error, correlationId, duration });
      
      if (error instanceof ValidationError) {
        return formatErrorResponse(error);
      } else if (error instanceof NotFoundError) {
        return formatErrorResponse(error);
      } else if (error instanceof UnauthorizedError) {
        return formatErrorResponse(error);
      } else {
        return formatErrorResponse(new Error('Internal server error'));
      }
    }
  }, event);
  
  return handler(event);
};

// Get financial data
export const getFinancialData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const organizerId = event.pathParameters?.organizerId;
      
      if (!organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }
      
      // TODO: Implement actual financial data retrieval
      const financialData = {
        id: `fin_${Date.now()}`,
        organizerId,
        revenue: 0,
        exchangeRates: {},
        taxBreakdown: {},
        payouts: [],
        compliance: {},
        metrics: {}
      };
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/finance', 'GET', duration, 200);
      
      logger.info('Financial data retrieved successfully', {
        organizerId,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({ financialData });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('FINANCIAL_DATA_RETRIEVAL_ERROR', 'FinanceManagementService', 'getFinancialData');
      
      logger.error('Failed to get financial data', { error, correlationId, duration });
      
      if (error instanceof NotFoundError) {
        return formatErrorResponse(error);
      } else if (error instanceof UnauthorizedError) {
        return formatErrorResponse(error);
      } else {
        return formatErrorResponse(new Error('Internal server error'));
      }
    }
  }, event);
  
  return handler(event);
};
