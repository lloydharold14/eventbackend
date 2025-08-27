# 🚀 Event Management Platform - Multi-Environment Deployment Guide

## 📋 Overview

This guide provides comprehensive instructions for deploying the Event Management Platform across multiple environments (dev, staging, prod) using our enhanced CDK infrastructure and deployment scripts.

## 🏗️ Architecture Overview

### **Multi-Environment Infrastructure**
- **Development (dev)**: Minimal resources, full debugging, test data
- **Staging**: Pre-production environment with full features
- **Production (prod)**: Maximum security, monitoring, and compliance

### **Environment-Specific Features**

| Feature | Dev | Staging | Prod |
|---------|-----|---------|------|
| **Resources** | Minimal | Medium | Maximum |
| **Security** | Basic | Enhanced | Maximum |
| **Monitoring** | Basic | Full | Comprehensive |
| **Compliance** | PIPEDA | PIPEDA + CCPA | Full (GDPR, PIPEDA, CCPA, WAEMU) |
| **Cost** | ~$200-400/month | ~$500-800/month | ~$1000-2000/month |
| **Auto-scaling** | Disabled | Enabled | Enabled |
| **Backup** | 7 days | 14 days | 35 days |

## 🛠️ Prerequisites

### **Required Tools**
- **Node.js 18+** and npm
- **AWS CLI** configured with appropriate credentials
- **AWS CDK** installed globally: `npm install -g aws-cdk`
- **Git** for version control

### **AWS Account Setup**
1. **Create AWS Account** with appropriate permissions
2. **Configure AWS CLI** with your credentials
3. **Set up IAM User** with necessary permissions:
   - AdministratorAccess (for development)
   - Or custom policy with CDK, CloudFormation, and service permissions

### **Required AWS Services**
- **CloudFormation** (for CDK deployment)
- **IAM** (for roles and policies)
- **VPC** (for networking)
- **Lambda** (for serverless functions)
- **DynamoDB** (for data storage)
- **API Gateway** (for API management)
- **Cognito** (for authentication)
- **S3** (for file storage)
- **CloudWatch** (for monitoring)
- **X-Ray** (for tracing)

## 🚀 Quick Start Deployment

### **1. Development Environment (Recommended First)**

```bash
# Deploy to development environment
npm run deploy:dev

# Or use the script directly
./scripts/deploy-multi-env.sh -e dev
```

### **2. Staging Environment**

```bash
# Deploy to staging environment
npm run deploy:staging

# Or use the script directly
./scripts/deploy-multi-env.sh -e staging
```

### **3. Production Environment**

```bash
# Deploy to production environment (requires confirmation)
npm run deploy:prod

# Or use the script directly
./scripts/deploy-multi-env.sh -e prod
```

## 📝 Deployment Scripts

### **Available Scripts**

| Script | Description | Usage |
|--------|-------------|-------|
| `deploy:dev` | Deploy to development | `npm run deploy:dev` |
| `deploy:staging` | Deploy to staging | `npm run deploy:staging` |
| `deploy:prod` | Deploy to production | `npm run deploy:prod` |
| `deploy:dev:dry` | Dry run for dev | `npm run deploy:dev:dry` |
| `deploy:staging:dry` | Dry run for staging | `npm run deploy:staging:dry` |
| `deploy:prod:dry` | Dry run for prod | `npm run deploy:prod:dry` |
| `deploy:dev:force` | Force deploy to dev | `npm run deploy:dev:force` |
| `deploy:staging:force` | Force deploy to staging | `npm run deploy:staging:force` |
| `deploy:prod:force` | Force deploy to prod | `npm run deploy:prod:force` |

### **Advanced Script Options**

```bash
# Full script with all options
./scripts/deploy-multi-env.sh [OPTIONS]

# Options:
-e, --environment ENV    Environment to deploy to (dev, staging, prod)
-r, --region REGION      AWS region (default: ca-central-1)
-a, --account ACCOUNT    AWS account ID
--dry-run               Show what would be deployed without deploying
--force                 Force deployment without confirmation
--skip-tests            Skip running tests before deployment
--skip-validation       Skip environment validation
--no-rollback           Disable automatic rollback on failure
--parallel              Enable parallel deployment for faster deployment
--no-monitoring         Skip monitoring setup
--no-security-scan      Skip security scanning
```

## 🔧 Manual Deployment Steps

### **1. Environment Setup**

```bash
# Clone the repository
git clone <repository-url>
cd event-management-platform

# Install dependencies
npm install

# Build the project
npm run build
```

### **2. AWS Configuration**

```bash
# Configure AWS CLI
aws configure

# Verify configuration
aws sts get-caller-identity
```

### **3. CDK Bootstrap (First Time Only)**

```bash
# Bootstrap CDK for your environment
cdk bootstrap --context environment=dev
cdk bootstrap --context environment=staging
cdk bootstrap --context environment=prod
```

### **4. Deploy Infrastructure**

```bash
# Deploy all stacks
cdk deploy --all --context environment=dev

# Or deploy specific stacks
cdk deploy EventManagement-dev UserManagement-dev --context environment=dev
```

## 🌍 Environment-Specific Configuration

### **Development Environment**

**Purpose**: Development and testing
**Resources**: Minimal for cost optimization
**Security**: Basic security measures
**Monitoring**: Basic monitoring and logging

**Configuration**:
```typescript
{
  name: 'dev',
  region: 'ca-central-1',
  vpc: { maxAzs: 2, natGateways: 1 },
  dynamodb: { billingMode: 'PAY_PER_REQUEST' },
  lambda: { timeout: 30, memorySize: 512 },
  security: { enableWaf: false, enableShield: false },
  monitoring: { enableAlarms: false, retentionDays: 7 },
  compliance: { dataResidency: ['CA'], pipedaCompliance: true }
}
```

### **Staging Environment**

**Purpose**: Pre-production testing and validation
**Resources**: Medium capacity for realistic testing
**Security**: Enhanced security measures
**Monitoring**: Full monitoring and alerting

**Configuration**:
```typescript
{
  name: 'staging',
  region: 'ca-central-1',
  vpc: { maxAzs: 3, natGateways: 2 },
  dynamodb: { billingMode: 'PROVISIONED', readCapacity: 10, writeCapacity: 5 },
  lambda: { timeout: 60, memorySize: 1024, reservedConcurrency: 50 },
  security: { enableWaf: true, enableGuardDuty: true },
  monitoring: { enableAlarms: true, retentionDays: 30 },
  compliance: { dataResidency: ['CA', 'US'], pipedaCompliance: true, ccpaCompliance: true }
}
```

### **Production Environment**

**Purpose**: Live production environment
**Resources**: Maximum capacity and performance
**Security**: Maximum security and compliance
**Monitoring**: Comprehensive monitoring and alerting

**Configuration**:
```typescript
{
  name: 'prod',
  region: 'ca-central-1',
  vpc: { maxAzs: 3, natGateways: 3 },
  dynamodb: { billingMode: 'PROVISIONED', readCapacity: 50, writeCapacity: 25 },
  lambda: { timeout: 300, memorySize: 2048, reservedConcurrency: 200 },
  security: { enableWaf: true, enableShield: true, enableGuardDuty: true },
  monitoring: { enableAlarms: true, retentionDays: 90 },
  compliance: { 
    dataResidency: ['CA', 'US', 'EU'], 
    gdprCompliance: true, 
    pipedaCompliance: true, 
    ccpaCompliance: true, 
    waemuCompliance: true 
  }
}
```

## 🔍 Deployment Validation

### **Health Checks**

After deployment, verify all services are running:

```bash
# Check API Gateway health
curl https://<api-gateway-url>/health

# Check individual service health
curl https://<api-gateway-url>/users/health
curl https://<api-gateway-url>/events/health
curl https://<api-gateway-url>/bookings/health
curl https://<api-gateway-url>/payments/health
```

### **Service Verification**

1. **User Management**: Test user registration and authentication
2. **Event Management**: Test event creation and retrieval
3. **Booking System**: Test booking creation and management
4. **Payment Processing**: Test payment intent creation
5. **Notifications**: Test email/SMS sending
6. **Search**: Test event search functionality
7. **Analytics**: Test analytics data generation

### **Monitoring Verification**

1. **CloudWatch Dashboard**: Verify metrics are being collected
2. **X-Ray Tracing**: Verify distributed tracing is working
3. **Log Groups**: Verify logs are being written
4. **Alarms**: Verify alarms are configured (staging/prod)

## 🔒 Security Configuration

### **Environment-Specific Security**

| Security Feature | Dev | Staging | Prod |
|------------------|-----|---------|------|
| **WAF** | ❌ | ✅ | ✅ |
| **Shield** | ❌ | ❌ | ✅ |
| **GuardDuty** | ✅ | ✅ | ✅ |
| **CloudTrail** | ✅ | ✅ | ✅ |
| **Encryption at Rest** | ✅ | ✅ | ✅ |
| **Encryption in Transit** | ✅ | ✅ | ✅ |

### **Compliance Features**

| Compliance | Dev | Staging | Prod |
|------------|-----|---------|------|
| **PIPEDA (Canada)** | ✅ | ✅ | ✅ |
| **CCPA (California)** | ❌ | ✅ | ✅ |
| **GDPR (EU)** | ❌ | ❌ | ✅ |
| **WAEMU (West Africa)** | ❌ | ❌ | ✅ |

## 📊 Cost Optimization

### **Environment-Specific Costs**

| Environment | Estimated Monthly Cost | Cost Optimization |
|-------------|----------------------|-------------------|
| **Development** | $200-400 | Pay-per-request, minimal resources |
| **Staging** | $500-800 | Provisioned capacity, auto-scaling |
| **Production** | $1000-2000 | Reserved instances, maximum performance |

### **Cost Optimization Strategies**

1. **Development**:
   - Use PAY_PER_REQUEST billing for DynamoDB
   - Minimal Lambda memory allocation
   - Disable auto-scaling
   - Short log retention periods

2. **Staging**:
   - Balanced resource allocation
   - Enable auto-scaling for realistic testing
   - Medium log retention periods

3. **Production**:
   - Reserved instances for predictable workloads
   - Maximum performance configuration
   - Long-term log retention for compliance
   - Comprehensive monitoring and alerting

## 🚨 Troubleshooting

### **Common Deployment Issues**

1. **CDK Bootstrap Issues**
   ```bash
   # Re-bootstrap CDK
   cdk bootstrap --context environment=dev
   ```

2. **Permission Issues**
   ```bash
   # Verify AWS credentials
   aws sts get-caller-identity
   
   # Check IAM permissions
   aws iam get-user
   ```

3. **Resource Limits**
   ```bash
   # Check service quotas
   aws service-quotas list-service-quotas --service-code lambda
   ```

4. **Build Issues**
   ```bash
   # Clean and rebuild
   npm run clean
   npm install
   npm run build
   ```

### **Rollback Procedures**

```bash
# Manual rollback to previous version
cdk destroy --all --context environment=prod
cdk deploy --all --context environment=prod

# Or use CloudFormation console for selective rollback
```

## 📈 Monitoring and Maintenance

### **Post-Deployment Tasks**

1. **Configure Monitoring Alerts**
   - Set up CloudWatch alarms
   - Configure SNS notifications
   - Set up dashboard monitoring

2. **Security Hardening**
   - Review IAM roles and policies
   - Enable additional security features
   - Configure compliance monitoring

3. **Performance Optimization**
   - Monitor Lambda cold starts
   - Optimize DynamoDB queries
   - Tune auto-scaling parameters

4. **Backup and Recovery**
   - Test backup procedures
   - Document recovery processes
   - Set up disaster recovery

### **Regular Maintenance**

1. **Weekly**:
   - Review CloudWatch metrics
   - Check for security updates
   - Monitor cost trends

2. **Monthly**:
   - Update dependencies
   - Review and optimize resources
   - Update documentation

3. **Quarterly**:
   - Security audit
   - Performance review
   - Compliance assessment

## 📚 Additional Resources

### **Documentation**
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Event Management Platform API Guide](mobile-app-api-guide.md)
- [Architecture Decision Records](docs/adr/)

### **Support**
- **Development Issues**: Create GitHub issue
- **Infrastructure Issues**: Check CloudWatch logs
- **Security Issues**: Contact security team

### **Training**
- CDK Workshop: [cdkworkshop.com](https://cdkworkshop.com)
- AWS Lambda Workshop: [aws.amazon.com/lambda/](https://aws.amazon.com/lambda/)
- DynamoDB Best Practices: [aws.amazon.com/dynamodb/](https://aws.amazon.com/dynamodb/)

---

## 🎯 Next Steps

After successful deployment:

1. **Test the complete user workflow**
2. **Configure custom domain (optional)**
3. **Set up CI/CD pipeline**
4. **Implement monitoring alerts**
5. **Train team on new infrastructure**
6. **Plan for scaling and optimization**

**Your Event Management Platform is now ready for global deployment!** 🚀🌍



