import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface MultiDomainIntegrationStackProps extends cdk.StackProps {
  environment: string;
  domainName: string;
  config: EnvironmentConfig;
  // Simplified: Only need the main unified API Gateway
  mainApiGateway: apigateway.RestApi;
  mainCertificate: certificatemanager.ICertificate;
}

export class MultiDomainIntegrationStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: MultiDomainIntegrationStackProps) {
    super(scope, id, props);

    const { environment, domainName, mainApiGateway, mainCertificate } = props;

    // Import existing hosted zone
    this.hostedZone = route53.HostedZone.fromLookup(this, 'ExistingHostedZone', {
      domainName: domainName,
    });

    // Create single CloudFront distribution for unified mobile API
    // Use environment-aware subdomain naming
    const envPrefix = environment === 'prod' ? '' : `${environment}-`;
    
    const unifiedDistribution = new cloudfront.Distribution(this, 'UnifiedMobileApiDistribution', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(mainApiGateway.urlForPath().replace('https://', '').replace('http://', '').split('/')[0], {
          originPath: `/${environment}`,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      domainNames: [`${envPrefix}api.${domainName}`],
      certificate: mainCertificate,
    });



    // Create single Route 53 record for unified mobile API
    new route53.ARecord(this, 'UnifiedMobileApiAliasRecord', {
      zone: this.hostedZone,
      recordName: `${envPrefix}api.${domainName}`,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(unifiedDistribution)),
    });

    // Output for unified mobile API
    new cdk.CfnOutput(this, 'UnifiedMobileApiUrl', {
      value: `https://${envPrefix}api.${domainName}`,
      description: `Unified Mobile API Gateway - Single endpoint for all services (${environment})`,
    });

    // Create DNS configuration guide
    this.createDNSConfigurationGuide(domainName);
  }

  private createDNSConfigurationGuide(domainName: string) {
    const guide = `# Multi-Domain DNS Configuration Guide

## Domain Structure
Your event management platform now uses multiple custom domains for better service isolation:

### API Endpoints
- **Main API**: https://dev-api.${domainName} (Authentication, Notifications, Users)
- **Events API**: https://dev-events.${domainName} (Event Management)
- **Bookings API**: https://dev-bookings.${domainName} (Booking Management)
- **Payments API**: https://dev-payments.${domainName} (Payment Processing)
- **QR Codes API**: https://dev-qr.${domainName} (QR Code Generation & Validation)
- **Analytics API**: https://dev-analytics.${domainName} (Analytics & Reporting)

### DNS Records Created
The following A records have been created in your Route 53 hosted zone:
- dev-api.${domainName} → Main API Gateway
- dev-events.${domainName} → Events Service
- dev-bookings.${domainName} → Booking Service
- dev-payments.${domainName} → Payment Service
- dev-qr.${domainName} → QR Code Service
- dev-analytics.${domainName} → Analytics Service

### SSL Certificates
All domains use the same wildcard certificate (*.${domainName}) from AWS Certificate Manager.

### Testing Endpoints
Test each service with these endpoints:

#### Main API (Authentication & Core Services)
\`\`\`bash
# Health check
curl https://dev-api.${domainName}/health

# User registration
curl -X POST https://dev-api.${domainName}/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User","username":"testuser","acceptTerms":true}'

# User login
curl -X POST https://dev-api.${domainName}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"Test123!"}'
\`\`\`

#### Events API
\`\`\`bash
# Get all events
curl https://dev-events.${domainName}/events

# Get categories
curl https://dev-events.${domainName}/categories
\`\`\`

#### Bookings API
\`\`\`bash
# Get bookings
curl https://dev-bookings.${domainName}/bookings
\`\`\`

#### Payments API
\`\`\`bash
# Get payment health
curl https://dev-payments.${domainName}/health
\`\`\`

#### QR Codes API
\`\`\`bash
# Get QR codes
curl https://dev-qr.${domainName}/qr-codes
\`\`\`

#### Analytics API
\`\`\`bash
# Get analytics health
curl https://dev-analytics.${domainName}/analytics/health
\`\`\`

### Mobile App Integration
Update your mobile app to use the appropriate domain for each service:

\`\`\`kotlin
// Example Kotlin configuration
object ApiConfig {
    const val AUTH_BASE_URL = "https://dev-api.${domainName}"
    const val EVENTS_BASE_URL = "https://dev-events.${domainName}"
    const val BOOKINGS_BASE_URL = "https://dev-bookings.${domainName}"
    const val PAYMENTS_BASE_URL = "https://dev-payments.${domainName}"
    const val QR_CODES_BASE_URL = "https://dev-qr.${domainName}"
    const val ANALYTICS_BASE_URL = "https://dev-analytics.${domainName}"
}
\`\`\`

### Benefits of This Architecture
1. **Service Isolation**: Each service operates independently
2. **Independent Scaling**: Services can scale based on their own load
3. **Security Boundaries**: Each service has its own security configuration
4. **Easier Maintenance**: Changes to one service don't affect others
5. **Better Performance**: No single point of failure
6. **Clear API Boundaries**: Each domain represents a specific business domain

### Monitoring
Each service has its own CloudWatch metrics and logs. Monitor them separately:
- Main API: CloudWatch logs for authentication and notifications
- Events API: CloudWatch logs for event operations
- Bookings API: CloudWatch logs for booking operations
- Payments API: CloudWatch logs for payment processing
- QR Codes API: CloudWatch logs for QR code operations
- Analytics API: CloudWatch logs for analytics operations
`;

    // Write the guide to a file
    const fs = require('fs');
    const path = require('path');
    const guidePath = path.join(process.cwd(), 'MULTI_DOMAIN_DNS_CONFIGURATION_GUIDE.md');
    fs.writeFileSync(guidePath, guide);
  }
}
