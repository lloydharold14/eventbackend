import { 
  TeamMember, 
  TeamMemberInvitation, 
  TeamRole, 
  TeamPermission, 
  RegionalAccess,
  CreateTeamMemberRequest,
  UpdateTeamMemberRequest,
  TeamMemberSearchFilters,
  TeamMemberListResponse,
  TeamPerformanceSummary,
  TeamActivityLog
} from '../../models/TeamMember';
import { OrganizerService } from '../organizer/OrganizerService';
import { logger } from '../../../../shared/utils/logger';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../../../shared/errors/DomainError';

export class TeamService {
  private organizerService: OrganizerService;

  constructor(organizerService: OrganizerService) {
    this.organizerService = organizerService;
  }

  // Create team member
  async createTeamMember(request: CreateTeamMemberRequest): Promise<TeamMember> {
    try {
      // Validate organizer exists
      const organizer = await this.organizerService.getOrganizerById(request.organizerId);
      if (!organizer) {
        throw new NotFoundError('Organizer', request.organizerId);
      }

      // Check if user can invite team members
      if (!this.canInviteTeamMembers(organizer.settings)) {
        throw new UnauthorizedError('Insufficient permissions to invite team members');
      }

      // Check team member limit
      if (organizer.settings.maxTeamMembers !== -1) {
        const currentTeamSize = await this.getTeamSize(request.organizerId);
        if (currentTeamSize >= organizer.settings.maxTeamMembers) {
          throw new ValidationError('Team member limit reached for current subscription');
        }
      }

      const teamMember: TeamMember = {
        id: `tm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizerId: request.organizerId,
        firstName: request.firstName,
        lastName: request.lastName,
        email: request.email,
        phone: request.phone,
        country: request.country,
        region: request.region,
        timezone: request.timezone,
        locale: request.locale,
        role: request.role,
        permissions: request.permissions,
        accessLevel: this.getAccessLevelFromRole(request.role),
        regionalAccess: request.regionalAccess,
        languagePreferences: request.languagePreferences || ['en'],
        currencyPreferences: request.currencyPreferences || ['USD'],
        dateFormatPreferences: ['MM/DD/YYYY'],
        isActive: true,
        isVerified: false,
        lastActive: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
        eventsManaged: 0,
        actionsPerformed: 0,
        lastActionAt: new Date().toISOString(),
        communicationPreferences: {
          email: true,
          sms: false,
          push: false,
          inApp: true
        },
        twoFactorEnabled: false,
        lastLoginAt: new Date().toISOString(),
        loginHistory: [],
        notes: request.notes,
        tags: [],
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };

      // TODO: Save to database via repository
      logger.info('Team member created successfully', { 
        teamMemberId: teamMember.id, 
        organizerId: request.organizerId 
      });
      
      return teamMember;
    } catch (error) {
      logger.error('Failed to create team member', { error, request });
      throw error;
    }
  }

  // Get team member by ID
  async getTeamMemberById(teamMemberId: string): Promise<TeamMember> {
    try {
      // TODO: Get from database via repository
      // For now, return mock data
      throw new NotFoundError('Team member', teamMemberId);
    } catch (error) {
      logger.error('Failed to get team member', { error, teamMemberId });
      throw error;
    }
  }

  // Get team members by organizer ID
  async getTeamMembersByOrganizer(organizerId: string): Promise<TeamMember[]> {
    try {
      // TODO: Get from database via repository
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to get team members by organizer', { error, organizerId });
      throw error;
    }
  }

  // Update team member
  async updateTeamMember(teamMemberId: string, request: UpdateTeamMemberRequest): Promise<TeamMember> {
    try {
      const teamMember = await this.getTeamMemberById(teamMemberId);
      if (!teamMember) {
        throw new NotFoundError('Team member', teamMemberId);
      }

      // Update fields if provided
      if (request.firstName) teamMember.firstName = request.firstName;
      if (request.lastName) teamMember.lastName = request.lastName;
      if (request.phone !== undefined) teamMember.phone = request.phone;
      if (request.role) teamMember.role = request.role;
      if (request.permissions) teamMember.permissions = request.permissions;
      if (request.regionalAccess) teamMember.regionalAccess = request.regionalAccess;
      if (request.country) teamMember.country = request.country;
      if (request.region) teamMember.region = request.region;
      if (request.timezone) teamMember.timezone = request.timezone;
      if (request.locale) teamMember.locale = request.locale;
      if (request.languagePreferences) teamMember.languagePreferences = request.languagePreferences;
      if (request.currencyPreferences) teamMember.currencyPreferences = request.currencyPreferences;
      if (request.isActive !== undefined) teamMember.isActive = request.isActive;
      if (request.notes !== undefined) teamMember.notes = request.notes;

      // Update access level if role changed
      if (request.role) {
        teamMember.accessLevel = this.getAccessLevelFromRole(request.role);
      }

      // TODO: Save to database via repository
      logger.info('Team member updated successfully', { teamMemberId, updates: request });
      
      return teamMember;
    } catch (error) {
      logger.error('Failed to update team member', { error, teamMemberId, request });
      throw error;
    }
  }

  // Remove team member
  async removeTeamMember(teamMemberId: string, organizerId: string): Promise<void> {
    try {
      const teamMember = await this.getTeamMemberById(teamMemberId);
      if (!teamMember) {
        throw new NotFoundError('Team member', teamMemberId);
      }

      if (teamMember.organizerId !== organizerId) {
        throw new UnauthorizedError('Access denied');
      }

      // TODO: Remove from database via repository
      logger.info('Team member removed successfully', { teamMemberId, organizerId });
    } catch (error) {
      logger.error('Failed to remove team member', { error, teamMemberId, organizerId });
      throw error;
    }
  }

  // Search team members
  async searchTeamMembers(filters: TeamMemberSearchFilters): Promise<TeamMemberListResponse> {
    try {
      // TODO: Implement search logic via repository
      // For now, return empty result
      return {
        members: [],
        totalCount: 0,
        page: filters.page || 1,
        pageSize: filters.pageSize || 10,
        hasNextPage: false,
        hasPreviousPage: false
      };
    } catch (error) {
      logger.error('Failed to search team members', { error, filters });
      throw error;
    }
  }

  // Create team member invitation
  async createTeamMemberInvitation(
    organizerId: string,
    email: string,
    firstName: string,
    lastName: string,
    role: TeamRole,
    permissions: TeamPermission[],
    regionalAccess: RegionalAccess,
    invitedBy: string,
    customMessage?: string
  ): Promise<TeamMemberInvitation> {
    try {
      // Validate organizer exists
      const organizer = await this.organizerService.getOrganizerById(organizerId);
      if (!organizer) {
        throw new NotFoundError('Organizer', organizerId);
      }

      // Check if user can invite team members
      if (!this.canInviteTeamMembers(organizer.settings)) {
        throw new UnauthorizedError('Insufficient permissions to invite team members');
      }

      // Check team member limit
      if (organizer.settings.maxTeamMembers !== -1) {
        const currentTeamSize = await this.getTeamSize(organizerId);
        if (currentTeamSize >= organizer.settings.maxTeamMembers) {
          throw new ValidationError('Team member limit reached for current subscription');
        }
      }

      const invitation: TeamMemberInvitation = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizerId,
        email,
        firstName,
        lastName,
        role,
        permissions,
        regionalAccess,
        invitedBy,
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        status: 'pending',
        defaultCountry: organizer.country,
        defaultRegion: organizer.region,
        defaultTimezone: organizer.timezone,
        defaultLocale: organizer.locale,
        customMessage
      };

      // TODO: Save to database via repository
      // TODO: Send invitation email
      
      logger.info('Team member invitation created successfully', { 
        invitationId: invitation.id, 
        organizerId, 
        email 
      });
      
      return invitation;
    } catch (error) {
      logger.error('Failed to create team member invitation', { error, organizerId, email });
      throw error;
    }
  }

  // Accept team member invitation
  async acceptTeamMemberInvitation(
    invitationId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    location: { country: string; region: string; city: string }
  ): Promise<TeamMember> {
    try {
      // TODO: Get invitation from database
      // TODO: Validate invitation is still valid
      // TODO: Create team member
      // TODO: Update invitation status
      
      throw new Error('Not implemented');
    } catch (error) {
      logger.error('Failed to accept team member invitation', { error, invitationId, userId });
      throw error;
    }
  }

  // Get team performance summary
  async getTeamPerformanceSummary(
    organizerId: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    startDate: string,
    endDate: string
  ): Promise<TeamPerformanceSummary> {
    try {
      // TODO: Get real performance data
      // For now, return mock data
      const summary: TeamPerformanceSummary = {
        organizerId,
        period,
        startDate,
        endDate,
        totalMembers: 0,
        activeMembers: 0,
        newMembers: 0,
        departedMembers: 0,
        averageEfficiencyScore: 0,
        averageQualityScore: 0,
        averageCollaborationScore: 0,
        averageOverallScore: 0,
        totalActions: 0,
        eventsCreated: 0,
        attendeesManaged: 0,
        campaignsLaunched: 0,
        supportTicketsResolved: 0,
        regionalPerformance: [],
        topPerformers: []
      };

      return summary;
    } catch (error) {
      logger.error('Failed to get team performance summary', { error, organizerId, period });
      throw error;
    }
  }

  // Log team member activity
  async logTeamMemberActivity(
    memberId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
    location?: { country: string; region: string; city: string }
  ): Promise<void> {
    try {
      const activity: TeamActivityLog = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizerId: memberId, // Using memberId as organizerId for now
        memberId,
        action,
        resource,
        resourceId,
        details,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent,
        location
      };

      // TODO: Save to database via repository
      logger.info('Team member activity logged', { 
        memberId, 
        action, 
        resource, 
        resourceId 
      });
    } catch (error) {
      logger.error('Failed to log team member activity', { error, memberId, action });
      // Don't throw error for logging failures
    }
  }

  // Check if user has permission
  async checkUserPermission(
    userId: string,
    organizerId: string,
    permission: TeamPermission
  ): Promise<boolean> {
    try {
      const teamMember = await this.getTeamMemberById(userId);
      if (!teamMember || teamMember.organizerId !== organizerId) {
        return false;
      }

      return teamMember.permissions.includes(permission);
    } catch (error) {
      logger.error('Failed to check user permission', { error, userId, organizerId, permission });
      return false;
    }
  }

  // Get user's regional access
  async getUserRegionalAccess(
    userId: string,
    organizerId: string,
    country: string
  ): Promise<RegionalAccess[string] | null> {
    try {
      const teamMember = await this.getTeamMemberById(userId);
      if (!teamMember || teamMember.organizerId !== organizerId) {
        return null;
      }

      return teamMember.regionalAccess[country] || null;
    } catch (error) {
      logger.error('Failed to get user regional access', { error, userId, organizerId, country });
      return null;
    }
  }

  // Get team size
  private async getTeamSize(organizerId: string): Promise<number> {
    try {
      const teamMembers = await this.getTeamMembersByOrganizer(organizerId);
      return teamMembers.filter(member => member.isActive).length;
    } catch (error) {
      logger.error('Failed to get team size', { error, organizerId });
      return 0;
    }
  }

  // Check if user can invite team members
  private canInviteTeamMembers(settings: any): boolean {
    return settings.allowTeamCollaboration;
  }

  // Get access level from role
  private getAccessLevelFromRole(role: TeamRole): 'view' | 'edit' | 'admin' | 'owner' {
    switch (role) {
      case TeamRole.OWNER:
        return 'owner';
      case TeamRole.ADMIN:
        return 'admin';
      case TeamRole.MANAGER:
      case TeamRole.EDITOR:
        return 'edit';
      case TeamRole.VIEWER:
      case TeamRole.STAFF:
      default:
        return 'view';
    }
  }

  // Get default permissions for role
  getDefaultPermissionsForRole(role: TeamRole): TeamPermission[] {
    switch (role) {
      case TeamRole.OWNER:
        return Object.values(TeamPermission); // All permissions
      case TeamRole.ADMIN:
        return [
          TeamPermission.CREATE_EVENTS,
          TeamPermission.EDIT_EVENTS,
          TeamPermission.DELETE_EVENTS,
          TeamPermission.PUBLISH_EVENTS,
          TeamPermission.VIEW_ATTENDEES,
          TeamPermission.MANAGE_ATTENDEES,
          TeamPermission.VIEW_FINANCIALS,
          TeamPermission.SEND_EMAILS,
          TeamPermission.MANAGE_CAMPAIGNS,
          TeamPermission.INVITE_TEAM_MEMBERS,
          TeamPermission.MANAGE_ROLES,
          TeamPermission.VIEW_ANALYTICS,
          TeamPermission.EXPORT_REPORTS,
          TeamPermission.MANAGE_ORGANIZER_SETTINGS,
          TeamPermission.VIEW_SUPPORT_MESSAGES,
          TeamPermission.REPLY_TO_SUPPORT
        ];
      case TeamRole.MANAGER:
        return [
          TeamPermission.CREATE_EVENTS,
          TeamPermission.EDIT_EVENTS,
          TeamPermission.PUBLISH_EVENTS,
          TeamPermission.VIEW_ATTENDEES,
          TeamPermission.MANAGE_ATTENDEES,
          TeamPermission.VIEW_FINANCIALS,
          TeamPermission.SEND_EMAILS,
          TeamPermission.MANAGE_CAMPAIGNS,
          TeamPermission.VIEW_ANALYTICS,
          TeamPermission.EXPORT_REPORTS,
          TeamPermission.VIEW_SUPPORT_MESSAGES,
          TeamPermission.REPLY_TO_SUPPORT
        ];
      case TeamRole.EDITOR:
        return [
          TeamPermission.EDIT_EVENTS,
          TeamPermission.VIEW_ATTENDEES,
          TeamPermission.MANAGE_ATTENDEES,
          TeamPermission.SEND_EMAILS,
          TeamPermission.VIEW_ANALYTICS,
          TeamPermission.VIEW_SUPPORT_MESSAGES,
          TeamPermission.REPLY_TO_SUPPORT
        ];
      case TeamRole.VIEWER:
        return [
          TeamPermission.VIEW_ATTENDEES,
          TeamPermission.VIEW_ANALYTICS,
          TeamPermission.VIEW_SUPPORT_MESSAGES
        ];
      case TeamRole.STAFF:
        return [
          TeamPermission.VIEW_ATTENDEES,
          TeamPermission.CHECK_IN_ATTENDEES,
          TeamPermission.VIEW_SUPPORT_MESSAGES,
          TeamPermission.REPLY_TO_SUPPORT
        ];
      default:
        return [];
    }
  }

  // Get default regional access for role
  getDefaultRegionalAccessForRole(role: TeamRole): RegionalAccess {
    const defaultAccess = {
      events: false,
      finances: false,
      attendees: false,
      marketing: false,
      team: false,
      analytics: false,
      settings: false,
      support: false
    };

    switch (role) {
      case TeamRole.OWNER:
      case TeamRole.ADMIN:
        return {
          '*': { ...defaultAccess, events: true, finances: true, attendees: true, marketing: true, team: true, analytics: true, settings: true, support: true }
        };
      case TeamRole.MANAGER:
        return {
          '*': { ...defaultAccess, events: true, attendees: true, marketing: true, analytics: true, support: true }
        };
      case TeamRole.EDITOR:
        return {
          '*': { ...defaultAccess, events: true, attendees: true, marketing: true, analytics: true, support: true }
        };
      case TeamRole.VIEWER:
        return {
          '*': { ...defaultAccess, attendees: true, analytics: true, support: true }
        };
      case TeamRole.STAFF:
        return {
          '*': { ...defaultAccess, attendees: true, support: true }
        };
      default:
        return {};
    }
  }
}
