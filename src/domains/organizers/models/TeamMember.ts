import { BaseEntity } from '../../../shared/types/common';

// Team Member Roles
export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  STAFF = 'staff'
}

// Team Member Permissions
export enum TeamPermission {
  // Event Management
  CREATE_EVENTS = 'create_events',
  EDIT_EVENTS = 'edit_events',
  DELETE_EVENTS = 'delete_events',
  PUBLISH_EVENTS = 'publish_events',
  DUPLICATE_EVENTS = 'duplicate_events',
  
  // Attendee Management
  VIEW_ATTENDEES = 'view_attendees',
  MANAGE_ATTENDEES = 'manage_attendees',
  CHECK_IN_ATTENDEES = 'check_in_attendees',
  EXPORT_ATTENDEE_DATA = 'export_attendee_data',
  
  // Financial Management
  VIEW_FINANCIALS = 'view_financials',
  PROCESS_REFUNDS = 'process_refunds',
  EXPORT_FINANCIAL_REPORTS = 'export_financial_reports',
  MANAGE_PAYOUTS = 'manage_payouts',
  
  // Marketing & Communication
  SEND_EMAILS = 'send_emails',
  MANAGE_CAMPAIGNS = 'manage_campaigns',
  CREATE_EMAIL_TEMPLATES = 'create_email_templates',
  MANAGE_AUDIENCE_SEGMENTS = 'manage_audience_segments',
  
  // Team Management
  INVITE_TEAM_MEMBERS = 'invite_team_members',
  MANAGE_ROLES = 'manage_roles',
  REMOVE_TEAM_MEMBERS = 'remove_team_members',
  VIEW_TEAM_ACTIVITY = 'view_team_activity',
  
  // Analytics & Reporting
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_REPORTS = 'export_reports',
  VIEW_PERFORMANCE_METRICS = 'view_performance_metrics',
  
  // Settings & Configuration
  MANAGE_ORGANIZER_SETTINGS = 'manage_organizer_settings',
  MANAGE_INTEGRATIONS = 'manage_integrations',
  MANAGE_BILLING = 'manage_billing',
  MANAGE_SUBSCRIPTION = 'manage_subscription',
  
  // Customer Support
  VIEW_SUPPORT_MESSAGES = 'view_support_messages',
  REPLY_TO_SUPPORT = 'reply_to_support',
  MANAGE_AUTO_REPLIES = 'manage_auto_replies',
  RESOLVE_SUPPORT_TICKETS = 'resolve_support_tickets'
}

// Regional Access Control
export interface RegionalAccess {
  [country: string]: {
    events: boolean;
    finances: boolean;
    attendees: boolean;
    marketing: boolean;
    team: boolean;
    analytics: boolean;
    settings: boolean;
    support: boolean;
  };
}

// Team Member Activity
export interface TeamMemberActivity {
  id: string;
  memberId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country: string;
    region: string;
    city: string;
  };
}

// Team Member Performance Metrics
export interface TeamMemberPerformance {
  memberId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  
  // Event Management
  eventsCreated: number;
  eventsEdited: number;
  eventsPublished: number;
  
  // Attendee Management
  attendeesManaged: number;
  checkInsProcessed: number;
  supportTicketsResolved: number;
  
  // Marketing Activities
  campaignsCreated: number;
  emailsSent: number;
  templatesCreated: number;
  
  // Financial Activities
  refundsProcessed: number;
  reportsGenerated: number;
  
  // Team Collaboration
  teamMembersInvited: number;
  rolesManaged: number;
  
  // Performance Scores
  efficiencyScore: number;            // 0-100
  qualityScore: number;               // 0-100
  collaborationScore: number;         // 0-100
  overallScore: number;               // 0-100
}

// Team Member Invitation
export interface TeamMemberInvitation {
  id: string;
  organizerId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: TeamRole;
  permissions: TeamPermission[];
  regionalAccess: RegionalAccess;
  
  // Invitation Details
  invitedBy: string;                  // User ID of inviter
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  
  // Multi-Country Settings
  defaultCountry: string;
  defaultRegion: string;
  defaultTimezone: string;
  defaultLocale: string;
  
  // Custom Message
  customMessage?: string;
  
  // Tracking
  acceptedAt?: string;
  acceptedFrom?: {
    ipAddress: string;
    userAgent: string;
    location: {
      country: string;
      region: string;
      city: string;
    };
  };
}

// Main Team Member Interface
export interface TeamMember extends BaseEntity {
  id: string;
  organizerId: string;
  
  // Basic Information
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePictureUrl?: string;
  
  // Multi-Country Settings
  country: string;
  region: string;
  timezone: string;
  locale: string;
  
  // Role & Permissions
  role: TeamRole;
  permissions: TeamPermission[];
  accessLevel: 'view' | 'edit' | 'admin' | 'owner';
  
  // Regional Access Control
  regionalAccess: RegionalAccess;
  
  // Localization Preferences
  languagePreferences: string[];
  currencyPreferences: string[];
  dateFormatPreferences: string[];
  
  // Team Settings
  isActive: boolean;
  isVerified: boolean;
  lastActive: string;
  joinedAt: string;
  
  // Performance Tracking
  eventsManaged: number;
  actionsPerformed: number;
  lastActionAt?: string;
  
  // Communication Preferences
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  
  // Security Settings
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  loginHistory: Array<{
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    location: {
      country: string;
      region: string;
      city: string;
    };
    success: boolean;
  }>;
  
  // Metadata
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

// Create Team Member Request
export interface CreateTeamMemberRequest {
  organizerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: TeamRole;
  permissions: TeamPermission[];
  regionalAccess: RegionalAccess;
  country: string;
  region: string;
  timezone: string;
  locale: string;
  languagePreferences?: string[];
  currencyPreferences?: string[];
  notes?: string;
}

// Update Team Member Request
export interface UpdateTeamMemberRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: TeamRole;
  permissions?: TeamPermission[];
  regionalAccess?: RegionalAccess;
  country?: string;
  region?: string;
  timezone?: string;
  locale?: string;
  languagePreferences?: string[];
  currencyPreferences?: string[];
  isActive?: boolean;
  notes?: string;
}

// Team Member Search Filters
export interface TeamMemberSearchFilters {
  organizerId: string;
  role?: TeamRole;
  country?: string;
  region?: string;
  isActive?: boolean;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

// Team Member List Response
export interface TeamMemberListResponse {
  members: TeamMember[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Team Role Definition
export interface TeamRoleDefinition {
  id: string;
  organizerId: string;
  name: string;
  description: string;
  permissions: TeamPermission[];
  regionalAccess: RegionalAccess;
  isCustom: boolean;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

// Team Activity Log
export interface TeamActivityLog {
  id: string;
  organizerId: string;
  memberId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country: string;
    region: string;
    city: string;
  };
  metadata?: Record<string, any>;
}

// Team Performance Summary
export interface TeamPerformanceSummary {
  organizerId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  
  // Team Overview
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  departedMembers: number;
  
  // Performance Metrics
  averageEfficiencyScore: number;
  averageQualityScore: number;
  averageCollaborationScore: number;
  averageOverallScore: number;
  
  // Activity Metrics
  totalActions: number;
  eventsCreated: number;
  attendeesManaged: number;
  campaignsLaunched: number;
  supportTicketsResolved: number;
  
  // Regional Performance
  regionalPerformance: Array<{
    country: string;
    region: string;
    memberCount: number;
    averageScore: number;
    totalActions: number;
  }>;
  
  // Top Performers
  topPerformers: Array<{
    memberId: string;
    firstName: string;
    lastName: string;
    role: TeamRole;
    overallScore: number;
    totalActions: number;
  }>;
}
