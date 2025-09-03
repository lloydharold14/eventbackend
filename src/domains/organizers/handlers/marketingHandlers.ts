import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MarketingService } from '../services/marketing/MarketingService';
import { OrganizerService } from '../services/organizer/OrganizerService';
import { formatSuccessResponse, formatErrorResponse, ValidationError, NotFoundError, UnauthorizedError } from '../../../shared/errors/DomainError';
import { logger } from '../../../shared/utils/logger';
import { 
  CreateCampaignRequest, 
  UpdateCampaignRequest, 
  CampaignSearchFilters,
  CampaignAnalyticsRequest
} from '../models/Marketing';
import { initializeTracing, traceLambdaExecution, extractCorrelationId } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { ResilienceManager } from '../../../shared/utils/resilience';

// Initialize tracing, metrics, and resilience
initializeTracing({
  serviceName: 'MarketingManagementService',
  enableTracing: process.env.ENABLE_TRING === 'true',
  captureHTTP: true,
  captureAWS: true,
  captureSQL: true,
  capturePromise: true,
  captureError: true
});

const metricsManager = MetricsManager.getInstance();
const resilienceManager = new ResilienceManager();

// Initialize services (TODO: Use proper dependency injection)
const organizerService = {} as any; // Placeholder
const marketingService = new MarketingService(organizerService);

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

// Create marketing campaign
export const createCampaign = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const body = JSON.parse(event.body || '{}');
      
      const requestData: CreateCampaignRequest = {
        ...body,
        organizerId: body.organizerId || event.pathParameters?.organizerId
      };
      
      if (!requestData.organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }

      const campaign = await resilienceManager.executeWithResilience(
        () => marketingService.createCampaign(requestData),
        {
          circuitBreakerKey: 'campaign-creation',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 15000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/marketing/campaigns', 'POST', duration, 201);
      metricsManager.recordBusinessMetric(BusinessMetricName.MARKETING_CAMPAIGNS_CREATED, 1, { organizerId: requestData.organizerId });
      
      logger.info('Marketing campaign created successfully', { 
        campaignId: campaign.id, 
        organizerId: requestData.organizerId,
        correlationId,
        duration 
      });
      
      return formatSuccessResponse({
        message: 'Marketing campaign created successfully',
        campaign: {
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
          targeting: campaign.targeting,
          budget: campaign.budget
        }
      }, 201);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('CAMPAIGN_CREATION_ERROR', 'MarketingManagementService', 'createCampaign');
      
      logger.error('Failed to create marketing campaign', { error, correlationId, duration });
      
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

// Get campaigns
export const getCampaigns = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const organizerId = event.pathParameters?.organizerId;
      
      if (!organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }
      
      const campaigns = await resilienceManager.executeWithResilience(
        () => marketingService.getCampaignsByOrganizer(organizerId),
        {
          circuitBreakerKey: 'campaigns-retrieval',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/marketing/campaigns', 'GET', duration, 200);
      
      logger.info('Marketing campaigns retrieved successfully', {
        organizerId,
        count: campaigns.length,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({
        campaigns: campaigns.map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
          targeting: campaign.targeting,
          budget: campaign.budget,
          performance: {
            totalSent: campaign.performance.totalSent,
            totalDelivered: campaign.performance.totalDelivered,
            totalOpened: campaign.performance.totalOpened,
            totalClicked: campaign.performance.totalClicked,
            totalConverted: campaign.performance.totalConverted,
            totalRevenue: campaign.performance.totalRevenue
          },
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        }))
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('CAMPAIGNS_RETRIEVAL_ERROR', 'MarketingManagementService', 'getCampaigns');
      
      logger.error('Failed to get marketing campaigns', { error, correlationId, duration });
      
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

// Get campaign by ID
export const getCampaign = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const campaignId = event.pathParameters?.campaignId;
      
      if (!campaignId) {
        return formatErrorResponse(new ValidationError('Campaign ID is required'));
      }
      
      const campaign = await resilienceManager.executeWithResilience(
        () => marketingService.getCampaignById(campaignId),
        {
          circuitBreakerKey: 'campaign-retrieval',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 10000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/marketing/campaigns/{campaignId}', 'GET', duration, 200);
      
      logger.info('Marketing campaign retrieved successfully', {
        campaignId,
        organizerId: campaign.organizerId,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({ campaign });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('CAMPAIGN_RETRIEVAL_ERROR', 'MarketingManagementService', 'getCampaign');
      
      logger.error('Failed to get marketing campaign', { error, correlationId, duration });
      
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

// Update campaign
export const updateCampaign = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const campaignId = event.pathParameters?.campaignId;
      
      if (!campaignId) {
        return formatErrorResponse(new ValidationError('Campaign ID is required'));
      }
      
      const body = JSON.parse(event.body || '{}');
      
      const campaign = await resilienceManager.executeWithResilience(
        () => marketingService.updateCampaign(campaignId, body),
        {
          circuitBreakerKey: 'campaign-update',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 15000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/marketing/campaigns/{campaignId}', 'PUT', duration, 200);
      
      logger.info('Marketing campaign updated successfully', {
        campaignId,
        organizerId: campaign.organizerId,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({
        message: 'Marketing campaign updated successfully',
        campaign: {
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
          targeting: campaign.targeting,
          budget: campaign.budget,
          updatedAt: campaign.updatedAt
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('CAMPAIGN_UPDATE_ERROR', 'MarketingManagementService', 'updateCampaign');
      
      logger.error('Failed to update marketing campaign', { error, correlationId, duration });
      
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

// Delete campaign
export const deleteCampaign = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const campaignId = event.pathParameters?.campaignId;
      const organizerId = event.pathParameters?.organizerId;
      
      if (!campaignId) {
        return formatErrorResponse(new ValidationError('Campaign ID is required'));
      }
      
      if (!organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }
      
      await resilienceManager.executeWithResilience(
        () => marketingService.deleteCampaign(campaignId, organizerId),
        {
          circuitBreakerKey: 'campaign-deletion',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 15000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/marketing/campaigns/{campaignId}', 'DELETE', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.MARKETING_CAMPAIGNS_DELETED, 1, { organizerId });
      
      logger.info('Marketing campaign deleted successfully', {
        campaignId,
        organizerId,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({
        message: 'Marketing campaign deleted successfully'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('CAMPAIGN_DELETION_ERROR', 'MarketingManagementService', 'deleteCampaign');
      
      logger.error('Failed to delete marketing campaign', { error, correlationId, duration });
      
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

// Activate campaign
export const activateCampaign = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const campaignId = event.pathParameters?.campaignId;
      const organizerId = event.pathParameters?.organizerId;
      
      if (!campaignId) {
        return formatErrorResponse(new ValidationError('Campaign ID is required'));
      }
      
      if (!organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }
      
      const result = await resilienceManager.executeWithResilience(
        () => marketingService.activateCampaign(campaignId, organizerId),
        {
          circuitBreakerKey: 'campaign-activation',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 15000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/marketing/campaigns/{campaignId}/activate', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.MARKETING_CAMPAIGNS_ACTIVATED, 1, { organizerId });
      
      logger.info('Marketing campaign activated successfully', {
        campaignId,
        organizerId,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({
        message: 'Marketing campaign activated successfully',
        result
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('CAMPAIGN_ACTIVATION_ERROR', 'MarketingManagementService', 'activateCampaign');
      
      logger.error('Failed to activate marketing campaign', { error, correlationId, duration });
      
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

// Pause campaign
export const pauseCampaign = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const campaignId = event.pathParameters?.campaignId;
      const organizerId = event.pathParameters?.organizerId;
      
      if (!campaignId) {
        return formatErrorResponse(new ValidationError('Campaign ID is required'));
      }
      
      if (!organizerId) {
        return formatErrorResponse(new ValidationError('Organizer ID is required'));
      }
      
      const result = await resilienceManager.executeWithResilience(
        () => marketingService.pauseCampaign(campaignId, organizerId),
        {
          circuitBreakerKey: 'campaign-pause',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 15000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/marketing/campaigns/{campaignId}/pause', 'POST', duration, 200);
      metricsManager.recordBusinessMetric(BusinessMetricName.MARKETING_CAMPAIGNS_PAUSED, 1, { organizerId });
      
      logger.info('Marketing campaign paused successfully', {
        campaignId,
        organizerId,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({
        message: 'Marketing campaign paused successfully',
        result
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('CAMPAIGN_PAUSE_ERROR', 'MarketingManagementService', 'pauseCampaign');
      
      logger.error('Failed to pause marketing campaign', { error, correlationId, duration });
      
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

// Get campaign analytics
export const getCampaignAnalytics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const handler = traceLambdaExecution(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const correlationId = extractCorrelationId(event);
    const startTime = Date.now();
    
    try {
      const user = await getUserFromToken(event);
      const campaignId = event.pathParameters?.campaignId;
      
      if (!campaignId) {
        return formatErrorResponse(new ValidationError('Campaign ID is required'));
      }
      
      // Get query parameters
      const queryParams = event.queryStringParameters || {};
      const request: CampaignAnalyticsRequest = {
        campaignId,
        period: (queryParams.period as 'day' | 'week' | 'month' | 'quarter' | 'year') || 'month',
        startDate: queryParams.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: queryParams.endDate || new Date().toISOString()
      };
      
      const analytics = await resilienceManager.executeWithResilience(
        () => marketingService.getCampaignAnalytics(request),
        {
          circuitBreakerKey: 'campaign-analytics',
          retryConfig: { maxRetries: 3, baseDelay: 1000 },
          timeoutConfig: { timeoutMs: 20000 }
        }
      );
      
      const duration = Date.now() - startTime;
      metricsManager.recordApiPerformance('/organizers/{id}/marketing/campaigns/{campaignId}/analytics', 'GET', duration, 200);
      
      logger.info('Campaign analytics retrieved successfully', {
        campaignId,
        period: request.period,
        correlationId,
        duration
      });
      
      return formatSuccessResponse({ analytics });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsManager.recordError('CAMPAIGN_ANALYTICS_ERROR', 'MarketingManagementService', 'getCampaignAnalytics');
      
      logger.error('Failed to get campaign analytics', { error, correlationId, duration });
      
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
