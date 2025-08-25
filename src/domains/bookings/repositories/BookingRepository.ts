import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Booking, BookingFilters, BookingStatus, PaymentStatus } from '../models/Booking';
import { v4 as uuidv4 } from 'uuid';

export class BookingRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.BOOKING_TABLE_NAME || 'EventPlatform-Bookings-dev';
  }

  async createBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking> {
    const now = new Date().toISOString();
    const bookingWithId: Booking = {
      ...booking,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };

    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `BOOKING#${bookingWithId.id}`,
        SK: `BOOKING#${bookingWithId.id}`,
        GSI1PK: `USER#${bookingWithId.userId}`,
        GSI1SK: `BOOKING#${bookingWithId.createdAt}`,
        GSI2PK: `EVENT#${bookingWithId.eventId}`,
        GSI2SK: `BOOKING#${bookingWithId.createdAt}`,
        GSI3PK: `ORGANIZER#${bookingWithId.organizerId}`,
        GSI3SK: `BOOKING#${bookingWithId.status}#${bookingWithId.createdAt}`,
        ...bookingWithId
      }
    }));

    return bookingWithId;
  }

  async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `BOOKING#${bookingId}`,
          SK: `BOOKING#${bookingId}`
        }
      }));

      if (!result.Item) {
        return null;
      }

      return this.mapDynamoItemToBooking(result.Item);
    } catch (error: any) {
      console.error('Error getting booking by ID:', error);
      throw new Error(`Failed to get booking: ${error.message}`);
    }
  }

  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<Booking> {
    try {
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build update expression
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'createdAt' && value !== undefined) {
          const attributeName = `#${key}`;
          const attributeValue = `:${key}`;
          
          updateExpression.push(`${attributeName} = ${attributeValue}`);
          expressionAttributeNames[attributeName] = key;
          expressionAttributeValues[attributeValue] = value;
        }
      });

      // Add updatedAt
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      // Update GSI3SK if status is being updated
      if (updates.status) {
        updateExpression.push('#GSI3SK = :GSI3SK');
        expressionAttributeNames['#GSI3SK'] = 'GSI3SK';
        expressionAttributeValues[':GSI3SK'] = `BOOKING#${updates.status}#${new Date().toISOString()}`;
      }

      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `BOOKING#${bookingId}`,
          SK: `BOOKING#${bookingId}`
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }));

      return this.mapDynamoItemToBooking(result.Attributes!);
    } catch (error: any) {
      console.error('Error updating booking:', error);
      throw new Error(`Failed to update booking: ${error.message}`);
    }
  }

  async deleteBooking(bookingId: string): Promise<void> {
    try {
      await this.client.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `BOOKING#${bookingId}`,
          SK: `BOOKING#${bookingId}`
        }
      }));
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      throw new Error(`Failed to delete booking: ${error.message}`);
    }
  }

  async getBookingsByUser(userId: string, filters?: Partial<BookingFilters>): Promise<Booking[]> {
    try {
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :userId',
        ExpressionAttributeValues: {
          ':userId': `USER#${userId}`
        },
        ScanIndexForward: false // Most recent first
      };

      // Add filter expressions
      if (filters?.status) {
        queryParams.FilterExpression = '#status = :status';
        queryParams.ExpressionAttributeNames = { '#status': 'status' };
        queryParams.ExpressionAttributeValues[':status'] = filters.status;
      }

      if (filters?.startDate || filters?.endDate) {
        if (!queryParams.FilterExpression) {
          queryParams.FilterExpression = '';
        } else {
          queryParams.FilterExpression += ' AND ';
        }

        if (filters.startDate && filters.endDate) {
          queryParams.FilterExpression += '#createdAt BETWEEN :startDate AND :endDate';
          queryParams.ExpressionAttributeNames['#createdAt'] = 'createdAt';
          queryParams.ExpressionAttributeValues[':startDate'] = filters.startDate;
          queryParams.ExpressionAttributeValues[':endDate'] = filters.endDate;
        } else if (filters.startDate) {
          queryParams.FilterExpression += '#createdAt >= :startDate';
          queryParams.ExpressionAttributeNames['#createdAt'] = 'createdAt';
          queryParams.ExpressionAttributeValues[':startDate'] = filters.startDate;
        } else if (filters.endDate) {
          queryParams.FilterExpression += '#createdAt <= :endDate';
          queryParams.ExpressionAttributeNames['#createdAt'] = 'createdAt';
          queryParams.ExpressionAttributeValues[':endDate'] = filters.endDate;
        }
      }

      const result = await this.client.send(new QueryCommand(queryParams));
      return result.Items?.map(item => this.mapDynamoItemToBooking(item)) || [];
    } catch (error: any) {
      console.error('Error getting bookings by user:', error);
      throw new Error(`Failed to get user bookings: ${error.message}`);
    }
  }

  async getBookingsByEvent(eventId: string, filters?: Partial<BookingFilters>): Promise<Booking[]> {
    try {
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :eventId',
        ExpressionAttributeValues: {
          ':eventId': `EVENT#${eventId}`
        },
        ScanIndexForward: false
      };

      // Add filter expressions
      if (filters?.status) {
        queryParams.FilterExpression = '#status = :status';
        queryParams.ExpressionAttributeNames = { '#status': 'status' };
        queryParams.ExpressionAttributeValues[':status'] = filters.status;
      }

      const result = await this.client.send(new QueryCommand(queryParams));
      return result.Items?.map(item => this.mapDynamoItemToBooking(item)) || [];
    } catch (error: any) {
      console.error('Error getting bookings by event:', error);
      throw new Error(`Failed to get event bookings: ${error.message}`);
    }
  }

  async getBookingsByOrganizer(organizerId: string, filters?: Partial<BookingFilters>): Promise<Booking[]> {
    try {
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :organizerId',
        ExpressionAttributeValues: {
          ':organizerId': `ORGANIZER#${organizerId}`
        },
        ScanIndexForward: false
      };

      // Add filter expressions
      if (filters?.status) {
        queryParams.FilterExpression = '#status = :status';
        queryParams.ExpressionAttributeNames = { '#status': 'status' };
        queryParams.ExpressionAttributeValues[':status'] = filters.status;
      }

      const result = await this.client.send(new QueryCommand(queryParams));
      return result.Items?.map(item => this.mapDynamoItemToBooking(item)) || [];
    } catch (error: any) {
      console.error('Error getting bookings by organizer:', error);
      throw new Error(`Failed to get organizer bookings: ${error.message}`);
    }
  }

  async getBookingsByStatus(status: BookingStatus, filters?: Partial<BookingFilters>): Promise<Booking[]> {
    try {
      const scanParams: any = {
        TableName: this.tableName,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': status
        }
      };

      // Add additional filters
      if (filters?.organizerId) {
        scanParams.FilterExpression += ' AND #organizerId = :organizerId';
        scanParams.ExpressionAttributeNames['#organizerId'] = 'organizerId';
        scanParams.ExpressionAttributeValues[':organizerId'] = filters.organizerId;
      }

      if (filters?.eventId) {
        scanParams.FilterExpression += ' AND #eventId = :eventId';
        scanParams.ExpressionAttributeNames['#eventId'] = 'eventId';
        scanParams.ExpressionAttributeValues[':eventId'] = filters.eventId;
      }

      const result = await this.client.send(new ScanCommand(scanParams));
      return result.Items?.map(item => this.mapDynamoItemToBooking(item)) || [];
    } catch (error: any) {
      console.error('Error getting bookings by status:', error);
      throw new Error(`Failed to get bookings by status: ${error.message}`);
    }
  }

  async getBookingStatistics(organizerId?: string, startDate?: string, endDate?: string): Promise<any> {
    try {
      const scanParams: any = {
        TableName: this.tableName
      };

      let filterExpression = '';
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      if (organizerId) {
        filterExpression += '#organizerId = :organizerId';
        expressionAttributeNames['#organizerId'] = 'organizerId';
        expressionAttributeValues[':organizerId'] = organizerId;
      }

      if (startDate || endDate) {
        if (filterExpression) filterExpression += ' AND ';
        
        if (startDate && endDate) {
          filterExpression += '#createdAt BETWEEN :startDate AND :endDate';
          expressionAttributeNames['#createdAt'] = 'createdAt';
          expressionAttributeValues[':startDate'] = startDate;
          expressionAttributeValues[':endDate'] = endDate;
        } else if (startDate) {
          filterExpression += '#createdAt >= :startDate';
          expressionAttributeNames['#createdAt'] = 'createdAt';
          expressionAttributeValues[':startDate'] = startDate;
        } else if (endDate) {
          filterExpression += '#createdAt <= :endDate';
          expressionAttributeNames['#createdAt'] = 'createdAt';
          expressionAttributeValues[':endDate'] = endDate;
        }
      }

      if (filterExpression) {
        scanParams.FilterExpression = filterExpression;
        scanParams.ExpressionAttributeNames = expressionAttributeNames;
        scanParams.ExpressionAttributeValues = expressionAttributeValues;
      }

      const result = await this.client.send(new ScanCommand(scanParams));
      const bookings = result.Items?.map(item => this.mapDynamoItemToBooking(item)) || [];

      // Calculate statistics
      const totalBookings = bookings.length;
      const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
      const confirmedBookings = bookings.filter(b => b.status === BookingStatus.CONFIRMED);
      const cancelledBookings = bookings.filter(b => b.status === BookingStatus.CANCELLED);
      const pendingBookings = bookings.filter(b => b.status === BookingStatus.PENDING);

      return {
        totalBookings,
        totalRevenue,
        confirmedBookings: confirmedBookings.length,
        cancelledBookings: cancelledBookings.length,
        pendingBookings: pendingBookings.length,
        averageBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0
      };
    } catch (error: any) {
      console.error('Error getting booking statistics:', error);
      throw new Error(`Failed to get booking statistics: ${error.message}`);
    }
  }

  private mapDynamoItemToBooking(item: any): Booking {
    const {
      PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK,
      ...bookingData
    } = item;

    return bookingData as Booking;
  }
}
