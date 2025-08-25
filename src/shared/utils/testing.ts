import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { Logger } from '@aws-lambda-powertools/logger';

// Test Configuration
export interface TestConfig {
  environment: string;
  logLevel: string;
  enableTracing: boolean;
  enableMetrics: boolean;
}

// Default test configuration
export const DEFAULT_TEST_CONFIG: TestConfig = {
  environment: 'test',
  logLevel: 'ERROR',
  enableTracing: false,
  enableMetrics: false,
};

// Test Utilities
export class TestUtils {
  private static mockDynamoClient: any;

  // Create mock API Gateway event
  static createMockAPIGatewayEvent(
    method: string = 'GET',
    path: string = '/test',
    body?: any,
    headers?: Record<string, string>,
    queryStringParameters?: Record<string, string>,
    pathParameters?: Record<string, string>
  ): APIGatewayProxyEvent {
    return {
      httpMethod: method,
      path,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'test-agent',
        ...headers,
      },
      multiValueHeaders: {},
      queryStringParameters: queryStringParameters || null,
      multiValueQueryStringParameters: null,
      pathParameters: pathParameters || null,
      stageVariables: null,
      requestContext: {
        accountId: 'test-account',
        apiId: 'test-api',
        authorizer: {},
        httpMethod: method,
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: '127.0.0.1',
          user: null,
          userAgent: null,
          userArn: null,
          clientCert: null,
        },
        path,
        protocol: 'HTTP/1.1',
        requestId: 'test-request-id',
        requestTime: '01/Jan/2024:00:00:00 +0000',
        requestTimeEpoch: Date.now(),
        resourceId: 'test-resource',
        resourcePath: path,
        stage: 'test',
      },
      resource: path,
      body: body ? JSON.stringify(body) : null,
      isBase64Encoded: false,
    };
  }

  // Create mock DynamoDB client
  static createMockDynamoClient(): any {
    if (!this.mockDynamoClient) {
      this.mockDynamoClient = mockClient(DynamoDBDocumentClient);
    }
    return this.mockDynamoClient;
  }

  // Reset all mocks
  static resetMocks(): void {
    if (this.mockDynamoClient) {
      this.mockDynamoClient.reset();
    }
  }

  // Create test user data
  static createTestUser(overrides: Partial<any> = {}): any {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'attendee',
      status: 'active',
      emailVerified: true,
      phoneVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        marketingEmails: false,
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
        privacySettings: {
          profileVisibility: 'public',
          showEmail: true,
          showPhone: false,
          showDateOfBirth: false,
          allowDirectMessages: true,
        },
      },
      ...overrides,
    };
  }

  // Create test event data
  static createTestEvent(overrides: Partial<any> = {}): any {
    return {
      id: 'test-event-id',
      title: 'Test Event',
      description: 'A test event for testing purposes',
      organizerId: 'test-organizer-id',
      organizerName: 'Test Organizer',
      organizerEmail: 'organizer@example.com',
      categoryId: 'test-category',
      categoryName: 'Test Category',
      type: 'conference',
      status: 'published',
      visibility: 'public',
      startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      endDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      timezone: 'UTC',
      isAllDay: false,
      location: {
        type: 'physical',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          postalCode: '12345',
        },
        venue: {
          name: 'Test Venue',
          description: 'A test venue',
          capacity: 100,
          amenities: ['WiFi', 'Parking'],
        },
      },
      maxAttendees: 100,
      currentAttendees: 0,
      pricing: {
        model: 'paid',
        currency: 'USD',
        basePrice: 50,
        tiers: [
          {
            name: 'General Admission',
            price: 50,
            description: 'General admission ticket',
            availableQuantity: 100,
          },
        ],
      },
      tags: ['test', 'conference'],
      keywords: ['test', 'event', 'conference'],
      settings: {
        allowWaitlist: true,
        allowCancellations: true,
        requireApproval: false,
        maxAttendeesPerBooking: 5,
        allowGroupBookings: true,
        requirePaymentConfirmation: true,
        sendReminders: true,
        allowSocialSharing: true,
        allowComments: true,
        requireModeration: false,
      },
      stats: {
        totalViews: 0,
        totalBookings: 0,
        totalRevenue: 0,
        totalReviews: 0,
        conversionRate: 0,
        attendanceRate: 0,
        lastUpdated: new Date().toISOString(),
      },
      slug: 'test-event',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  // Create test booking data
  static createTestBooking(overrides: Partial<any> = {}): any {
    return {
      id: 'test-booking-id',
      userId: 'test-user-id',
      eventId: 'test-event-id',
      organizerId: 'test-organizer-id',
      status: 'confirmed',
      items: [
        {
          id: 'test-item-id',
          eventId: 'test-event-id',
          ticketType: 'general',
          quantity: 2,
          unitPrice: 50,
          totalPrice: 100,
          currency: 'USD',
        },
      ],
      totalAmount: 100,
      currency: 'USD',
      paymentInfo: {
        paymentMethodId: 'test-payment-method',
        amount: 100,
        currency: 'USD',
        status: 'completed',
        processedAt: new Date().toISOString(),
      },
      attendeeInfo: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
      },
      bookingDate: new Date().toISOString(),
      eventDate: new Date(Date.now() + 86400000).toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  // Create test payment data
  static createTestPayment(overrides: Partial<any> = {}): any {
    return {
      id: 'test-payment-id',
      paymentIntentId: 'test-payment-intent-id',
      bookingId: 'test-booking-id',
      userId: 'test-user-id',
      eventId: 'test-event-id',
      amount: 100,
      currency: 'USD',
      status: 'succeeded',
      paymentMethod: 'credit_card',
      paymentGateway: 'stripe',
      gatewayPaymentId: 'pi_test_payment_id',
      receiptUrl: 'https://receipt.stripe.com/test',
      metadata: {
        bookingId: 'test-booking-id',
        eventId: 'test-event-id',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  // Mock DynamoDB responses
  static mockDynamoDBResponses(mockClient: any, responses: Record<string, any>): void {
    Object.entries(responses).forEach(([operation, response]) => {
      mockClient.on(operation).resolves(response);
    });
  }

  // Mock DynamoDB errors
  static mockDynamoDBErrors(mockClient: any, errors: Record<string, Error>): void {
    Object.entries(errors).forEach(([operation, error]) => {
      mockClient.on(operation).rejects(error);
    });
  }

  // Create test environment variables
  static createTestEnvironment(): void {
    process.env.ENVIRONMENT = 'test';
    process.env.AWS_REGION = 'us-east-1';
    process.env.SERVICE_NAME = 'test-service';
    process.env.LOG_LEVEL = 'ERROR';
    process.env.ENABLE_TRACING = 'false';
    process.env.ENABLE_METRICS = 'false';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
  }

  // Clean up test environment
  static cleanupTestEnvironment(): void {
    delete process.env.ENVIRONMENT;
    delete process.env.AWS_REGION;
    delete process.env.SERVICE_NAME;
    delete process.env.LOG_LEVEL;
    delete process.env.ENABLE_TRACING;
    delete process.env.ENABLE_METRICS;
    delete process.env.JWT_SECRET;
    delete process.env.ENCRYPTION_KEY;
  }

  // Assert API Gateway response
  static assertAPIGatewayResponse(
    response: APIGatewayProxyResult,
    expectedStatus: number,
    expectedBody?: any
  ): void {
    expect(response.statusCode).toBe(expectedStatus);
    expect(response.headers).toHaveProperty('Content-Type', 'application/json');
    
    if (expectedBody) {
      const body = JSON.parse(response.body || '{}');
      expect(body).toMatchObject(expectedBody);
    }
  }

  // Assert error response
  static assertErrorResponse(
    response: APIGatewayProxyResult,
    expectedStatus: number,
    expectedErrorCode?: string
  ): void {
    expect(response.statusCode).toBe(expectedStatus);
    expect(response.headers).toHaveProperty('Content-Type', 'application/json');
    
    const body = JSON.parse(response.body || '{}');
    expect(body).toHaveProperty('success', false);
    expect(body).toHaveProperty('error');
    
    if (expectedErrorCode) {
      expect(body.error).toHaveProperty('code', expectedErrorCode);
    }
  }

  // Wait for async operations
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate test correlation ID
  static generateCorrelationId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Test Database Helper
export class TestDatabaseHelper {
  private static mockClient: any;

  static getMockClient(): any {
    if (!this.mockClient) {
      this.mockClient = TestUtils.createMockDynamoClient();
    }
    return this.mockClient;
  }

  static resetMock(): void {
    if (this.mockClient) {
      this.mockClient.reset();
    }
  }

  // Mock successful DynamoDB operations
  static mockSuccessfulOperations(): void {
    const client = this.getMockClient();
    
    client
      .on('GetCommand')
      .resolves({
        Item: TestUtils.createTestUser(),
      })
      .on('PutCommand')
      .resolves({})
      .on('UpdateCommand')
      .resolves({
        Attributes: TestUtils.createTestUser(),
      })
      .on('DeleteCommand')
      .resolves({})
      .on('QueryCommand')
      .resolves({
        Items: [TestUtils.createTestUser()],
        Count: 1,
        ScannedCount: 1,
      })
      .on('ScanCommand')
      .resolves({
        Items: [TestUtils.createTestUser()],
        Count: 1,
        ScannedCount: 1,
      });
  }

  // Mock DynamoDB not found
  static mockNotFound(): void {
    const client = this.getMockClient();
    
    client
      .on('GetCommand')
      .resolves({
        Item: undefined,
      });
  }

  // Mock DynamoDB errors
  static mockErrors(): void {
    const client = this.getMockClient();
    
    client
      .on('GetCommand')
      .rejects(new Error('DynamoDB error'))
      .on('PutCommand')
      .rejects(new Error('DynamoDB error'))
      .on('UpdateCommand')
      .rejects(new Error('DynamoDB error'))
      .on('DeleteCommand')
      .rejects(new Error('DynamoDB error'))
      .on('QueryCommand')
      .rejects(new Error('DynamoDB error'))
      .on('ScanCommand')
      .rejects(new Error('DynamoDB error'));
  }
}

// Test Authentication Helper
export class TestAuthHelper {
  // Create valid JWT token
  static createValidToken(userId: string = 'test-user-id', role: string = 'attendee'): string {
    const payload = {
      userId,
      email: 'test@example.com',
      name: 'Test User',
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    // This is a mock token - in real tests, you'd use the actual JWT library
    return `mock-jwt-token.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
  }

  // Create expired JWT token
  static createExpiredToken(): string {
    const payload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'attendee',
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    };

    return `mock-jwt-token.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
  }

  // Create invalid JWT token
  static createInvalidToken(): string {
    return 'invalid.jwt.token';
  }

  // Add authorization header to event
  static addAuthHeader(event: APIGatewayProxyEvent, token: string): APIGatewayProxyEvent {
    return {
      ...event,
      headers: {
        ...event.headers,
        Authorization: `Bearer ${token}`,
      },
    };
  }
}

// Test Performance Helper
export class TestPerformanceHelper {
  // Measure execution time
  static async measureExecutionTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    
    return { result, duration };
  }

  // Assert performance threshold
  static assertPerformanceThreshold(duration: number, maxDuration: number): void {
    expect(duration).toBeLessThan(maxDuration);
  }

  // Load test helper
  static async loadTest(
    operation: () => Promise<any>,
    concurrency: number = 10,
    iterations: number = 100
  ): Promise<{ totalDuration: number; averageDuration: number; minDuration: number; maxDuration: number; errors: number }> {
    const startTime = Date.now();
    const durations: number[] = [];
    let errors = 0;

    const promises = Array.from({ length: iterations }, async () => {
      try {
        const { duration } = await this.measureExecutionTime(operation);
        durations.push(duration);
      } catch (error) {
        errors++;
      }
    });

    // Execute with concurrency limit
    for (let i = 0; i < promises.length; i += concurrency) {
      const batch = promises.slice(i, i + concurrency);
      await Promise.all(batch);
    }

    const totalDuration = Date.now() - startTime;
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      totalDuration,
      averageDuration,
      minDuration,
      maxDuration,
      errors,
    };
  }
}

// Test Data Factory
export class TestDataFactory {
  // Generate test users
  static generateUsers(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, (_, index) =>
      TestUtils.createTestUser({
        id: `test-user-${index}`,
        email: `test${index}@example.com`,
        username: `testuser${index}`,
        ...overrides,
      })
    );
  }

  // Generate test events
  static generateEvents(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, (_, index) =>
      TestUtils.createTestEvent({
        id: `test-event-${index}`,
        title: `Test Event ${index}`,
        slug: `test-event-${index}`,
        ...overrides,
      })
    );
  }

  // Generate test bookings
  static generateBookings(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, (_, index) =>
      TestUtils.createTestBooking({
        id: `test-booking-${index}`,
        ...overrides,
      })
    );
  }

  // Generate test payments
  static generatePayments(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, (_, index) =>
      TestUtils.createTestPayment({
        id: `test-payment-${index}`,
        ...overrides,
      })
    );
  }
}

// Test Configuration Manager
export class TestConfigManager {
  private static config: TestConfig = DEFAULT_TEST_CONFIG;

  static setConfig(config: Partial<TestConfig>): void {
    this.config = { ...this.config, ...config };
  }

  static getConfig(): TestConfig {
    return { ...this.config };
  }

  static resetConfig(): void {
    this.config = DEFAULT_TEST_CONFIG;
  }
}

// Export test utilities
export {
  TestUtils as testUtils,
  TestDatabaseHelper as testDB,
  TestAuthHelper as testAuth,
  TestPerformanceHelper as testPerf,
  TestDataFactory as testData,
  TestConfigManager as testConfig,
};
