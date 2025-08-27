import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ValidationLog, ValidationStatistics } from '../models/ValidationResult';
import { logger } from '../../../shared/utils/logger';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';

export class ValidationLogRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly metricsManager: MetricsManager;

  constructor(region: string = 'ca-central-1', tableName?: string) {
    const dynamoClient = new DynamoDBClient({ region });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = tableName || process.env.VALIDATION_LOG_TABLE_NAME || 'ValidationLogTable';
    this.metricsManager = MetricsManager.getInstance();
  }

  async createValidationLog(log: ValidationLog): Promise<ValidationLog> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `VALIDATION#${log.validationId}`,
          SK: `QR#${log.qrCodeId}`,
          validationId: log.validationId,
          qrCodeId: log.qrCodeId,
          bookingId: log.bookingId,
          eventId: log.eventId,
          attendeeId: log.attendeeId,
          validatorId: log.validatorId,
          validationResult: log.validationResult,
          validationTime: log.validationTime,
          location: log.location,
          deviceInfo: log.deviceInfo,
          notes: log.notes,
          scenario: log.scenario
        }
      });

      await this.client.send(command);
      
      // Record metrics based on validation result
      if (log.validationResult === 'SUCCESS') {
        this.metricsManager.recordBusinessMetric(BusinessMetricName.VALIDATIONS_SUCCESSFUL, 1);
      } else {
        this.metricsManager.recordBusinessMetric(BusinessMetricName.VALIDATIONS_FAILED, 1);
      }
      
      logger.info('Validation log created successfully', { 
        validationId: log.validationId, 
        qrCodeId: log.qrCodeId,
        result: log.validationResult 
      });

      return log;
    } catch (error: any) {
      logger.error('Failed to create validation log', { 
        error: error.message, 
        validationId: log.validationId 
      });
      throw error;
    }
  }

  async getValidationHistory(qrCodeId: string): Promise<ValidationLog[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': `QR#${qrCodeId}`
        },
        ScanIndexForward: false // Most recent first
      });

      const response = await this.client.send(command);
      
      if (!response.Items) {
        return [];
      }

      return response.Items.map(item => this.mapDynamoItemToValidationLog(item));
    } catch (error: any) {
      logger.error('Failed to get validation history', { 
        error: error.message, 
        qrCodeId 
      });
      throw error;
    }
  }

  async getEventValidationLogs(eventId: string, startDate?: string, endDate?: string): Promise<ValidationLog[]> {
    try {
      let filterExpression = 'eventId = :eventId';
      const expressionAttributeValues: any = { ':eventId': eventId };

      if (startDate && endDate) {
        filterExpression += ' AND validationTime BETWEEN :startDate AND :endDate';
        expressionAttributeValues[':startDate'] = startDate;
        expressionAttributeValues[':endDate'] = endDate;
      }

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues
      });

      const response = await this.client.send(command);
      
      if (!response.Items) {
        return [];
      }

      return response.Items.map(item => this.mapDynamoItemToValidationLog(item));
    } catch (error: any) {
      logger.error('Failed to get event validation logs', { 
        error: error.message, 
        eventId 
      });
      throw error;
    }
  }

  async getValidatorLogs(validatorId: string, startDate?: string, endDate?: string): Promise<ValidationLog[]> {
    try {
      let filterExpression = 'validatorId = :validatorId';
      const expressionAttributeValues: any = { ':validatorId': validatorId };

      if (startDate && endDate) {
        filterExpression += ' AND validationTime BETWEEN :startDate AND :endDate';
        expressionAttributeValues[':startDate'] = startDate;
        expressionAttributeValues[':endDate'] = endDate;
      }

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues
      });

      const response = await this.client.send(command);
      
      if (!response.Items) {
        return [];
      }

      return response.Items.map(item => this.mapDynamoItemToValidationLog(item));
    } catch (error: any) {
      logger.error('Failed to get validator logs', { 
        error: error.message, 
        validatorId 
      });
      throw error;
    }
  }

  async getValidationStatistics(eventId: string, startDate?: string, endDate?: string): Promise<any> {
    try {
      const logs = await this.getEventValidationLogs(eventId, startDate, endDate);
      
      const statistics: ValidationStatistics = {
        eventId,
        totalBookings: 0, // Would need to get from bookings table
        totalValidations: logs.length,
        successfulValidations: logs.filter(log => log.validationResult === 'SUCCESS').length,
        failedValidations: logs.filter(log => log.validationResult !== 'SUCCESS').length,
        checkIns: logs.filter(log => log.scenario === 'entry').length,
        checkOuts: logs.filter(log => log.scenario === 'exit').length,
        averageValidationTime: 0, // Would need to calculate from actual validation times
        validationRate: 0,
        lastValidationTime: undefined,
        peakValidationTime: undefined
      };

      if (statistics.totalValidations > 0) {
        statistics.validationRate = (statistics.successfulValidations / statistics.totalValidations) * 100;
        
        const sortedLogs = logs.sort((a, b) => 
          new Date(b.validationTime).getTime() - new Date(a.validationTime).getTime()
        );
        
        statistics.lastValidationTime = sortedLogs[0]?.validationTime;
        
        // Find peak validation time (simplified - would need more complex logic for actual peak detection)
        const validationTimes = logs.map(log => new Date(log.validationTime).getHours());
        const timeCounts = validationTimes.reduce((acc, hour) => {
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        
        const peakHour = Object.entries(timeCounts).reduce((a, b) => 
          (timeCounts[Number(a[0])] || 0) > (timeCounts[Number(b[0])] || 0) ? a : b
        )[0];
        
        statistics.peakValidationTime = peakHour ? `${peakHour}:00` : undefined;
      }

      return statistics;
    } catch (error: any) {
      logger.error('Failed to get validation statistics', { 
        error: error.message, 
        eventId 
      });
      throw error;
    }
  }

  async getRecentValidations(limit: number = 50): Promise<ValidationLog[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        Limit: limit
      });

      const response = await this.client.send(command);
      
      if (!response.Items) {
        return [];
      }

      const logs = response.Items.map(item => this.mapDynamoItemToValidationLog(item));
      
      // Sort by validation time (most recent first)
      return logs.sort((a, b) => 
        new Date(b.validationTime).getTime() - new Date(a.validationTime).getTime()
      );
    } catch (error: any) {
      logger.error('Failed to get recent validations', { 
        error: error.message 
      });
      throw error;
    }
  }

  async getFailedValidations(eventId?: string, startDate?: string, endDate?: string): Promise<ValidationLog[]> {
    try {
      let filterExpression = 'validationResult <> :success';
      const expressionAttributeValues: any = { ':success': 'SUCCESS' };

      if (eventId) {
        filterExpression += ' AND eventId = :eventId';
        expressionAttributeValues[':eventId'] = eventId;
      }

      if (startDate && endDate) {
        filterExpression += ' AND validationTime BETWEEN :startDate AND :endDate';
        expressionAttributeValues[':startDate'] = startDate;
        expressionAttributeValues[':endDate'] = endDate;
      }

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues
      });

      const response = await this.client.send(command);
      
      if (!response.Items) {
        return [];
      }

      return response.Items.map(item => this.mapDynamoItemToValidationLog(item));
    } catch (error: any) {
      logger.error('Failed to get failed validations', { 
        error: error.message 
      });
      throw error;
    }
  }

  private mapDynamoItemToValidationLog(item: any): ValidationLog {
    return {
      validationId: item.validationId,
      qrCodeId: item.qrCodeId,
      bookingId: item.bookingId,
      eventId: item.eventId,
      attendeeId: item.attendeeId,
      validatorId: item.validatorId,
      validationResult: item.validationResult,
      validationTime: item.validationTime,
      location: item.location,
      deviceInfo: item.deviceInfo,
      notes: item.notes,
      scenario: item.scenario
    };
  }
}
