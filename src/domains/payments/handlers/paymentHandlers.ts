import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { PaymentService } from '../services/PaymentService';
import {
  CreatePaymentIntentRequest,
  ConfirmPaymentRequest,
  ProcessRefundRequest,
  PaymentSearchFilters,
  PaymentValidationError,
  PaymentNotFoundError,
  PaymentProcessingError,
  StripeError,
} from '../models/Payment';

const logger = new Logger({ serviceName: 'payment-handlers' });

// Initialize payment service
const paymentService = new PaymentService(process.env.PAYMENT_TABLE_NAME!);

// Response helper functions
const formatSuccessResponse = (data: any, statusCode: number = 200): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  },
  body: JSON.stringify({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }),
});

const formatErrorResponse = (error: Error, statusCode: number = 500): APIGatewayProxyResult => {
  logger.error('Payment handler error', { error: error.message, stack: error.stack });

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify({
      success: false,
      error: {
        message: error.message,
        code: (error as any).code || 'INTERNAL_ERROR',
        statusCode,
      },
      timestamp: new Date().toISOString(),
    }),
  };
};

// Health Check Handler
export const healthCheck = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Payment service health check', { event });

    const healthStatus = {
      status: 'healthy',
      service: 'payment-service',
      timestamp: new Date().toISOString(),
      environment: process.env.ENVIRONMENT || 'dev',
      version: '1.0.0',
      uptime: process.uptime(),
    };

    return formatSuccessResponse(healthStatus);
  } catch (error) {
    logger.error('Health check failed', { error });
    return formatErrorResponse(error as Error, 503);
  }
};

// Create Payment Intent Handler
export const createPaymentIntent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Creating payment intent', { event });

    if (!event.body) {
      throw new PaymentValidationError('Request body is required');
    }

    const request: CreatePaymentIntentRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.bookingId || !request.userId || !request.eventId || !request.amount || !request.currency) {
      throw new PaymentValidationError('Missing required fields: bookingId, userId, eventId, amount, currency');
    }

    const paymentIntent = await paymentService.createPaymentIntent(request);

    logger.info('Payment intent created successfully', { paymentIntentId: paymentIntent.id });

    return formatSuccessResponse({ paymentIntent }, 201);
  } catch (error) {
    if (error instanceof PaymentValidationError) {
      return formatErrorResponse(error, 400);
    }
    if (error instanceof StripeError) {
      return formatErrorResponse(error, 400);
    }
    return formatErrorResponse(error as Error);
  }
};

// Get Payment Intent Handler
export const getPaymentIntent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const paymentIntentId = event.pathParameters?.paymentIntentId;
    if (!paymentIntentId) {
      throw new PaymentValidationError('Payment intent ID is required');
    }

    logger.info('Getting payment intent', { paymentIntentId });

    const paymentIntent = await paymentService.getPaymentIntent(paymentIntentId);

    return formatSuccessResponse({ paymentIntent });
  } catch (error) {
    if (error instanceof PaymentValidationError) {
      return formatErrorResponse(error, 400);
    }
    if (error instanceof PaymentNotFoundError) {
      return formatErrorResponse(error, 404);
    }
    return formatErrorResponse(error as Error);
  }
};

// Confirm Payment Handler
export const confirmPayment = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Confirming payment', { event });

    if (!event.body) {
      throw new PaymentValidationError('Request body is required');
    }

    const request: ConfirmPaymentRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.paymentIntentId || !request.paymentMethodId) {
      throw new PaymentValidationError('Missing required fields: paymentIntentId, paymentMethodId');
    }

    const payment = await paymentService.confirmPayment(request);

    logger.info('Payment confirmed successfully', { paymentId: payment.id });

    return formatSuccessResponse({ payment }, 201);
  } catch (error) {
    if (error instanceof PaymentValidationError) {
      return formatErrorResponse(error, 400);
    }
    if (error instanceof PaymentNotFoundError) {
      return formatErrorResponse(error, 404);
    }
    if (error instanceof StripeError) {
      return formatErrorResponse(error, 400);
    }
    return formatErrorResponse(error as Error);
  }
};

// Get Payment Status Handler
export const getPaymentStatus = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const paymentId = event.pathParameters?.paymentId;
    if (!paymentId) {
      throw new PaymentValidationError('Payment ID is required');
    }

    logger.info('Getting payment status', { paymentId });

    const payment = await paymentService.getPayment(paymentId);

    return formatSuccessResponse({ payment });
  } catch (error) {
    if (error instanceof PaymentValidationError) {
      return formatErrorResponse(error, 400);
    }
    if (error instanceof PaymentNotFoundError) {
      return formatErrorResponse(error, 404);
    }
    return formatErrorResponse(error as Error);
  }
};

// Process Refund Handler
export const processRefund = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Processing refund', { event });

    if (!event.body) {
      throw new PaymentValidationError('Request body is required');
    }

    const request: ProcessRefundRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.paymentId || !request.reason) {
      throw new PaymentValidationError('Missing required fields: paymentId, reason');
    }

    const refund = await paymentService.processRefund(request);

    logger.info('Refund processed successfully', { refundId: refund.id });

    return formatSuccessResponse({ refund }, 201);
  } catch (error) {
    if (error instanceof PaymentValidationError) {
      return formatErrorResponse(error, 400);
    }
    if (error instanceof PaymentNotFoundError) {
      return formatErrorResponse(error, 404);
    }
    if (error instanceof StripeError) {
      return formatErrorResponse(error, 400);
    }
    return formatErrorResponse(error as Error);
  }
};

// Get User Payments Handler
export const getUserPayments = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      throw new PaymentValidationError('User ID is required');
    }

    const limit = parseInt(event.queryStringParameters?.limit || '20');
    const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey;

    logger.info('Getting user payments', { userId, limit });

    const result = await paymentService.getUserPayments(userId, limit, lastEvaluatedKey);

    return formatSuccessResponse({
      payments: result.payments,
      pagination: {
        limit,
        hasMore: !!result.lastEvaluatedKey,
        lastEvaluatedKey: result.lastEvaluatedKey,
      },
    });
  } catch (error) {
    if (error instanceof PaymentValidationError) {
      return formatErrorResponse(error, 400);
    }
    return formatErrorResponse(error as Error);
  }
};

// Handle Stripe Webhook Handler
export const handleStripeWebhook = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Handling Stripe webhook', { event });

    if (!event.body) {
      throw new PaymentValidationError('Webhook body is required');
    }

    const stripeEvent = JSON.parse(event.body);

    // Verify webhook signature (in production, you should verify the signature)
    // const signature = event.headers['stripe-signature'];
    // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    // const stripeEvent = stripe.webhooks.constructEvent(event.body, signature, webhookSecret);

    await paymentService.handleStripeWebhook(stripeEvent);

    logger.info('Stripe webhook handled successfully', { eventType: stripeEvent.type });

    return formatSuccessResponse({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error', { error });
    
    // For webhooks, we return 200 even on error to prevent Stripe from retrying
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

// Search Payments Handler
export const searchPayments = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Searching payments', { event });

    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const limit = parseInt(queryParams.limit || '20');

    const filters: PaymentSearchFilters = {
      userId: queryParams.userId,
      bookingId: queryParams.bookingId,
      eventId: queryParams.eventId,
      status: queryParams.status as any,
      paymentMethod: queryParams.paymentMethod as any,
      dateFrom: queryParams.dateFrom,
      dateTo: queryParams.dateTo,
      amountMin: queryParams.amountMin ? parseFloat(queryParams.amountMin) : undefined,
      amountMax: queryParams.amountMax ? parseFloat(queryParams.amountMax) : undefined,
    };

    const result = await paymentService.searchPayments(filters, page, limit);

    return formatSuccessResponse(result);
  } catch (error) {
    if (error instanceof PaymentValidationError) {
      return formatErrorResponse(error, 400);
    }
    return formatErrorResponse(error as Error);
  }
};

// Get Booking Payments Handler
export const getBookingPayments = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const bookingId = event.pathParameters?.bookingId;
    if (!bookingId) {
      throw new PaymentValidationError('Booking ID is required');
    }

    logger.info('Getting booking payments', { bookingId });

    const payments = await paymentService.getBookingPayments(bookingId);

    return formatSuccessResponse({ payments });
  } catch (error) {
    if (error instanceof PaymentValidationError) {
      return formatErrorResponse(error, 400);
    }
    return formatErrorResponse(error as Error);
  }
};

// Get Refund Handler
export const getRefund = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const refundId = event.pathParameters?.refundId;
    if (!refundId) {
      throw new PaymentValidationError('Refund ID is required');
    }

    logger.info('Getting refund', { refundId });

    const refund = await paymentService.getRefund(refundId);

    return formatSuccessResponse({ refund });
  } catch (error) {
    if (error instanceof PaymentValidationError) {
      return formatErrorResponse(error, 400);
    }
    if (error instanceof PaymentNotFoundError) {
      return formatErrorResponse(error, 404);
    }
    return formatErrorResponse(error as Error);
  }
};
