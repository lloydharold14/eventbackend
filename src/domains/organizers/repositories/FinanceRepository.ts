import { DynamoDB } from 'aws-sdk';
import { FinancialData, FinancialTransaction, OrganizerPayoutMethod, PayoutSchedule } from '../models/Finance';
import { logger } from '../../../shared/utils/logger';
import { MetricsManager } from '../../../shared/utils/metrics';

export class FinanceRepository {
  private readonly dynamodb: DynamoDB.DocumentClient;
  private readonly tableName: string;
  private readonly metricsManager: MetricsManager;

  constructor() {
    this.dynamodb = new DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.tableName = process.env.FINANCE_TABLE_NAME || 'organizer-finance-table';
    this.metricsManager = MetricsManager.getInstance();
  }

  /**
   * Create financial data
   */
  async createFinancialData(financialData: FinancialData): Promise<FinancialData> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: {
          ...financialData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(id)'
      };

      await this.dynamodb.put(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialData', 'CREATE', duration, true);
      
      logger.info('Financial data created successfully', { 
        financialDataId: financialData.id,
        organizerId: financialData.organizerId
      });
      
      return financialData;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialData', 'CREATE', 0, false);
      
      logger.error('Failed to create financial data', { error, financialData });
      throw error;
    }
  }

  /**
   * Get financial data by organizer
   */
  async getFinancialDataByOrganizer(organizerId: string): Promise<FinancialData | null> {
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
          ':type': 'financial-data'
        }
      };

      const result = await this.dynamodb.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialData', 'READ', duration, true);
      
      if (!result.Items || result.Items.length === 0) {
        logger.info('Financial data not found for organizer', { organizerId });
        return null;
      }
      
      return result.Items[0] as FinancialData;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialData', 'READ', 0, false);
      
      logger.error('Failed to get financial data by organizer', { error, organizerId });
      throw error;
    }
  }

  /**
   * Update financial data
   */
  async updateFinancialData(id: string, updates: Partial<FinancialData>): Promise<FinancialData> {
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
          expressionAttributeValues[`:${key}`] = updates[key as keyof FinancialData];
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
      this.metricsManager.recordDatabasePerformance('FinancialData', 'UPDATE', duration, true);
      
      logger.info('Financial data updated successfully', { id });
      
      return result.Attributes as FinancialData;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialData', 'UPDATE', 0, false);
      
      logger.error('Failed to update financial data', { error, id, updates });
      throw error;
    }
  }

  /**
   * Create financial transaction
   */
  async createTransaction(transaction: FinancialTransaction): Promise<FinancialTransaction> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: {
          ...transaction,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(id)'
      };

      await this.dynamodb.put(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialTransaction', 'CREATE', duration, true);
      
      logger.info('Financial transaction created successfully', { 
        transactionId: transaction.id,
        organizerId: transaction.organizerId,
        amount: transaction.amount,
        currency: transaction.currency
      });
      
      return transaction;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialTransaction', 'CREATE', 0, false);
      
      logger.error('Failed to create financial transaction', { error, transaction });
      throw error;
    }
  }

  /**
   * Get transactions by organizer
   */
  async getTransactionsByOrganizer(organizerId: string, limit: number = 50, lastEvaluatedKey?: string): Promise<{ items: FinancialTransaction[]; lastEvaluatedKey?: string }> {
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
          ':type': 'transaction'
        },
        Limit: limit
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = { id: lastEvaluatedKey };
      }

      const result = await this.dynamodb.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialTransaction', 'READ', duration, true);
      
      const items = result.Items as FinancialTransaction[] || [];
      const nextLastEvaluatedKey = result.LastEvaluatedKey?.id;
      
      logger.info('Retrieved financial transactions for organizer', { 
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
      this.metricsManager.recordDatabasePerformance('FinancialTransaction', 'READ', 0, false);
      
      logger.error('Failed to get financial transactions by organizer', { error, organizerId });
      throw error;
    }
  }

  /**
   * Search transactions
   */
  async searchTransactions(organizerId: string, query: string, limit: number = 20): Promise<FinancialTransaction[]> {
    const startTime = Date.now();
    
    try {
      // Get all transactions for the organizer and filter by query
      const { items } = await this.getTransactionsByOrganizer(organizerId, 1000);
      
      const filteredItems = items.filter(transaction => 
        transaction.description?.toLowerCase().includes(query.toLowerCase()) ||
        transaction.type.toLowerCase().includes(query.toLowerCase()) ||
        transaction.status.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialTransaction', 'READ', duration, true);
      
      logger.info('Transaction search completed', { 
        organizerId, 
        query, 
        total: items.length,
        filtered: filteredItems.length
      });
      
      return filteredItems;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialTransaction', 'READ', 0, false);
      
      logger.error('Failed to search transactions', { error, organizerId, query });
      throw error;
    }
  }

  /**
   * Create payout method
   */
  async createPayoutMethod(payoutMethod: OrganizerPayoutMethod): Promise<OrganizerPayoutMethod> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: {
          ...payoutMethod,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(id)'
      };

      await this.dynamodb.put(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('OrganizerPayoutMethod', 'CREATE', duration, true);
      
      logger.info('Payout method created successfully', { 
        payoutMethodId: payoutMethod.id,
        organizerId: payoutMethod.organizerId,
        type: payoutMethod.type
      });
      
      return payoutMethod;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('OrganizerPayoutMethod', 'CREATE', 0, false);
      
      logger.error('Failed to create payout method', { error, payoutMethod });
      throw error;
    }
  }

  /**
   * Get payout methods by organizer
   */
  async getPayoutMethodsByOrganizer(organizerId: string): Promise<OrganizerPayoutMethod[]> {
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
          ':type': 'payout-method'
        }
      };

      const result = await this.dynamodb.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('OrganizerPayoutMethod', 'READ', duration, true);
      
      const items = result.Items as OrganizerPayoutMethod[] || [];
      
      logger.info('Retrieved payout methods for organizer', { 
        organizerId, 
        count: items.length
      });
      
      return items;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('OrganizerPayoutMethod', 'READ', 0, false);
      
      logger.error('Failed to get payout methods by organizer', { error, organizerId });
      throw error;
    }
  }

  /**
   * Update payout method
   */
  async updatePayoutMethod(id: string, updates: Partial<OrganizerPayoutMethod>): Promise<OrganizerPayoutMethod> {
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
          expressionAttributeValues[`:${key}`] = updates[key as keyof OrganizerPayoutMethod];
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
      this.metricsManager.recordDatabasePerformance('OrganizerPayoutMethod', 'UPDATE', duration, true);
      
      logger.info('Payout method updated successfully', { id });
      
      return result.Attributes as OrganizerPayoutMethod;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('OrganizerPayoutMethod', 'UPDATE', 0, false);
      
      logger.error('Failed to update payout method', { error, id, updates });
      throw error;
    }
  }

  /**
   * Create payout schedule
   */
  async createPayoutSchedule(payoutSchedule: PayoutSchedule): Promise<PayoutSchedule> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: {
          ...payoutSchedule,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(id)'
      };

      await this.dynamodb.put(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('PayoutSchedule', 'CREATE', duration, true);
      
      logger.info('Payout schedule created successfully', { 
        payoutScheduleId: payoutSchedule.id,
        organizerId: payoutSchedule.organizerId,
        frequency: payoutSchedule.frequency
      });
      
      return payoutSchedule;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('PayoutSchedule', 'CREATE', 0, false);
      
      logger.error('Failed to create payout schedule', { error, payoutSchedule });
      throw error;
    }
  }

  /**
   * Create tax configuration
   */
  async createTaxConfig(taxConfig: any): Promise<any> {
    // TODO: Implement tax configuration creation
    logger.info('Tax configuration creation not implemented yet');
    return taxConfig;
  }

  /**
   * Get tax configurations by organizer
   */
  async getTaxConfigsByOrganizer(organizerId: string): Promise<any[]> {
    // TODO: Implement tax configuration retrieval
    logger.info('Tax configuration retrieval not implemented yet');
    return [];
  }

  /**
   * Update tax configuration
   */
  async updateTaxConfig(id: string, updates: any): Promise<any> {
    // TODO: Implement tax configuration update
    logger.info('Tax configuration update not implemented yet');
    return { id, ...updates };
  }

  /**
   * Get transactions by date range
   */
  async getTransactionsByDateRange(organizerId: string, startDate: string, endDate: string): Promise<FinancialTransaction[]> {
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
      this.metricsManager.recordDatabasePerformance('FinancialTransaction', 'READ', duration, true);
      
      const items = result.Items as FinancialTransaction[] || [];
      
      logger.info('Retrieved transactions by date range', { 
        organizerId, 
        startDate,
        endDate,
        count: items.length
      });
      
      return items;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialTransaction', 'READ', 0, false);
      
      logger.error('Failed to get transactions by date range', { error, organizerId, startDate, endDate });
      throw error;
    }
  }

  /**
   * Get transactions by currency
   */
  async getTransactionsByCurrency(organizerId: string, currency: string): Promise<FinancialTransaction[]> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'organizer-currency-index',
        KeyConditionExpression: 'organizerId = :organizerId AND #currency = :currency',
        ExpressionAttributeNames: {
          '#currency': 'currency'
        },
        ExpressionAttributeValues: {
          ':organizerId': organizerId,
          ':currency': currency
        }
      };

      const result = await this.dynamodb.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialTransaction', 'READ', duration, true);
      
      const items = result.Items as FinancialTransaction[] || [];
      
      logger.info('Retrieved transactions by currency', { 
        organizerId, 
        currency,
        count: items.length
      });
      
      return items;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialTransaction', 'READ', 0, false);
      
      logger.error('Failed to get transactions by currency', { error, organizerId, currency });
      throw error;
    }
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(organizerId: string, startDate: string, endDate: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // TODO: Implement actual financial summary calculation
      // This would typically involve aggregating data from multiple tables
      const summary = {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        currencyBreakdown: {},
        monthlyTrends: []
      };
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialData', 'READ', duration, true);
      
      logger.info('Financial summary retrieved', { organizerId, startDate, endDate });
      
      return summary;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('FinancialData', 'READ', 0, false);
      
      logger.error('Failed to get financial summary', { error, organizerId, startDate, endDate });
      throw error;
    }
  }
}
