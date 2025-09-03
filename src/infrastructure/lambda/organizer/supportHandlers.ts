import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createMessage, getMessages } from '../../../domains/organizers/handlers/supportHandlers';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, path } = event;
  
  try {
    // Route based on HTTP method and path
    switch (httpMethod) {
      case 'POST':
        if (path === '/organizer/support') {
          return await createMessage(event);
        }
        break;
        
      case 'GET':
        if (path === '/organizer/support') {
          return await getMessages(event);
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
    console.error('Error in support handler:', error);
    
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
