import { DynamoDB } from 'aws-sdk';
import { 
  Organizer, 
  CreateOrganizerRequest, 
  UpdateOrganizerRequest, 
  OrganizerSearchFilters, 
  OrganizerListResponse 
} from '../models/Organizer';
import { logger } from '../../../shared/utils/logger';
import { NotFoundError, DatabaseError } from '../../../shared/errors/DomainError';

export class OrganizerRepository {
  private dynamoDB: DynamoDB.DocumentClient;
  private tableName: string;
  private region: string;

  constructor(region: string, tableName: string) {
    this.region = region;
    this.tableName = tableName;
    this.dynamoDB = new DynamoDB.DocumentClient({ region });
  }

  // Create new organizer
  async createOrganizer(organizer: Organizer): Promise<Organizer> {
    try {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: {
          PK: `ORGANIZER#${organizer.id}`,
          SK: `ORGANIZER#${organizer.id}`,
          GSI1PK: `USER#${organizer.userId}`,
          GSI1SK: `ORGANIZER#${organizer.id}`,
          GSI2PK: `COUNTRY#${organizer.country}`,
          GSI2SK: `REGION#${organizer.region}`,
          GSI3PK: `INDUSTRY#${organizer.industry}`,
          GSI3SK: `ORGANIZER#${organizer.id}`,
          GSI4PK: `BUSINESS_TYPE#${organizer.businessType}`,
          GSI4SK: `ORGANIZER#${organizer.id}`,
          GSI5PK: `SUBSCRIPTION#${organizer.subscription}`,
          GSI5SK: `ORGANIZER#${organizer.id}`,
          ...organizer,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(PK)'
      };

      await this.dynamoDB.put(params).promise();
      
      logger.info('Organizer created in database', { organizerId: organizer.id });
      return organizer;
    } catch (error) {
      logger.error('Failed to create organizer in database', { error, organizerId: organizer.id });
      throw new DatabaseError('Failed to create organizer');
    }
  }

  // Get organizer by ID
  async getOrganizerById(organizerId: string): Promise<Organizer> {
    try {
      const params: DynamoDB.DocumentClient.GetItemInput = {
        TableName: this.tableName,
        Key: {
          PK: `ORGANIZER#${organizerId}`,
          SK: `ORGANIZER#${organizerId}`
        }
      };

      const result = await this.dynamoDB.get(params).promise();
      
      if (!result.Item) {
        throw new NotFoundError('Organizer', 'not_found');
      }

      // Remove DynamoDB-specific fields
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, GSI4PK, GSI4SK, GSI5PK, GSI5SK, ...organizer } = result.Item;
      
      logger.info('Organizer retrieved from database', { organizerId });
      return organizer as Organizer;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get organizer from database', { error, organizerId });
      throw new DatabaseError('Failed to retrieve organizer');
    }
  }

  // Get organizer by user ID
  async getOrganizerByUserId(userId: string): Promise<Organizer | null> {
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :userId',
        ExpressionAttributeValues: {
          ':userId': `USER#${userId}`
        },
        Limit: 1
      };

      const result = await this.dynamoDB.query(params).promise();
      
      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      // Remove DynamoDB-specific fields
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, GSI4PK, GSI4SK, GSI5PK, GSI5SK, ...organizer } = result.Items[0];
      
      logger.info('Organizer retrieved by user ID from database', { userId, organizerId: organizer.id });
      return organizer as Organizer;
    } catch (error) {
      logger.error('Failed to get organizer by user ID from database', { error, userId });
      throw new DatabaseError('Failed to retrieve organizer by user ID');
    }
  }

  // Update organizer
  async updateOrganizer(organizerId: string, updates: Partial<Organizer>): Promise<Organizer> {
    try {
      // Get current organizer first
      const currentOrganizer = await this.getOrganizerById(organizerId);
      
      // Prepare update expression
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'PK' && key !== 'SK') {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      });
      
      // Always update the updatedAt timestamp
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      
      // Update GSI fields if country, region, industry, businessType, or subscription changed
      if (updates.country || updates.region) {
        const newCountry = updates.country || currentOrganizer.country;
        const newRegion = updates.region || currentOrganizer.region;
        
        updateExpression.push('#GSI2PK = :GSI2PK, #GSI2SK = :GSI2SK');
        expressionAttributeNames['#GSI2PK'] = 'GSI2PK';
        expressionAttributeNames['#GSI2SK'] = 'GSI2SK';
        expressionAttributeValues[':GSI2PK'] = `COUNTRY#${newCountry}`;
        expressionAttributeValues[':GSI2SK'] = `REGION#${newRegion}`;
      }
      
      if (updates.industry) {
        updateExpression.push('#GSI3PK = :GSI3PK');
        expressionAttributeNames['#GSI3PK'] = 'GSI3PK';
        expressionAttributeValues[':GSI3PK'] = `INDUSTRY#${updates.industry}`;
      }
      
      if (updates.businessType) {
        updateExpression.push('#GSI4PK = :GSI4PK');
        expressionAttributeNames['#GSI4PK'] = 'GSI4PK';
        expressionAttributeValues[':GSI4PK'] = `BUSINESS_TYPE#${updates.businessType}`;
      }
      
      if (updates.subscription) {
        updateExpression.push('#GSI5PK = :GSI5PK');
        expressionAttributeNames['#GSI5PK'] = 'GSI5PK';
        expressionAttributeValues[':GSI5PK'] = `SUBSCRIPTION#${updates.subscription}`;
      }
      
      const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: {
          PK: `ORGANIZER#${organizerId}`,
          SK: `ORGANIZER#${organizerId}`
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.dynamoDB.update(params).promise();
      
      // Remove DynamoDB-specific fields
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, GSI4PK, GSI4SK, GSI5PK, GSI5SK, ...organizer } = result.Attributes!;
      
      logger.info('Organizer updated in database', { organizerId, updates });
      return organizer as Organizer;
    } catch (error) {
      logger.error('Failed to update organizer in database', { error, organizerId, updates });
      throw new DatabaseError('Failed to update organizer');
    }
  }

  // Search organizers
  async searchOrganizers(filters: OrganizerSearchFilters): Promise<OrganizerListResponse> {
    try {
      let queryParams: DynamoDB.DocumentClient.QueryInput | undefined;
      let scanParams: DynamoDB.DocumentClient.ScanInput | undefined;
      
      // Build query based on filters
      if (filters.country && filters.region) {
        // Query by country and region
        queryParams = {
          TableName: this.tableName,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :country AND begins_with(GSI2SK, :region)',
          ExpressionAttributeValues: {
            ':country': `COUNTRY#${filters.country}`,
            ':region': `REGION#${filters.region}`
          }
        };
      } else if (filters.country) {
        // Query by country only
        queryParams = {
          TableName: this.tableName,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :country',
          ExpressionAttributeValues: {
            ':country': `COUNTRY#${filters.country}`
          }
        };
      } else if (filters.industry) {
        // Query by industry
        queryParams = {
          TableName: this.tableName,
          IndexName: 'GSI3',
          KeyConditionExpression: 'GSI3PK = :industry',
          ExpressionAttributeValues: {
            ':industry': `INDUSTRY#${filters.industry}`
          }
        };
      } else if (filters.businessType) {
        // Query by business type
        queryParams = {
          TableName: this.tableName,
          IndexName: 'GSI4',
          KeyConditionExpression: 'GSI4PK = :businessType',
          ExpressionAttributeValues: {
            ':businessType': `BUSINESS_TYPE#${filters.businessType}`
          }
        };
      } else if (filters.subscription) {
        // Query by subscription
        queryParams = {
          TableName: this.tableName,
          IndexName: 'GSI5',
          KeyConditionExpression: 'GSI5PK = :subscription',
          ExpressionAttributeValues: {
            ':subscription': `SUBSCRIPTION#${filters.subscription}`
          }
        };
      } else {
        // Scan with filters
        scanParams = {
          TableName: this.tableName,
          FilterExpression: '',
          ExpressionAttributeNames: {},
          ExpressionAttributeValues: {}
        };
        
        const filterExpressions: string[] = [];
        
        if (filters.country) {
          filterExpressions.push('#country = :country');
          scanParams.ExpressionAttributeNames!['#country'] = 'country';
          scanParams.ExpressionAttributeValues![':country'] = filters.country;
        }
        
        if (filters.region) {
          filterExpressions.push('#region = :region');
          scanParams.ExpressionAttributeNames!['#region'] = 'region';
          scanParams.ExpressionAttributeValues![':region'] = filters.region;
        }
        
        if (filters.industry) {
          filterExpressions.push('#industry = :industry');
          scanParams.ExpressionAttributeNames!['#industry'] = 'industry';
          scanParams.ExpressionAttributeValues![':industry'] = filters.industry;
        }
        
        if (filters.businessType) {
          filterExpressions.push('#businessType = :businessType');
          scanParams.ExpressionAttributeNames!['#businessType'] = 'businessType';
          scanParams.ExpressionAttributeValues![':businessType'] = filters.businessType;
        }
        
        if (filters.subscription) {
          filterExpressions.push('#subscription = :subscription');
          scanParams.ExpressionAttributeNames!['#subscription'] = 'subscription';
          scanParams.ExpressionAttributeValues![':subscription'] = filters.subscription;
        }
        
        if (filters.verificationStatus) {
          filterExpressions.push('#verificationStatus = :verificationStatus');
          scanParams.ExpressionAttributeNames!['#verificationStatus'] = 'verificationStatus';
          scanParams.ExpressionAttributeValues![':verificationStatus'] = filters.verificationStatus;
        }
        
        if (filters.searchTerm) {
          filterExpressions.push('(contains(#companyName, :searchTerm) OR contains(#industry, :searchTerm))');
          scanParams.ExpressionAttributeNames!['#companyName'] = 'companyName';
          scanParams.ExpressionAttributeNames!['#industry'] = 'industry';
          scanParams.ExpressionAttributeValues![':searchTerm'] = filters.searchTerm;
        }
        
        if (filterExpressions.length > 0) {
          scanParams.FilterExpression = filterExpressions.join(' AND ');
        }
      }
      
      // Add pagination
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const startIndex = (page - 1) * pageSize;
      
      // Initialize queryParams and scanParams if they exist
      if (queryParams) {
        queryParams.Limit = pageSize;
        if (startIndex > 0) {
          queryParams.ExclusiveStartKey = { /* TODO: Implement pagination token */ };
        }
      }
      
      if (scanParams) {
        scanParams.Limit = pageSize;
        if (startIndex > 0) {
          scanParams.ExclusiveStartKey = { /* TODO: Implement pagination token */ };
        }
      }
      
      // Execute query or scan
      let result: DynamoDB.DocumentClient.QueryOutput | DynamoDB.DocumentClient.ScanOutput;
      
      if (queryParams) {
        result = await this.dynamoDB.query(queryParams).promise();
      } else if (scanParams) {
        result = await this.dynamoDB.scan(scanParams).promise();
      } else {
        // Fallback to scan if neither exists
        result = await this.dynamoDB.scan({ TableName: this.tableName }).promise();
      }
      
      // Process results
      const organizers = (result.Items || []).map(item => {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, GSI4PK, GSI4SK, GSI5PK, GSI5SK, ...organizer } = item;
        return organizer as Organizer;
      });
      
      // TODO: Implement proper pagination with LastEvaluatedKey
      const totalCount = organizers.length; // This should be the actual total count
      const hasNextPage = false; // TODO: Implement based on LastEvaluatedKey
      const hasPreviousPage = page > 1;
      
      logger.info('Organizer search completed', { 
        filters, 
        resultCount: organizers.length, 
        page, 
        pageSize 
      });
      
      return {
        organizers,
        totalCount,
        page,
        pageSize,
        hasNextPage,
        hasPreviousPage
      };
    } catch (error) {
      logger.error('Failed to search organizers in database', { error, filters });
      throw new DatabaseError('Failed to search organizers');
    }
  }

  // Delete organizer
  async deleteOrganizer(organizerId: string): Promise<void> {
    try {
      const params: DynamoDB.DocumentClient.DeleteItemInput = {
        TableName: this.tableName,
        Key: {
          PK: `ORGANIZER#${organizerId}`,
          SK: `ORGANIZER#${organizerId}`
        }
      };

      await this.dynamoDB.delete(params).promise();
      
      logger.info('Organizer deleted from database', { organizerId });
    } catch (error) {
      logger.error('Failed to delete organizer from database', { error, organizerId });
      throw new DatabaseError('Failed to delete organizer');
    }
  }

  // Get organizer statistics
  async getOrganizerStats(): Promise<{
    totalOrganizers: number;
    verifiedOrganizers: number;
    pendingVerification: number;
    byCountry: Record<string, number>;
    byIndustry: Record<string, number>;
    bySubscription: Record<string, number>;
  }> {
    try {
      // This would require a scan or additional GSI queries
      // For now, return mock data
      return {
        totalOrganizers: 0,
        verifiedOrganizers: 0,
        pendingVerification: 0,
        byCountry: {},
        byIndustry: {},
        bySubscription: {}
      };
    } catch (error) {
      logger.error('Failed to get organizer statistics from database', { error });
      throw new DatabaseError('Failed to get organizer statistics');
    }
  }

  // Check if business registration number exists
  async checkBusinessNumberExists(businessNumber: string, country: string): Promise<boolean> {
    try {
      // This would require a scan with filter
      // For now, return false
      return false;
    } catch (error) {
      logger.error('Failed to check business number existence in database', { error, businessNumber, country });
      throw new DatabaseError('Failed to check business number existence');
    }
  }

  // Get organizers by business type
  async getOrganizersByBusinessType(businessType: string): Promise<Organizer[]> {
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'GSI4',
        KeyConditionExpression: 'GSI4PK = :businessType',
        ExpressionAttributeValues: {
          ':businessType': `BUSINESS_TYPE#${businessType}`
        }
      };

      const result = await this.dynamoDB.query(params).promise();
      
      const organizers = (result.Items || []).map(item => {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, GSI4PK, GSI4SK, GSI5PK, GSI5SK, ...organizer } = item;
        return organizer as Organizer;
      });
      
      logger.info('Organizers retrieved by business type from database', { businessType, count: organizers.length });
      return organizers;
    } catch (error) {
      logger.error('Failed to get organizers by business type from database', { error, businessType });
      throw new DatabaseError('Failed to retrieve organizers by business type');
    }
  }

  // Get organizers by subscription
  async getOrganizersBySubscription(subscription: string): Promise<Organizer[]> {
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'GSI5',
        KeyConditionExpression: 'GSI5PK = :subscription',
        ExpressionAttributeValues: {
          ':subscription': `SUBSCRIPTION#${subscription}`
        }
      };

      const result = await this.dynamoDB.query(params).promise();
      
      const organizers = (result.Items || []).map(item => {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, GSI4PK, GSI4SK, GSI5PK, GSI5SK, ...organizer } = item;
        return organizer as Organizer;
      });
      
      logger.info('Organizers retrieved by subscription from database', { subscription, count: organizers.length });
      return organizers;
    } catch (error) {
      logger.error('Failed to get organizers by subscription from database', { error, subscription });
      throw new DatabaseError('Failed to retrieve organizers by subscription');
    }
  }
}
