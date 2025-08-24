# Event Management Platform

A modern, scalable event management platform built with microservices architecture on AWS.

## 🏗️ Architecture Overview

This platform follows a microservices architecture with the following services:

- **User Management Service** - Authentication, user profiles, and role management
- **Event Management Service** - Event CRUD operations and management
- **Booking Service** - Ticket reservations and capacity management
- **Payment Service** - Payment processing with Stripe integration
- **Notification Service** - Email, SMS, and push notifications
- **Search Service** - Event discovery and search functionality
- **Analytics Service** - Business intelligence and reporting

### Technology Stack

- **Backend**: Node.js, TypeScript, AWS Lambda
- **Database**: Amazon DynamoDB (NoSQL)
- **API Gateway**: AWS API Gateway v2
- **Authentication**: Amazon Cognito
- **File Storage**: Amazon S3 + CloudFront
- **Caching**: Amazon ElastiCache Redis
- **Search**: Amazon OpenSearch
- **Monitoring**: CloudWatch, X-Ray
- **Infrastructure**: AWS CDK (Infrastructure as Code)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate permissions
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd event-management-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Deploy to AWS**
   ```bash
   # Bootstrap CDK (first time only)
   cdk bootstrap
   
   # Deploy all stacks
   npm run cdk:deploy
   ```

## 📋 Development Setup

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up local environment**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Edit with your local settings
   nano .env.local
   ```

3. **Run tests**
   ```bash
   npm test
   npm run test:coverage
   ```

4. **Lint and format code**
   ```bash
   npm run lint
   npm run format
   ```

### Environment Configuration

The platform uses AWS Systems Manager Parameter Store for configuration management. For local development, you can use environment variables:

```bash
# Required environment variables
AWS_REGION=us-east-1
ENVIRONMENT=dev
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🏛️ Project Structure

```
src/
├── domains/                 # Business domain services
│   ├── users/              # User Management Service
│   ├── events/             # Event Management Service
│   ├── bookings/           # Booking Service
│   ├── payments/           # Payment Service
│   ├── notifications/      # Notification Service
│   ├── search/             # Search Service
│   └── analytics/          # Analytics Service
├── infrastructure/         # CDK infrastructure code
│   ├── stacks/            # CDK stacks
│   └── lambda/            # Lambda functions
├── shared/                # Shared utilities
│   ├── types/             # TypeScript types
│   ├── validators/        # Validation schemas
│   ├── errors/            # Error handling
│   ├── utils/             # Utility functions
│   └── config/            # Configuration management
└── tests/                 # Test files
    ├── unit/              # Unit tests
    ├── integration/       # Integration tests
    └── e2e/              # End-to-end tests
```

## 🔧 Available Scripts

- `npm run build` - Build TypeScript code
- `npm run watch` - Watch for changes and rebuild
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run cdk:diff` - Show CDK diff
- `npm run cdk:deploy` - Deploy all CDK stacks
- `npm run cdk:destroy` - Destroy all CDK stacks

## 🚀 Deployment

### Development Environment

```bash
# Deploy to development environment
npm run cdk:deploy -- --context environment=dev
```

### Production Environment

```bash
# Deploy to production environment
npm run cdk:deploy -- --context environment=prod
```

### Staging Environment

```bash
# Deploy to staging environment
npm run cdk:deploy -- --context environment=staging
```

## 📊 Monitoring and Observability

The platform includes comprehensive monitoring:

- **CloudWatch Dashboards** - Real-time metrics and logs
- **X-Ray Tracing** - Distributed tracing for microservices
- **Custom Metrics** - Business metrics and KPIs
- **Alarms** - Automated alerting for critical issues
- **Health Checks** - Service health monitoring

### Accessing Monitoring

- **CloudWatch Dashboard**: Available in AWS Console
- **X-Ray Tracing**: Available in AWS Console
- **Health Check Endpoint**: `GET /health`

## 🔒 Security

The platform implements security best practices:

- **Zero Trust Architecture** - Never trust, always verify
- **Defense in Depth** - Multiple security layers
- **Principle of Least Privilege** - Minimum required permissions
- **Data Encryption** - Encrypt everything in transit and at rest
- **Audit Trail** - Log all security-relevant events

### Security Features

- JWT-based authentication with Cognito
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- DDoS protection

## 🧪 Testing

### Test Types

- **Unit Tests** - Individual function testing
- **Integration Tests** - Service integration testing
- **End-to-End Tests** - Full user journey testing
- **Performance Tests** - Load and stress testing
- **Security Tests** - Vulnerability scanning

### Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## 📈 Performance Optimization

### Optimization Strategies

- **Caching** - Multi-layer caching with Redis
- **CDN** - CloudFront for static content delivery
- **Database Optimization** - DynamoDB best practices
- **Lambda Optimization** - Cold start mitigation
- **API Optimization** - Request/response optimization

### Performance Targets

- **API Response Time**: < 200ms (95th percentile)
- **Database Query Time**: < 50ms (95th percentile)
- **Cache Hit Rate**: > 90%
- **Uptime**: > 99.9%

## 🔄 CI/CD Pipeline

The platform includes automated CI/CD:

1. **Code Quality Gates**
   - ESLint, Prettier, TypeScript compiler
   - Unit tests (80%+ coverage)
   - Security scanning

2. **Infrastructure Validation**
   - CDK diff validation
   - Infrastructure security scanning
   - Cost estimation

3. **Deployment Stages**
   - Automated testing in staging
   - Blue-green deployment
   - Automated rollback on failure

## 💰 Cost Optimization

### Cost Management Strategies

- **Serverless Architecture** - Pay only for what you use
- **Auto-scaling** - Scale based on demand
- **Reserved Instances** - For predictable workloads
- **Cost Monitoring** - Real-time cost tracking
- **Resource Optimization** - Right-sizing resources

### Estimated Costs

- **Development**: ~$50-100/month
- **Staging**: ~$200-300/month
- **Production**: ~$500-1000/month (varies by usage)

## 🆘 Troubleshooting

### Common Issues

1. **CDK Deployment Fails**
   - Check AWS credentials
   - Verify IAM permissions
   - Check for resource conflicts

2. **Lambda Function Errors**
   - Check CloudWatch logs
   - Verify environment variables
   - Check IAM permissions

3. **Database Connection Issues**
   - Verify VPC configuration
   - Check security group rules
   - Verify DynamoDB table permissions

### Getting Help

- Check CloudWatch logs for detailed error information
- Review X-Ray traces for performance issues
- Use the health check endpoint for service status
- Contact the development team for support

## 📚 API Documentation

API documentation is available at:
- **Swagger UI**: `https://your-api-gateway-url/docs`
- **OpenAPI Spec**: `https://your-api-gateway-url/openapi.json`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Use conventional commit messages
- Follow the established code style
- Document new features and APIs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Documentation**: Check this README and inline code comments
- **Issues**: Create an issue in the repository
- **Email**: Contact the development team
- **Slack**: Join our development channel

---

**Built with ❤️ by the Event Management Team**
