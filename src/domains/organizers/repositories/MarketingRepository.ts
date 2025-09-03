import { DynamoDB } from 'aws-sdk';
import { MarketingCampaign, CampaignStatus, CampaignType } from '../models/Marketing';
import { logger } from '../../../shared/utils/logger';
import { MetricsManager } from '../../../shared/utils/metrics';

export class MarketingRepository {
  private readonly dynamodb: DynamoDB.DocumentClient;
  private readonly tableName: string;
  private readonly metricsManager: MetricsManager;

  constructor() {
    this.dynamodb = new DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.tableName = process.env.MARKETING_TABLE_NAME || 'organizer-marketing-table';
    this.metricsManager = MetricsManager.getInstance();
  }

  /**
   * Create a new marketing campaign
   */
  async createCampaign(campaign: MarketingCampaign): Promise<MarketingCampaign> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: {
          ...campaign,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(id)'
      };

      await this.dynamodb.put(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'CREATE', duration, true);
      
      logger.info('Marketing campaign created successfully', { 
        campaignId: campaign.id,
        organizerId: campaign.organizerId,
        name: campaign.name
      });
      
      return campaign;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'CREATE', 0, false);
      
      logger.error('Failed to create marketing campaign', { error, campaign });
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(id: string): Promise<MarketingCampaign | null> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.GetItemInput = {
        TableName: this.tableName,
        Key: { id }
      };

      const result = await this.dynamodb.get(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', duration, true);
      
      if (!result.Item) {
        logger.info('Marketing campaign not found', { id });
        return null;
      }
      
      return result.Item as MarketingCampaign;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', 0, false);
      
      logger.error('Failed to get marketing campaign by ID', { error, id });
      throw error;
    }
  }

  /**
   * Get campaigns by organizer
   */
  async getCampaignsByOrganizer(organizerId: string, limit: number = 50, lastEvaluatedKey?: string): Promise<{ items: MarketingCampaign[]; lastEvaluatedKey?: string }> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'organizer-index',
        KeyConditionExpression: 'organizerId = :organizerId',
        ExpressionAttributeValues: {
          ':organizerId': organizerId
        },
        Limit: limit
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = { id: lastEvaluatedKey };
      }

      const result = await this.dynamodb.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', duration, true);
      
      const items = result.Items as MarketingCampaign[] || [];
      const nextLastEvaluatedKey = result.LastEvaluatedKey?.id;
      
      logger.info('Retrieved campaigns for organizer', { 
        organizerId, 
        count: items.length,
        hasMore: !!nextLastEvaluatedKey
      });
      
      return {
        items,
        lastEvaluatedKey: nextLastEvaluatedKey
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', 0, false);
      
      logger.error('Failed to get campaigns by organizer', { error, organizerId });
      throw error;
    }
  }

  /**
   * Get campaigns by status
   */
  async getCampaignsByStatus(organizerId: string, status: CampaignStatus, limit: number = 50): Promise<MarketingCampaign[]> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'organizer-status-index',
        KeyConditionExpression: 'organizerId = :organizerId AND #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':organizerId': organizerId,
          ':status': status
        },
        Limit: limit
      };

      const result = await this.dynamodb.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', duration, true);
      
      const items = result.Items as MarketingCampaign[] || [];
      
      logger.info('Retrieved campaigns by status', { 
        organizerId, 
        status,
        count: items.length
      });
      
      return items;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', 0, false);
      
      logger.error('Failed to get campaigns by status', { error, organizerId, status });
      throw error;
    }
  }

  /**
   * Get campaigns by type
   */
  async getCampaignsByType(organizerId: string, type: CampaignType, limit: number = 50): Promise<MarketingCampaign[]> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'organizer-type-index',
        KeyConditionExpression: 'organizerId = :organizerId AND #type = :type',
        ExpressionAttributeNames: {
          '#type': 'type'
        },
        ExpressionAttributeValues: {
          ':organizerId': organizerId,
          ':type': type
        },
        Limit: limit
      };

      const result = await this.dynamodb.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', duration, true);
      
      const items = result.Items as MarketingCampaign[] || [];
      
      logger.info('Retrieved campaigns by type', { 
        organizerId, 
        type,
        count: items.length
      });
      
      return items;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', 0, false);
      
      logger.error('Failed to get campaigns by type', { error, organizerId, type });
      throw error;
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(id: string, updates: Partial<MarketingCampaign>): Promise<MarketingCampaign> {
    const startTime = Date.now();
    
    try {
      const updateExpression: string[] = [];
      const expressionAttributeNames: { [key: string]: string } = {};
      const expressionAttributeValues: { [key: string]: any } = {};

      // Build update expression dynamically
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'organizerId' && key !== 'createdAt') {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = updates[key as keyof MarketingCampaign];
        }
      });

      // Always update the updatedAt timestamp
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.dynamodb.update(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'UPDATE', duration, true);
      
      logger.info('Marketing campaign updated successfully', { id });
      
      return result.Attributes as MarketingCampaign;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'UPDATE', 0, false);
      
      logger.error('Failed to update marketing campaign', { error, id, updates });
      throw error;
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.DeleteItemInput = {
        TableName: this.tableName,
        Key: { id }
      };

      await this.dynamodb.delete(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'DELETE', duration, true);
      
      logger.info('Marketing campaign deleted successfully', { id });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'DELETE', 0, false);
      
      logger.error('Failed to delete marketing campaign', { error, id });
      throw error;
    }
  }

  /**
   * Search campaigns
   */
  async searchCampaigns(organizerId: string, query: string, limit: number = 20): Promise<MarketingCampaign[]> {
    const startTime = Date.now();
    
    try {
      // Get all campaigns for the organizer and filter by query
      const { items } = await this.getCampaignsByOrganizer(organizerId, 1000);
      
      const filteredItems = items.filter(campaign => 
        campaign.name.toLowerCase().includes(query.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(query.toLowerCase()) ||
        campaign.type.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', duration, true);
      
      logger.info('Campaign search completed', { 
        organizerId, 
        query, 
        total: items.length,
        filtered: filteredItems.length
      });
      
      return filteredItems;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', 0, false);
      
      logger.error('Failed to search campaigns', { error, organizerId, query });
      throw error;
    }
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(organizerId: string): Promise<MarketingCampaign[]> {
    const startTime = Date.now();
    
    try {
      const activeStatuses: CampaignStatus[] = [CampaignStatus.ACTIVE, CampaignStatus.SCHEDULED];
      const activeCampaigns: MarketingCampaign[] = [];
      
      for (const status of activeStatuses) {
        const campaigns = await this.getCampaignsByStatus(organizerId, status, 100);
        activeCampaigns.push(...campaigns);
      }
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', duration, true);
      
      logger.info('Retrieved active campaigns', { 
        organizerId, 
        count: activeCampaigns.length
      });
      
      return activeCampaigns;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', duration, true);
      
      logger.error('Failed to get active campaigns', { error, organizerId });
      throw error;
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // TODO: Implement actual analytics retrieval
      // This would typically involve aggregating data from multiple tables
      const analytics = {
        campaignId,
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalConverted: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
        revenue: 0,
        cost: 0,
        roi: 0
      };
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', duration, true);
      
      logger.info('Campaign analytics retrieved', { campaignId });
      
      return analytics;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', 0, false);
      
      logger.error('Failed to get campaign analytics', { error, campaignId });
      throw error;
    }
  }

  /**
   * Update campaign performance metrics
   */
  async updateCampaignPerformance(campaignId: string, metrics: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: { id: campaignId },
        UpdateExpression: 'SET performance = :performance, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':performance': metrics,
          ':updatedAt': new Date().toISOString()
        }
      };

      await this.dynamodb.update(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'UPDATE', duration, true);
      
      logger.info('Campaign performance updated', { campaignId, metrics });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'UPDATE', 0, false);
      
      logger.error('Failed to update campaign performance', { error, campaignId, metrics });
      throw error;
    }
  }

  /**
   * Get campaigns by date range
   */
  async getCampaignsByDateRange(organizerId: string, startDate: string, endDate: string): Promise<MarketingCampaign[]> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'organizer-date-index',
        KeyConditionExpression: 'organizerId = :organizerId AND #createdAt BETWEEN :startDate AND :endDate',
        ExpressionAttributeNames: {
          '#createdAt': 'createdAt'
        },
        ExpressionAttributeValues: {
          ':organizerId': organizerId,
          ':startDate': startDate,
          ':endDate': endDate
        }
      };

      const result = await this.dynamodb.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', duration, true);
      
      const items = result.Items as MarketingCampaign[] || [];
      
      logger.info('Retrieved campaigns by date range', { 
        organizerId, 
        startDate,
        endDate,
        count: items.length
      });
      
      return items;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', 0, false);
      
      logger.error('Failed to get campaigns by date range', { error, organizerId, startDate, endDate });
      throw error;
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(organizerId: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // TODO: Implement actual statistics calculation
      // This would typically involve aggregating data from multiple tables
      const stats = {
        totalCampaigns: 0,
        activeCampaigns: 0,
        completedCampaigns: 0,
        totalBudget: 0,
        totalSpent: 0,
        averageOpenRate: 0,
        averageClickRate: 0,
        averageConversionRate: 0,
        totalRevenue: 0,
        totalROI: 0
      };
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', duration, true);
      
      logger.info('Campaign statistics retrieved', { organizerId });
      
      return stats;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('MarketingCampaign', 'READ', 0, false);
      
      logger.error('Failed to get campaign statistics', { error, organizerId });
      throw error;
    }
  }
}
