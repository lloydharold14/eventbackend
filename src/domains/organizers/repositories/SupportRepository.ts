import { DynamoDB } from 'aws-sdk';
import { SupportMessage, AutoReplyTemplate, FAQEntry, SupportStatus, SupportPriority } from '../models/Support';
import { logger } from '../../../shared/utils/logger';
import { MetricsManager } from '../../../shared/utils/metrics';

export class SupportRepository {
  private readonly dynamoDB: DynamoDB.DocumentClient;
  private readonly tableName: string;
  private readonly metricsManager: MetricsManager;

  constructor() {
    this.dynamoDB = new DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.tableName = process.env.SUPPORT_TABLE_NAME || 'organizer-support-table';
    this.metricsManager = MetricsManager.getInstance();
  }

  /**
   * Create a new support message
   */
  async createMessage(message: SupportMessage): Promise<SupportMessage> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: {
          ...message,
          PK: `ORGANIZER#${message.organizerId}`,
          SK: `MESSAGE#${message.id}`,
          GSI1PK: `MESSAGE#${message.organizerId}`,
          GSI1SK: `STATUS#${message.status}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
      };

      await this.dynamoDB.put(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'CREATE', duration, true);
      
      logger.info('Support message created successfully', { 
        messageId: message.id,
        organizerId: message.organizerId,
        attendeeId: message.attendeeId
      });
      
      return message;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'CREATE', 0, false);
      
      logger.error('Failed to create support message', { error, message });
      throw error;
    }
  }

  /**
   * Get message by ID
   */
  async getMessageById(id: string, organizerId: string): Promise<SupportMessage | null> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.GetItemInput = {
        TableName: this.tableName,
        Key: {
          PK: `ORGANIZER#${organizerId}`,
          SK: `MESSAGE#${id}`
        }
      };

      const result = await this.dynamoDB.get(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'READ', duration, true);
      
      if (!result.Item) {
        logger.info('Support message not found', { id });
        return null;
      }
      
      return result.Item as SupportMessage;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'READ', 0, false);
      
      logger.error('Failed to get support message by ID', { error, id });
      throw error;
    }
  }

  /**
   * Get messages by organizer
   */
  async getMessagesByOrganizer(organizerId: string, limit: number = 50, lastEvaluatedKey?: string): Promise<{ items: SupportMessage[]; lastEvaluatedKey?: string }> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `MESSAGE#${organizerId}`
        },
        Limit: limit
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = { GSI1PK: `MESSAGE#${organizerId}`, GSI1SK: lastEvaluatedKey };
      }

      const result = await this.dynamoDB.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'READ', duration, true);
      
      const items = result.Items as SupportMessage[] || [];
      const nextLastEvaluatedKey = result.LastEvaluatedKey?.GSI1SK;
      
      logger.info('Retrieved support messages for organizer', { 
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
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'READ', 0, false);
      
      logger.error('Failed to get support messages by organizer', { error, organizerId });
      throw error;
    }
  }

  /**
   * Get messages by status
   */
  async getMessagesByStatus(organizerId: string, status: SupportStatus, limit: number = 50): Promise<SupportMessage[]> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :status)',
        ExpressionAttributeValues: {
          ':pk': `MESSAGE#${organizerId}`,
          ':status': `STATUS#${status}`
        },
        Limit: limit
      };

      const result = await this.dynamoDB.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'READ', duration, true);
      
      const items = result.Items as SupportMessage[] || [];
      
      logger.info('Retrieved support messages by status', { 
        organizerId, 
        status,
        count: items.length
      });
      
      return items;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'READ', 0, false);
      
      logger.error('Failed to get support messages by status', { error, organizerId, status });
      throw error;
    }
  }

  /**
   * Get messages by priority
   */
  async getMessagesByPriority(organizerId: string, priority: SupportPriority, limit: number = 50): Promise<SupportMessage[]> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: '#priority = :priority',
        ExpressionAttributeNames: {
          '#priority': 'priority'
        },
        ExpressionAttributeValues: {
          ':pk': `MESSAGE#${organizerId}`,
          ':priority': priority
        },
        Limit: limit
      };

      const result = await this.dynamoDB.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'READ', duration, true);
      
      const items = result.Items as SupportMessage[] || [];
      
      logger.info('Retrieved support messages by priority', { 
        organizerId, 
        priority,
        count: items.length
      });
      
      return items;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'READ', 0, false);
      
      logger.error('Failed to get support messages by priority', { error, organizerId, priority });
      throw error;
    }
  }

  /**
   * Update message
   */
  async updateMessage(id: string, organizerId: string, updates: Partial<SupportMessage>): Promise<SupportMessage> {
    const startTime = Date.now();
    
    try {
      const updateExpression: string[] = [];
      const expressionAttributeNames: { [key: string]: string } = {};
      const expressionAttributeValues: { [key: string]: any } = {};

      // Build update expression dynamically
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'organizerId' && key !== 'createdAt' && key !== 'PK' && key !== 'SK') {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = updates[key as keyof SupportMessage];
        }
      });

      // Always update the updatedAt timestamp
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: {
          PK: `ORGANIZER#${organizerId}`,
          SK: `MESSAGE#${id}`
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.dynamoDB.update(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'UPDATE', duration, true);
      
      logger.info('Support message updated successfully', { id });
      
      return result.Attributes as SupportMessage;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportMessage', 'UPDATE', 0, false);
      
      logger.error('Failed to update support message', { error, id, updates });
      throw error;
    }
  }

  /**
   * Create auto-reply
   */
  async createAutoReply(autoReply: AutoReplyTemplate): Promise<AutoReplyTemplate> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: {
          ...autoReply,
          PK: `ORGANIZER#${autoReply.organizerId}`,
          SK: `AUTOREPLY#${autoReply.id}`,
          GSI1PK: `AUTOREPLY#${autoReply.organizerId}`,
          GSI1SK: `CATEGORY#${autoReply.category}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
      };

      await this.dynamoDB.put(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('AutoReply', 'CREATE', duration, true);
      
      logger.info('Auto-reply template created successfully', { 
        autoReplyId: autoReply.id,
        organizerId: autoReply.organizerId,
        duration 
      });
      
      return autoReply;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('AutoReply', 'CREATE', 0, false);
      
      logger.error('Failed to create auto-reply template', { error, autoReplyId: autoReply.id });
      throw error;
    }
  }

  /**
   * Get auto-replies by organizer
   */
  async getAutoRepliesByOrganizer(organizerId: string): Promise<AutoReplyTemplate[]> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `AUTOREPLY#${organizerId}`
        }
      };

      const result = await this.dynamoDB.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('AutoReply', 'READ', duration, true);
      
      const items = result.Items as AutoReplyTemplate[] || [];
      
      logger.info('Retrieved auto-reply templates for organizer', { 
        organizerId, 
        count: items.length
      });
      
      return items;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('AutoReply', 'READ', 0, false);
      
      logger.error('Failed to get auto-reply templates by organizer', { error, organizerId });
      throw error;
    }
  }

  /**
   * Update auto-reply
   */
  async updateAutoReply(id: string, updates: Partial<AutoReplyTemplate>): Promise<AutoReplyTemplate> {
    const startTime = Date.now();
    
    try {
      const updateExpression: string[] = [];
      const expressionAttributeNames: { [key: string]: string } = {};
      const expressionAttributeValues: { [key: string]: any } = {};

      // Build update expression dynamically
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'organizerId' && key !== 'createdAt' && key !== 'PK' && key !== 'SK') {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = updates[key as keyof AutoReplyTemplate];
        }
      });

      // Always update the updatedAt timestamp
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: {
          PK: `ORGANIZER#${updates.organizerId}`,
          SK: `AUTOREPLY#${id}`
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.dynamoDB.update(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('AutoReply', 'UPDATE', duration, true);
      
      logger.info('Auto-reply template updated successfully', { 
        autoReplyId: id, 
        organizerId: updates.organizerId,
        duration 
      });
      
      return result.Attributes as AutoReplyTemplate;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('AutoReply', 'UPDATE', 0, false);
      
      logger.error('Failed to update auto-reply template', { error, autoReplyId: id });
      throw error;
    }
  }

  /**
   * Create FAQ entry
   */
  async createFAQ(faq: FAQEntry): Promise<FAQEntry> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: {
          ...faq,
          PK: `ORGANIZER#${faq.organizerId}`,
          SK: `FAQ#${faq.id}`,
          GSI1PK: `FAQ#${faq.organizerId}`,
          GSI1SK: `CATEGORY#${faq.categoryId}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
      };

      await this.dynamoDB.put(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'CREATE', duration, true);
      
      logger.info('FAQ entry created successfully', { 
        faqId: faq.id,
        organizerId: faq.organizerId,
        duration 
      });
      
      return faq;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'CREATE', 0, false);
      
      logger.error('Failed to create FAQ entry', { error, faqId: faq.id });
      throw error;
    }
  }

  /**
   * Get FAQ entries by organizer
   */
  async getFAQsByOrganizer(organizerId: string): Promise<FAQEntry[]> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `FAQ#${organizerId}`
        }
      };

      const result = await this.dynamoDB.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'READ', duration, true);
      
      const items = result.Items as FAQEntry[] || [];
      
      logger.info('Retrieved FAQ entries for organizer', { 
        organizerId, 
        count: items.length
      });
      
      return items;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'READ', 0, false);
      
      logger.error('Failed to get FAQ entries by organizer', { error, organizerId });
      throw error;
    }
  }

  /**
   * Update FAQ entry
   */
  async updateFAQ(id: string, updates: Partial<FAQEntry>): Promise<FAQEntry> {
    const startTime = Date.now();
    
    try {
      const updateExpression: string[] = [];
      const expressionAttributeNames: { [key: string]: string } = {};
      const expressionAttributeValues: { [key: string]: any } = {};

      // Build update expression dynamically
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'organizerId' && key !== 'createdAt' && key !== 'PK' && key !== 'SK') {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = updates[key as keyof FAQEntry];
        }
      });

      // Always update the updatedAt timestamp
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: {
          PK: `ORGANIZER#${updates.organizerId}`,
          SK: `FAQ#${id}`
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.dynamoDB.update(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'UPDATE', duration, true);
      
      logger.info('FAQ entry updated successfully', { 
        faqId: id, 
        organizerId: updates.organizerId,
        duration 
      });
      
      return result.Attributes as FAQEntry;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'UPDATE', 0, false);
      
      logger.error('Failed to update FAQ entry', { error, faqId: id });
      throw error;
    }
  }

  /**
   * Search FAQ entries
   */
  async searchFAQs(organizerId: string, query: string, filters?: {
    categoryId?: string;
    locale?: string;
    country?: string;
    language?: string;
  }): Promise<FAQEntry[]> {
    const startTime = Date.now();
    
    try {
      let faqEntries = await this.getFAQsByOrganizer(organizerId);
      
      // Filter by published status
      let filteredEntries = faqEntries.filter(faq => faq.isActive);
      
      // Filter by locale if specified
      if (filters?.locale) {
        filteredEntries = filteredEntries.filter(faq => faq.availableLanguages.includes(filters.locale!));
      }
      
      // Filter by category if specified
      if (filters?.categoryId) {
        filteredEntries = filteredEntries.filter(faq => faq.categoryId === filters.categoryId);
      }
      
      // Search in question, answer, and keywords
      const searchQuery = query.toLowerCase();
      filteredEntries = filteredEntries.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery) ||
        faq.answer.toLowerCase().includes(searchQuery) ||
        faq.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery))
      );
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'READ', duration, true);
      
      logger.info('FAQ search completed successfully', {
        organizerId,
        query,
        resultCount: filteredEntries.length,
        duration
      });
      
      return filteredEntries;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'READ', 0, false);
      
      logger.error('Failed to search FAQs', { error, organizerId, query });
      throw error;
    }
  }

  /**
   * Increment FAQ view count
   */
  async incrementFAQViewCount(id: string, organizerId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: {
          PK: `ORGANIZER#${organizerId}`,
          SK: `FAQ#${id}`
        },
        UpdateExpression: 'SET viewCount = if_not_exists(viewCount, :zero) + :inc, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':zero': 0,
          ':updatedAt': new Date().toISOString()
        }
      };

      await this.dynamoDB.update(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'UPDATE', duration, true);
      
      logger.info('FAQ view count incremented', { id });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'UPDATE', 0, false);
      
      logger.error('Failed to increment FAQ view count', { error, id });
      throw error;
    }
  }

  /**
   * Mark FAQ as helpful
   */
  async markFAQHelpful(id: string, organizerId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: {
          PK: `ORGANIZER#${organizerId}`,
          SK: `FAQ#${id}`
        },
        UpdateExpression: 'SET helpfulCount = if_not_exists(helpfulCount, :zero) + :inc, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':zero': 0,
          ':updatedAt': new Date().toISOString()
        }
      };

      await this.dynamoDB.update(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'UPDATE', duration, true);
      
      logger.info('FAQ marked as helpful', { id });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'UPDATE', 0, false);
      
      logger.error('Failed to mark FAQ as helpful', { error, id });
      throw error;
    }
  }

  /**
   * Update FAQ status
   */
  async updateFAQStatus(id: string, organizerId: string, isActive: boolean): Promise<FAQEntry> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: {
          PK: `ORGANIZER#${organizerId}`,
          SK: `FAQ#${id}`
        },
        UpdateExpression: 'SET isActive = :isActive, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':isActive': isActive,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.dynamoDB.update(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'UPDATE', duration, true);
      
      logger.info('FAQ status updated successfully', { 
        faqId: id, 
        organizerId,
        isActive,
        duration 
      });
      
      return result.Attributes as FAQEntry;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FAQEntry', 'UPDATE', 0, false);
      
      logger.error('Failed to update FAQ status', { error, faqId: id });
      throw error;
    }
  }

  /**
   * Get support statistics
   */
  async getSupportStats(organizerId: string, period: 'day' | 'week' | 'month'): Promise<any> {
    const startTime = Date.now();
    
    try {
      const messages = await this.getMessagesByOrganizer(organizerId);
      const faqEntries = await this.getFAQsByOrganizer(organizerId);
      
      // Calculate period dates
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
      }
      
      // Filter messages by period
      const periodMessages = messages.items.filter(m => 
        new Date(m.createdAt) >= startDate && new Date(m.createdAt) <= endDate
      );
      
      // Calculate metrics
      const totalMessages = periodMessages.length;
      const unreadMessages = periodMessages.filter(m => m.status === SupportStatus.UNREAD).length;
      const inProgressMessages = periodMessages.filter(m => m.status === SupportStatus.IN_PROGRESS).length;
      const resolvedMessages = periodMessages.filter(m => m.status === SupportStatus.RESOLVED).length;
      const escalatedMessages = periodMessages.filter(m => m.status === SupportStatus.ESCALATED).length;
      
      // Calculate response times
      const messagesWithFirstResponse = periodMessages.filter(m => m.firstResponseTime);
      const averageResponseTime = messagesWithFirstResponse.length > 0 
        ? messagesWithFirstResponse.reduce((sum, m) => sum + (m.firstResponseTime || 0), 0) / messagesWithFirstResponse.length
        : 0;
      
      // Calculate resolution times
      const messagesWithResolution = periodMessages.filter(m => m.resolutionTime);
      const averageResolutionTime = messagesWithResolution.length > 0
        ? messagesWithResolution.reduce((sum, m) => sum + (m.resolutionTime || 0), 0) / messagesWithResolution.length
        : 0;
      
      // Calculate customer satisfaction
      const messagesWithSatisfaction = periodMessages.filter(m => m.customerSatisfaction);
      const customerSatisfaction = messagesWithSatisfaction.length > 0
        ? messagesWithSatisfaction.reduce((sum, m) => sum + (m.customerSatisfaction || 0), 0) / messagesWithSatisfaction.length
        : 0;
      
      // Calculate resolution rate
      const resolutionRate = totalMessages > 0 ? (resolvedMessages / totalMessages) * 100 : 0;
      
      // Calculate FAQ metrics
      const publishedFAQs = faqEntries.filter(f => f.isActive).length;
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportStats', 'READ', duration, true);
      
      logger.info('Support stats retrieved successfully', {
        organizerId,
        period,
        totalMessages,
        duration
      });
      
      return {
        organizerId,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalMessages,
        unreadMessages,
        inProgressMessages,
        resolvedMessages,
        escalatedMessages,
        averageResponseTime,
        averageResolutionTime,
        customerSatisfaction,
        resolutionRate,
        totalFAQs: faqEntries.length,
        publishedFAQs,
        totalAutoReplies: 0
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('SupportStats', 'READ', 0, false);
      
      logger.error('Failed to get support statistics', { error, organizerId });
      throw error;
    }
  }
}
