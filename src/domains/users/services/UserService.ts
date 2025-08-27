import { User, UpdateUserRequest, UserSearchFilters, UserListResponse, EmailVerificationConfirmRequest, PhoneVerificationConfirmRequest, UserRegistrationRequest } from '../models/User';
import { UserRepository } from '../repositories/UserRepository';
import { AuthService } from './AuthService';
import { UserRole, UserStatus } from '../../../shared/types/common';
import { logger } from '../../../shared/utils/logger';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../../shared/errors/DomainError';
import { DomainEvent, EventType, UserRegisteredEvent } from '../../../shared/types/events';
import { ComplianceService } from '../../../shared/compliance/RegionalCompliance';
import { LocalizationService } from '../../../shared/localization/LocalizationService';
import { EventBusFactory, EventBusConfigBuilder } from '../../../shared/events/EventBus';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  private readonly userRepository: UserRepository;
  private readonly authService: AuthService;
  private readonly complianceService: ComplianceService;
  private readonly localizationService: LocalizationService;
  private readonly eventBus: any; // Using any for now to avoid import issues

  constructor(
    userRepository: UserRepository,
    authService: AuthService,
    eventBus?: any
  ) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.complianceService = ComplianceService.getInstance();
    this.localizationService = LocalizationService.getInstance();
    this.eventBus = eventBus;
  }

  async createUser(userData: UserRegistrationRequest, requestContext?: any): Promise<User> {
    try {
      // Use the existing AuthService to register the user
      const user = await this.authService.registerUser(userData);

      // Detect user locale from request headers
      const locale = this.localizationService.detectLocale({
        headers: requestContext?.headers || {},
        country: requestContext?.country,
        userPreferences: {
          language: requestContext?.language
        }
      });

      // Update user preferences with localization
      await this.userRepository.updateUser(user.id, {
        preferences: {
          ...user.preferences,
          language: locale,
          currency: this.localizationService.getLocaleConfig(locale).currency,
          timezone: this.localizationService.getLocaleConfig(locale).timezone
        }
      });

      // Publish user registered event if event bus is available
      if (this.eventBus) {
        const userRegisteredEvent: UserRegisteredEvent = {
          eventId: uuidv4(),
          eventType: EventType.USER_REGISTERED,
          aggregateId: user.id,
          aggregateType: 'User',
          version: 1,
          timestamp: new Date(),
          correlationId: requestContext?.correlationId || uuidv4(),
          causationId: requestContext?.causationId || uuidv4(),
          data: {
            userId: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            createdAt: user.createdAt,
            preferences: {
              language: locale,
              timezone: this.localizationService.getLocaleConfig(locale).timezone,
              currency: this.localizationService.getLocaleConfig(locale).currency,
              marketingConsent: userData.marketingConsent || false
            }
          },
          metadata: {
            userId: user.id,
            region: requestContext?.country,
            locale,
            ipAddress: requestContext?.ipAddress,
            userAgent: requestContext?.userAgent
          }
        };

        await this.eventBus.publish(userRegisteredEvent);
      }

      logger.info('User created successfully with localization', {
        userId: user.id,
        email: user.email,
        locale
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userData: { email: userData.email }
      });
      throw error;
    }
  }

  // Enhanced user service methods with localization and compliance support
  // Additional methods can be added here as needed

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userRepository.getUserByEmail(email);
      if (!user) return null;
      
      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    } catch (error: any) {
      logger.error('Failed to get user by email', { error: error.message, email });
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await this.userRepository.getUserByUsername(username);
      if (!user) return null;
      
      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    } catch (error: any) {
      logger.error('Failed to get user by username', { error: error.message, username });
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }
      
      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get user by ID', { error: error.message, userId });
      throw error;
    }
  }

  async updateUser(userId: string, updates: UpdateUserRequest): Promise<User> {
    try {
      // Validate updates
      this.validateProfileUpdates(updates);

      // Check if user exists and is active
      const existingUser = await this.userRepository.getUserById(userId);
      if (!existingUser) {
        throw new NotFoundError('User', userId);
      }

      if (existingUser.status !== UserStatus.ACTIVE) {
        throw new ValidationError('Cannot update inactive user');
      }

      // Apply compliance validation if region is provided
      if (updates.address?.country) {
        const compliance = this.complianceService.getRegionalCompliance(updates.address.country);
        if (compliance) {
          // Log compliance information for organizers
          if (existingUser.role === UserRole.ORGANIZER) {
            logger.info('User update includes regional compliance check', {
              userId,
              region: updates.address.country,
              compliance: {
                businessRegistration: compliance.requirements.business.businessRegistration,
                languageRequirements: compliance.requirements.business.languageRequirements,
                taxRegistration: compliance.requirements.business.taxRegistration
              }
            });
          }
        }
      }

      // Convert UpdateUserRequest to Partial<User>
      const userUpdates: Partial<User> = { 
        ...updates,
        preferences: updates.preferences ? { ...existingUser.preferences, ...updates.preferences } : undefined
      };
      
      // Update user
      const updatedUser = await this.userRepository.updateUser(userId, userUpdates);
      
      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = updatedUser as any;
      
      logger.info('User updated successfully', { userId, updates: Object.keys(updates) });
      return userWithoutPassword;
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to update user', { error: error.message, userId });
      throw error;
    }
  }

  async searchUsers(filters: UserSearchFilters, page: number = 1, pageSize: number = 20): Promise<UserListResponse> {
    try {
      // Apply localization filters if provided
      const enhancedFilters = { ...filters };
      
      // If searching by region, apply compliance filtering
      if (filters.searchTerm && filters.searchTerm.length > 0) {
        // Enhanced search with localization support
        // This could be extended to search in multiple languages
        logger.info('Performing enhanced user search', { 
          searchTerm: filters.searchTerm, 
          page, 
          pageSize 
        });
      }

      const response = await this.userRepository.listUsers(enhancedFilters, page, pageSize);
      
      // Remove sensitive data from all users
      const usersWithoutPasswords = response.users.map(user => {
        const { passwordHash, ...userWithoutPassword } = user as any;
        return userWithoutPassword;
      });

      // Apply regional compliance filtering if needed
      const filteredUsers = usersWithoutPasswords.filter(user => {
        // Add any compliance-based filtering here
        return true; // For now, return all users
      });

      return {
        ...response,
        users: filteredUsers,
      };
    } catch (error: any) {
      logger.error('Failed to search users', { error: error.message, filters });
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: UpdateUserRequest): Promise<User> {
    try {
      // Validate updates
      this.validateProfileUpdates(updates);

      // Check if user exists and is active
      const existingUser = await this.userRepository.getUserById(userId);
      if (existingUser.status !== UserStatus.ACTIVE) {
        throw new ValidationError('Cannot update profile for inactive user');
      }

      // Convert UpdateUserRequest to Partial<User>
      const userUpdates: Partial<User> = { 
        ...updates,
        preferences: updates.preferences ? { ...existingUser.preferences, ...updates.preferences } : undefined
      };
      
      // Update user
      const updatedUser = await this.userRepository.updateUser(userId, userUpdates);
      
      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = updatedUser as any;
      
      logger.info('User profile updated successfully', { userId, updates: Object.keys(updates) });
      return userWithoutPassword;
    } catch (error: any) {
      logger.error('Failed to update user profile', { error: error.message, userId });
      throw error;
    }
  }

  async deleteUser(userId: string, requestingUserId: string, requestingUserRole: UserRole): Promise<void> {
    try {
      // Check permissions
      if (requestingUserId !== userId && requestingUserRole !== UserRole.ADMIN) {
        throw new UnauthorizedError('Insufficient permissions to delete this user');
      }

      // Check if user exists
      const user = await this.userRepository.getUserById(userId);
      
      // Prevent deletion of admin users by non-admin users
      if (user.role === UserRole.ADMIN && requestingUserRole !== UserRole.ADMIN) {
        throw new UnauthorizedError('Cannot delete admin user');
      }

      await this.userRepository.deleteUser(userId);
      logger.info('User deleted successfully', { userId, deletedBy: requestingUserId });
    } catch (error: any) {
      logger.error('Failed to delete user', { error: error.message, userId });
      throw error;
    }
  }

  async listUsers(filters: UserSearchFilters, page: number = 1, pageSize: number = 20): Promise<UserListResponse> {
    try {
      const response = await this.userRepository.listUsers(filters, page, pageSize);
      
      // Remove sensitive data from all users
      const usersWithoutPasswords = response.users.map(user => {
        const { passwordHash, ...userWithoutPassword } = user as any;
        return userWithoutPassword;
      });

      return {
        ...response,
        users: usersWithoutPasswords,
      };
    } catch (error: any) {
      logger.error('Failed to list users', { error: error.message, filters });
      throw error;
    }
  }

  async getUsersByRole(role: UserRole, page: number = 1, pageSize: number = 20): Promise<UserListResponse> {
    try {
      const response = await this.userRepository.getUsersByRole(role, page, pageSize);
      
      // Remove sensitive data from all users
      const usersWithoutPasswords = response.users.map(user => {
        const { passwordHash, ...userWithoutPassword } = user as any;
        return userWithoutPassword;
      });

      return {
        ...response,
        users: usersWithoutPasswords,
      };
    } catch (error: any) {
      logger.error('Failed to get users by role', { error: error.message, role });
      throw error;
    }
  }

  async verifyEmail(userId: string, verificationData: EmailVerificationConfirmRequest): Promise<void> {
    try {
      // TODO: Validate verification token
      // This would typically involve checking a token against a verification table
      // For now, we'll just mark the email as verified
      
      await this.userRepository.verifyEmail(userId);
      
      // Update user status to active if this was the first verification
      const user = await this.userRepository.getUserById(userId);
      if (user.status === UserStatus.PENDING_VERIFICATION) {
        await this.userRepository.updateUser(userId, { status: UserStatus.ACTIVE });
      }
      
      logger.info('User email verified successfully', { userId });
    } catch (error: any) {
      logger.error('Failed to verify user email', { error: error.message, userId });
      throw error;
    }
  }



  async changeUserRole(userId: string, newRole: UserRole, requestingUserId: string, requestingUserRole: UserRole): Promise<User> {
    try {
      // Check permissions
      if (requestingUserRole !== UserRole.ADMIN) {
        throw new UnauthorizedError('Only administrators can change user roles');
      }

      // Check if user exists
      const user = await this.userRepository.getUserById(userId);
      
      // Prevent changing admin roles
      if (user.role === UserRole.ADMIN && requestingUserId === userId) {
        throw new ValidationError('Cannot change your own admin role');
      }

      // Update role
      const updatedUser = await this.userRepository.updateUser(userId, { role: newRole });
      
      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = updatedUser as any;
      
      logger.info('User role changed successfully', { userId, oldRole: user.role, newRole, changedBy: requestingUserId });
      return userWithoutPassword;
    } catch (error: any) {
      logger.error('Failed to change user role', { error: error.message, userId, newRole });
      throw error;
    }
  }

  async updateUserStatus(userId: string, newStatus: UserStatus, requestingUserId: string, requestingUserRole: UserRole): Promise<User> {
    try {
      // Check permissions
      if (requestingUserRole !== UserRole.ADMIN) {
        throw new UnauthorizedError('Only administrators can change user status');
      }

      // Check if user exists
      const user = await this.userRepository.getUserById(userId);
      
      // Prevent changing admin status
      if (user.role === UserRole.ADMIN && requestingUserId === userId) {
        throw new ValidationError('Cannot change your own admin status');
      }

      // Update status
      const updatedUser = await this.userRepository.updateUser(userId, { status: newStatus });
      
      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = updatedUser as any;
      
      logger.info('User status changed successfully', { userId, oldStatus: user.status, newStatus, changedBy: requestingUserId });
      return userWithoutPassword;
    } catch (error: any) {
      logger.error('Failed to change user status', { error: error.message, userId, newStatus });
      throw error;
    }
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    pendingVerification: number;
    suspendedUsers: number;
    usersByRole: Record<UserRole, number>;
  }> {
    try {
      // Get all users for stats
      const allUsers = await this.userRepository.listUsers({}, 1, 1000);
      
      const stats = {
        totalUsers: allUsers.totalCount,
        activeUsers: 0,
        pendingVerification: 0,
        suspendedUsers: 0,
        usersByRole: {
          [UserRole.ADMIN]: 0,
          [UserRole.ORGANIZER]: 0,
          [UserRole.ATTENDEE]: 0,
        } as Record<UserRole, number>,
      };

      allUsers.users.forEach(user => {
        // Count by status
        switch (user.status) {
          case UserStatus.ACTIVE:
            stats.activeUsers++;
            break;
          case UserStatus.PENDING_VERIFICATION:
            stats.pendingVerification++;
            break;
          case UserStatus.SUSPENDED:
            stats.suspendedUsers++;
            break;
        }

        // Count by role
        stats.usersByRole[user.role]++;
      });

      return stats;
    } catch (error: any) {
      logger.error('Failed to get user stats', { error: error.message });
      throw error;
    }
  }

  private validateProfileUpdates(updates: UpdateUserRequest): void {
    // Validate email format if provided
    if (updates.firstName && updates.firstName.trim().length < 2) {
      throw new ValidationError('First name must be at least 2 characters long');
    }

    if (updates.lastName && updates.lastName.trim().length < 2) {
      throw new ValidationError('Last name must be at least 2 characters long');
    }

    if (updates.phoneNumber && !this.isValidPhoneNumber(updates.phoneNumber)) {
      throw new ValidationError('Invalid phone number format');
    }

    if (updates.dateOfBirth && !this.isValidDate(updates.dateOfBirth)) {
      throw new ValidationError('Invalid date of birth format');
    }

    if (updates.bio && updates.bio.length > 500) {
      throw new ValidationError('Bio cannot exceed 500 characters');
    }
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation - can be enhanced based on requirements
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phoneNumber);
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date <= new Date();
  }

  // Helper method to get localized error messages
  private async getLocalizedErrorMessage(errorKey: string, locale: string, interpolations?: Record<string, any>): Promise<string> {
    return await this.localizationService.getText(errorKey, locale, interpolations);
  }
}
