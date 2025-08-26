import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { QRCode, QRCodeStatus } from '../models/QRCode';
import { logger } from '../../../shared/utils/logger';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';

export class QRCodeRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly metricsManager: MetricsManager;

  constructor(region: string = 'ca-central-1', tableName?: string) {
    const dynamoClient = new DynamoDBClient({ region });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = tableName || process.env.QR_CODE_TABLE_NAME || 'QRCodeTable';
    this.metricsManager = MetricsManager.getInstance();
  }

  async createQRCode(qrCode: QRCode): Promise<QRCode> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `QR#${qrCode.bookingId}`,
          SK: `EVENT#${qrCode.eventId}`,
          qrCodeId: qrCode.id,
          bookingId: qrCode.bookingId,
          eventId: qrCode.eventId,
          attendeeId: qrCode.attendeeId,
          qrCodeData: qrCode.qrCodeData,
          qrCodeUrl: qrCode.qrCodeUrl,
          qrCodeImage: qrCode.qrCodeImage,
          format: qrCode.format,
          status: qrCode.status,
          singleUse: qrCode.singleUse,
          maxValidations: qrCode.maxValidations,
          validationCount: qrCode.validationCount,
          createdAt: qrCode.createdAt,
          expiresAt: qrCode.expiresAt,
          usedAt: qrCode.usedAt,
          usedBy: qrCode.usedBy,
          lastValidatedAt: qrCode.lastValidatedAt,
          metadata: qrCode.metadata
        }
      });

      await this.client.send(command);
      
      this.metricsManager.recordBusinessMetric(BusinessMetricName.QR_CODES_GENERATED, 1);
      
      logger.info('QR code created successfully', { 
        qrCodeId: qrCode.id, 
        bookingId: qrCode.bookingId,
        eventId: qrCode.eventId 
      });

      return qrCode;
    } catch (error: any) {
      logger.error('Failed to create QR code', { 
        error: error.message, 
        qrCodeId: qrCode.id 
      });
      throw error;
    }
  }

  async getQRCode(qrCodeId: string): Promise<QRCode | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'QRCodeIdIndex',
        KeyConditionExpression: 'qrCodeId = :qrCodeId',
        ExpressionAttributeValues: {
          ':qrCodeId': qrCodeId
        }
      });

      const response = await this.client.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      const item = response.Items[0];
      return this.mapDynamoItemToQRCode(item);
    } catch (error: any) {
      logger.error('Failed to get QR code', { 
        error: error.message, 
        qrCodeId 
      });
      throw error;
    }
  }

  async getQRCodeByBooking(bookingId: string): Promise<QRCode | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `QR#${bookingId}`
        }
      });

      const response = await this.client.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      const item = response.Items[0];
      return this.mapDynamoItemToQRCode(item);
    } catch (error: any) {
      logger.error('Failed to get QR code by booking', { 
        error: error.message, 
        bookingId 
      });
      throw error;
    }
  }

  async getEventQRCodes(eventId: string): Promise<QRCode[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': `EVENT#${eventId}`
        }
      });

      const response = await this.client.send(command);
      
      if (!response.Items) {
        return [];
      }

      return response.Items.map(item => this.mapDynamoItemToQRCode(item));
    } catch (error: any) {
      logger.error('Failed to get event QR codes', { 
        error: error.message, 
        eventId 
      });
      throw error;
    }
  }

  async updateQRCodeStatus(qrCodeId: string, status: QRCodeStatus, validationCount?: number): Promise<void> {
    try {
      const updateExpression = 'SET #status = :status';
      const expressionAttributeNames = { '#status': 'status' };
      const expressionAttributeValues: any = { ':status': status };

      if (validationCount !== undefined) {
        expressionAttributeNames['#validationCount'] = 'validationCount';
        expressionAttributeNames['#lastValidatedAt'] = 'lastValidatedAt';
        expressionAttributeValues[':validationCount'] = validationCount;
        expressionAttributeValues[':lastValidatedAt'] = new Date().toISOString();
        updateExpression += ', #validationCount = :validationCount, #lastValidatedAt = :lastValidatedAt';
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `QR#${qrCodeId}`,
          SK: `EVENT#${qrCodeId}`
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      });

      await this.client.send(command);
      
      logger.info('QR code status updated', { 
        qrCodeId, 
        status,
        validationCount 
      });
    } catch (error: any) {
      logger.error('Failed to update QR code status', { 
        error: error.message, 
        qrCodeId,
        status 
      });
      throw error;
    }
  }

  async revokeQRCode(qrCodeId: string): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `QR#${qrCodeId}`,
          SK: `EVENT#${qrCodeId}`
        },
        UpdateExpression: 'SET #status = :status, #revokedAt = :revokedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#revokedAt': 'revokedAt'
        },
        ExpressionAttributeValues: {
          ':status': QRCodeStatus.REVOKED,
          ':revokedAt': new Date().toISOString()
        }
      });

      await this.client.send(command);
      
      logger.info('QR code revoked', { qrCodeId });
    } catch (error: any) {
      logger.error('Failed to revoke QR code', { 
        error: error.message, 
        qrCodeId 
      });
      throw error;
    }
  }

  async deleteQRCode(qrCodeId: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `QR#${qrCodeId}`,
          SK: `EVENT#${qrCodeId}`
        }
      });

      await this.client.send(command);
      
      logger.info('QR code deleted', { qrCodeId });
    } catch (error: any) {
      logger.error('Failed to delete QR code', { 
        error: error.message, 
        qrCodeId 
      });
      throw error;
    }
  }

  async getExpiredQRCodes(): Promise<QRCode[]> {
    try {
      const now = new Date().toISOString();
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'expiresAt < :now AND #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':now': now,
          ':status': QRCodeStatus.ACTIVE
        }
      });

      const response = await this.client.send(command);
      
      if (!response.Items) {
        return [];
      }

      return response.Items.map(item => this.mapDynamoItemToQRCode(item));
    } catch (error: any) {
      logger.error('Failed to get expired QR codes', { 
        error: error.message 
      });
      throw error;
    }
  }

  async batchUpdateQRCodes(qrCodes: QRCode[]): Promise<void> {
    try {
      const batchSize = 25; // DynamoDB batch limit
      const batches = [];
      
      for (let i = 0; i < qrCodes.length; i += batchSize) {
        batches.push(qrCodes.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const writeRequests = batch.map(qrCode => ({
          PutRequest: {
            Item: {
              PK: `QR#${qrCode.bookingId}`,
              SK: `EVENT#${qrCode.eventId}`,
              qrCodeId: qrCode.id,
              bookingId: qrCode.bookingId,
              eventId: qrCode.eventId,
              attendeeId: qrCode.attendeeId,
              qrCodeData: qrCode.qrCodeData,
              qrCodeUrl: qrCode.qrCodeUrl,
              qrCodeImage: qrCode.qrCodeImage,
              format: qrCode.format,
              status: qrCode.status,
              singleUse: qrCode.singleUse,
              maxValidations: qrCode.maxValidations,
              validationCount: qrCode.validationCount,
              createdAt: qrCode.createdAt,
              expiresAt: qrCode.expiresAt,
              usedAt: qrCode.usedAt,
              usedBy: qrCode.usedBy,
              lastValidatedAt: qrCode.lastValidatedAt,
              metadata: qrCode.metadata
            }
          }
        }));

        // Note: In a real implementation, you'd use BatchWriteCommand
        // For now, we'll use individual PutCommand calls
        for (const writeRequest of writeRequests) {
          const command = new PutCommand({
            TableName: this.tableName,
            Item: writeRequest.PutRequest.Item
          });
          await this.client.send(command);
        }
      }

      logger.info('Batch QR codes updated', { count: qrCodes.length });
    } catch (error: any) {
      logger.error('Failed to batch update QR codes', { 
        error: error.message 
      });
      throw error;
    }
  }

  private mapDynamoItemToQRCode(item: any): QRCode {
    return {
      id: item.qrCodeId,
      bookingId: item.bookingId,
      eventId: item.eventId,
      attendeeId: item.attendeeId,
      qrCodeData: item.qrCodeData,
      qrCodeUrl: item.qrCodeUrl,
      qrCodeImage: item.qrCodeImage,
      format: item.format,
      status: item.status,
      singleUse: item.singleUse,
      maxValidations: item.maxValidations,
      validationCount: item.validationCount,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
      usedAt: item.usedAt,
      usedBy: item.usedBy,
      lastValidatedAt: item.lastValidatedAt,
      metadata: item.metadata
    };
  }
}
