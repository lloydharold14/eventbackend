import { Logger } from '@aws-lambda-powertools/logger';
import { v4 as uuidv4 } from 'uuid';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { PaymentGatewayManager } from '../gateways/PaymentGatewayManager';
import {
  PaymentIntent,
  Payment,
  Refund,
  PaymentStatus,
  RefundStatus,
  PaymentMethod,
  RefundReason,
  CreatePaymentIntentRequest,
  ConfirmPaymentRequest,
  ProcessRefundRequest,
  PaymentSearchFilters,
  PaymentValidationError,
  PaymentNotFoundError,
  PaymentProcessingError,
  PaymentGatewayError,
  PaymentGateway,
} from '../models/Payment';

const logger = new Logger({ serviceName: 'payment-service' });

export class PaymentService {
  private gatewayManager: PaymentGatewayManager;
  private repository: PaymentRepository;

  constructor(paymentTableName: string) {
    this.gatewayManager = new PaymentGatewayManager();
    this.repository = new PaymentRepository(paymentTableName);
  }

  // Payment Intent Operations
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    try {
      logger.info('Creating payment intent', { request });

      // Validate request
      this.validateCreatePaymentIntentRequest(request);

      // Use gateway manager to create payment intent
      const gatewayResponse = await this.gatewayManager.createPaymentIntent(request);
      
      if (!gatewayResponse.success) {
        throw new PaymentGatewayError(
          gatewayResponse.error || 'Payment gateway error',
          PaymentGateway.STRIPE, // TODO: Get actual gateway from response
          'PAYMENT_GATEWAY_ERROR',
          400
        );
      }

      // Get the selected gateway
      const selectedGateway = this.gatewayManager.selectGateway(request);

      // Create payment intent record
      const paymentIntent: PaymentIntent = {
        id: uuidv4(),
        bookingId: request.bookingId,
        userId: request.userId,
        eventId: request.eventId,
        amount: request.amount,
        currency: request.currency,
        status: PaymentStatus.PENDING,
        paymentMethod: request.paymentMethod,
        paymentGateway: selectedGateway.gateway,
        gatewayPaymentIntentId: gatewayResponse.gatewayTransactionId,
        gatewayClientSecret: gatewayResponse.gatewayResponse?.client_secret || undefined,
        metadata: request.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      const createdPaymentIntent = await this.repository.createPaymentIntent(paymentIntent);

      logger.info('Payment intent created successfully', { 
        paymentIntentId: createdPaymentIntent.id,
        gatewayPaymentIntentId: gatewayResponse.gatewayTransactionId,
        gateway: selectedGateway.gateway
      });

      return createdPaymentIntent;
    } catch (error) {
      logger.error('Error creating payment intent', { error, request });
      if (error instanceof PaymentGatewayError) {
        throw error;
      }
      throw new PaymentGatewayError(
        error instanceof Error ? error.message : 'Unknown error',
        PaymentGateway.STRIPE, // TODO: Get actual gateway
        'PAYMENT_GATEWAY_ERROR',
        500
      );
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      logger.info('Getting payment intent', { paymentIntentId });

      const paymentIntent = await this.repository.getPaymentIntent(paymentIntentId);
      if (!paymentIntent) {
        throw new PaymentNotFoundError(paymentIntentId);
      }

      return paymentIntent;
    } catch (error) {
      logger.error('Error getting payment intent', { error, paymentIntentId });
      throw error;
    }
  }

  async confirmPayment(request: ConfirmPaymentRequest): Promise<Payment> {
    try {
      logger.info('Confirming payment', { request });

      // Validate request
      this.validateConfirmPaymentRequest(request);

      // Get payment intent
      const paymentIntent = await this.repository.getPaymentIntent(request.paymentIntentId);
      if (!paymentIntent) {
        throw new PaymentNotFoundError(request.paymentIntentId);
      }

      if (paymentIntent.status !== PaymentStatus.PENDING) {
        throw new PaymentValidationError(`Payment intent is not in pending status: ${paymentIntent.status}`);
      }

      // Use gateway manager to confirm payment
      const gatewayResponse = await this.gatewayManager.confirmPayment(request);
      
      if (!gatewayResponse.success) {
        throw new PaymentGatewayError(
          gatewayResponse.error || 'Payment gateway error',
          paymentIntent.paymentGateway,
          'PAYMENT_GATEWAY_ERROR',
          400
        );
      }

      // Create payment record
      const payment: Payment = {
        id: uuidv4(),
        paymentIntentId: paymentIntent.id,
        bookingId: paymentIntent.bookingId,
        userId: paymentIntent.userId,
        eventId: paymentIntent.eventId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: this.mapStripeStatusToPaymentStatus(gatewayResponse.gatewayResponse.status),
        paymentMethod: this.mapStripePaymentMethodToPaymentMethod(gatewayResponse.gatewayResponse.payment_method_types?.[0]),
        paymentGateway: paymentIntent.paymentGateway,
        gatewayPaymentId: gatewayResponse.gatewayTransactionId,
        gatewayChargeId: gatewayResponse.gatewayResponse.latest_charge as string,
        receiptUrl: gatewayResponse.gatewayResponse.latest_charge ? 
          gatewayResponse.gatewayResponse.receipt_url || undefined : undefined,
        metadata: request.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      };

      const createdPayment = await this.repository.createPayment(payment);

      // Update payment intent status
      await this.repository.updatePaymentIntent(paymentIntent.id, {
        status: payment.status,
        updatedAt: new Date().toISOString(),
      });

      logger.info('Payment confirmed successfully', { 
        paymentId: createdPayment.id,
        paymentIntentId: paymentIntent.id 
      });

      return createdPayment;
    } catch (error) {
      logger.error('Error confirming payment', { error, request });
      if (error instanceof PaymentGatewayError) {
        throw error;
      }
      throw new PaymentGatewayError(
        error instanceof Error ? error.message : 'Unknown error',
        PaymentGateway.STRIPE, // TODO: Get actual gateway
        'PAYMENT_GATEWAY_ERROR',
        500
      );
    }
  }

  // Payment Operations
  async getPayment(paymentId: string): Promise<Payment> {
    try {
      logger.info('Getting payment', { paymentId });

      const payment = await this.repository.getPayment(paymentId);
      if (!payment) {
        throw new PaymentNotFoundError(paymentId);
      }

      return payment;
    } catch (error) {
      logger.error('Error getting payment', { error, paymentId });
      throw error;
    }
  }

  async getUserPayments(userId: string, limit: number = 20, lastEvaluatedKey?: any): Promise<{ payments: Payment[]; lastEvaluatedKey?: any }> {
    try {
      logger.info('Getting user payments', { userId, limit });

      return await this.repository.getUserPayments(userId, limit, lastEvaluatedKey);
    } catch (error) {
      logger.error('Error getting user payments', { error, userId });
      throw error;
    }
  }

  async getBookingPayments(bookingId: string): Promise<Payment[]> {
    try {
      logger.info('Getting booking payments', { bookingId });

      return await this.repository.getBookingPayments(bookingId);
    } catch (error) {
      logger.error('Error getting booking payments', { error, bookingId });
      throw error;
    }
  }

  // Refund Operations
  async processRefund(request: ProcessRefundRequest): Promise<Refund> {
    try {
      logger.info('Processing refund', { request });

      // Validate request
      this.validateProcessRefundRequest(request);

      // Get payment
      const payment = await this.repository.getPayment(request.paymentId);
      if (!payment) {
        throw new PaymentNotFoundError(request.paymentId);
      }

      if (payment.status !== PaymentStatus.SUCCEEDED) {
        throw new PaymentValidationError(`Payment is not in succeeded status: ${payment.status}`);
      }

      // Check if payment is already refunded
      const existingRefunds = await this.repository.getBookingPayments(payment.bookingId);
      const totalRefunded = existingRefunds
        .filter(p => p.status === PaymentStatus.REFUNDED || p.status === PaymentStatus.PARTIALLY_REFUNDED)
        .reduce((sum, p) => sum + p.amount, 0);

      if (totalRefunded >= payment.amount) {
        throw new PaymentValidationError('Payment is already fully refunded');
      }

      const refundAmount = request.amount || payment.amount;

      // Use gateway manager to process refund
      const gatewayResponse = await this.gatewayManager.processRefund(request);
      
      if (!gatewayResponse.success) {
        throw new PaymentGatewayError(
          gatewayResponse.error || 'Payment gateway error',
          payment.paymentGateway,
          'PAYMENT_GATEWAY_ERROR',
          400
        );
      }

      // Create refund record
      const refund: Refund = {
        id: uuidv4(),
        paymentId: payment.id,
        bookingId: payment.bookingId,
        userId: payment.userId,
        amount: refundAmount,
        currency: payment.currency,
        status: this.mapStripeRefundStatusToRefundStatus(gatewayResponse.gatewayResponse.status || 'pending'),
        reason: request.reason,
        paymentGateway: payment.paymentGateway,
        gatewayRefundId: gatewayResponse.gatewayTransactionId,
        metadata: request.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      };

      const createdRefund = await this.repository.createRefund(refund);

      // Update payment status
      const newPaymentStatus = refundAmount >= payment.amount ? 
        PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
      
      await this.repository.updatePayment(payment.id, {
        status: newPaymentStatus,
        updatedAt: new Date().toISOString(),
      });

      logger.info('Refund processed successfully', { 
        refundId: createdRefund.id,
        paymentId: payment.id 
      });

      return createdRefund;
    } catch (error) {
      logger.error('Error processing refund', { error, request });
      if (error instanceof PaymentGatewayError) {
        throw error;
      }
      throw new PaymentGatewayError(
        error instanceof Error ? error.message : 'Unknown error',
        PaymentGateway.STRIPE, // TODO: Get actual gateway
        'PAYMENT_GATEWAY_ERROR',
        500
      );
    }
  }

  async getRefund(refundId: string): Promise<Refund> {
    try {
      logger.info('Getting refund', { refundId });

      const refund = await this.repository.getRefund(refundId);
      if (!refund) {
        throw new PaymentNotFoundError(refundId);
      }

      return refund;
    } catch (error) {
      logger.error('Error getting refund', { error, refundId });
      throw error;
    }
  }

  // Search Operations
  async searchPayments(filters: PaymentSearchFilters, page: number = 1, limit: number = 20) {
    try {
      logger.info('Searching payments', { filters, page, limit });

      return await this.repository.searchPayments(filters, page, limit);
    } catch (error) {
      logger.error('Error searching payments', { error, filters });
      throw error;
    }
  }

  // Webhook Operations
  async handleStripeWebhook(event: any): Promise<void> {
    try {
      logger.info('Handling Stripe webhook', { eventType: event.type });

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object);
          break;
        default:
          logger.info('Unhandled webhook event type', { eventType: event.type });
      }
    } catch (error) {
      logger.error('Error handling Stripe webhook', { error, event });
      throw error;
    }
  }

  // Private helper methods
  private validateCreatePaymentIntentRequest(request: CreatePaymentIntentRequest): void {
    if (!request.bookingId) {
      throw new PaymentValidationError('Booking ID is required');
    }
    if (!request.userId) {
      throw new PaymentValidationError('User ID is required');
    }
    if (!request.eventId) {
      throw new PaymentValidationError('Event ID is required');
    }
    if (!request.amount || request.amount <= 0) {
      throw new PaymentValidationError('Amount must be greater than 0');
    }
    if (!request.currency) {
      throw new PaymentValidationError('Currency is required');
    }
  }

  private validateConfirmPaymentRequest(request: ConfirmPaymentRequest): void {
    if (!request.paymentIntentId) {
      throw new PaymentValidationError('Payment intent ID is required');
    }
    if (!request.paymentMethodId) {
      throw new PaymentValidationError('Payment method ID is required');
    }
  }

  private validateProcessRefundRequest(request: ProcessRefundRequest): void {
    if (!request.paymentId) {
      throw new PaymentValidationError('Payment ID is required');
    }
    if (request.amount && request.amount <= 0) {
      throw new PaymentValidationError('Refund amount must be greater than 0');
    }
    if (!request.reason) {
      throw new PaymentValidationError('Refund reason is required');
    }
  }

  private mapStripeStatusToPaymentStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return PaymentStatus.PENDING;
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'succeeded':
        return PaymentStatus.SUCCEEDED;
      case 'canceled':
        return PaymentStatus.CANCELLED;
      default:
        return PaymentStatus.FAILED;
    }
  }

  private mapStripePaymentMethodToPaymentMethod(stripePaymentMethod: string): PaymentMethod {
    switch (stripePaymentMethod) {
      case 'card':
        return PaymentMethod.CREDIT_CARD;
      case 'bank_transfer':
        return PaymentMethod.BANK_TRANSFER;
      case 'wallet':
        return PaymentMethod.DIGITAL_WALLET;
      default:
        return PaymentMethod.CREDIT_CARD;
    }
  }

  private mapRefundReasonToStripeReason(reason: RefundReason): string {
    switch (reason) {
      case RefundReason.REQUESTED_BY_CUSTOMER:
        return 'requested_by_customer';
      case RefundReason.DUPLICATE:
        return 'duplicate';
      case RefundReason.FRAUDULENT:
        return 'fraudulent';
      default:
        return 'requested_by_customer';
    }
  }

  private mapStripeRefundStatusToRefundStatus(stripeStatus: string): RefundStatus {
    switch (stripeStatus) {
      case 'succeeded':
        return RefundStatus.SUCCEEDED;
      case 'failed':
        return RefundStatus.FAILED;
      case 'canceled':
        return RefundStatus.CANCELLED;
      default:
        return RefundStatus.PENDING;
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
    try {
      const existingPaymentIntent = await this.repository.getPaymentIntentByStripeId(paymentIntent.id);
      if (existingPaymentIntent) {
        await this.repository.updatePaymentIntent(existingPaymentIntent.id, {
          status: PaymentStatus.SUCCEEDED,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error handling payment intent succeeded', { error, paymentIntent });
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
    try {
      const existingPaymentIntent = await this.repository.getPaymentIntentByStripeId(paymentIntent.id);
      if (existingPaymentIntent) {
        await this.repository.updatePaymentIntent(existingPaymentIntent.id, {
          status: PaymentStatus.FAILED,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error handling payment intent failed', { error, paymentIntent });
    }
  }

  private async handleChargeRefunded(charge: any): Promise<void> {
    try {
      const payment = await this.repository.getPaymentByStripeId(charge.payment_intent);
      if (payment) {
        const refundAmount = charge.amount_refunded / 100; // Convert from cents
        const newStatus = refundAmount >= payment.amount ? 
          PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
        
        await this.repository.updatePayment(payment.id, {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error handling charge refunded', { error, charge });
    }
  }
}
