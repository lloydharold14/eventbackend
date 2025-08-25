import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { getUserById, updateUserProfile, listUsers } from '../../../../src/domains/users/handlers/userHandlers';
import { testUtils, testAuth, testPerf } from '../../../../src/shared/utils/testing';
import { ValidationError, NotFoundError } from '../../../../src/shared/errors/DomainError';

// Mock DynamoDB client
const mockDynamoClient = mockClient(DynamoDBDocumentClient);

describe('User Handlers Integration Tests', () => {
  beforeEach(() => {
    // Setup test environment
    testUtils.createTestEnvironment();
    
    // Reset mocks
    mockDynamoClient.reset();
    
    // Mock successful DynamoDB operations by default
    mockDynamoClient
      .on('GetCommand')
      .resolves({
        Item: testUtils.createTestUser(),
      })
      .on('PutCommand')
      .resolves({})
      .on('UpdateCommand')
      .resolves({
        Attributes: testUtils.createTestUser(),
      })
      .on('QueryCommand')
      .resolves({
        Items: [testUtils.createTestUser()],
        Count: 1,
        ScannedCount: 1,
      });
  });

  afterEach(() => {
    testUtils.cleanupTestEnvironment();
  });

  describe('getUserById', () => {
    it('should return user successfully', async () => {
      // Arrange
      const userId = 'test-user-id';
      const expectedUser = testUtils.createTestUser({ id: userId });
      
      mockDynamoClient.on('GetCommand').resolves({
        Item: expectedUser,
      });

      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        `/users/${userId}`,
        undefined,
        undefined,
        undefined,
        { userId }
      );

      // Add valid auth token
      const validToken = testAuth.createValidToken(userId);
      const authenticatedEvent = testAuth.addAuthHeader(event, validToken);

      // Act
      const response = await getUserById(authenticatedEvent);

      // Assert
      testUtils.assertAPIGatewayResponse(response, 200, {
        success: true,
        data: expectedUser,
      });
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user-id';
      
      mockDynamoClient.on('GetCommand').resolves({
        Item: undefined,
      });

      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        `/users/${userId}`,
        undefined,
        undefined,
        undefined,
        { userId }
      );

      const validToken = testAuth.createValidToken(userId);
      const authenticatedEvent = testAuth.addAuthHeader(event, validToken);

      // Act
      const response = await getUserById(authenticatedEvent);

      // Assert
      testUtils.assertErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('should return 401 when no authorization header', async () => {
      // Arrange
      const userId = 'test-user-id';
      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        `/users/${userId}`,
        undefined,
        undefined,
        undefined,
        { userId }
      );

      // Act
      const response = await getUserById(event);

      // Assert
      testUtils.assertErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('should return 401 when invalid token', async () => {
      // Arrange
      const userId = 'test-user-id';
      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        `/users/${userId}`,
        undefined,
        undefined,
        undefined,
        { userId }
      );

      const invalidToken = testAuth.createInvalidToken();
      const authenticatedEvent = testAuth.addAuthHeader(event, invalidToken);

      // Act
      const response = await getUserById(authenticatedEvent);

      // Assert
      testUtils.assertErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('should return 403 when accessing different user without admin role', async () => {
      // Arrange
      const userId = 'other-user-id';
      const requestingUserId = 'test-user-id';
      
      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        `/users/${userId}`,
        undefined,
        undefined,
        undefined,
        { userId }
      );

      const token = testAuth.createValidToken(requestingUserId, 'attendee');
      const authenticatedEvent = testAuth.addAuthHeader(event, token);

      // Act
      const response = await getUserById(authenticatedEvent);

      // Assert
      testUtils.assertErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should allow admin to access any user', async () => {
      // Arrange
      const userId = 'other-user-id';
      const adminUserId = 'admin-user-id';
      const expectedUser = testUtils.createTestUser({ id: userId });
      
      mockDynamoClient.on('GetCommand').resolves({
        Item: expectedUser,
      });

      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        `/users/${userId}`,
        undefined,
        undefined,
        undefined,
        { userId }
      );

      const adminToken = testAuth.createValidToken(adminUserId, 'admin');
      const authenticatedEvent = testAuth.addAuthHeader(event, adminToken);

      // Act
      const response = await getUserById(authenticatedEvent);

      // Assert
      testUtils.assertAPIGatewayResponse(response, 200, {
        success: true,
        data: expectedUser,
      });
    });

    it('should handle DynamoDB errors gracefully', async () => {
      // Arrange
      const userId = 'test-user-id';
      
      mockDynamoClient.on('GetCommand').rejects(new Error('DynamoDB connection failed'));

      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        `/users/${userId}`,
        undefined,
        undefined,
        undefined,
        { userId }
      );

      const validToken = testAuth.createValidToken(userId);
      const authenticatedEvent = testAuth.addAuthHeader(event, validToken);

      // Act
      const response = await getUserById(authenticatedEvent);

      // Assert
      testUtils.assertErrorResponse(response, 500, 'INTERNAL_SERVER_ERROR');
    });

    it('should meet performance requirements', async () => {
      // Arrange
      const userId = 'test-user-id';
      const expectedUser = testUtils.createTestUser({ id: userId });
      
      mockDynamoClient.on('GetCommand').resolves({
        Item: expectedUser,
      });

      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        `/users/${userId}`,
        undefined,
        undefined,
        undefined,
        { userId }
      );

      const validToken = testAuth.createValidToken(userId);
      const authenticatedEvent = testAuth.addAuthHeader(event, validToken);

      // Act
      const { result: response, duration } = await testPerf.measureExecutionTime(() =>
        getUserById(authenticatedEvent)
      );

      // Assert
      testUtils.assertAPIGatewayResponse(response, 200);
      testPerf.assertPerformanceThreshold(duration, 500); // Should complete within 500ms
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
      const updatedUser = testUtils.createTestUser({ id: userId, ...updateData });
      
      mockDynamoClient
        .on('GetCommand')
        .resolves({
          Item: testUtils.createTestUser({ id: userId }),
        })
        .on('UpdateCommand')
        .resolves({
          Attributes: updatedUser,
        });

      const event = testUtils.createMockAPIGatewayEvent(
        'PUT',
        `/users/${userId}/profile`,
        updateData,
        undefined,
        undefined,
        { userId }
      );

      const validToken = testAuth.createValidToken(userId);
      const authenticatedEvent = testAuth.addAuthHeader(event, validToken);

      // Act
      const response = await updateUserProfile(authenticatedEvent);

      // Assert
      testUtils.assertAPIGatewayResponse(response, 200, {
        success: true,
        data: updatedUser,
      });
    });

    it('should return 400 for invalid update data', async () => {
      // Arrange
      const userId = 'test-user-id';
      const invalidUpdateData = {
        email: 'invalid-email',
        phoneNumber: 'invalid-phone',
      };

      const event = testUtils.createMockAPIGatewayEvent(
        'PUT',
        `/users/${userId}/profile`,
        invalidUpdateData,
        undefined,
        undefined,
        { userId }
      );

      const validToken = testAuth.createValidToken(userId);
      const authenticatedEvent = testAuth.addAuthHeader(event, validToken);

      // Act
      const response = await updateUserProfile(authenticatedEvent);

      // Assert
      testUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user-id';
      const updateData = { firstName: 'Updated' };
      
      mockDynamoClient.on('GetCommand').resolves({
        Item: undefined,
      });

      const event = testUtils.createMockAPIGatewayEvent(
        'PUT',
        `/users/${userId}/profile`,
        updateData,
        undefined,
        undefined,
        { userId }
      );

      const validToken = testAuth.createValidToken(userId);
      const authenticatedEvent = testAuth.addAuthHeader(event, validToken);

      // Act
      const response = await updateUserProfile(authenticatedEvent);

      // Assert
      testUtils.assertErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('should return 403 when updating different user without admin role', async () => {
      // Arrange
      const userId = 'other-user-id';
      const requestingUserId = 'test-user-id';
      const updateData = { firstName: 'Updated' };

      const event = testUtils.createMockAPIGatewayEvent(
        'PUT',
        `/users/${userId}/profile`,
        updateData,
        undefined,
        undefined,
        { userId }
      );

      const token = testAuth.createValidToken(requestingUserId, 'attendee');
      const authenticatedEvent = testAuth.addAuthHeader(event, token);

      // Act
      const response = await updateUserProfile(authenticatedEvent);

      // Assert
      testUtils.assertErrorResponse(response, 403, 'FORBIDDEN');
    });
  });

  describe('listUsers', () => {
    it('should return paginated user list', async () => {
      // Arrange
      const filters = { role: 'attendee' };
      const page = 1;
      const pageSize = 10;
      const users = testUtils.generateUsers(5, { role: 'attendee' });
      
      mockDynamoClient.on('QueryCommand').resolves({
        Items: users,
        Count: 5,
        ScannedCount: 5,
      });

      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        '/users',
        undefined,
        undefined,
        { role: 'attendee', page: '1', pageSize: '10' }
      );

      const adminToken = testAuth.createValidToken('admin-user-id', 'admin');
      const authenticatedEvent = testAuth.addAuthHeader(event, adminToken);

      // Act
      const response = await listUsers(authenticatedEvent);

      // Assert
      testUtils.assertAPIGatewayResponse(response, 200, {
        success: true,
        data: {
          users: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              role: 'attendee',
            }),
          ]),
          totalCount: 5,
          page: 1,
          pageSize: 10,
        },
      });
    });

    it('should return 403 when non-admin tries to list users', async () => {
      // Arrange
      const event = testUtils.createMockAPIGatewayEvent('GET', '/users');

      const userToken = testAuth.createValidToken('user-id', 'attendee');
      const authenticatedEvent = testAuth.addAuthHeader(event, userToken);

      // Act
      const response = await listUsers(authenticatedEvent);

      // Assert
      testUtils.assertErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should handle empty results', async () => {
      // Arrange
      mockDynamoClient.on('QueryCommand').resolves({
        Items: [],
        Count: 0,
        ScannedCount: 0,
      });

      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        '/users',
        undefined,
        undefined,
        { role: 'admin' }
      );

      const adminToken = testAuth.createValidToken('admin-user-id', 'admin');
      const authenticatedEvent = testAuth.addAuthHeader(event, adminToken);

      // Act
      const response = await listUsers(authenticatedEvent);

      // Assert
      testUtils.assertAPIGatewayResponse(response, 200, {
        success: true,
        data: {
          users: [],
          totalCount: 0,
          page: 1,
          pageSize: 10,
        },
      });
    });
  });

  describe('Load Testing', () => {
    it('should handle concurrent user requests', async () => {
      // Arrange
      const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);
      const users = userIds.map(id => testUtils.createTestUser({ id }));
      
      mockDynamoClient.on('GetCommand').mockImplementation((params) => {
        const userId = params.Key?.id;
        const user = users.find(u => u.id === userId);
        return Promise.resolve({ Item: user });
      });

      // Act
      const { totalDuration, averageDuration, errors } = await testPerf.loadTest(
        async () => {
          const userId = userIds[Math.floor(Math.random() * userIds.length)];
          const event = testUtils.createMockAPIGatewayEvent(
            'GET',
            `/users/${userId}`,
            undefined,
            undefined,
            undefined,
            { userId }
          );
          const token = testAuth.createValidToken(userId);
          const authenticatedEvent = testAuth.addAuthHeader(event, token);
          
          return getUserById(authenticatedEvent);
        },
        5,  // concurrency
        20  // iterations
      );

      // Assert
      expect(errors).toBe(0);
      expect(averageDuration).toBeLessThan(200); // Should average less than 200ms
      expect(totalDuration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed request body', async () => {
      // Arrange
      const userId = 'test-user-id';
      const malformedBody = 'invalid-json';

      const event = testUtils.createMockAPIGatewayEvent(
        'PUT',
        `/users/${userId}/profile`,
        malformedBody,
        undefined,
        undefined,
        { userId }
      );

      const validToken = testAuth.createValidToken(userId);
      const authenticatedEvent = testAuth.addAuthHeader(event, validToken);

      // Act
      const response = await updateUserProfile(authenticatedEvent);

      // Assert
      testUtils.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should handle expired token', async () => {
      // Arrange
      const userId = 'test-user-id';
      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        `/users/${userId}`,
        undefined,
        undefined,
        undefined,
        { userId }
      );

      const expiredToken = testAuth.createExpiredToken();
      const authenticatedEvent = testAuth.addAuthHeader(event, expiredToken);

      // Act
      const response = await getUserById(authenticatedEvent);

      // Assert
      testUtils.assertErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('should handle DynamoDB throttling', async () => {
      // Arrange
      const userId = 'test-user-id';
      
      mockDynamoClient.on('GetCommand').rejects(new Error('ThrottlingException'));

      const event = testUtils.createMockAPIGatewayEvent(
        'GET',
        `/users/${userId}`,
        undefined,
        undefined,
        undefined,
        { userId }
      );

      const validToken = testAuth.createValidToken(userId);
      const authenticatedEvent = testAuth.addAuthHeader(event, validToken);

      // Act
      const response = await getUserById(authenticatedEvent);

      // Assert
      testUtils.assertErrorResponse(response, 429, 'THROTTLED');
    });
  });
});
