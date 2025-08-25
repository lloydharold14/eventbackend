import {
  PaymentGateway,
  PaymentGatewayConfig,
  PaymentGatewayResponse,
  CreatePaymentIntentRequest,
  ConfirmPaymentRequest,
  ProcessRefundRequest,
  Payment,
  Refund,
  PaymentGatewayEvent
} from '../models/Payment';

export interface IPaymentGateway {
  readonly gateway: PaymentGateway;
  readonly config: PaymentGatewayConfig;
  
  // Core payment operations
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentGatewayResponse>;
  confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentGatewayResponse>;
  processRefund(request: ProcessRefundRequest): Promise<PaymentGatewayResponse>;
  
  // Payment status operations
  getPaymentStatus(paymentId: string): Promise<PaymentGatewayResponse>;
  getRefundStatus(refundId: string): Promise<PaymentGatewayResponse>;
  
  // Webhook handling
  handleWebhook(event: PaymentGatewayEvent): Promise<PaymentGatewayResponse>;
  verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
  
  // Gateway-specific operations
  getSupportedCurrencies(): string[];
  getSupportedPaymentMethods(): string[];
  isCurrencySupported(currency: string): boolean;
  isPaymentMethodSupported(method: string): boolean;
  
  // Utility methods
  formatAmount(amount: number, currency: string): number;
  parseAmount(amount: number, currency: string): number;
  getGatewayTransactionId(response: any): string;
  getGatewayError(response: any): string | null;
}

export abstract class BasePaymentGateway implements IPaymentGateway {
  abstract readonly gateway: PaymentGateway;
  abstract readonly config: PaymentGatewayConfig;

  abstract createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentGatewayResponse>;
  abstract confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentGatewayResponse>;
  abstract processRefund(request: ProcessRefundRequest): Promise<PaymentGatewayResponse>;
  abstract getPaymentStatus(paymentId: string): Promise<PaymentGatewayResponse>;
  abstract getRefundStatus(refundId: string): Promise<PaymentGatewayResponse>;
  abstract handleWebhook(event: PaymentGatewayEvent): Promise<PaymentGatewayResponse>;
  abstract verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;

  getSupportedCurrencies(): string[] {
    return this.config.supportedCurrencies;
  }

  getSupportedPaymentMethods(): string[] {
    return this.config.supportedPaymentMethods.map(method => method.toString());
  }

  isCurrencySupported(currency: string): boolean {
    return this.config.supportedCurrencies.includes(currency.toUpperCase());
  }

  isPaymentMethodSupported(method: string): boolean {
    return this.config.supportedPaymentMethods.some(pm => pm.toString() === method);
  }

  formatAmount(amount: number, currency: string): number {
    // Default implementation - most gateways use cents/smallest currency unit
    return Math.round(amount * 100);
  }

  parseAmount(amount: number, currency: string): number {
    // Default implementation - convert from smallest currency unit
    return amount / 100;
  }

  getGatewayTransactionId(response: any): string {
    // Default implementation - should be overridden by specific gateways
    return response.id || response.transactionId || response.paymentId;
  }

  getGatewayError(response: any): string | null {
    // Default implementation - should be overridden by specific gateways
    return response.error?.message || response.error || null;
  }

  protected validateRequest(request: CreatePaymentIntentRequest): void {
    if (!request.bookingId) {
      throw new Error('Booking ID is required');
    }
    if (!request.userId) {
      throw new Error('User ID is required');
    }
    if (!request.eventId) {
      throw new Error('Event ID is required');
    }
    if (!request.amount || request.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!request.currency) {
      throw new Error('Currency is required');
    }
    if (!this.isCurrencySupported(request.currency)) {
      throw new Error(`Currency ${request.currency} is not supported by ${this.gateway}`);
    }
  }
}
