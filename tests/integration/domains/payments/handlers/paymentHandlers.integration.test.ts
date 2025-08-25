import { jest } from '@jest/globals';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createPaymentIntent, confirmPayment, getPaymentStatus, processRefund } from '../../../../src/domains/payments/handlers/paymentHandlers';
import { PaymentStatus, PaymentMethod, PaymentGateway, RefundReason } from '../../../../src/domains/payments/models/Payment';
import { testUtils, testAuth, testPerf, testData } from '../../../../src/shared/utils/testing';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

// Mock AWS SDK
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Payment Handlers Integration Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
    testUtils.resetMocks();
  });

  afterAll(() => {
    ddbMock.restore();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      // Arrange
      const requestBody = {
        bookingId: 'test-booking-id',
        userId: 'test-user-id',
        eventId: 'test-event-id',
        amount: 10000, // $100.00 in cents
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentGateway: PaymentGateway.STRIPE
      };

      const event = testUtils.createMockAPIGatewayEvent('POST', '/payments/intent', requestBody);
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      const mockPaymentIntent = testData.createTestPayment({
        id: 'test-payment-intent-id',
        bookingId: requestBody.bookingId,
        userId: requestBody.userId,
        eventId: requestBody.eventId,
        amount: requestBody.amount,
        currency: requestBody.currency,
        status: PaymentStatus.PENDING,
        paymentGateway: requestBody.paymentGateway,
        gatewayPaymentIntentId: 'pi_test_1234567890'
      });

      ddbMock.on(PutCommand).resolves({
        Attributes: mockPaymentIntent
      });

      // Act
      const { result, duration } = await testPerf.measureExecutionTime(() =>
        createPaymentIntent(event)
      );

      // Assert
      expect(result.statusCode).toBe(201);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.id).toBe('test-payment-intent-id');
      expect(responseBody.data.status).toBe(PaymentStatus.PENDING);
      expect(responseBody.data.gatewayPaymentIntentId).toBe('pi_test_1234567890');
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidRequestBody = {
        bookingId: '', // Invalid: empty booking ID
        userId: 'test-user-id',
        eventId: 'test-event-id',
        amount: -100, // Invalid: negative amount
        currency: 'USD'
      };

      const event = testUtils.createMockAPIGatewayEvent('POST', '/payments/intent', invalidRequestBody);
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      // Act
      const result = await createPaymentIntent(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle unauthorized access', async () => {
      // Arrange
      const requestBody = {
        bookingId: 'test-booking-id',
        userId: 'test-user-id',
        eventId: 'test-event-id',
        amount: 10000,
        currency: 'USD'
      };

      const event = testUtils.createMockAPIGatewayEvent('POST', '/payments/intent', requestBody);
      // No auth token provided

      // Act
      const result = await createPaymentIntent(event);

      // Assert
      expect(result.statusCode).toBe(401);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const requestBody = {
        bookingId: 'test-booking-id',
        userId: 'test-user-id',
        eventId: 'test-event-id',
        amount: 10000,
        currency: 'USD'
      };

      const event = testUtils.createMockAPIGatewayEvent('POST', '/payments/intent', requestBody);
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      ddbMock.on(PutCommand).rejects(new Error('Database connection failed'));

      // Act
      const result = await createPaymentIntent(event);

      // Assert
      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      // Arrange
      const paymentIntentId = 'test-payment-intent-id';
      const requestBody = {
        paymentMethodId: 'pm_test_1234567890',
        metadata: {
          source: 'mobile_app'
        }
      };

      const event = testUtils.createMockAPIGatewayEvent(
        'POST', 
        `/payments/intent/${paymentIntentId}/confirm`, 
        requestBody,
        {},
        { paymentIntentId }
      );
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      const mockPaymentIntent = testData.createTestPayment({
        id: paymentIntentId,
        status: PaymentStatus.PENDING,
        gatewayPaymentIntentId: 'pi_test_1234567890'
      });

      const mockPayment = testData.createTestPayment({
        id: 'test-payment-id',
        paymentIntentId,
        status: PaymentStatus.SUCCEEDED,
        gatewayPaymentId: 'ch_test_1234567890'
      });

      ddbMock.on(GetCommand).resolves({
        Item: mockPaymentIntent
      });

      ddbMock.on(PutCommand).resolves({
        Attributes: mockPayment
      });

      ddbMock.on(UpdateCommand).resolves({
        Attributes: { ...mockPaymentIntent, status: PaymentStatus.SUCCEEDED }
      });

      // Act
      const result = await confirmPayment(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.status).toBe(PaymentStatus.SUCCEEDED);
      expect(responseBody.data.gatewayPaymentId).toBe('ch_test_1234567890');
    });

    it('should handle payment intent not found', async () => {
      // Arrange
      const paymentIntentId = 'non-existent-payment-intent-id';
      const requestBody = {
        paymentMethodId: 'pm_test_1234567890'
      };

      const event = testUtils.createMockAPIGatewayEvent(
        'POST', 
        `/payments/intent/${paymentIntentId}/confirm`, 
        requestBody,
        {},
        { paymentIntentId }
      );
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      ddbMock.on(GetCommand).resolves({
        Item: null
      });

      // Act
      const result = await confirmPayment(event);

      // Assert
      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('PAYMENT_NOT_FOUND');
    });

    it('should handle payment gateway errors', async () => {
      // Arrange
      const paymentIntentId = 'test-payment-intent-id';
      const requestBody = {
        paymentMethodId: 'pm_test_invalid'
      };

      const event = testUtils.createMockAPIGatewayEvent(
        'POST', 
        `/payments/intent/${paymentIntentId}/confirm`, 
        requestBody,
        {},
        { paymentIntentId }
      );
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      const mockPaymentIntent = testData.createTestPayment({
        id: paymentIntentId,
        status: PaymentStatus.PENDING
      });

      ddbMock.on(GetCommand).resolves({
        Item: mockPaymentIntent
      });

      // Mock Stripe error response
      ddbMock.on(PutCommand).rejects(new Error('Payment method not found'));

      // Act
      const result = await confirmPayment(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('PAYMENT_GATEWAY_ERROR');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status successfully', async () => {
      // Arrange
      const paymentId = 'test-payment-id';
      const event = testUtils.createMockAPIGatewayEvent(
        'GET', 
        `/payments/${paymentId}/status`,
        undefined,
        {},
        { paymentId }
      );
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      const mockPayment = testData.createTestPayment({
        id: paymentId,
        status: PaymentStatus.SUCCEEDED,
        gatewayPaymentId: 'ch_test_1234567890'
      });

      ddbMock.on(GetCommand).resolves({
        Item: mockPayment
      });

      // Act
      const result = await getPaymentStatus(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.status).toBe(PaymentStatus.SUCCEEDED);
      expect(responseBody.data.id).toBe(paymentId);
    });

    it('should handle payment not found', async () => {
      // Arrange
      const paymentId = 'non-existent-payment-id';
      const event = testUtils.createMockAPIGatewayEvent(
        'GET', 
        `/payments/${paymentId}/status`,
        undefined,
        {},
        { paymentId }
      );
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      ddbMock.on(GetCommand).resolves({
        Item: null
      });

      // Act
      const result = await getPaymentStatus(event);

      // Assert
      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      // Arrange
      const paymentId = 'test-payment-id';
      const requestBody = {
        amount: 5000, // $50.00 refund
        reason: RefundReason.REQUESTED_BY_CUSTOMER,
        metadata: {
          refundReason: 'Customer requested refund'
        }
      };

      const event = testUtils.createMockAPIGatewayEvent(
        'POST', 
        `/payments/${paymentId}/refund`, 
        requestBody,
        {},
        { paymentId }
      );
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      const mockPayment = testData.createTestPayment({
        id: paymentId,
        status: PaymentStatus.SUCCEEDED,
        amount: 10000,
        gatewayPaymentId: 'ch_test_1234567890'
      });

      const mockRefund = testData.createTestPayment({
        id: 'test-refund-id',
        paymentId,
        amount: 5000,
        status: PaymentStatus.REFUNDED,
        gatewayRefundId: 're_test_1234567890'
      });

      ddbMock.on(GetCommand).resolves({
        Item: mockPayment
      });

      ddbMock.on(PutCommand).resolves({
        Attributes: mockRefund
      });

      ddbMock.on(UpdateCommand).resolves({
        Attributes: { ...mockPayment, status: PaymentStatus.REFUNDED }
      });

      // Act
      const result = await processRefund(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.status).toBe(PaymentStatus.REFUNDED);
      expect(responseBody.data.amount).toBe(5000);
      expect(responseBody.data.gatewayRefundId).toBe('re_test_1234567890');
    });

    it('should handle refund amount exceeding payment amount', async () => {
      // Arrange
      const paymentId = 'test-payment-id';
      const requestBody = {
        amount: 15000, // $150.00 refund (exceeds payment amount)
        reason: RefundReason.REQUESTED_BY_CUSTOMER
      };

      const event = testUtils.createMockAPIGatewayEvent(
        'POST', 
        `/payments/${paymentId}/refund`, 
        requestBody,
        {},
        { paymentId }
      );
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      const mockPayment = testData.createTestPayment({
        id: paymentId,
        status: PaymentStatus.SUCCEEDED,
        amount: 10000 // $100.00 payment
      });

      ddbMock.on(GetCommand).resolves({
        Item: mockPayment
      });

      // Act
      const result = await processRefund(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('PAYMENT_VALIDATION_ERROR');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent payment intent creation', async () => {
      // Arrange
      const requestBody = {
        bookingId: 'test-booking-id',
        userId: 'test-user-id',
        eventId: 'test-event-id',
        amount: 10000,
        currency: 'USD'
      };

      const event = testUtils.createMockAPIGatewayEvent('POST', '/payments/intent', requestBody);
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      const mockPaymentIntent = testData.createTestPayment({
        id: 'test-payment-intent-id',
        status: PaymentStatus.PENDING
      });

      ddbMock.on(PutCommand).resolves({
        Attributes: mockPaymentIntent
      });

      // Act
      const { totalDuration, averageDuration, errors } = await testPerf.loadTest(
        () => createPaymentIntent(event),
        5,  // concurrency
        20  // iterations
      );

      // Assert
      expect(errors).toBe(0);
      expect(averageDuration).toBeLessThan(1000); // Average should be under 1 second
      expect(totalDuration).toBeLessThan(5000); // Total should be under 5 seconds
    });

    it('should handle bulk payment status queries efficiently', async () => {
      // Arrange
      const paymentIds = Array.from({ length: 50 }, (_, i) => `payment-${i}`);
      const mockPayment = testData.createTestPayment({
        status: PaymentStatus.SUCCEEDED
      });

      ddbMock.on(GetCommand).resolves({
        Item: mockPayment
      });

      // Act
      const { totalDuration, averageDuration, errors } = await testPerf.loadTest(
        async () => {
          const paymentId = paymentIds[Math.floor(Math.random() * paymentIds.length)];
          const event = testUtils.createMockAPIGatewayEvent(
            'GET', 
            `/payments/${paymentId}/status`,
            undefined,
            {},
            { paymentId }
          );
          const authToken = testAuth.createValidToken('test-user-id', 'attendee');
          testAuth.addAuthHeader(event, authToken);
          return getPaymentStatus(event);
        },
        10, // concurrency
        50  // iterations
      );

      // Assert
      expect(errors).toBe(0);
      expect(averageDuration).toBeLessThan(500); // Average should be under 500ms
      expect(totalDuration).toBeLessThan(3000); // Total should be under 3 seconds
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle DynamoDB throttling with retry', async () => {
      // Arrange
      const requestBody = {
        bookingId: 'test-booking-id',
        userId: 'test-user-id',
        eventId: 'test-event-id',
        amount: 10000,
        currency: 'USD'
      };

      const event = testUtils.createMockAPIGatewayEvent('POST', '/payments/intent', requestBody);
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      // Mock throttling error first, then success
      ddbMock.on(PutCommand)
        .rejectsOnce(new Error('ThrottlingException'))
        .resolves({
          Attributes: testData.createTestPayment({ id: 'test-payment-intent-id' })
        });

      // Act
      const result = await createPaymentIntent(event);

      // Assert
      expect(result.statusCode).toBe(201);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(true);
    });

    it('should handle network timeouts gracefully', async () => {
      // Arrange
      const requestBody = {
        bookingId: 'test-booking-id',
        userId: 'test-user-id',
        eventId: 'test-event-id',
        amount: 10000,
        currency: 'USD'
      };

      const event = testUtils.createMockAPIGatewayEvent('POST', '/payments/intent', requestBody);
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      ddbMock.on(PutCommand).rejects(new Error('Request timeout'));

      // Act
      const result = await createPaymentIntent(event);

      // Assert
      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Security Tests', () => {
    it('should prevent access to other users payments', async () => {
      // Arrange
      const paymentId = 'test-payment-id';
      const event = testUtils.createMockAPIGatewayEvent(
        'GET', 
        `/payments/${paymentId}/status`,
        undefined,
        {},
        { paymentId }
      );
      const authToken = testAuth.createValidToken('different-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      const mockPayment = testData.createTestPayment({
        id: paymentId,
        userId: 'test-user-id', // Different user
        status: PaymentStatus.SUCCEEDED
      });

      ddbMock.on(GetCommand).resolves({
        Item: mockPayment
      });

      // Act
      const result = await getPaymentStatus(event);

      // Assert
      expect(result.statusCode).toBe(403);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('FORBIDDEN');
    });

    it('should validate payment gateway configuration', async () => {
      // Arrange
      const requestBody = {
        bookingId: 'test-booking-id',
        userId: 'test-user-id',
        eventId: 'test-event-id',
        amount: 10000,
        currency: 'INVALID_CURRENCY', // Invalid currency
        paymentGateway: PaymentGateway.STRIPE
      };

      const event = testUtils.createMockAPIGatewayEvent('POST', '/payments/intent', requestBody);
      const authToken = testAuth.createValidToken('test-user-id', 'attendee');
      testAuth.addAuthHeader(event, authToken);

      // Act
      const result = await createPaymentIntent(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('PAYMENT_VALIDATION_ERROR');
    });
  });
});
