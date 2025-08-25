import { UserService } from '../../../../src/domains/users/services/UserService';
import { UserRepository } from '../../../../src/domains/users/repositories/UserRepository';
import { AuthService } from '../../../../src/domains/users/services/AuthService';
import { testUtils, testDB, testAuth, testPerf } from '../../../../src/shared/utils/testing';
import { ValidationError, NotFoundError } from '../../../../src/shared/errors/DomainError';

// Mock dependencies
jest.mock('../../../../src/domains/users/repositories/UserRepository');
jest.mock('../../../../src/domains/users/services/AuthService');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    // Setup test environment
    testUtils.createTestEnvironment();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockUserRepository = new UserRepository('us-east-1', 'test-users-table') as jest.Mocked<UserRepository>;
    mockAuthService = new AuthService(mockUserRepository, 'test-jwt-secret') as jest.Mocked<AuthService>;
    
    // Create service instance
    userService = new UserService(mockUserRepository, mockAuthService);
  });

  afterEach(() => {
    testUtils.cleanupTestEnvironment();
    testUtils.resetMocks();
  });

  describe('getUserById', () => {
    it('should return user when user exists', async () => {
      // Arrange
      const userId = 'test-user-id';
      const expectedUser = testUtils.createTestUser({ id: userId });
      
      mockUserRepository.getUserById.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.getUserById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.getUserById).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      const userId = 'non-existent-user-id';
      
      mockUserRepository.getUserById.mockRejectedValue(new NotFoundError('User', userId));

      // Act & Assert
      await expect(userService.getUserById(userId)).rejects.toThrow(NotFoundError);
      expect(mockUserRepository.getUserById).toHaveBeenCalledWith(userId);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const userId = 'test-user-id';
      const error = new Error('Database connection failed');
      
      mockUserRepository.getUserById.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.getUserById(userId)).rejects.toThrow('Database connection failed');
    });

    it('should meet performance requirements', async () => {
      // Arrange
      const userId = 'test-user-id';
      const expectedUser = testUtils.createTestUser({ id: userId });
      
      mockUserRepository.getUserById.mockResolvedValue(expectedUser);

      // Act
      const { result, duration } = await testPerf.measureExecutionTime(() =>
        userService.getUserById(userId)
      );

      // Assert
      expect(result).toEqual(expectedUser);
      testPerf.assertPerformanceThreshold(duration, 100); // Should complete within 100ms
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when email exists', async () => {
      // Arrange
      const email = 'test@example.com';
      const expectedUser = testUtils.createTestUser({ email });
      
      mockUserRepository.getUserByEmail.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.getUserByEmail).toHaveBeenCalledWith(email);
    });

    it('should return null when email does not exist', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      
      mockUserRepository.getUserByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(result).toBeNull();
      expect(mockUserRepository.getUserByEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      const userId = 'test-user-id';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+1234567890',
      };
      const existingUser = testUtils.createTestUser({ id: userId });
      const updatedUser = { ...existingUser, ...updateData };
      
      mockUserRepository.getUserById.mockResolvedValue(existingUser);
      mockUserRepository.updateUser.mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUserProfile(userId, updateData);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(userId, updateData);
    });

    it('should validate phone number format', async () => {
      // Arrange
      const userId = 'test-user-id';
      const updateData = {
        phoneNumber: 'invalid-phone',
      };
      const existingUser = testUtils.createTestUser({ id: userId });
      
      mockUserRepository.getUserById.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.updateUserProfile(userId, updateData)).rejects.toThrow(ValidationError);
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it('should validate date format', async () => {
      // Arrange
      const userId = 'test-user-id';
      const updateData = {
        dateOfBirth: 'invalid-date',
      };
      const existingUser = testUtils.createTestUser({ id: userId });
      
      mockUserRepository.getUserById.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.updateUserProfile(userId, updateData)).rejects.toThrow(ValidationError);
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      const userId = 'non-existent-user-id';
      const updateData = { firstName: 'Updated' };
      
      mockUserRepository.getUserById.mockRejectedValue(new NotFoundError('User', userId));

      // Act & Assert
      await expect(userService.updateUserProfile(userId, updateData)).rejects.toThrow(NotFoundError);
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('should return paginated user list', async () => {
      // Arrange
      const filters = { role: 'attendee' };
      const page = 1;
      const pageSize = 10;
      const expectedResponse = {
        users: testUtils.generateUsers(5),
        totalCount: 25,
        page: 1,
        pageSize: 10,
        hasNextPage: true,
        hasPreviousPage: false,
      };
      
      mockUserRepository.listUsers.mockResolvedValue(expectedResponse);

      // Act
      const result = await userService.listUsers(filters, page, pageSize);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockUserRepository.listUsers).toHaveBeenCalledWith(filters, page, pageSize);
    });

    it('should handle empty results', async () => {
      // Arrange
      const filters = { role: 'admin' };
      const expectedResponse = {
        users: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      
      mockUserRepository.listUsers.mockResolvedValue(expectedResponse);

      // Act
      const result = await userService.listUsers(filters);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.users).toHaveLength(0);
    });
  });

  describe('getUsersByRole', () => {
    it('should return users filtered by role', async () => {
      // Arrange
      const role = 'organizer';
      const page = 1;
      const pageSize = 20;
      const expectedResponse = {
        users: testUtils.generateUsers(3, { role }),
        totalCount: 3,
        page: 1,
        pageSize: 20,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      
      mockUserRepository.getUsersByRole.mockResolvedValue(expectedResponse);

      // Act
      const result = await userService.getUsersByRole(role, page, pageSize);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockUserRepository.getUsersByRole).toHaveBeenCalledWith(role, page, pageSize);
      expect(result.users.every(user => user.role === role)).toBe(true);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      // Arrange
      const userId = 'test-user-id';
      const verificationData = { token: 'valid-token' };
      const existingUser = testUtils.createTestUser({ id: userId, emailVerified: false });
      
      mockUserRepository.getUserById.mockResolvedValue(existingUser);
      mockUserRepository.verifyEmail.mockResolvedValue();

      // Act
      await userService.verifyEmail(userId, verificationData);

      // Assert
      expect(mockUserRepository.verifyEmail).toHaveBeenCalledWith(userId, verificationData);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user-id';
      const verificationData = { token: 'valid-token' };
      
      mockUserRepository.getUserById.mockRejectedValue(new NotFoundError('User', userId));

      // Act & Assert
      await expect(userService.verifyEmail(userId, verificationData)).rejects.toThrow(NotFoundError);
      expect(mockUserRepository.verifyEmail).not.toHaveBeenCalled();
    });
  });

  describe('verifyPhone', () => {
    it('should verify phone successfully', async () => {
      // Arrange
      const userId = 'test-user-id';
      const verificationData = { phoneNumber: '+1234567890', code: '123456' };
      const existingUser = testUtils.createTestUser({ id: userId, phoneVerified: false });
      
      mockUserRepository.getUserById.mockResolvedValue(existingUser);
      mockUserRepository.verifyPhone.mockResolvedValue();

      // Act
      await userService.verifyPhone(userId, verificationData);

      // Assert
      expect(mockUserRepository.verifyPhone).toHaveBeenCalledWith(userId, verificationData);
    });
  });

  describe('changeUserRole', () => {
    it('should change user role successfully', async () => {
      // Arrange
      const userId = 'test-user-id';
      const newRole = 'organizer';
      const requestingUserId = 'admin-user-id';
      const requestingUserRole = 'admin';
      const existingUser = testUtils.createTestUser({ id: userId, role: 'attendee' });
      const updatedUser = { ...existingUser, role: newRole };
      
      mockUserRepository.getUserById.mockResolvedValue(existingUser);
      mockUserRepository.updateUser.mockResolvedValue(updatedUser);

      // Act
      const result = await userService.changeUserRole(userId, newRole, requestingUserId, requestingUserRole);

      // Assert
      expect(result.role).toBe(newRole);
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(userId, { role: newRole });
    });

    it('should throw error when requesting user is not admin', async () => {
      // Arrange
      const userId = 'test-user-id';
      const newRole = 'organizer';
      const requestingUserId = 'regular-user-id';
      const requestingUserRole = 'attendee';

      // Act & Assert
      await expect(
        userService.changeUserRole(userId, newRole, requestingUserId, requestingUserRole)
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should throw error when trying to change admin role', async () => {
      // Arrange
      const userId = 'admin-user-id';
      const newRole = 'attendee';
      const requestingUserId = 'another-admin-id';
      const requestingUserRole = 'admin';
      const existingUser = testUtils.createTestUser({ id: userId, role: 'admin' });
      
      mockUserRepository.getUserById.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(
        userService.changeUserRole(userId, newRole, requestingUserId, requestingUserRole)
      ).rejects.toThrow('Cannot change admin role');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      // Arrange
      const mockStats = {
        totalUsers: 100,
        activeUsers: 85,
        pendingVerification: 10,
        suspendedUsers: 5,
        usersByRole: {
          attendee: 70,
          organizer: 25,
          admin: 5,
        },
      };

      // Mock repository methods
      mockUserRepository.listUsers.mockResolvedValue({
        users: testUtils.generateUsers(100),
        totalCount: 100,
        page: 1,
        pageSize: 100,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      // Act
      const result = await userService.getUserStats();

      // Assert
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('pendingVerification');
      expect(result).toHaveProperty('suspendedUsers');
      expect(result).toHaveProperty('usersByRole');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors properly', async () => {
      // Arrange
      const userId = 'test-user-id';
      const invalidUpdateData = {
        email: 'invalid-email',
        phoneNumber: 'invalid-phone',
      };

      // Act & Assert
      await expect(userService.updateUserProfile(userId, invalidUpdateData)).rejects.toThrow(ValidationError);
    });

    it('should handle database connection errors', async () => {
      // Arrange
      const userId = 'test-user-id';
      const dbError = new Error('Database connection timeout');
      
      mockUserRepository.getUserById.mockRejectedValue(dbError);

      // Act & Assert
      await expect(userService.getUserById(userId)).rejects.toThrow('Database connection timeout');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent user lookups', async () => {
      // Arrange
      const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);
      const users = userIds.map(id => testUtils.createTestUser({ id }));
      
      mockUserRepository.getUserById.mockImplementation((id) => {
        const user = users.find(u => u.id === id);
        return Promise.resolve(user!);
      });

      // Act
      const { totalDuration, averageDuration, errors } = await testPerf.loadTest(
        () => userService.getUserById(userIds[Math.floor(Math.random() * userIds.length)]),
        5, // concurrency
        20  // iterations
      );

      // Assert
      expect(errors).toBe(0);
      expect(averageDuration).toBeLessThan(50); // Should average less than 50ms
      expect(totalDuration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
