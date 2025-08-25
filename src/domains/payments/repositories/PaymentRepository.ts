import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { PaymentIntent, Payment, Refund, PaymentStatus, RefundStatus, PaymentSearchFilters, PaymentPagination } from '../models/Payment';

const logger = new Logger({ serviceName: 'payment-repository' });

export class PaymentRepository {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({
      region: process.env.AWS_REGION || 'ca-central-1'
    }));
  }

  // Payment Intent Operations
  async createPaymentIntent(paymentIntent: PaymentIntent): Promise<PaymentIntent> {
    try {
      const item = this.mapPaymentIntentToDynamoDB(paymentIntent);
      
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      }));

      logger.info('Payment intent created successfully', { paymentIntentId: paymentIntent.id });
      return paymentIntent;
    } catch (error) {
      logger.error('Error creating payment intent', { error, paymentIntent });
      throw error;
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
    try {
      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `PAYMENT_INTENT#${paymentIntentId}`,
          SK: `PAYMENT_INTENT#${paymentIntentId}`,
        },
      }));

      if (!result.Item) {
        return null;
      }

      return this.mapDynamoDBToPaymentIntent(result.Item);
    } catch (error) {
      logger.error('Error getting payment intent', { error, paymentIntentId });
      throw error;
    }
  }

  async updatePaymentIntent(paymentIntentId: string, updates: Partial<PaymentIntent>): Promise<PaymentIntent> {
    try {
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build update expression
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          const attributeName = `#${key}`;
          const attributeValue = `:${key}`;
          
          updateExpressions.push(`${attributeName} = ${attributeValue}`);
          expressionAttributeNames[attributeName] = key;
          expressionAttributeValues[attributeValue] = value;
        }
      });

      // Add updatedAt
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `PAYMENT_INTENT#${paymentIntentId}`,
          SK: `PAYMENT_INTENT#${paymentIntentId}`,
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }));

      logger.info('Payment intent updated successfully', { paymentIntentId });
      return this.mapDynamoDBToPaymentIntent(result.Attributes!);
    } catch (error) {
      logger.error('Error updating payment intent', { error, paymentIntentId });
      throw error;
    }
  }

  async getPaymentIntentByStripeId(stripePaymentIntentId: string): Promise<PaymentIntent | null> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StripeIndex',
        KeyConditionExpression: 'GSI4PK = :stripeId',
        ExpressionAttributeValues: {
          ':stripeId': `STRIPE_PAYMENT_INTENT#${stripePaymentIntentId}`,
        },
        Limit: 1,
      }));

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return this.mapDynamoDBToPaymentIntent(result.Items[0]);
    } catch (error) {
      logger.error('Error getting payment intent by Stripe ID', { error, stripePaymentIntentId });
      throw error;
    }
  }

  // Payment Operations
  async createPayment(payment: Payment): Promise<Payment> {
    try {
      const item = this.mapPaymentToDynamoDB(payment);
      
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      }));

      logger.info('Payment created successfully', { paymentId: payment.id });
      return payment;
    } catch (error) {
      logger.error('Error creating payment', { error, payment });
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<Payment | null> {
    try {
      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `PAYMENT#${paymentId}`,
          SK: `PAYMENT#${paymentId}`,
        },
      }));

      if (!result.Item) {
        return null;
      }

      return this.mapDynamoDBToPayment(result.Item);
    } catch (error) {
      logger.error('Error getting payment', { error, paymentId });
      throw error;
    }
  }

  async updatePayment(paymentId: string, updates: Partial<Payment>): Promise<Payment> {
    try {
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build update expression
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          const attributeName = `#${key}`;
          const attributeValue = `:${key}`;
          
          updateExpressions.push(`${attributeName} = ${attributeValue}`);
          expressionAttributeNames[attributeName] = key;
          expressionAttributeValues[attributeValue] = value;
        }
      });

      // Add updatedAt
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `PAYMENT#${paymentId}`,
          SK: `PAYMENT#${paymentId}`,
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }));

      logger.info('Payment updated successfully', { paymentId });
      return this.mapDynamoDBToPayment(result.Attributes!);
    } catch (error) {
      logger.error('Error updating payment', { error, paymentId });
      throw error;
    }
  }

  async getPaymentByStripeId(stripePaymentId: string): Promise<Payment | null> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StripeIndex',
        KeyConditionExpression: 'GSI4PK = :stripeId',
        ExpressionAttributeValues: {
          ':stripeId': `STRIPE_PAYMENT#${stripePaymentId}`,
        },
        Limit: 1,
      }));

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return this.mapDynamoDBToPayment(result.Items[0]);
    } catch (error) {
      logger.error('Error getting payment by Stripe ID', { error, stripePaymentId });
      throw error;
    }
  }

  async getUserPayments(userId: string, limit: number = 20, lastEvaluatedKey?: any): Promise<{ payments: Payment[]; lastEvaluatedKey?: any }> {
    try {
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'GSI1PK = :userId',
        FilterExpression: 'begins_with(SK, :paymentPrefix)',
        ExpressionAttributeValues: {
          ':userId': `USER#${userId}`,
          ':paymentPrefix': 'PAYMENT#',
        },
        Limit: limit,
        ScanIndexForward: false, // Most recent first
      };

      if (lastEvaluatedKey) {
        queryParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await this.client.send(new QueryCommand(queryParams));

      const payments = result.Items?.map(item => this.mapDynamoDBToPayment(item)) || [];

      logger.info('User payments retrieved successfully', { 
        userId, 
        count: payments.length,
        hasMore: !!result.LastEvaluatedKey 
      });

      return {
        payments,
        lastEvaluatedKey: result.LastEvaluatedKey,
      };
    } catch (error) {
      logger.error('Error getting user payments', { error, userId });
      throw error;
    }
  }

  async getBookingPayments(bookingId: string): Promise<Payment[]> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'BookingIndex',
        KeyConditionExpression: 'GSI2PK = :bookingId',
        FilterExpression: 'begins_with(SK, :paymentPrefix)',
        ExpressionAttributeValues: {
          ':bookingId': `BOOKING#${bookingId}`,
          ':paymentPrefix': 'PAYMENT#',
        },
        ScanIndexForward: false, // Most recent first
      }));

      const payments = result.Items?.map(item => this.mapDynamoDBToPayment(item)) || [];

      logger.info('Booking payments retrieved successfully', { 
        bookingId, 
        count: payments.length 
      });

      return payments;
    } catch (error) {
      logger.error('Error getting booking payments', { error, bookingId });
      throw error;
    }
  }

  // Refund Operations
  async createRefund(refund: Refund): Promise<Refund> {
    try {
      const item = this.mapRefundToDynamoDB(refund);
      
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      }));

      logger.info('Refund created successfully', { refundId: refund.id });
      return refund;
    } catch (error) {
      logger.error('Error creating refund', { error, refund });
      throw error;
    }
  }

  async getRefund(refundId: string): Promise<Refund | null> {
    try {
      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `REFUND#${refundId}`,
          SK: `REFUND#${refundId}`,
        },
      }));

      if (!result.Item) {
        return null;
      }

      return this.mapDynamoDBToRefund(result.Item);
    } catch (error) {
      logger.error('Error getting refund', { error, refundId });
      throw error;
    }
  }

  async updateRefund(refundId: string, updates: Partial<Refund>): Promise<Refund> {
    try {
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build update expression
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          const attributeName = `#${key}`;
          const attributeValue = `:${key}`;
          
          updateExpressions.push(`${attributeName} = ${attributeValue}`);
          expressionAttributeNames[attributeName] = key;
          expressionAttributeValues[attributeValue] = value;
        }
      });

      // Add updatedAt
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `REFUND#${refundId}`,
          SK: `REFUND#${refundId}`,
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }));

      logger.info('Refund updated successfully', { refundId });
      return this.mapDynamoDBToRefund(result.Attributes!);
    } catch (error) {
      logger.error('Error updating refund', { error, refundId });
      throw error;
    }
  }

  // Search Operations
  async searchPayments(filters: PaymentSearchFilters, page: number = 1, limit: number = 20): Promise<{ payments: Payment[]; pagination: PaymentPagination }> {
    try {
      const filterExpressions: string[] = ['begins_with(SK, :paymentPrefix)'];
      const expressionAttributeNames: Record<string, string> = {
        ':paymentPrefix': 'PAYMENT#',
      };
      const expressionAttributeValues: Record<string, any> = {};

      // Apply filters
      if (filters.userId) {
        filterExpressions.push('GSI1PK = :userId');
        expressionAttributeValues[':userId'] = `USER#${filters.userId}`;
      }

      if (filters.bookingId) {
        filterExpressions.push('GSI2PK = :bookingId');
        expressionAttributeValues[':bookingId'] = `BOOKING#${filters.bookingId}`;
      }

      if (filters.status) {
        filterExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = filters.status;
      }

      if (filters.paymentMethod) {
        filterExpressions.push('#paymentMethod = :paymentMethod');
        expressionAttributeNames['#paymentMethod'] = 'paymentMethod';
        expressionAttributeValues[':paymentMethod'] = filters.paymentMethod;
      }

      if (filters.dateFrom) {
        filterExpressions.push('#createdAt >= :dateFrom');
        expressionAttributeNames['#createdAt'] = 'createdAt';
        expressionAttributeValues[':dateFrom'] = filters.dateFrom;
      }

      if (filters.dateTo) {
        filterExpressions.push('#createdAt <= :dateTo');
        expressionAttributeNames['#createdAt'] = 'createdAt';
        expressionAttributeValues[':dateTo'] = filters.dateTo;
      }

      if (filters.amountMin) {
        filterExpressions.push('#amount >= :amountMin');
        expressionAttributeNames['#amount'] = 'amount';
        expressionAttributeValues[':amountMin'] = filters.amountMin;
      }

      if (filters.amountMax) {
        filterExpressions.push('#amount <= :amountMax');
        expressionAttributeNames['#amount'] = 'amount';
        expressionAttributeValues[':amountMax'] = filters.amountMax;
      }

      const scanParams: any = {
        TableName: this.tableName,
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
        Limit: limit,
      };

      const result = await this.client.send(new ScanCommand(scanParams));

      const payments = result.Items?.map(item => this.mapDynamoDBToPayment(item)) || [];
      const total = result.ScannedCount || 0;
      const totalPages = Math.ceil(total / limit);

      const pagination: PaymentPagination = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      logger.info('Payments search completed', { 
        filters, 
        count: payments.length,
        total,
        pagination 
      });

      return { payments, pagination };
    } catch (error) {
      logger.error('Error searching payments', { error, filters });
      throw error;
    }
  }

  // Mapping functions
  private mapPaymentIntentToDynamoDB(paymentIntent: PaymentIntent): any {
    return {
      PK: `PAYMENT_INTENT#${paymentIntent.id}`,
      SK: `PAYMENT_INTENT#${paymentIntent.id}`,
      GSI1PK: `USER#${paymentIntent.userId}`,
      GSI1SK: `PAYMENT_INTENT#${paymentIntent.createdAt}`,
      GSI2PK: `BOOKING#${paymentIntent.bookingId}`,
      GSI2SK: `PAYMENT_INTENT#${paymentIntent.createdAt}`,
      GSI3PK: `STATUS#${paymentIntent.status}`,
      GSI3SK: `PAYMENT_INTENT#${paymentIntent.createdAt}`,
      GSI4PK: paymentIntent.stripePaymentIntentId ? `STRIPE_PAYMENT_INTENT#${paymentIntent.stripePaymentIntentId}` : undefined,
      GSI4SK: paymentIntent.stripePaymentIntentId ? `PAYMENT_INTENT#${paymentIntent.createdAt}` : undefined,
      ...paymentIntent,
    };
  }

  private mapDynamoDBToPaymentIntent(item: any): PaymentIntent {
    const paymentIntent = { ...item };
    delete paymentIntent.PK;
    delete paymentIntent.SK;
    delete paymentIntent.GSI1PK;
    delete paymentIntent.GSI1SK;
    delete paymentIntent.GSI2PK;
    delete paymentIntent.GSI2SK;
    delete paymentIntent.GSI3PK;
    delete paymentIntent.GSI3SK;
    delete paymentIntent.GSI4PK;
    delete paymentIntent.GSI4SK;
    return paymentIntent as PaymentIntent;
  }

  private mapPaymentToDynamoDB(payment: Payment): any {
    return {
      PK: `PAYMENT#${payment.id}`,
      SK: `PAYMENT#${payment.id}`,
      GSI1PK: `USER#${payment.userId}`,
      GSI1SK: `PAYMENT#${payment.createdAt}`,
      GSI2PK: `BOOKING#${payment.bookingId}`,
      GSI2SK: `PAYMENT#${payment.createdAt}`,
      GSI3PK: `STATUS#${payment.status}`,
      GSI3SK: `PAYMENT#${payment.createdAt}`,
      GSI4PK: `STRIPE_PAYMENT#${payment.stripePaymentId}`,
      GSI4SK: `PAYMENT#${payment.createdAt}`,
      ...payment,
    };
  }

  private mapDynamoDBToPayment(item: any): Payment {
    const payment = { ...item };
    delete payment.PK;
    delete payment.SK;
    delete payment.GSI1PK;
    delete payment.GSI1SK;
    delete payment.GSI2PK;
    delete payment.GSI2SK;
    delete payment.GSI3PK;
    delete payment.GSI3SK;
    delete payment.GSI4PK;
    delete payment.GSI4SK;
    return payment as Payment;
  }

  private mapRefundToDynamoDB(refund: Refund): any {
    return {
      PK: `REFUND#${refund.id}`,
      SK: `REFUND#${refund.id}`,
      GSI1PK: `USER#${refund.userId}`,
      GSI1SK: `REFUND#${refund.createdAt}`,
      GSI2PK: `PAYMENT#${refund.paymentId}`,
      GSI2SK: `REFUND#${refund.createdAt}`,
      GSI3PK: `STATUS#${refund.status}`,
      GSI3SK: `REFUND#${refund.createdAt}`,
      ...refund,
    };
  }

  private mapDynamoDBToRefund(item: any): Refund {
    const refund = { ...item };
    delete refund.PK;
    delete refund.SK;
    delete refund.GSI1PK;
    delete refund.GSI1SK;
    delete refund.GSI2PK;
    delete refund.GSI2SK;
    delete refund.GSI3PK;
    delete refund.GSI3SK;
    return refund as Refund;
  }
}
