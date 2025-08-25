# 🌍 Payment Gateway Integration Guide

## Overview

The Event Management Platform's payment system is designed to be **payment gateway agnostic**, supporting multiple payment providers for different markets and regions. This architecture allows for easy integration of new payment gateways and automatic selection based on currency, region, and user preferences.

## 🏗️ Architecture

### Payment Gateway Abstraction Layer

The system uses a **Gateway Manager Pattern** with the following components:

1. **PaymentGatewayInterface** - Abstract interface for all payment gateways
2. **BasePaymentGateway** - Base class with common functionality
3. **PaymentGatewayManager** - Manages multiple gateways and selects appropriate ones
4. **Specific Gateway Implementations** - Concrete implementations for each provider

### Key Features

- ✅ **Multi-Gateway Support** - Support for 10+ payment gateways
- ✅ **Automatic Gateway Selection** - Based on currency and region
- ✅ **Fallback Mechanisms** - Automatic fallback to alternative gateways
- ✅ **Unified API** - Same interface regardless of underlying gateway
- ✅ **Market-Specific Optimization** - Optimized for different regions

## 🌐 Supported Payment Gateways

### Currently Implemented

| Gateway | Region | Currencies | Payment Methods | Status |
|---------|--------|------------|-----------------|---------|
| **Stripe** | Global | USD, CAD, EUR, GBP, AUD, JPY, SGD, HKD | Credit/Debit Cards, Digital Wallets | ✅ **Active** |

### Planned Integrations

| Gateway | Region | Currencies | Payment Methods | Priority |
|---------|--------|------------|-----------------|----------|
| **PayPal** | Global | USD, EUR, GBP, CAD, AUD | PayPal, Credit Cards | 🔄 **Next** |
| **Razorpay** | India | INR | UPI, Cards, Net Banking | 🔄 **Next** |
| **Paytm** | India | INR | UPI, Cards, Wallets | 🔄 **Next** |
| **Alipay** | China | CNY | Alipay, UnionPay | 🔄 **Next** |
| **WeChat Pay** | China | CNY | WeChat Pay | 🔄 **Next** |
| **Mercado Pago** | Latin America | BRL, MXN, ARS, CLP, COP, PEN, UYU | Cards, PIX, Boleto | 🔄 **Next** |
| **PagSeguro** | Brazil | BRL | Cards, PIX, Boleto | 🔄 **Next** |
| **Adyen** | Europe | EUR, GBP, USD | Cards, SEPA, iDEAL | 🔄 **Next** |
| **Square** | North America | USD, CAD | Cards, Digital Wallets | 🔄 **Next** |

## 🗺️ Regional Gateway Mapping

### North America
- **Primary**: Stripe, PayPal, Square
- **Currencies**: USD, CAD
- **Fallback**: Stripe

### Europe
- **Primary**: Stripe, PayPal, Adyen
- **Currencies**: EUR, GBP
- **Fallback**: Stripe

### Asia Pacific
- **Primary**: Stripe, PayPal
- **Currencies**: JPY, SGD, HKD, AUD
- **Fallback**: Stripe

### India
- **Primary**: Razorpay, Paytm, Stripe
- **Currencies**: INR
- **Fallback**: Stripe

### China
- **Primary**: Alipay, WeChat Pay
- **Currencies**: CNY
- **Fallback**: Stripe (if available)

### Latin America
- **Primary**: Mercado Pago, PagSeguro, Stripe
- **Currencies**: BRL, MXN, ARS, CLP, COP, PEN, UYU
- **Fallback**: Stripe

## 🔧 Adding New Payment Gateways

### Step 1: Create Gateway Implementation

```typescript
// src/domains/payments/gateways/PayPalGateway.ts
import { BasePaymentGateway } from './PaymentGatewayInterface';
import { PaymentGateway, PaymentGatewayConfig, PaymentGatewayResponse } from '../models/Payment';

export class PayPalGateway extends BasePaymentGateway {
  readonly gateway = PaymentGateway.PAYPAL;
  readonly config: PaymentGatewayConfig;
  private paypalClient: any; // PayPal SDK client

  constructor(config: PaymentGatewayConfig) {
    super();
    this.config = config;
    // Initialize PayPal client
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentGatewayResponse> {
    // PayPal-specific implementation
  }

  async confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentGatewayResponse> {
    // PayPal-specific implementation
  }

  // ... other required methods
}
```

### Step 2: Register in Gateway Manager

```typescript
// In PaymentGatewayManager.ts
private initializeGateways(): void {
  // Existing Stripe gateway...

  // Add PayPal Gateway
  const paypalConfig: PaymentGatewayConfig = {
    gateway: PaymentGateway.PAYPAL,
    region: PaymentGatewayRegion.NORTH_AMERICA,
    isActive: true,
    apiKey: process.env.PAYPAL_CLIENT_ID || '',
    secretKey: process.env.PAYPAL_CLIENT_SECRET || '',
    webhookSecret: process.env.PAYPAL_WEBHOOK_SECRET,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    supportedPaymentMethods: [
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.DIGITAL_WALLET
    ],
    metadata: {
      environment: process.env.ENVIRONMENT || 'dev'
    }
  };

  this.registerGateway(paypalConfig);
}
```

### Step 3: Update Currency Mapping

```typescript
// In PaymentGatewayManager.ts
private selectGatewayByCurrency(currency: string, paymentMethod?: PaymentMethod): IPaymentGateway | null {
  const currencyGatewayMap: Record<string, PaymentGateway[]> = {
    // Existing mappings...
    'USD': [PaymentGateway.STRIPE, PaymentGateway.PAYPAL, PaymentGateway.SQUARE],
    'EUR': [PaymentGateway.STRIPE, PaymentGateway.PAYPAL, PaymentGateway.ADYEN],
    // Add new mappings as needed
  };
  // ... rest of the method
}
```

## 🚀 Gateway Selection Logic

### Automatic Selection

The system automatically selects the best payment gateway based on:

1. **Currency Support** - Gateway must support the requested currency
2. **Regional Preference** - Local gateways are preferred for better UX
3. **Payment Method** - Gateway must support the requested payment method
4. **Availability** - Gateway must be active and operational
5. **Fallback Chain** - Multiple gateways are tried in order of preference

### Manual Override

Users can specify a preferred gateway:

```json
{
  "bookingId": "booking-123",
  "userId": "user-123",
  "eventId": "event-001",
  "amount": 179.98,
  "currency": "USD",
  "paymentGateway": "paypal", // Optional: specify preferred gateway
  "paymentMethod": "credit_card"
}
```

## 🔒 Security & Compliance

### Gateway-Specific Security

Each gateway implementation handles:

- **Webhook Signature Verification** - Gateway-specific signature validation
- **API Key Management** - Secure storage and rotation of API keys
- **PCI Compliance** - Gateway-specific compliance requirements
- **Fraud Detection** - Gateway-specific fraud prevention

### Unified Security Layer

Common security features across all gateways:

- **Input Validation** - Comprehensive request validation
- **Error Handling** - Standardized error responses
- **Logging** - Detailed audit trails
- **Rate Limiting** - Protection against abuse

## 📊 Monitoring & Analytics

### Gateway Performance Metrics

- **Success Rate** - Payment success rate per gateway
- **Response Time** - Average response time per gateway
- **Error Rates** - Error distribution across gateways
- **Regional Performance** - Performance by region and currency

### Business Intelligence

- **Revenue by Gateway** - Revenue distribution across gateways
- **User Preferences** - Most popular gateways by region
- **Conversion Rates** - Conversion rates by gateway and region
- **Cost Analysis** - Transaction costs by gateway

## 🔄 Webhook Integration

### Unified Webhook Handler

All gateways use a unified webhook handler:

```typescript
// Handle webhooks from any gateway
export const handleWebhook = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const gatewayType = event.headers['x-gateway-type'] || 'stripe';
  const payload = event.body;
  const signature = event.headers['x-signature'];

  // Verify signature
  const isValid = await gatewayManager.verifyWebhookSignature(payload, signature, gatewayType);
  
  if (!isValid) {
    return formatErrorResponse(new Error('Invalid signature'), 400);
  }

  // Process webhook
  const result = await gatewayManager.handleWebhook(JSON.parse(payload), gatewayType);
  
  return formatSuccessResponse(result);
};
```

## 🧪 Testing Strategy

### Gateway Testing

1. **Unit Tests** - Test each gateway implementation independently
2. **Integration Tests** - Test gateway manager with multiple gateways
3. **End-to-End Tests** - Test complete payment flow with each gateway
4. **Fallback Tests** - Test automatic fallback mechanisms

### Test Data

```typescript
// Test payment gateways with different scenarios
const testScenarios = [
  {
    currency: 'USD',
    expectedGateway: PaymentGateway.STRIPE,
    fallbackGateway: PaymentGateway.PAYPAL
  },
  {
    currency: 'INR',
    expectedGateway: PaymentGateway.RAZORPAY,
    fallbackGateway: PaymentGateway.STRIPE
  },
  {
    currency: 'CNY',
    expectedGateway: PaymentGateway.ALIPAY,
    fallbackGateway: PaymentGateway.WECHAT_PAY
  }
];
```

## 📈 Performance Optimization

### Gateway Optimization

- **Connection Pooling** - Reuse connections to gateway APIs
- **Caching** - Cache gateway responses where appropriate
- **Async Processing** - Process webhooks asynchronously
- **Retry Logic** - Implement exponential backoff for failed requests

### Regional Optimization

- **CDN Integration** - Use regional CDNs for better performance
- **Database Sharding** - Shard payment data by region
- **Load Balancing** - Distribute load across multiple gateway instances

## 🔮 Future Enhancements

### Planned Features

1. **Dynamic Gateway Discovery** - Automatically discover available gateways
2. **A/B Testing** - Test different gateways for optimization
3. **Machine Learning** - Use ML to predict optimal gateway selection
4. **Real-time Analytics** - Real-time monitoring and alerting
5. **Multi-Currency Support** - Support for multiple currencies in single transaction

### Market Expansion

- **Africa** - Mobile money integration (M-Pesa, Orange Money)
- **Middle East** - Local payment methods (STC Pay, Fawry)
- **Southeast Asia** - Regional payment methods (GrabPay, GoPay)

## 📚 API Documentation

### Payment Intent Creation

```http
POST /payments
Content-Type: application/json

{
  "bookingId": "booking-123",
  "userId": "user-123",
  "eventId": "event-001",
  "amount": 179.98,
  "currency": "USD",
  "paymentGateway": "paypal", // Optional: specify gateway
  "paymentMethod": "credit_card",
  "metadata": {
    "region": "north_america",
    "preferredGateway": "paypal"
  }
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "paymentIntent": {
      "id": "pi_1234567890",
      "bookingId": "booking-123",
      "userId": "user-123",
      "eventId": "event-001",
      "amount": 179.98,
      "currency": "USD",
      "status": "pending",
      "paymentGateway": "paypal",
      "gatewayPaymentIntentId": "PAY-1234567890",
      "gatewayClientSecret": "PAY-1234567890_secret_abc123",
      "expiresAt": "2024-01-16T10:30:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

## 🎯 Best Practices

### Gateway Selection

1. **Prioritize Local Gateways** - Use local gateways for better user experience
2. **Implement Fallbacks** - Always have fallback gateways for reliability
3. **Monitor Performance** - Continuously monitor gateway performance
4. **Update Preferences** - Allow users to set preferred payment methods

### Error Handling

1. **Graceful Degradation** - Fall back to alternative gateways on failure
2. **User Communication** - Clear error messages for users
3. **Retry Logic** - Implement smart retry mechanisms
4. **Logging** - Comprehensive logging for debugging

### Security

1. **API Key Rotation** - Regularly rotate API keys
2. **Webhook Verification** - Always verify webhook signatures
3. **Input Sanitization** - Sanitize all user inputs
4. **Audit Trails** - Maintain detailed audit trails

---

This payment gateway integration guide demonstrates how the Event Management Platform is designed to support multiple markets and payment providers, making it truly global and scalable.
