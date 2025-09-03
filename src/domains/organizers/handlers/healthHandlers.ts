import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatSuccessResponse } from '../../../shared/errors/DomainError';
import { initializeTracing, traceLambdaExecution } from '../../../shared/utils/tracing';

// Initialize tracing (will be disabled if DISABLE_XRAY is true)
initializeTracing({
  serviceName: 'HealthCheckService',
  enableTracing: process.env.ENABLE_TRING === 'true',
  captureHTTP: true,
  captureAWS: true,
  captureSQL: true,
  capturePromise: true,
  captureError: true
});

// Health check endpoint
export const healthCheck = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return formatSuccessResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Organizer Management Service'
    });
  }, event);
  
  return handler(event);
};

// Database health check
export const databaseHealthCheck = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // TODO: Implement actual database health check
    return formatSuccessResponse({
      status: 'healthy',
      database: 'DynamoDB',
      timestamp: new Date().toISOString()
    });
  }, event);
  
  return handler(event);
};

// Service health check
export const serviceHealthCheck = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // TODO: Implement actual service health check
    return formatSuccessResponse({
      status: 'healthy',
      services: ['Marketing', 'Support', 'Finance', 'Team'],
      timestamp: new Date().toISOString()
    });
  }, event);
  
  return handler(event);
};
