import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Event, EventCategory, EventMedia, EventSearchFilters, EventListResponse } from '../models/Event';
import { logger } from '../../../shared/utils/logger';
import { NotFoundError } from '../../../shared/errors/DomainError';

export class EventRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(region: string, tableName: string) {
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
    this.tableName = tableName;
  }

  // Event CRUD Operations
  async createEvent(event: Event): Promise<Event> {
    try {
      const item = this.mapEventToDynamoDB(event);
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));

      logger.info('Event created successfully', { eventId: event.id, organizerId: event.organizerId });
      return event;
    } catch (error: any) {
      logger.error('Failed to create event', { error: error.message, eventId: event.id });
      throw error;
    }
  }

  async getEventById(eventId: string): Promise<Event | null> {
    try {
      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: `EVENT#${eventId}`
        }
      }));

      if (!result.Item) {
        return null;
      }

      return this.mapDynamoDBToEvent(result.Item);
    } catch (error: any) {
      logger.error('Failed to get event by ID', { error: error.message, eventId });
      throw error;
    }
  }

  async getEventBySlug(slug: string): Promise<Event | null> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'SlugIndex',
        KeyConditionExpression: 'GSI4PK = :slug',
        ExpressionAttributeValues: {
          ':slug': `SLUG#${slug}`
        }
      }));

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return this.mapDynamoDBToEvent(result.Items[0]);
    } catch (error: any) {
      logger.error('Failed to get event by slug', { error: error.message, slug });
      throw error;
    }
  }

  async updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
    try {
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build update expression dynamically
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const attributeName = `#${key}`;
          const attributeValue = `:${key}`;
          
          updateExpression.push(`${attributeName} = ${attributeValue}`);
          expressionAttributeNames[attributeName] = key;
          expressionAttributeValues[attributeValue] = value;
        }
      });

      // Always update the updatedAt timestamp
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: `EVENT#${eventId}`
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }));

      if (!result.Attributes) {
        throw new NotFoundError('Event', eventId);
      }

      const updatedEvent = this.mapDynamoDBToEvent(result.Attributes);
      logger.info('Event updated successfully', { eventId, updates: Object.keys(updates) });
      return updatedEvent;
    } catch (error: any) {
      logger.error('Failed to update event', { error: error.message, eventId });
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.client.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: `EVENT#${eventId}`
        }
      }));

      logger.info('Event deleted successfully', { eventId });
    } catch (error: any) {
      logger.error('Failed to delete event', { error: error.message, eventId });
      throw error;
    }
  }

  // Event Search and Listing
  async searchEvents(filters: EventSearchFilters, page: number = 1, limit: number = 20): Promise<EventListResponse> {
    try {
      const filterExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build filter expressions
      if (filters.organizerId) {
        filterExpressions.push('#organizerId = :organizerId');
        expressionAttributeNames['#organizerId'] = 'organizerId';
        expressionAttributeValues[':organizerId'] = filters.organizerId;
      }

      if (filters.categoryId) {
        filterExpressions.push('#categoryId = :categoryId');
        expressionAttributeNames['#categoryId'] = 'categoryId';
        expressionAttributeValues[':categoryId'] = filters.categoryId;
      }

      if (filters.type) {
        filterExpressions.push('#type = :type');
        expressionAttributeNames['#type'] = 'type';
        expressionAttributeValues[':type'] = filters.type;
      }

      if (filters.status) {
        filterExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = filters.status;
      }

      if (filters.visibility) {
        filterExpressions.push('#visibility = :visibility');
        expressionAttributeNames['#visibility'] = 'visibility';
        expressionAttributeValues[':visibility'] = filters.visibility;
      }

      if (filters.startDate) {
        filterExpressions.push('#startDate >= :startDate');
        expressionAttributeNames['#startDate'] = 'startDate';
        expressionAttributeValues[':startDate'] = filters.startDate;
      }

      if (filters.endDate) {
        filterExpressions.push('#endDate <= :endDate');
        expressionAttributeNames['#endDate'] = 'endDate';
        expressionAttributeValues[':endDate'] = filters.endDate;
      }

      if (filters.hasAvailableSpots) {
        filterExpressions.push('#currentAttendees < #maxAttendees');
        expressionAttributeNames['#currentAttendees'] = 'currentAttendees';
        expressionAttributeNames['#maxAttendees'] = 'maxAttendees';
      }

      if (filters.isFree) {
        filterExpressions.push('#pricingModel = :pricingModel');
        expressionAttributeNames['#pricingModel'] = 'pricingModel';
        expressionAttributeValues[':pricingModel'] = 'free';
      }

      if (filters.isVirtual) {
        filterExpressions.push('#locationType = :locationType');
        expressionAttributeNames['#locationType'] = 'locationType';
        expressionAttributeValues[':locationType'] = 'virtual';
      }

      if (filters.isHybrid) {
        filterExpressions.push('#locationType = :locationType');
        expressionAttributeNames['#locationType'] = 'locationType';
        expressionAttributeValues[':locationType'] = 'hybrid';
      }

      // Use GSI for efficient querying
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StatusDateIndex',
        KeyConditionExpression: '#status = :status',
        FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
        Limit: limit,
        ScanIndexForward: false // Most recent first
      }));

      const events = (result.Items || []).map(item => this.mapDynamoDBToEvent(item));
      const total = result.Count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters
      };
    } catch (error: any) {
      logger.error('Failed to search events', { error: error.message, filters });
      throw error;
    }
  }

  async getEventsByOrganizer(organizerId: string, page: number = 1, limit: number = 20): Promise<EventListResponse> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'OrganizerIndex',
        KeyConditionExpression: 'GSI3PK = :organizerId',
        ExpressionAttributeValues: {
          ':organizerId': `ORGANIZER#${organizerId}`
        },
        Limit: limit,
        ScanIndexForward: false
      }));

      const events = (result.Items || []).map(item => this.mapDynamoDBToEvent(item));
      const total = result.Count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: { organizerId }
      };
    } catch (error: any) {
      logger.error('Failed to get events by organizer', { error: error.message, organizerId });
      throw error;
    }
  }

  async getEventsByCategory(categoryId: string, page: number = 1, limit: number = 20): Promise<EventListResponse> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'CategoryIndex',
        KeyConditionExpression: 'GSI2PK = :categoryId',
        ExpressionAttributeValues: {
          ':categoryId': `CATEGORY#${categoryId}`
        },
        Limit: limit,
        ScanIndexForward: false
      }));

      const events = (result.Items || []).map(item => this.mapDynamoDBToEvent(item));
      const total = result.Count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: { categoryId }
      };
    } catch (error: any) {
      logger.error('Failed to get events by category', { error: error.message, categoryId });
      throw error;
    }
  }

  // Event Category Operations
  async createCategory(category: EventCategory): Promise<EventCategory> {
    try {
      const item = this.mapCategoryToDynamoDB(category);
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));

      logger.info('Event category created successfully', { categoryId: category.id });
      return category;
    } catch (error: any) {
      logger.error('Failed to create event category', { error: error.message, categoryId: category.id });
      throw error;
    }
  }

  async getCategoryById(categoryId: string): Promise<EventCategory | null> {
    try {
      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `CATEGORY#${categoryId}`,
          SK: `CATEGORY#${categoryId}`
        }
      }));

      if (!result.Item) {
        return null;
      }

      return this.mapDynamoDBToCategory(result.Item);
    } catch (error: any) {
      logger.error('Failed to get category by ID', { error: error.message, categoryId });
      throw error;
    }
  }

  async getAllCategories(): Promise<EventCategory[]> {
    try {
      const result = await this.client.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'begins_with(PK, :categoryPrefix)',
        ExpressionAttributeValues: {
          ':categoryPrefix': 'CATEGORY#'
        }
      }));

      return (result.Items || []).map(item => this.mapDynamoDBToCategory(item));
    } catch (error: any) {
      logger.error('Failed to get all categories', { error: error.message });
      throw error;
    }
  }

  // Event Media Operations
  async addEventMedia(media: EventMedia): Promise<EventMedia> {
    try {
      const item = this.mapMediaToDynamoDB(media);
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));

      logger.info('Event media added successfully', { mediaId: media.id, eventId: media.eventId });
      return media;
    } catch (error: any) {
      logger.error('Failed to add event media', { error: error.message, mediaId: media.id });
      throw error;
    }
  }

  async getEventMedia(eventId: string): Promise<EventMedia[]> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :eventId AND begins_with(SK, :mediaPrefix)',
        ExpressionAttributeValues: {
          ':eventId': `EVENT#${eventId}`,
          ':mediaPrefix': 'MEDIA#'
        }
      }));

      return (result.Items || []).map(item => this.mapDynamoDBToMedia(item));
    } catch (error: any) {
      logger.error('Failed to get event media', { error: error.message, eventId });
      throw error;
    }
  }

  async deleteEventMedia(mediaId: string, eventId: string): Promise<void> {
    try {
      await this.client.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: `MEDIA#${mediaId}`
        }
      }));

      logger.info('Event media deleted successfully', { mediaId, eventId });
    } catch (error: any) {
      logger.error('Failed to delete event media', { error: error.message, mediaId });
      throw error;
    }
  }

  // Statistics and Analytics
  async updateEventStats(eventId: string, stats: Partial<Event['stats']>): Promise<void> {
    try {
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(stats).forEach(([key, value]) => {
        if (value !== undefined) {
          const attributeName = `#stats.${key}`;
          const attributeValue = `:stats${key}`;
          
          updateExpression.push(`${attributeName} = ${attributeValue}`);
          expressionAttributeNames[attributeName] = `stats.${key}`;
          expressionAttributeValues[attributeValue] = value;
        }
      });

      if (updateExpression.length === 0) return;

      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: `EVENT#${eventId}`
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }));

      logger.info('Event stats updated successfully', { eventId, stats: Object.keys(stats) });
    } catch (error: any) {
      logger.error('Failed to update event stats', { error: error.message, eventId });
      throw error;
    }
  }

  // Helper Methods for DynamoDB Mapping
  private mapEventToDynamoDB(event: Event): any {
    return {
      PK: `EVENT#${event.id}`,
      SK: `EVENT#${event.id}`,
      GSI1PK: `ORGANIZER#${event.organizerId}`,
      GSI1SK: `EVENT#${event.startDate}`,
      GSI2PK: `CATEGORY#${event.categoryId}`,
      GSI2SK: `EVENT#${event.startDate}`,
      GSI3PK: `ORGANIZER#${event.organizerId}`,
      GSI3SK: `EVENT#${event.createdAt}`,
      GSI4PK: `SLUG#${event.slug}`,
      GSI4SK: `EVENT#${event.id}`,
      GSI5PK: `STATUS#${event.status}`,
      GSI5SK: `EVENT#${event.startDate}`,
      ...event,
      locationType: event.location.type,
      pricingModel: event.pricing.model
    };
  }

  private mapDynamoDBToEvent(item: any): Event {
    const event = { ...item };
    delete event.PK;
    delete item.SK;
    delete item.GSI1PK;
    delete item.GSI1SK;
    delete item.GSI2PK;
    delete item.GSI2SK;
    delete item.GSI3PK;
    delete item.GSI3SK;
    delete item.GSI4PK;
    delete item.GSI4SK;
    delete item.GSI5PK;
    delete item.GSI5SK;
    delete item.locationType;
    delete item.pricingModel;
    return event as Event;
  }

  private mapCategoryToDynamoDB(category: EventCategory): any {
    return {
      PK: `CATEGORY#${category.id}`,
      SK: `CATEGORY#${category.id}`,
      ...category
    };
  }

  private mapDynamoDBToCategory(item: any): EventCategory {
    const category = { ...item };
    delete category.PK;
    delete category.SK;
    return category as EventCategory;
  }

  private mapMediaToDynamoDB(media: EventMedia): any {
    return {
      PK: `EVENT#${media.eventId}`,
      SK: `MEDIA#${media.id}`,
      ...media
    };
  }

  private mapDynamoDBToMedia(item: any): EventMedia {
    const media = { ...item };
    delete media.PK;
    delete media.SK;
    return media as EventMedia;
  }
}
