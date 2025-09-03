import { DynamoDB } from 'aws-sdk';
import { TeamMember, TeamMemberInvitation, TeamRole, TeamPermission } from '../models/TeamMember';
import { logger } from '../../../shared/utils/logger';
import { MetricsManager } from '../../../shared/utils/metrics';

export class TeamRepository {
  private readonly dynamodb: DynamoDB.DocumentClient;
  private readonly tableName: string;
  private readonly metricsManager: MetricsManager;

  constructor() {
    this.dynamodb = new DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.tableName = process.env.TEAM_TABLE_NAME || 'organizer-team-table';
    this.metricsManager = MetricsManager.getInstance();
  }

  /**
   * Create a new team member
   */
  async createTeamMember(teamMember: TeamMember): Promise<TeamMember> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: {
          ...teamMember,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(id)'
      };

      await this.dynamodb.put(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'CREATE', duration, true);
      
      logger.info('Team member created successfully', { 
        teamMemberId: teamMember.id,
        organizerId: teamMember.organizerId,
        email: teamMember.email
      });
      
      return teamMember;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'CREATE', 0, false);
      
      logger.error('Failed to create team member', { error, teamMember });
      throw error;
    }
  }

  /**
   * Get team member by ID
   */
  async getTeamMemberById(id: string): Promise<TeamMember | null> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.GetItemInput = {
        TableName: this.tableName,
        Key: { id }
      };

      const result = await this.dynamodb.get(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', duration, true);
      
      if (!result.Item) {
        logger.info('Team member not found', { id });
        return null;
      }
      
      return result.Item as TeamMember;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', 0, false);
      
      logger.error('Failed to get team member by ID', { error, id });
      throw error;
    }
  }

  /**
   * Get team member by organizer ID and user ID
   */
  async getTeamMemberByOrganizerAndUser(organizerId: string, userId: string): Promise<TeamMember | null> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'organizer-user-index',
        KeyConditionExpression: 'organizerId = :organizerId AND userId = :userId',
        ExpressionAttributeValues: {
          ':organizerId': organizerId,
          ':userId': userId
        }
      };

      const result = await this.dynamodb.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', duration, true);
      
      if (!result.Items || result.Items.length === 0) {
        logger.info('Team member not found', { organizerId, userId });
        return null;
      }
      
      return result.Items[0] as TeamMember;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', 0, false);
      
      logger.error('Failed to get team member by organizer and user', { error, organizerId, userId });
      throw error;
    }
  }

  /**
   * Get all team members for an organizer
   */
  async getTeamMembersByOrganizer(organizerId: string, limit: number = 50, lastEvaluatedKey?: string): Promise<{ items: TeamMember[]; lastEvaluatedKey?: string }> {
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
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', duration, true);
      
      const items = result.Items as TeamMember[] || [];
      const nextLastEvaluatedKey = result.LastEvaluatedKey?.id;
      
      logger.info('Retrieved team members for organizer', { 
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
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', 0, false);
      
      logger.error('Failed to get team members by organizer', { error, organizerId });
      throw error;
    }
  }

  /**
   * Update team member
   */
  async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember> {
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
          expressionAttributeValues[`:${key}`] = updates[key as keyof TeamMember];
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
      this.metricsManager.recordDatabasePerformance('TeamMember', 'UPDATE', duration, true);
      
      logger.info('Team member updated successfully', { id });
      
      return result.Attributes as TeamMember;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'UPDATE', 0, false);
      
      logger.error('Failed to update team member', { error, id, updates });
      throw error;
    }
  }

  /**
   * Remove team member
   */
  async removeTeamMember(id: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.DeleteItemInput = {
        TableName: this.tableName,
        Key: { id }
      };

      await this.dynamodb.delete(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'DELETE', duration, true);
      
      logger.info('Team member removed successfully', { id });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'DELETE', 0, false);
      
      logger.error('Failed to remove team member', { error, id });
      throw error;
    }
  }

  /**
   * Create team member invitation
   */
  async createTeamInvitation(invitation: TeamMemberInvitation): Promise<TeamMemberInvitation> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: {
          ...invitation,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(id)'
      };

      await this.dynamodb.put(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamInvitation', 'CREATE', duration, true);
      
      logger.info('Team invitation created successfully', { 
        invitationId: invitation.id,
        organizerId: invitation.organizerId,
        email: invitation.email
      });
      
      return invitation;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamInvitation', 'CREATE', 0, false);
      
      logger.error('Failed to create team invitation', { error, invitation });
      throw error;
    }
  }

  /**
   * Get team invitation by ID
   */
  async getTeamInvitationById(id: string): Promise<TeamMemberInvitation | null> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.GetItemInput = {
        TableName: this.tableName,
        Key: { id }
      };

      const result = await this.dynamodb.get(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamInvitation', 'READ', duration, true);
      
      if (!result.Item) {
        logger.info('Team invitation not found', { id });
        return null;
      }
      
      return result.Item as TeamMemberInvitation;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamInvitation', 'READ', 0, false);
      
      logger.error('Failed to get team invitation by ID', { error, id });
      throw error;
    }
  }

  /**
   * Get pending invitations for an organizer
   */
  async getPendingInvitationsByOrganizer(organizerId: string): Promise<TeamMemberInvitation[]> {
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
          ':status': 'pending'
        }
      };

      const result = await this.dynamodb.query(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamInvitation', 'READ', duration, true);
      
      const items = result.Items as TeamMemberInvitation[] || [];
      
      logger.info('Retrieved pending invitations for organizer', { 
        organizerId, 
        count: items.length
      });
      
      return items;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamInvitation', 'READ', 0, false);
      
      logger.error('Failed to get pending invitations by organizer', { error, organizerId });
      throw error;
    }
  }

  /**
   * Update team invitation status
   */
  async updateInvitationStatus(id: string, status: 'pending' | 'accepted' | 'declined' | 'expired'): Promise<TeamMemberInvitation> {
    const startTime = Date.now();
    
    try {
      const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.dynamodb.update(params).promise();
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamInvitation', 'UPDATE', duration, true);
      
      logger.info('Team invitation status updated', { id, status });
      
      return result.Attributes as TeamMemberInvitation;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamInvitation', 'UPDATE', 0, false);
      
      logger.error('Failed to update invitation status', { error, id, status });
      throw error;
    }
  }

  /**
   * Search team members
   */
  async searchTeamMembers(organizerId: string, query: string, limit: number = 20): Promise<TeamMember[]> {
    const startTime = Date.now();
    
    try {
      // Get all team members for the organizer and filter by query
      const { items } = await this.getTeamMembersByOrganizer(organizerId, 1000);
      
      const filteredItems = items.filter(member => 
        member.firstName.toLowerCase().includes(query.toLowerCase()) ||
        member.lastName.toLowerCase().includes(query.toLowerCase()) ||
        member.email.toLowerCase().includes(query.toLowerCase()) ||
        member.role.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', duration, true);
      
      logger.info('Team members search completed', { 
        organizerId, 
        query, 
        total: items.length,
        filtered: filteredItems.length
      });
      
      return filteredItems;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', 0, false);
      
      logger.error('Failed to search team members', { error, organizerId, query });
      throw error;
    }
  }

  /**
   * Get team member performance summary
   */
  async getTeamPerformanceSummary(organizerId: string, startDate: string, endDate: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // TODO: Implement actual performance metrics calculation
      // This would typically involve aggregating data from multiple tables
      const summary = {
        totalMembers: 0,
        activeMembers: 0,
        totalEvents: 0,
        totalRevenue: 0,
        averageResponseTime: 0,
        memberActivity: []
      };
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', duration, true);
      
      logger.info('Team performance summary retrieved', { organizerId, startDate, endDate });
      
      return summary;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', 0, false);
      
      logger.error('Failed to get team performance summary', { error, organizerId, startDate, endDate });
      throw error;
    }
  }

  /**
   * Check if user is already a team member
   */
  async isUserTeamMember(organizerId: string, userId: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const member = await this.getTeamMemberByOrganizerAndUser(organizerId, userId);
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', duration, true);
      
      const isMember = !!member;
      
      logger.info('Team member check completed', { organizerId, userId, isMember });
      
      return isMember;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', 0, false);
      
      logger.error('Failed to check if user is team member', { error, organizerId, userId });
      throw error;
    }
  }

  /**
   * Get team member count by role
   */
  async getTeamMemberCountByRole(organizerId: string): Promise<Record<string, number>> {
    const startTime = Date.now();
    
    try {
      const { items } = await this.getTeamMembersByOrganizer(organizerId, 1000);
      
      const roleCounts: Record<string, number> = {};
      items.forEach(member => {
        roleCounts[member.role] = (roleCounts[member.role] || 0) + 1;
      });
      
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', duration, true);
      
      logger.info('Team member count by role retrieved', { organizerId, roleCounts });
      
      return roleCounts;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsManager.recordDatabasePerformance('TeamMember', 'READ', 0, false);
      
      logger.error('Failed to get team member count by role', { error, organizerId });
      throw error;
    }
  }
}
