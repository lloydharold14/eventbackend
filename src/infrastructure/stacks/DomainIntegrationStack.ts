import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface DomainIntegrationStackProps extends cdk.StackProps {
  environment: string;
  config: EnvironmentConfig;
  apiGateway: apigateway.RestApi;
  domainName: string; // e.g., 'yourdomain.com'
  subdomain?: string; // e.g., 'api' for api.yourdomain.com
}

export class DomainIntegrationStack extends cdk.Stack {
  public readonly certificate: certificatemanager.Certificate;
  public readonly cloudFrontDistribution: cloudfront.Distribution;
  public readonly hostedZone?: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: DomainIntegrationStackProps) {
    super(scope, id, props);

    const { environment, config, apiGateway, domainName, subdomain = 'api' } = props;
    const fullDomainName = `${subdomain}.${domainName}`;

    // Create or import hosted zone
    this.hostedZone = this.createOrImportHostedZone(domainName);

    // Create SSL certificate
    this.certificate = new certificatemanager.Certificate(this, 'ApiCertificate', {
      domainName: fullDomainName,
      validation: certificatemanager.CertificateValidation.fromDns(this.hostedZone),
      subjectAlternativeNames: [
        domainName, // Also cover root domain
        `*.${domainName}`, // Wildcard for subdomains
      ],
    });

    // Create CloudFront distribution
    this.cloudFrontDistribution = new cloudfront.Distribution(this, 'ApiDistribution', {
      defaultBehavior: {
        origin: new origins.RestApiOrigin(apiGateway),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // For API calls
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      domainNames: [fullDomainName],
      certificate: this.certificate,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
      comment: `Event Management Platform API - ${environment} environment`,
      defaultRootObject: '',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(0),
        },
      ],
    });

    // Create A record pointing to CloudFront
    if (this.hostedZone) {
      new route53.ARecord(this, 'ApiAliasRecord', {
        zone: this.hostedZone,
        recordName: subdomain,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(this.cloudFrontDistribution)
        ),
      });

      // Create CNAME for www subdomain (optional)
      new route53.CnameRecord(this, 'WwwCnameRecord', {
        zone: this.hostedZone,
        recordName: 'www',
        domainName: fullDomainName,
      });
    }

    // Create custom domain in API Gateway
    const customDomain = new apigateway.DomainName(this, 'ApiCustomDomain', {
      domainName: fullDomainName,
      certificate: this.certificate,
      securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      endpointType: apigateway.EndpointType.REGIONAL,
    });

    // Create base path mapping
    new apigateway.BasePathMapping(this, 'ApiBasePathMapping', {
      domainName: customDomain,
      restApi: apiGateway,
      basePath: '', // No base path, serve from root
    });

    // Outputs
    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.cloudFrontDistribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `${id}-CloudFrontDomainName`,
    });

    new cdk.CfnOutput(this, 'CustomDomainName', {
      value: fullDomainName,
      description: 'Custom Domain Name for API',
      exportName: `${id}-CustomDomainName`,
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'SSL Certificate ARN',
      exportName: `${id}-CertificateArn`,
    });

    if (this.hostedZone) {
      new cdk.CfnOutput(this, 'HostedZoneId', {
        value: this.hostedZone.hostedZoneId,
        description: 'Route 53 Hosted Zone ID',
        exportName: `${id}-HostedZoneId`,
      });

      new cdk.CfnOutput(this, 'NameServers', {
        value: this.hostedZone.hostedZoneNameServers?.join(', ') || 'N/A',
        description: 'Name Servers for DNS Configuration',
        exportName: `${id}-NameServers`,
      });
    }
  }

  private createOrImportHostedZone(domainName: string): route53.IHostedZone {
    // Try to import existing hosted zone first
    try {
      return route53.HostedZone.fromLookup(this, 'ExistingHostedZone', {
        domainName: domainName,
      });
    } catch (error) {
      // If hosted zone doesn't exist, create a new one
      console.log(`Creating new hosted zone for ${domainName}`);
      return new route53.PublicHostedZone(this, 'NewHostedZone', {
        zoneName: domainName,
        comment: `Hosted zone for ${domainName}`,
      });
    }
  }
}
