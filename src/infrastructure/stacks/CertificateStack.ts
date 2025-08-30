import * as cdk from 'aws-cdk-lib';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface CertificateStackProps extends cdk.StackProps {
  domainName: string;
  environment: string;
}

export class CertificateStack extends cdk.Stack {
  public readonly mainApiCertificate: certificatemanager.Certificate;
  public readonly eventsApiCertificate: certificatemanager.Certificate;
  public readonly bookingsApiCertificate: certificatemanager.Certificate;
  public readonly paymentsApiCertificate: certificatemanager.Certificate;
  public readonly qrCodesApiCertificate: certificatemanager.Certificate;
  public readonly analyticsApiCertificate: certificatemanager.Certificate;

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, {
      ...props,
      env: {
        account: props.env?.account,
        region: 'us-east-1', // CloudFront requires certificates in us-east-1
      },
    });

    const { domainName, environment } = props;
    
    // Use environment-aware subdomain naming
    const envPrefix = environment === 'prod' ? '' : `${environment}-`;

    // Import existing hosted zone
    const hostedZone = route53.HostedZone.fromLookup(this, 'ExistingHostedZone', {
      domainName: domainName,
    });

    // Create individual certificates for each subdomain (free for Amazon-issued certificates)
    this.mainApiCertificate = new certificatemanager.Certificate(this, 'MainApiCertificate', {
      domainName: `${envPrefix}api.${domainName}`,
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    this.eventsApiCertificate = new certificatemanager.Certificate(this, 'EventsApiCertificate', {
      domainName: `${envPrefix}events.${domainName}`,
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    this.bookingsApiCertificate = new certificatemanager.Certificate(this, 'BookingsApiCertificate', {
      domainName: `${envPrefix}bookings.${domainName}`,
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    this.paymentsApiCertificate = new certificatemanager.Certificate(this, 'PaymentsApiCertificate', {
      domainName: `${envPrefix}payments.${domainName}`,
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    this.qrCodesApiCertificate = new certificatemanager.Certificate(this, 'QRCodesApiCertificate', {
      domainName: `${envPrefix}qr.${domainName}`,
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    this.analyticsApiCertificate = new certificatemanager.Certificate(this, 'AnalyticsApiCertificate', {
      domainName: `${envPrefix}analytics.${domainName}`,
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    // Outputs
    new cdk.CfnOutput(this, 'MainApiCertificateArn', {
      value: this.mainApiCertificate.certificateArn,
      description: 'Main API Certificate ARN',
    });

    new cdk.CfnOutput(this, 'EventsApiCertificateArn', {
      value: this.eventsApiCertificate.certificateArn,
      description: 'Events API Certificate ARN',
    });

    new cdk.CfnOutput(this, 'BookingsApiCertificateArn', {
      value: this.bookingsApiCertificate.certificateArn,
      description: 'Bookings API Certificate ARN',
    });

    new cdk.CfnOutput(this, 'PaymentsApiCertificateArn', {
      value: this.paymentsApiCertificate.certificateArn,
      description: 'Payments API Certificate ARN',
    });

    new cdk.CfnOutput(this, 'QRCodesApiCertificateArn', {
      value: this.qrCodesApiCertificate.certificateArn,
      description: 'QR Codes API Certificate ARN',
    });

    new cdk.CfnOutput(this, 'AnalyticsApiCertificateArn', {
      value: this.analyticsApiCertificate.certificateArn,
      description: 'Analytics API Certificate ARN',
    });
  }
}
