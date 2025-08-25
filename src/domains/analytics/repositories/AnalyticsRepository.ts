import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { traceAsyncOperation } from '../../../shared/utils/tracing';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';

export interface AnalyticsRecord {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  GSI3PK?: string;
  GSI3SK?: string;
  data: any;
  timestamp: string;
  ttl?: number;
}

export interface AggregatedMetrics {
  metricName: string;
  value: number;
  period: string;
  dimensions: { [key: string]: string };
  timestamp: string;
}

export interface EventAnalytics {
  eventId: string;
  eventTitle: string;
  organizerId: string;
  organizerName: string;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  views: number;
  conversionRate: number;
  period: string;
}

export interface UserAnalytics {
  userId: string;
  userEmail: string;
  totalBookings: number;
  totalSpent: number;
  favoriteEventTypes: string[];
  lastActivity: string;
  period: string;
}

export interface RevenueAnalytics {
  period: string;
  revenue: number;
  bookings: number;
  averageTicketPrice: number;
  currency: string;
  paymentMethod: string;
}

export class AnalyticsRepository {
  private client: DynamoDBDocumentClient;
  private logger: Logger;
  private metricsManager: MetricsManager;
  private tableName: string;

  constructor(tableName: string) {
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    this.logger = new Logger({ serviceName: 'analytics-repository' });
    this.metricsManager = MetricsManager.getInstance();
    this.tableName = tableName;
  }

  async storeAnalyticsRecord(record: AnalyticsRecord): Promise<void> {
    return traceAsyncOperation('storeAnalyticsRecord', async () => {
      try {
        await this.client.send(new PutCommand({
          TableName: this.tableName,
          Item: record
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.ANALYTICS_RECORDS_STORED, 1);
        this.logger.info('Analytics record stored successfully', { recordId: record.PK });
      } catch (error) {
        this.logger.error('Error storing analytics record', { error, record });
        this.metricsManager.recordError('ANALYTICS_STORAGE_ERROR', 'AnalyticsRepository', 'storeAnalyticsRecord');
        throw error;
      }
    });
  }

  async getAnalyticsRecords(pk: string, startDate: string, endDate: string): Promise<AnalyticsRecord[]> {
    return traceAsyncOperation('getAnalyticsRecords', async () => {
      try {
        const result = await this.client.send(new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startDate AND :endDate',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':startDate': startDate,
            ':endDate': endDate
          }
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.ANALYTICS_RECORDS_RETRIEVED, result.Items?.length || 0);
        return result.Items as AnalyticsRecord[] || [];
      } catch (error) {
        this.logger.error('Error retrieving analytics records', { error, pk, startDate, endDate });
        this.metricsManager.recordError('ANALYTICS_RETRIEVAL_ERROR', 'AnalyticsRepository', 'getAnalyticsRecords');
        throw error;
      }
    });
  }

  async getAggregatedMetrics(metricName: string, period: string, dimensions?: { [key: string]: string }): Promise<AggregatedMetrics[]> {
    return traceAsyncOperation('getAggregatedMetrics', async () => {
      try {
        const gsi1pk = `METRIC#${metricName}#${period}`;
        const gsi1sk = dimensions ? Object.entries(dimensions).map(([k, v]) => `${k}=${v}`).join('#') : 'default';

        const result = await this.client.send(new QueryCommand({
          TableName: this.tableName,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)',
          ExpressionAttributeValues: {
            ':gsi1pk': gsi1pk,
            ':gsi1sk': gsi1sk
          }
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.ANALYTICS_METRICS_RETRIEVED, result.Items?.length || 0);
        return result.Items as AggregatedMetrics[] || [];
      } catch (error) {
        this.logger.error('Error retrieving aggregated metrics', { error, metricName, period, dimensions });
        this.metricsManager.recordError('ANALYTICS_METRICS_ERROR', 'AnalyticsRepository', 'getAggregatedMetrics');
        throw error;
      }
    });
  }

  async getEventAnalytics(eventId: string, startDate: string, endDate: string): Promise<EventAnalytics[]> {
    return traceAsyncOperation('getEventAnalytics', async () => {
      try {
        const pk = `EVENT#${eventId}`;
        const result = await this.client.send(new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startDate AND :endDate',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':startDate': startDate,
            ':endDate': endDate
          }
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.EVENT_ANALYTICS_RETRIEVED, result.Items?.length || 0);
        return result.Items as EventAnalytics[] || [];
      } catch (error) {
        this.logger.error('Error retrieving event analytics', { error, eventId, startDate, endDate });
        this.metricsManager.recordError('EVENT_ANALYTICS_ERROR', 'AnalyticsRepository', 'getEventAnalytics');
        throw error;
      }
    });
  }

  async getUserAnalytics(userId: string, startDate: string, endDate: string): Promise<UserAnalytics[]> {
    return traceAsyncOperation('getUserAnalytics', async () => {
      try {
        const pk = `USER#${userId}`;
        const result = await this.client.send(new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startDate AND :endDate',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':startDate': startDate,
            ':endDate': endDate
          }
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.USER_ANALYTICS_RETRIEVED, result.Items?.length || 0);
        return result.Items as UserAnalytics[] || [];
      } catch (error) {
        this.logger.error('Error retrieving user analytics', { error, userId, startDate, endDate });
        this.metricsManager.recordError('USER_ANALYTICS_ERROR', 'AnalyticsRepository', 'getUserAnalytics');
        throw error;
      }
    });
  }

  async getRevenueAnalytics(startDate: string, endDate: string, groupBy: string = 'day'): Promise<RevenueAnalytics[]> {
    return traceAsyncOperation('getRevenueAnalytics', async () => {
      try {
        const pk = `REVENUE#${groupBy}`;
        const result = await this.client.send(new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startDate AND :endDate',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':startDate': startDate,
            ':endDate': endDate
          }
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.REVENUE_ANALYTICS_RETRIEVED, result.Items?.length || 0);
        return result.Items as RevenueAnalytics[] || [];
      } catch (error) {
        this.logger.error('Error retrieving revenue analytics', { error, startDate, endDate, groupBy });
        this.metricsManager.recordError('REVENUE_ANALYTICS_ERROR', 'AnalyticsRepository', 'getRevenueAnalytics');
        throw error;
      }
    });
  }

  async getTopPerformingEvents(limit: number = 10, period: string): Promise<EventAnalytics[]> {
    return traceAsyncOperation('getTopPerformingEvents', async () => {
      try {
        const gsi2pk = `TOP_EVENTS#${period}`;
        const result = await this.client.send(new QueryCommand({
          TableName: this.tableName,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :gsi2pk',
          ExpressionAttributeValues: {
            ':gsi2pk': gsi2pk
          },
          ScanIndexForward: false, // Descending order
          Limit: limit
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.TOP_EVENTS_RETRIEVED, result.Items?.length || 0);
        return result.Items as EventAnalytics[] || [];
      } catch (error) {
        this.logger.error('Error retrieving top performing events', { error, limit, period });
        this.metricsManager.recordError('TOP_EVENTS_ERROR', 'AnalyticsRepository', 'getTopPerformingEvents');
        throw error;
      }
    });
  }

  async getTopOrganizers(limit: number = 10, period: string): Promise<any[]> {
    return traceAsyncOperation('getTopOrganizers', async () => {
      try {
        const gsi2pk = `TOP_ORGANIZERS#${period}`;
        const result = await this.client.send(new QueryCommand({
          TableName: this.tableName,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :gsi2pk',
          ExpressionAttributeValues: {
            ':gsi2pk': gsi2pk
          },
          ScanIndexForward: false, // Descending order
          Limit: limit
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.TOP_ORGANIZERS_RETRIEVED, result.Items?.length || 0);
        return result.Items || [];
      } catch (error) {
        this.logger.error('Error retrieving top organizers', { error, limit, period });
        this.metricsManager.recordError('TOP_ORGANIZERS_ERROR', 'AnalyticsRepository', 'getTopOrganizers');
        throw error;
      }
    });
  }

  async getUserGrowth(startDate: string, endDate: string): Promise<any[]> {
    return traceAsyncOperation('getUserGrowth', async () => {
      try {
        const pk = 'USER_GROWTH';
        const result = await this.client.send(new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startDate AND :endDate',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':startDate': startDate,
            ':endDate': endDate
          }
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.USER_GROWTH_RETRIEVED, result.Items?.length || 0);
        return result.Items || [];
      } catch (error) {
        this.logger.error('Error retrieving user growth', { error, startDate, endDate });
        this.metricsManager.recordError('USER_GROWTH_ERROR', 'AnalyticsRepository', 'getUserGrowth');
        throw error;
      }
    });
  }

  async storeAggregatedMetric(metric: AggregatedMetrics): Promise<void> {
    return traceAsyncOperation('storeAggregatedMetric', async () => {
      try {
        const record: AnalyticsRecord = {
          PK: `METRIC#${metric.metricName}`,
          SK: metric.timestamp,
          GSI1PK: `METRIC#${metric.metricName}#${metric.period}`,
          GSI1SK: Object.entries(metric.dimensions).map(([k, v]) => `${k}=${v}`).join('#'),
          data: {
            value: metric.value,
            period: metric.period,
            dimensions: metric.dimensions
          },
          timestamp: metric.timestamp,
          ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
        };

        await this.client.send(new PutCommand({
          TableName: this.tableName,
          Item: record
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.ANALYTICS_METRICS_STORED, 1);
        this.logger.info('Aggregated metric stored successfully', { metricName: metric.metricName, period: metric.period });
      } catch (error) {
        this.logger.error('Error storing aggregated metric', { error, metric });
        this.metricsManager.recordError('METRIC_STORAGE_ERROR', 'AnalyticsRepository', 'storeAggregatedMetric');
        throw error;
      }
    });
  }

  async updateAnalyticsRecord(pk: string, sk: string, updates: any): Promise<void> {
    return traceAsyncOperation('updateAnalyticsRecord', async () => {
      try {
        const updateExpression = 'SET ' + Object.keys(updates).map(key => `#${key} = :${key}`).join(', ');
        const expressionAttributeNames = Object.keys(updates).reduce((acc, key) => {
          acc[`#${key}`] = key;
          return acc;
        }, {} as { [key: string]: string });
        const expressionAttributeValues = Object.entries(updates).reduce((acc, [key, value]) => {
          acc[`:${key}`] = value;
          return acc;
        }, {} as { [key: string]: any });

        await this.client.send(new UpdateCommand({
          TableName: this.tableName,
          Key: { PK: pk, SK: sk },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.ANALYTICS_RECORDS_UPDATED, 1);
        this.logger.info('Analytics record updated successfully', { pk, sk });
      } catch (error) {
        this.logger.error('Error updating analytics record', { error, pk, sk, updates });
        this.metricsManager.recordError('ANALYTICS_UPDATE_ERROR', 'AnalyticsRepository', 'updateAnalyticsRecord');
        throw error;
      }
    });
  }

  async deleteAnalyticsRecord(pk: string, sk: string): Promise<void> {
    return traceAsyncOperation('deleteAnalyticsRecord', async () => {
      try {
        await this.client.send(new DeleteCommand({
          TableName: this.tableName,
          Key: { PK: pk, SK: sk }
        }));

        this.metricsManager.recordBusinessMetric(BusinessMetricName.ANALYTICS_RECORDS_DELETED, 1);
        this.logger.info('Analytics record deleted successfully', { pk, sk });
      } catch (error) {
        this.logger.error('Error deleting analytics record', { error, pk, sk });
        this.metricsManager.recordError('ANALYTICS_DELETE_ERROR', 'AnalyticsRepository', 'deleteAnalyticsRecord');
        throw error;
      }
    });
  }
}
