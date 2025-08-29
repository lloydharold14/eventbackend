import { SESClient, SendEmailCommand, VerifyEmailIdentityCommand, GetSendStatisticsCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';
import { logger } from '../../../shared/utils/logger';
import { EmailTemplate, EmailTemplateData, getEmailTemplate } from '../templates/emailTemplates';

export interface EmailRequest {
  to: string;
  from: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private ses: SESClient;
  private defaultFromEmail: string;
  private defaultReplyTo: string;

  constructor(region: string = 'ca-central-1') {
    this.ses = new SESClient({ region });
    this.defaultFromEmail = 'noreply@eventmanagementplatform.com';
    this.defaultReplyTo = 'support@eventmanagementplatform.com';
  }

  /**
   * Send a templated email
   */
  async sendTemplatedEmail(
    to: string,
    templateType: string,
    templateData: EmailTemplateData,
    locale: string = 'en-US',
    from?: string
  ): Promise<EmailResult> {
    try {
      logger.info('Sending templated email', { 
        to, 
        templateType, 
        locale,
        templateData: { ...templateData, resetUrl: '[REDACTED]' } // Don't log sensitive URLs
      });

      const template = getEmailTemplate(templateType, templateData, locale);
      
      return await this.sendEmail({
        to,
        from: from || this.defaultFromEmail,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        replyTo: this.defaultReplyTo
      });
    } catch (error: any) {
      logger.error('Failed to send templated email', { 
        error: error.message, 
        to, 
        templateType 
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    userName: string,
    resetToken: string,
    baseUrl: string = 'https://eventmanagementplatform.com',
    locale: string = 'en-US'
  ): Promise<EmailResult> {
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    
    return await this.sendTemplatedEmail(
      to,
      'password_reset',
      {
        resetUrl,
        userName
      },
      locale
    );
  }

  /**
   * Send an email verification email
   */
  async sendEmailVerificationEmail(
    to: string,
    userName: string,
    verificationToken: string,
    baseUrl: string = 'https://eventmanagementplatform.com',
    locale: string = 'en-US'
  ): Promise<EmailResult> {
    const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;
    
    return await this.sendTemplatedEmail(
      to,
      'email_verification',
      {
        verificationUrl,
        userName
      },
      locale
    );
  }

  /**
   * Send a booking confirmation email
   */
  async sendBookingConfirmationEmail(
    to: string,
    userName: string,
    bookingData: {
      eventTitle: string;
      eventDate: string;
      eventLocation: string;
      ticketType: string;
      quantity: number;
      totalAmount: string;
      bookingId: string;
    },
    locale: string = 'en-US'
  ): Promise<EmailResult> {
    return await this.sendTemplatedEmail(
      to,
      'booking_confirmation',
      {
        ...bookingData,
        userName
      },
      locale
    );
  }

  /**
   * Send a raw email using AWS SES
   */
  async sendEmail(request: EmailRequest): Promise<EmailResult> {
    try {
      logger.info('Sending email via SES', { 
        to: request.to, 
        subject: request.subject 
      });

      const params = {
        Source: request.from,
        Destination: {
          ToAddresses: [request.to]
        },
        Message: {
          Subject: {
            Data: request.subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: request.htmlBody,
              Charset: 'UTF-8'
            },
            Text: {
              Data: request.textBody,
              Charset: 'UTF-8'
            }
          }
        },
        ReplyToAddresses: request.replyTo ? [request.replyTo] : undefined
      };

      const command = new SendEmailCommand(params);
      const result = await this.ses.send(command);
      
      logger.info('Email sent successfully', { 
        messageId: result.MessageId,
        to: request.to 
      });

      return {
        success: true,
        messageId: result.MessageId
      };
    } catch (error: any) {
      logger.error('Failed to send email via SES', { 
        error: error.message, 
        to: request.to,
        subject: request.subject
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send a raw email with attachments
   */
  async sendRawEmail(
    to: string,
    from: string,
    subject: string,
    htmlBody: string,
    textBody: string,
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }>
  ): Promise<EmailResult> {
    try {
      logger.info('Sending raw email with attachments', { 
        to, 
        subject,
        hasAttachments: !!attachments?.length
      });

      // For now, we'll use the regular sendEmail method
      // In a full implementation, you'd use sendRawEmail for attachments
      return await this.sendEmail({
        to,
        from,
        subject,
        htmlBody,
        textBody
      });
    } catch (error: any) {
      logger.error('Failed to send raw email', { 
        error: error.message, 
        to 
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify an email address with SES
   */
  async verifyEmailAddress(email: string): Promise<boolean> {
    try {
      logger.info('Verifying email address with SES', { email });

      const command = new VerifyEmailIdentityCommand({ EmailAddress: email });
      await this.ses.send(command);
      
      logger.info('Email verification request sent', { email });
      return true;
    } catch (error: any) {
      logger.error('Failed to verify email address', { 
        error: error.message, 
        email 
      });
      return false;
    }
  }

  /**
   * Get SES sending statistics
   */
  async getSendingStatistics(): Promise<any> {
    try {
      logger.info('Getting SES sending statistics');
      
      const command = new GetSendStatisticsCommand();
      const result = await this.ses.send(command);
      
      logger.info('Retrieved SES sending statistics', { 
        dataPoints: result.SendDataPoints?.length 
      });
      
      return result;
    } catch (error: any) {
      logger.error('Failed to get SES sending statistics', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get SES send quota
   */
  async getSendQuota(): Promise<any> {
    try {
      logger.info('Getting SES send quota');
      
      const command = new GetSendQuotaCommand();
      const result = await this.ses.send(command);
      
      logger.info('Retrieved SES send quota', { 
        max24HourSend: result.Max24HourSend,
        sentLast24Hours: result.SentLast24Hours
      });
      
      return result;
    } catch (error: any) {
      logger.error('Failed to get SES send quota', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Check if email is in sandbox mode
   */
  async isInSandboxMode(): Promise<boolean> {
    try {
      const quota = await this.getSendQuota();
      // In sandbox mode, Max24HourSend is typically 200
      return (quota.Max24HourSend || 0) <= 200;
    } catch (error) {
      logger.error('Failed to check sandbox mode', { error });
      return true; // Assume sandbox mode if we can't check
    }
  }

  /**
   * Validate email address format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Extract domain from email address
   */
  static getEmailDomain(email: string): string {
    return email.split('@')[1]?.toLowerCase() || '';
  }

  /**
   * Check if email domain is common (for spam prevention)
   */
  static isCommonEmailDomain(email: string): boolean {
    const domain = this.getEmailDomain(email);
    const commonDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
    ];
    return commonDomains.includes(domain);
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export const getEmailService = (region?: string): EmailService => {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService(region);
  }
  return emailServiceInstance;
};
