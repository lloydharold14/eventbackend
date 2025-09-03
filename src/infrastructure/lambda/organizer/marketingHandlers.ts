import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createCampaign, getCampaigns, getCampaign, updateCampaign, deleteCampaign, activateCampaign, pauseCampaign, getCampaignAnalytics } from '../../../domains/organizers/handlers/marketingHandlers';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, path, pathParameters } = event;
  
  try {
    // Route based on HTTP method and path
    switch (httpMethod) {
      case 'POST':
        if (path === '/organizer/marketing') {
          return await createCampaign(event);
        } else if (pathParameters?.campaignId && path.endsWith('/activate')) {
          return await activateCampaign(event);
        } else if (pathParameters?.campaignId && path.endsWith('/pause')) {
          return await pauseCampaign(event);
        }
        break;
        
      case 'GET':
        if (path === '/organizer/marketing') {
          return await getCampaigns(event);
        } else if (pathParameters?.campaignId && path.endsWith('/analytics')) {
          return await getCampaignAnalytics(event);
        } else if (pathParameters?.campaignId) {
          return await getCampaign(event);
        }
        break;
        
      case 'PUT':
        if (pathParameters?.campaignId) {
          return await updateCampaign(event);
        }
        break;
        
      case 'DELETE':
        if (pathParameters?.campaignId) {
          return await deleteCampaign(event);
        }
        break;
        
      default:
        return {
          statusCode: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
          },
          body: JSON.stringify({
            message: 'Method not allowed',
            error: `HTTP method ${httpMethod} is not supported for this endpoint`
          })
        };
    }
    
    // If no route matches, return 404
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        message: 'Endpoint not found',
        error: `No handler found for ${httpMethod} ${path}`
      })
    };
    
  } catch (error) {
    console.error('Error in marketing handler:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    };
  }
};
