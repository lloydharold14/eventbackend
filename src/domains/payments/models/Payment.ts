export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  DISPUTED = 'disputed',
  EXPIRED = 'expired'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTO = 'crypto'
}

export enum RefundStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum RefundReason {
  REQUESTED_BY_CUSTOMER = 'requested_by_customer',
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  PRODUCT_NOT_RECEIVED = 'product_not_received',
  PRODUCT_UNACCEPTABLE = 'product_unacceptable',
  INCORRECT_AMOUNT = 'incorrect_amount',
  GENERAL = 'general'
}

// Payment Gateway Abstraction
export enum PaymentGateway {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SQUARE = 'square',
  ADYEN = 'adyen',
  RAZORPAY = 'razorpay',
  PAYTM = 'paytm',
  ALIPAY = 'alipay',
  WECHAT_PAY = 'wechat_pay',
  MERCADO_PAGO = 'mercado_pago',
  PAGSEGURO = 'pagseguro'
}

export enum PaymentGatewayRegion {
  NORTH_AMERICA = 'north_america',
  EUROPE = 'europe',
  ASIA_PACIFIC = 'asia_pacific',
  LATIN_AMERICA = 'latin_america',
  AFRICA = 'africa',
  MIDDLE_EAST = 'middle_east'
}

export interface PaymentGatewayConfig {
  gateway: PaymentGateway;
  region: PaymentGatewayRegion;
  isActive: boolean;
  apiKey: string;
  secretKey: string;
  webhookSecret?: string;
  supportedCurrencies: string[];
  supportedPaymentMethods: PaymentMethod[];
  metadata?: Record<string, any>;
}

export interface PaymentGatewayResponse {
  success: boolean;
  gatewayTransactionId: string;
  gatewayResponse: any;
  error?: string;
}

export interface PaymentIntent {
  id: string;
  bookingId: string;
  userId: string;
  eventId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentGateway: PaymentGateway;
  gatewayPaymentIntentId?: string;
  gatewayClientSecret?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface Payment {
  id: string;
  paymentIntentId: string;
  bookingId: string;
  userId: string;
  eventId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentGateway: PaymentGateway;
  gatewayPaymentId: string;
  gatewayChargeId?: string;
  receiptUrl?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: RefundReason;
  paymentGateway: PaymentGateway;
  gatewayRefundId: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface PaymentMethodInfo {
  id: string;
  type: PaymentMethod;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: string;
}

export interface CreatePaymentIntentRequest {
  bookingId: string;
  userId: string;
  eventId: string;
  amount: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  paymentGateway?: PaymentGateway;
  metadata?: Record<string, string>;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId: string;
  metadata?: Record<string, string>;
}

export interface ProcessRefundRequest {
  paymentId: string;
  amount?: number;
  reason: RefundReason;
  metadata?: Record<string, string>;
}

export interface PaymentSearchFilters {
  userId?: string;
  bookingId?: string;
  eventId?: string;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentGateway?: PaymentGateway;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

export interface PaymentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaymentSearchResponse {
  payments: Payment[];
  pagination: PaymentPagination;
  filters: PaymentSearchFilters;
}

export interface PaymentGatewayEvent {
  id: string;
  object: string;
  api_version: string;
  created: number;
  data: {
    object: any;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string;
    idempotency_key: string;
  };
  type: string;
}

export interface PaymentError extends Error {
  code: string;
  statusCode: number;
  details?: any;
}

export class PaymentValidationError extends Error implements PaymentError {
  constructor(
    message: string,
    public code: string = 'PAYMENT_VALIDATION_ERROR',
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentValidationError';
  }
}

export class PaymentNotFoundError extends Error implements PaymentError {
  constructor(
    paymentId: string,
    public code: string = 'PAYMENT_NOT_FOUND',
    public statusCode: number = 404
  ) {
    super(`Payment with id ${paymentId} not found`);
    this.name = 'PaymentNotFoundError';
  }
}

export class PaymentProcessingError extends Error implements PaymentError {
  constructor(
    message: string,
    public code: string = 'PAYMENT_PROCESSING_ERROR',
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentProcessingError';
  }
}

export class PaymentGatewayError extends Error implements PaymentError {
  constructor(
    message: string,
    public gateway: PaymentGateway,
    public code: string = 'PAYMENT_GATEWAY_ERROR',
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}
