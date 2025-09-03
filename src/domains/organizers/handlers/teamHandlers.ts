import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatSuccessResponse, formatErrorResponse, ValidationError, NotFoundError, UnauthorizedError } from '../../../shared/errors/DomainError';
import { logger } from '../../../shared/utils/logger';
import { initializeTracing, traceLambdaExecution, extractCorrelationId } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';

// Initialize tracing, metrics, and resilience
initializeTracing({
  serviceName: 'TeamManagementService',
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

// Create team member
export const createTeamMember = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const body = JSON.parse(event.body || '{}');
      
      if (!body.email || !body.role) {
        return formatErrorResponse(new ValidationError('Email and role are required'));
      }

      // TODO: Implement actual team member creation
      const teamMember = {
        id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: body.email,
        role: body.role,
        organizerId: body.organizerId || event.pathParameters?.organizerId,
        createdAt: new Date().toISOString()
      };
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/team', 'POST', duration, 201);
      metricsManager.recordBusinessMetric(BusinessMetricName.TEAM_MEMBERS_ADDED, 1, { organizerId: teamMember.organizerId });
      
      logger.info('Team member created successfully', { 
        memberId: teamMember.id, 
        organizerId: teamMember.organizerId,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Team member added successfully',
        teamMember
      }, 201);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('TEAM_MEMBER_CREATION_ERROR', 'TeamManagementService', 'createTeamMember');
      
      logger.error('Failed to create team member', { error, correlationId, duration });
      
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

// Get team members
export const getTeamMembers = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const organizerId = event.pathParameters?.organizerId;
      
      if (!organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }
      
      // TODO: Implement actual team member retrieval
      const teamMembers = [
        {
          id: 'member_1',
          email: 'member@example.com',
          role: 'admin',
          organizerId,
          createdAt: new Date().toISOString()
        }
      ];
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/team', 'GET', duration, 200);
      
      logger.info('Team members retrieved successfully', {
        organizerId,
        count: teamMembers.length,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({ teamMembers });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('TEAM_MEMBERS_RETRIEVAL_ERROR', 'TeamManagementService', 'getTeamMembers');
      
      logger.error('Failed to get team members', { error, correlationId, duration });
      
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
