import { Logger } from '@aws-lambda-powertools/logger';
import { IPaymentGateway } from './PaymentGatewayInterface';
import { StripeGateway } from './StripeGateway';
import {
  PaymentGateway,
  PaymentGatewayConfig,
  PaymentGatewayRegion,
  PaymentMethod,
  CreatePaymentIntentRequest,
  ConfirmPaymentRequest,
  ProcessRefundRequest,
  PaymentGatewayResponse,
  PaymentGatewayEvent
} from '../models/Payment';

const logger = new Logger({ serviceName: 'payment-gateway-manager' });

export class PaymentGatewayManager {
  private gateways: Map<PaymentGateway, IPaymentGateway> = new Map();
  private gatewayConfigs: Map<PaymentGateway, PaymentGatewayConfig> = new Map();

  constructor() {
    this.initializeGateways();
  }

  private initializeGateways(): void {
    // Primary Markets - North America & Europe
    this.registerGateway({
      gateway: PaymentGateway.STRIPE,
      region: PaymentGatewayRegion.NORTH_AMERICA,
      isActive: true,
      apiKey: process.env.STRIPE_API_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      supportedCurrencies: ['USD', 'CAD', 'EUR', 'GBP', 'AUD'],
      supportedPaymentMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.BANK_TRANSFER],
      metadata: {
        supportsSCA: true,
        supports3DS: true,
        supportsApplePay: true,
        supportsGooglePay: true
      }
    });

    // PayPal for global coverage
    this.registerGateway({
      gateway: PaymentGateway.PAYPAL,
      region: PaymentGatewayRegion.NORTH_AMERICA,
      isActive: true,
      apiKey: process.env.PAYPAL_CLIENT_ID || '',
      secretKey: process.env.PAYPAL_CLIENT_SECRET || '',
      webhookSecret: process.env.PAYPAL_WEBHOOK_SECRET || '',
      supportedCurrencies: ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'MXN', 'BRL', 'JPY', 'SGD'],
      supportedPaymentMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.BANK_TRANSFER],
      metadata: {
        supportsSCA: true,
        supports3DS: true,
        supportsVenmo: true
      }
    });

    // African Markets - Mobile Money & Local Banking
    this.registerGateway({
      gateway: PaymentGateway.RAZORPAY,
      region: PaymentGatewayRegion.AFRICA,
      isActive: true,
      apiKey: process.env.RAZORPAY_KEY_ID || '',
      secretKey: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
      supportedCurrencies: ['INR', 'USD', 'EUR', 'GBP'],
      supportedPaymentMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.BANK_TRANSFER],
      metadata: {
        supportsUPI: true,
        supportsNetBanking: true,
        supportsWallets: true
      }
    });

    // Paytm for India
    this.registerGateway({
      gateway: PaymentGateway.PAYTM,
      region: PaymentGatewayRegion.ASIA_PACIFIC,
      isActive: true,
      apiKey: process.env.PAYTM_MERCHANT_ID || '',
      secretKey: process.env.PAYTM_MERCHANT_KEY || '',
      webhookSecret: process.env.PAYTM_WEBHOOK_SECRET || '',
      supportedCurrencies: ['INR'],
      supportedPaymentMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.BANK_TRANSFER],
      metadata: {
        supportsUPI: true,
        supportsNetBanking: true,
        supportsWallets: true,
        supportsPaytmWallet: true
      }
    });

    // Alipay for China/Asia
    this.registerGateway({
      gateway: PaymentGateway.ALIPAY,
      region: PaymentGatewayRegion.ASIA_PACIFIC,
      isActive: true,
      apiKey: process.env.ALIPAY_APP_ID || '',
      secretKey: process.env.ALIPAY_PRIVATE_KEY || '',
      webhookSecret: process.env.ALIPAY_WEBHOOK_SECRET || '',
      supportedCurrencies: ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'SGD'],
      supportedPaymentMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.DIGITAL_WALLET],
      metadata: {
        supportsQRCode: true,
        supportsMobilePay: true,
        supportsInternationalPay: true
      }
    });

    // WeChat Pay for China
    this.registerGateway({
      gateway: PaymentGateway.WECHAT_PAY,
      region: PaymentGatewayRegion.ASIA_PACIFIC,
      isActive: true,
      apiKey: process.env.WECHAT_PAY_APP_ID || '',
      secretKey: process.env.WECHAT_PAY_MCH_ID || '',
      webhookSecret: process.env.WECHAT_PAY_WEBHOOK_SECRET || '',
      supportedCurrencies: ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'SGD'],
      supportedPaymentMethods: [PaymentMethod.DIGITAL_WALLET],
      metadata: {
        supportsQRCode: true,
        supportsMobilePay: true,
        supportsMiniProgram: true
      }
    });

    // Mercado Pago for Latin America
    this.registerGateway({
      gateway: PaymentGateway.MERCADO_PAGO,
      region: PaymentGatewayRegion.LATIN_AMERICA,
      isActive: true,
      apiKey: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
      secretKey: process.env.MERCADO_PAGO_PUBLIC_KEY || '',
      webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || '',
      supportedCurrencies: ['BRL', 'ARS', 'CLP', 'COP', 'MXN', 'PEN', 'UYU'],
      supportedPaymentMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.BANK_TRANSFER],
      metadata: {
        supportsPIX: true,
        supportsBoleto: true,
        supportsLocalCards: true
      }
    });

    // PagSeguro for Brazil
    this.registerGateway({
      gateway: PaymentGateway.PAGSEGURO,
      region: PaymentGatewayRegion.LATIN_AMERICA,
      isActive: true,
      apiKey: process.env.PAGSEGURO_EMAIL || '',
      secretKey: process.env.PAGSEGURO_TOKEN || '',
      webhookSecret: process.env.PAGSEGURO_WEBHOOK_SECRET || '',
      supportedCurrencies: ['BRL'],
      supportedPaymentMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.BANK_TRANSFER],
      metadata: {
        supportsBoleto: true,
        supportsPIX: true,
        supportsLocalCards: true
      }
    });

    // Adyen for global enterprise
    this.registerGateway({
      gateway: PaymentGateway.ADYEN,
      region: PaymentGatewayRegion.EUROPE,
      isActive: true,
      apiKey: process.env.ADYEN_API_KEY || '',
      secretKey: process.env.ADYEN_MERCHANT_ACCOUNT || '',
      webhookSecret: process.env.ADYEN_WEBHOOK_SECRET || '',
      supportedCurrencies: ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'JPY', 'SGD', 'BRL', 'MXN', 'INR'],
      supportedPaymentMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.BANK_TRANSFER, PaymentMethod.DIGITAL_WALLET],
      metadata: {
        supportsSCA: true,
        supports3DS: true,
        supportsLocalMethods: true,
        supportsKlarna: true,
        supportsAfterpay: true
      }
    });

    // Square for North America
    this.registerGateway({
      gateway: PaymentGateway.SQUARE,
      region: PaymentGatewayRegion.NORTH_AMERICA,
      isActive: true,
      apiKey: process.env.SQUARE_ACCESS_TOKEN || '',
      secretKey: process.env.SQUARE_APPLICATION_ID || '',
      webhookSecret: process.env.SQUARE_WEBHOOK_SECRET || '',
      supportedCurrencies: ['USD', 'CAD', 'AUD', 'GBP', 'EUR', 'JPY'],
      supportedPaymentMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.DIGITAL_WALLET],
      metadata: {
        supportsApplePay: true,
        supportsGooglePay: true,
        supportsCashApp: true
      }
    });
  }

  private registerGateway(config: PaymentGatewayConfig): void {
    if (!config.isActive) {
      logger.info(`Gateway ${config.gateway} is not active, skipping registration`);
      return;
    }

    let gateway: IPaymentGateway;

    switch (config.gateway) {
      case PaymentGateway.STRIPE:
        gateway = new StripeGateway(config);
        break;
      // TODO: Add other gateway implementations
      // case PaymentGateway.PAYPAL:
      //   gateway = new PayPalGateway(config);
      //   break;
      // case PaymentGateway.RAZORPAY:
      //   gateway = new RazorpayGateway(config);
      //   break;
      // case PaymentGateway.ALIPAY:
      //   gateway = new AlipayGateway(config);
      //   break;
      // case PaymentGateway.WECHAT_PAY:
      //   gateway = new WeChatPayGateway(config);
      //   break;
      // case PaymentGateway.MERCADO_PAGO:
      //   gateway = new MercadoPagoGateway(config);
      //   break;
      default:
        logger.warn(`Unsupported payment gateway: ${config.gateway}`);
        return;
    }

    this.gateways.set(config.gateway, gateway);
    this.gatewayConfigs.set(config.gateway, config);
    
    logger.info(`Registered payment gateway: ${config.gateway} for region: ${config.region}`);
  }

  // Gateway selection logic
  selectGateway(request: CreatePaymentIntentRequest): IPaymentGateway {
    const { currency, paymentMethod, paymentGateway } = request;

    // If specific gateway is requested, use it if available
    if (paymentGateway && this.gateways.has(paymentGateway)) {
      const gateway = this.gateways.get(paymentGateway)!;
      if (gateway.isCurrencySupported(currency)) {
        return gateway;
      }
    }

    // Auto-select gateway based on currency and region
    const selectedGateway = this.selectGatewayByCurrency(currency, paymentMethod);
    
    if (!selectedGateway) {
      throw new Error(`No suitable payment gateway found for currency: ${currency}`);
    }

    return selectedGateway;
  }

  private selectGatewayByCurrency(currency: string, paymentMethod?: PaymentMethod): IPaymentGateway | null {
    // Priority order for currency-based selection
    const currencyPriorities: Record<string, PaymentGateway[]> = {
      // Primary Markets
      'USD': [PaymentGateway.STRIPE, PaymentGateway.PAYPAL, PaymentGateway.SQUARE, PaymentGateway.ADYEN],
      'CAD': [PaymentGateway.STRIPE, PaymentGateway.PAYPAL, PaymentGateway.SQUARE, PaymentGateway.ADYEN],
      'EUR': [PaymentGateway.STRIPE, PaymentGateway.PAYPAL, PaymentGateway.ADYEN],
      'GBP': [PaymentGateway.STRIPE, PaymentGateway.PAYPAL, PaymentGateway.SQUARE, PaymentGateway.ADYEN],
      'JPY': [PaymentGateway.PAYPAL, PaymentGateway.ADYEN, PaymentGateway.SQUARE],
      'AUD': [PaymentGateway.STRIPE, PaymentGateway.PAYPAL, PaymentGateway.SQUARE, PaymentGateway.ADYEN],
      
      // African Markets
      'XOF': [PaymentGateway.PAYPAL, PaymentGateway.ADYEN], // West African CFA Franc
      'GHS': [PaymentGateway.PAYPAL, PaymentGateway.ADYEN], // Ghanaian Cedi
      'NGN': [PaymentGateway.PAYPAL, PaymentGateway.ADYEN], // Nigerian Naira
      
      // Latin American Markets
      'MXN': [PaymentGateway.PAYPAL, PaymentGateway.MERCADO_PAGO, PaymentGateway.ADYEN], // Mexican Peso
      'BRL': [PaymentGateway.MERCADO_PAGO, PaymentGateway.PAGSEGURO, PaymentGateway.PAYPAL, PaymentGateway.ADYEN], // Brazilian Real
      
      // Asian Markets
      'INR': [PaymentGateway.RAZORPAY, PaymentGateway.PAYTM, PaymentGateway.PAYPAL, PaymentGateway.ADYEN], // Indian Rupee
      'SGD': [PaymentGateway.PAYPAL, PaymentGateway.ADYEN, PaymentGateway.STRIPE], // Singapore Dollar
      'CNY': [PaymentGateway.ALIPAY, PaymentGateway.WECHAT_PAY, PaymentGateway.ADYEN] // Chinese Yuan
    };

    const priorities = currencyPriorities[currency];
    if (!priorities) {
      return null;
    }

    // Find the first available gateway that supports the currency and payment method
    for (const gatewayType of priorities) {
      const gateway = this.gateways.get(gatewayType);
      if (gateway && gateway.isCurrencySupported(currency)) {
        if (!paymentMethod || gateway.isPaymentMethodSupported(paymentMethod)) {
          return gateway;
        }
      }
    }

    return null;
  }

  // Gateway operations
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentGatewayResponse> {
    const gateway = this.selectGateway(request);
    logger.info(`Using payment gateway: ${gateway.gateway} for currency: ${request.currency}`);
    
    return await gateway.createPaymentIntent(request);
  }

  async confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentGatewayResponse> {
    // For confirmation, we need to know which gateway was used for the original payment intent
    // This should be stored in the payment intent record
    const gateway = this.getGatewayForPaymentIntent(request.paymentIntentId);
    return await gateway.confirmPayment(request);
  }

  async processRefund(request: ProcessRefundRequest): Promise<PaymentGatewayResponse> {
    // For refunds, we need to know which gateway was used for the original payment
    const gateway = this.getGatewayForPayment(request.paymentId);
    return await gateway.processRefund(request);
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentGatewayResponse> {
    const gateway = this.getGatewayForPayment(paymentId);
    return await gateway.getPaymentStatus(paymentId);
  }

  async getRefundStatus(refundId: string): Promise<PaymentGatewayResponse> {
    const gateway = this.getGatewayForRefund(refundId);
    return await gateway.getRefundStatus(refundId);
  }

  async handleWebhook(event: PaymentGatewayEvent, gatewayType: PaymentGateway): Promise<PaymentGatewayResponse> {
    const gateway = this.gateways.get(gatewayType);
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${gatewayType}`);
    }
    
    return await gateway.handleWebhook(event);
  }

  async verifyWebhookSignature(payload: string, signature: string, gatewayType: PaymentGateway): Promise<boolean> {
    const gateway = this.gateways.get(gatewayType);
    if (!gateway) {
      return false;
    }
    
    return await gateway.verifyWebhookSignature(payload, signature);
  }

  // Helper methods to get gateway for existing payments (these would typically query the database)
  private getGatewayForPaymentIntent(paymentIntentId: string): IPaymentGateway {
    // TODO: Query database to get the gateway used for this payment intent
    // For now, default to Stripe
    const gateway = this.gateways.get(PaymentGateway.STRIPE);
    if (!gateway) {
      throw new Error('Default payment gateway not available');
    }
    return gateway;
  }

  private getGatewayForPayment(paymentId: string): IPaymentGateway {
    // TODO: Query database to get the gateway used for this payment
    // For now, default to Stripe
    const gateway = this.gateways.get(PaymentGateway.STRIPE);
    if (!gateway) {
      throw new Error('Default payment gateway not available');
    }
    return gateway;
  }

  private getGatewayForRefund(refundId: string): IPaymentGateway {
    // TODO: Query database to get the gateway used for this refund
    // For now, default to Stripe
    const gateway = this.gateways.get(PaymentGateway.STRIPE);
    if (!gateway) {
      throw new Error('Default payment gateway not available');
    }
    return gateway;
  }

  // Gateway management methods
  getAvailableGateways(): PaymentGateway[] {
    return Array.from(this.gateways.keys());
  }

  getGatewayConfig(gateway: PaymentGateway): PaymentGatewayConfig | undefined {
    return this.gatewayConfigs.get(gateway);
  }

  isGatewayAvailable(gateway: PaymentGateway): boolean {
    return this.gateways.has(gateway);
  }

  getSupportedCurrencies(): string[] {
    const currencies = new Set<string>();
    for (const gateway of this.gateways.values()) {
      gateway.getSupportedCurrencies().forEach(currency => currencies.add(currency));
    }
    return Array.from(currencies);
  }

  getSupportedPaymentMethods(): string[] {
    const methods = new Set<string>();
    for (const gateway of this.gateways.values()) {
      gateway.getSupportedPaymentMethods().forEach(method => methods.add(method));
    }
    return Array.from(methods);
  }
}
