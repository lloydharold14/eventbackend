import { User, UpdateUserRequest, UserSearchFilters, UserListResponse, EmailVerificationConfirmRequest, PhoneVerificationConfirmRequest } from '../models/User';
import { UserRepository } from '../repositories/UserRepository';
import { AuthService } from './AuthService';
import { UserRole, UserStatus } from '../../../shared/types/common';
import { logger } from '../../../shared/utils/logger';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../../shared/errors/DomainError';

export class UserService {
  private readonly userRepository: UserRepository;
  private readonly authService: AuthService;

  constructor(userRepository: UserRepository, authService: AuthService) {
    this.userRepository = userRepository;
    this.authService = authService;
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const user = await this.userRepository.getUserById(userId);
      
      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    } catch (error: any) {
      logger.error('Failed to get user by ID', { error: error.message, userId });
      throw error;
    }
  }

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

  async updateUserProfile(userId: string, updates: UpdateUserRequest): Promise<User> {
    try {
      // Validate updates
      this.validateProfileUpdates(updates);

      // Check if user exists and is active
      const existingUser = await this.userRepository.getUserById(userId);
      if (existingUser.status !== UserStatus.ACTIVE) {
        throw new ValidationError('Cannot update profile for inactive user');
      }

      // Update user
      const updatedUser = await this.userRepository.updateUser(userId, updates);
      
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

  async verifyPhone(userId: string, verificationData: PhoneVerificationConfirmRequest): Promise<void> {
    try {
      // TODO: Validate verification code
      // This would typically involve checking a code against a verification table
      // For now, we'll just mark the phone as verified
      
      await this.userRepository.verifyPhone(userId);
      
      // Update user status to active if this was the first verification
      const user = await this.userRepository.getUserById(userId);
      if (user.status === UserStatus.PENDING_VERIFICATION) {
        await this.userRepository.updateUser(userId, { status: UserStatus.ACTIVE });
      }
      
      logger.info('User phone verified successfully', { userId });
    } catch (error: any) {
      logger.error('Failed to verify user phone', { error: error.message, userId });
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
}
