import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand
} from '@aws-sdk/lib-dynamodb';
import { User, UserSearchFilters, UserListResponse } from '../models/User';
import { UserRole, UserStatus } from '../../../shared/types/common';
import { logger } from '../../../shared/utils/logger';
import { NotFoundError, ValidationError } from '../../../shared/errors/DomainError';

export class UserRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly gsiEmailIndex: string;
  private readonly gsiUsernameIndex: string;
  private readonly gsiRoleIndex: string;

  constructor(region: string, tableName: string) {
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
    this.tableName = tableName;
    this.gsiEmailIndex = 'EmailIndex';
    this.gsiUsernameIndex = 'UsernameIndex';
    this.gsiRoleIndex = 'RoleIndex';
  }

  async createUser(user: User): Promise<User> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `USER#${user.id}`,
          SK: `USER#${user.id}`,
          GSI1PK: `EMAIL#${user.email.toLowerCase()}`,
          GSI1SK: `USER#${user.id}`,
          GSI2PK: `USERNAME#${user.username.toLowerCase()}`,
          GSI2SK: `USER#${user.id}`,
          GSI3PK: `ROLE#${user.role}`,
          GSI3SK: `USER#${user.id}`,
          ...user,
          email: user.email.toLowerCase(),
          username: user.username.toLowerCase(),
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      });

      await this.client.send(command);
      logger.info('User created successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new ValidationError('User with this email or username already exists');
      }
      logger.error('Failed to create user', { error: error.message, userId: user.id });
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER#${userId}`,
        },
      });

      const result = await this.client.send(command);
      
      if (!result.Item) {
        throw new NotFoundError('User', userId);
      }

      return result.Item as User;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get user by ID', { error: error.message, userId });
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: this.gsiEmailIndex,
        KeyConditionExpression: 'GSI1PK = :email',
        ExpressionAttributeValues: {
          ':email': `EMAIL#${email.toLowerCase()}`,
        },
        Limit: 1,
      });

      const result = await this.client.send(command);
      
      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return result.Items[0] as User;
    } catch (error: any) {
      logger.error('Failed to get user by email', { error: error.message, email });
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: this.gsiUsernameIndex,
        KeyConditionExpression: 'GSI2PK = :username',
        ExpressionAttributeValues: {
          ':username': `USERNAME#${username.toLowerCase()}`,
        },
        Limit: 1,
      });

      const result = await this.client.send(command);
      
      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return result.Items[0] as User;
    } catch (error: any) {
      logger.error('Failed to get user by username', { error: error.message, username });
      throw error;
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build update expression dynamically
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const attributeName = `#${key}`;
          const attributeValue = `:${key}`;
          
          updateExpressions.push(`${attributeName} = ${attributeValue}`);
          expressionAttributeNames[attributeName] = key;
          expressionAttributeValues[attributeValue] = value;
        }
      });

      // Always update the updatedAt timestamp
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER#${userId}`,
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_exists(PK)',
      });

      const result = await this.client.send(command);
      
      if (!result.Attributes) {
        throw new NotFoundError('User', userId);
      }

      logger.info('User updated successfully', { userId, updates: Object.keys(updates) });
      return result.Attributes as User;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to update user', { error: error.message, userId });
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER#${userId}`,
        },
        ConditionExpression: 'attribute_exists(PK)',
      });

      await this.client.send(command);
      logger.info('User deleted successfully', { userId });
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new NotFoundError('User', userId);
      }
      logger.error('Failed to delete user', { error: error.message, userId });
      throw error;
    }
  }

  async listUsers(filters: UserSearchFilters, page: number = 1, pageSize: number = 20): Promise<UserListResponse> {
    try {
      const filterExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build filter expressions
      if (filters.role) {
        filterExpressions.push('#role = :role');
        expressionAttributeNames['#role'] = 'role';
        expressionAttributeValues[':role'] = filters.role;
      }

      if (filters.status) {
        filterExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = filters.status;
      }

      if (filters.emailVerified !== undefined) {
        filterExpressions.push('#emailVerified = :emailVerified');
        expressionAttributeNames['#emailVerified'] = 'emailVerified';
        expressionAttributeValues[':emailVerified'] = filters.emailVerified;
      }

      if (filters.phoneVerified !== undefined) {
        filterExpressions.push('#phoneVerified = :phoneVerified');
        expressionAttributeNames['#phoneVerified'] = 'phoneVerified';
        expressionAttributeValues[':phoneVerified'] = filters.phoneVerified;
      }

      if (filters.createdAfter) {
        filterExpressions.push('#createdAt >= :createdAfter');
        expressionAttributeNames['#createdAt'] = 'createdAt';
        expressionAttributeValues[':createdAfter'] = filters.createdAfter;
      }

      if (filters.createdBefore) {
        filterExpressions.push('#createdAt <= :createdBefore');
        expressionAttributeNames['#createdAt'] = 'createdAt';
        expressionAttributeValues[':createdBefore'] = filters.createdBefore;
      }

      if (filters.searchTerm) {
        filterExpressions.push('(contains(#firstName, :searchTerm) OR contains(#lastName, :searchTerm) OR contains(#email, :searchTerm) OR contains(#username, :searchTerm))');
        expressionAttributeNames['#firstName'] = 'firstName';
        expressionAttributeNames['#lastName'] = 'lastName';
        expressionAttributeNames['#email'] = 'email';
        expressionAttributeNames['#username'] = 'username';
        expressionAttributeValues[':searchTerm'] = filters.searchTerm.toLowerCase();
      }

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
        Limit: pageSize,
        ExclusiveStartKey: page > 1 ? { PK: `USER#${(page - 1) * pageSize}` } : undefined,
      });

      const result = await this.client.send(command);
      
      const users = (result.Items || []) as User[];
      const totalCount = result.Count || 0;
      const hasNextPage = !!result.LastEvaluatedKey;
      const hasPreviousPage = page > 1;

      return {
        users,
        totalCount,
        page,
        pageSize,
        hasNextPage,
        hasPreviousPage,
      };
    } catch (error: any) {
      logger.error('Failed to list users', { error: error.message, filters });
      throw error;
    }
  }

  async getUsersByRole(role: UserRole, page: number = 1, pageSize: number = 20): Promise<UserListResponse> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: this.gsiRoleIndex,
        KeyConditionExpression: 'GSI3PK = :role',
        ExpressionAttributeValues: {
          ':role': `ROLE#${role}`,
        },
        Limit: pageSize,
        ExclusiveStartKey: page > 1 ? { GSI3PK: `ROLE#${role}`, GSI3SK: `USER#${(page - 1) * pageSize}` } : undefined,
      });

      const result = await this.client.send(command);
      
      const users = (result.Items || []) as User[];
      const totalCount = result.Count || 0;
      const hasNextPage = !!result.LastEvaluatedKey;
      const hasPreviousPage = page > 1;

      return {
        users,
        totalCount,
        page,
        pageSize,
        hasNextPage,
        hasPreviousPage,
      };
    } catch (error: any) {
      logger.error('Failed to get users by role', { error: error.message, role });
      throw error;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER#${userId}`,
        },
        UpdateExpression: 'SET #lastLoginAt = :lastLoginAt',
        ExpressionAttributeNames: {
          '#lastLoginAt': 'lastLoginAt',
        },
        ExpressionAttributeValues: {
          ':lastLoginAt': new Date().toISOString(),
        },
      });

      await this.client.send(command);
      logger.info('User last login updated', { userId });
    } catch (error: any) {
      logger.error('Failed to update user last login', { error: error.message, userId });
      throw error;
    }
  }

  async verifyEmail(userId: string): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER#${userId}`,
        },
        UpdateExpression: 'SET #emailVerified = :emailVerified, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#emailVerified': 'emailVerified',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':emailVerified': true,
          ':updatedAt': new Date().toISOString(),
        },
      });

      await this.client.send(command);
      logger.info('User email verified', { userId });
    } catch (error: any) {
      logger.error('Failed to verify user email', { error: error.message, userId });
      throw error;
    }
  }

  async verifyPhone(userId: string): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER#${userId}`,
        },
        UpdateExpression: 'SET #phoneVerified = :phoneVerified, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#phoneVerified': 'phoneVerified',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':phoneVerified': true,
          ':updatedAt': new Date().toISOString(),
        },
      });

      await this.client.send(command);
      logger.info('User phone verified', { userId });
    } catch (error: any) {
      logger.error('Failed to verify user phone', { error: error.message, userId });
      throw error;
    }
  }

  // OAuth-related methods
  async getUserByOAuthProvider(provider: string, providerUserId: string): Promise<User | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: this.gsiEmailIndex, // We'll use email index for now, could create a dedicated OAuth index
        KeyConditionExpression: 'GSI1PK = :providerKey',
        ExpressionAttributeValues: {
          ':providerKey': `OAUTH#${provider}#${providerUserId}`,
        },
        Limit: 1,
      });

      const result = await this.client.send(command);
      return result.Items?.[0] as User || null;
    } catch (error: any) {
      logger.error('Failed to get user by OAuth provider', { error: error.message, provider, providerUserId });
      throw error;
    }
  }

  async linkOAuthAccount(userId: string, oauthData: {
    provider: string;
    providerUserId: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
    scope?: string;
    expiresAt?: string;
  }): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER#${userId}`,
        },
        UpdateExpression: 'SET #oauthAccounts.#provider = :oauthData, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#oauthAccounts': 'oauthAccounts',
          '#provider': oauthData.provider,
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':oauthData': oauthData,
          ':updatedAt': new Date().toISOString(),
        },
      });

      await this.client.send(command);
      logger.info('OAuth account linked successfully', { userId, provider: oauthData.provider });
    } catch (error: any) {
      logger.error('Failed to link OAuth account', { error: error.message, userId, provider: oauthData.provider });
      throw error;
    }
  }

  async unlinkOAuthAccount(userId: string, provider: string): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER#${userId}`,
        },
        UpdateExpression: 'REMOVE #oauthAccounts.#provider, SET #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#oauthAccounts': 'oauthAccounts',
          '#provider': provider,
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':updatedAt': new Date().toISOString(),
        },
      });

      await this.client.send(command);
      logger.info('OAuth account unlinked successfully', { userId, provider });
    } catch (error: any) {
      logger.error('Failed to unlink OAuth account', { error: error.message, userId, provider });
      throw error;
    }
  }

  async getLinkedOAuthAccounts(userId: string): Promise<{ provider: string; providerUserId: string; linkedAt: string; }[]> {
    try {
      const user = await this.getUserById(userId);
      return (user.oauthAccounts || []) as { provider: string; providerUserId: string; linkedAt: string; }[];
    } catch (error: any) {
      logger.error('Failed to get linked OAuth accounts', { error: error.message, userId });
      throw error;
    }
  }
}
