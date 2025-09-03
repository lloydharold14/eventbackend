import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatSuccessResponse, formatErrorResponse, ValidationError, NotFoundError, UnauthorizedError } from '../../../shared/errors/DomainError';
import { logger } from '../../../shared/utils/logger';
import { initializeTracing, traceLambdaExecution, extractCorrelationId } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';

// Initialize tracing, metrics, and resilience
initializeTracing({
  serviceName: 'SupportManagementService',
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

// Create support message
export const createMessage = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const body = JSON.parse(event.body || '{}');
      
      if (!body.subject || !body.message) {
        return formatErrorResponse(new ValidationError('Subject and message are required'));
      }

      // TODO: Implement actual message creation
      const supportMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        subject: body.subject,
        message: body.message,
        attendeeId: user.userId,
        createdAt: new Date().toISOString()
      };
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/support/messages', 'POST', duration, 201);
      metricsManager.recordBusinessMetric(BusinessMetricName.SUPPORT_MESSAGES_CREATED, 1, { userId: user.userId });
      
      logger.info('Support message created successfully', { 
        messageId: supportMessage.id, 
        userId: user.userId,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Support message created successfully',
        supportMessage
      }, 201);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('SUPPORT_MESSAGE_CREATION_ERROR', 'SupportManagementService', 'createMessage');
      
      logger.error('Failed to create support message', { error, correlationId, duration });
      
      if (error instanceof ValidationError) {
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

// Get support messages
export const getMessages = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const organizerId = event.pathParameters?.organizerId;
      
      if (!organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }
      
      // TODO: Implement actual message retrieval
      const messages = [
        {
          id: 'msg_1',
          subject: 'Test Message',
          message: 'This is a test support message',
          attendeeId: user.userId,
          createdAt: new Date().toISOString()
        }
      ];
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/support/messages', 'GET', duration, 200);
      
      logger.info('Support messages retrieved successfully', {
        organizerId,
        count: messages.length,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({ messages });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('SUPPORT_MESSAGES_RETRIEVAL_ERROR', 'SupportManagementService', 'getMessages');
      
      logger.error('Failed to get support messages', { error, correlationId, duration });
      
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
