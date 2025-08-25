import Stripe from 'stripe';
import { BasePaymentGateway } from './PaymentGatewayInterface';
import {
  PaymentGateway,
  PaymentGatewayConfig,
  PaymentGatewayResponse,
  CreatePaymentIntentRequest,
  ConfirmPaymentRequest,
  ProcessRefundRequest,
  PaymentMethod,
  PaymentGatewayEvent
} from '../models/Payment';

export class StripeGateway extends BasePaymentGateway {
  readonly gateway = PaymentGateway.STRIPE;
  readonly config: PaymentGatewayConfig;
  private stripe: Stripe;

  constructor(config: PaymentGatewayConfig) {
    super();
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentGatewayResponse> {
    try {
      this.validateRequest(request);

      const stripePaymentIntent = await this.stripe.paymentIntents.create({
        amount: this.formatAmount(request.amount, request.currency),
        currency: request.currency.toLowerCase(),
        metadata: {
          bookingId: request.bookingId,
          userId: request.userId,
          eventId: request.eventId,
          ...request.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        gatewayTransactionId: stripePaymentIntent.id,
        gatewayResponse: stripePaymentIntent,
      };
    } catch (error) {
      return {
        success: false,
        gatewayTransactionId: '',
        gatewayResponse: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentGatewayResponse> {
    try {
      const stripePaymentIntent = await this.stripe.paymentIntents.confirm(
        request.paymentIntentId,
        {
          payment_method: request.paymentMethodId,
        }
      );

      return {
        success: true,
        gatewayTransactionId: stripePaymentIntent.id,
        gatewayResponse: stripePaymentIntent,
      };
    } catch (error) {
      return {
        success: false,
        gatewayTransactionId: '',
        gatewayResponse: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async processRefund(request: ProcessRefundRequest): Promise<PaymentGatewayResponse> {
    try {
      const stripeRefund = await this.stripe.refunds.create({
        payment_intent: request.paymentId,
        amount: request.amount ? this.formatAmount(request.amount, 'USD') : undefined,
        reason: this.mapRefundReasonToStripeReason(request.reason),
        metadata: request.metadata,
      });

      return {
        success: true,
        gatewayTransactionId: stripeRefund.id,
        gatewayResponse: stripeRefund,
      };
    } catch (error) {
      return {
        success: false,
        gatewayTransactionId: '',
        gatewayResponse: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentGatewayResponse> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
      
      return {
        success: true,
        gatewayTransactionId: paymentIntent.id,
        gatewayResponse: paymentIntent,
      };
    } catch (error) {
      return {
        success: false,
        gatewayTransactionId: '',
        gatewayResponse: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getRefundStatus(refundId: string): Promise<PaymentGatewayResponse> {
    try {
      const refund = await this.stripe.refunds.retrieve(refundId);
      
      return {
        success: true,
        gatewayTransactionId: refund.id,
        gatewayResponse: refund,
      };
    } catch (error) {
      return {
        success: false,
        gatewayTransactionId: '',
        gatewayResponse: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async handleWebhook(event: PaymentGatewayEvent): Promise<PaymentGatewayResponse> {
    try {
      // Handle different webhook event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          return {
            success: true,
            gatewayTransactionId: event.data.object.id,
            gatewayResponse: event.data.object,
          };
        case 'payment_intent.payment_failed':
          return {
            success: true,
            gatewayTransactionId: event.data.object.id,
            gatewayResponse: event.data.object,
          };
        case 'charge.refunded':
          return {
            success: true,
            gatewayTransactionId: event.data.object.id,
            gatewayResponse: event.data.object,
          };
        default:
          return {
            success: true,
            gatewayTransactionId: event.id,
            gatewayResponse: event,
          };
      }
    } catch (error) {
      return {
        success: false,
        gatewayTransactionId: '',
        gatewayResponse: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
      if (!this.config.webhookSecret) {
        return false;
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
      
      return !!event;
    } catch (error) {
      return false;
    }
  }

  override getGatewayTransactionId(response: any): string {
    return response.id || '';
  }

  override getGatewayError(response: any): string | null {
    return response.error?.message || response.error || null;
  }

  private mapRefundReasonToStripeReason(reason: string): Stripe.RefundCreateParams.Reason {
    switch (reason) {
      case 'requested_by_customer':
        return 'requested_by_customer';
      case 'duplicate':
        return 'duplicate';
      case 'fraudulent':
        return 'fraudulent';
      default:
        return 'requested_by_customer';
    }
  }
}
