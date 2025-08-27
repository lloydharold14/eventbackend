import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../shared/utils/logger';
import { ValidationError, NotFoundError } from '../../../shared/errors/DomainError';

export interface VerificationCode {
  id: string;
  userId: string;
  code: string;
  type: 'email' | 'sms';
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
}

export interface EmailVerificationData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface SMSVerificationData {
  userId: string;
  phoneNumber: string;
  firstName: string;
}

export class VerificationService {
  private readonly sesClient: SESClient;
  private readonly snsClient: SNSClient;
  private readonly fromEmail: string;
  private readonly region: string;
  private readonly verificationCodes: Map<string, VerificationCode> = new Map();

  constructor(region: string = 'ca-central-1', fromEmail?: string) {
    this.region = region;
    this.sesClient = new SESClient({ region });
    this.snsClient = new SNSClient({ region });
    this.fromEmail = fromEmail || 'noreply@eventplatform.com';
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(data: EmailVerificationData): Promise<string> {
    try {
      const verificationCode = this.generateVerificationCode(data.userId, 'email');
      const verificationUrl = this.generateEmailVerificationUrl(verificationCode.code, data.userId);
      
      const emailContent = this.generateEmailVerificationTemplate({
        firstName: data.firstName,
        lastName: data.lastName,
        verificationUrl,
        verificationCode: verificationCode.code
      });

      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [data.email]
        },
        Message: {
          Subject: {
            Data: 'Verify Your Event Platform Account',
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: emailContent.html,
              Charset: 'UTF-8'
            },
            Text: {
              Data: emailContent.text,
              Charset: 'UTF-8'
            }
          }
        }
      });

      await this.sesClient.send(command);
      
      logger.info('Email verification sent successfully', {
        userId: data.userId,
        email: data.email,
        verificationCodeId: verificationCode.id
      });

      return verificationCode.id;
    } catch (error: any) {
      logger.error('Failed to send email verification', {
        error: error.message,
        userId: data.userId,
        email: data.email
      });
      throw new Error('Failed to send email verification');
    }
  }

  /**
   * Send SMS OTP verification
   */
  async sendSMSVerification(data: SMSVerificationData): Promise<string> {
    try {
      const verificationCode = this.generateVerificationCode(data.userId, 'sms');
      
      const message = `Your Event Platform verification code is: ${verificationCode.code}. Valid for 10 minutes.`;

      const command = new PublishCommand({
        Message: message,
        PhoneNumber: data.phoneNumber
      });

      await this.snsClient.send(command);
      
      logger.info('SMS verification sent successfully', {
        userId: data.userId,
        phoneNumber: data.phoneNumber,
        verificationCodeId: verificationCode.id
      });

      return verificationCode.id;
    } catch (error: any) {
      logger.error('Failed to send SMS verification', {
        error: error.message,
        userId: data.userId,
        phoneNumber: data.phoneNumber
      });
      throw new Error('Failed to send SMS verification');
    }
  }

  /**
   * Verify email verification code
   */
  async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    return this.verifyCode(userId, code, 'email');
  }

  /**
   * Verify SMS OTP code
   */
  async verifySMSCode(userId: string, code: string): Promise<boolean> {
    return this.verifyCode(userId, code, 'sms');
  }

  /**
   * Verify verification code
   */
  private async verifyCode(userId: string, code: string, type: 'email' | 'sms'): Promise<boolean> {
    try {
      // Find verification code for this user and type
      const verificationCode = Array.from(this.verificationCodes.values())
        .find(vc => vc.userId === userId && vc.type === type);

      if (!verificationCode) {
        throw new NotFoundError('Verification code', 'not found');
      }

      // Check if code is expired
      if (new Date() > new Date(verificationCode.expiresAt)) {
        this.verificationCodes.delete(verificationCode.id);
        throw new ValidationError('Verification code has expired');
      }

      // Check if max attempts exceeded
      if (verificationCode.attempts >= verificationCode.maxAttempts) {
        this.verificationCodes.delete(verificationCode.id);
        throw new ValidationError('Maximum verification attempts exceeded');
      }

      // Increment attempts
      verificationCode.attempts++;

      // Check if code matches
      if (verificationCode.code !== code) {
        throw new ValidationError('Invalid verification code');
      }

      // Code is valid - remove it from storage
      this.verificationCodes.delete(verificationCode.id);

      logger.info('Verification code verified successfully', {
        userId,
        type,
        verificationCodeId: verificationCode.id
      });

      return true;
    } catch (error: any) {
      logger.error('Verification code verification failed', {
        error: error.message,
        userId,
        type,
        code
      });
      throw error;
    }
  }

  /**
   * Generate verification code
   */
  private generateVerificationCode(userId: string, type: 'email' | 'sms'): VerificationCode {
    const code = type === 'email' 
      ? this.generateEmailCode() 
      : this.generateSMSCode();
    
    const verificationCode: VerificationCode = {
      id: uuidv4(),
      userId,
      code,
      type,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      attempts: 0,
      maxAttempts: type === 'email' ? 5 : 3,
      createdAt: new Date().toISOString()
    };

    this.verificationCodes.set(verificationCode.id, verificationCode);
    return verificationCode;
  }

  /**
   * Generate email verification code (6 digits)
   */
  private generateEmailCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate SMS OTP code (6 digits)
   */
  private generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate email verification URL
   */
  private generateEmailVerificationUrl(code: string, userId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://eventplatform.com';
    return `${baseUrl}/verify-email?code=${code}&userId=${userId}`;
  }

  /**
   * Generate email verification template
   */
  private generateEmailVerificationTemplate(data: {
    firstName: string;
    lastName: string;
    verificationUrl: string;
    verificationCode: string;
  }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Event Platform Account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; }
          .code { font-size: 24px; font-weight: bold; color: #2c3e50; text-align: center; padding: 20px; background: white; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Event Platform!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.firstName} ${data.lastName},</h2>
            <p>Thank you for registering with Event Platform! To complete your registration, please verify your email address.</p>
            
            <h3>Your Verification Code:</h3>
            <div class="code">${data.verificationCode}</div>
            
            <p><strong>Or click the button below to verify automatically:</strong></p>
            <p style="text-align: center;">
              <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            </p>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This code is valid for 10 minutes</li>
              <li>If you didn't create this account, please ignore this email</li>
              <li>For security, never share this code with anyone</li>
            </ul>
          </div>
          <div class="footer">
            <p>© 2024 Event Platform. All rights reserved.</p>
            <p>This email was sent to verify your account registration.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to Event Platform!

Hi ${data.firstName} ${data.lastName},

Thank you for registering with Event Platform! To complete your registration, please verify your email address.

Your Verification Code: ${data.verificationCode}

Or visit this link to verify automatically: ${data.verificationUrl}

Important:
- This code is valid for 10 minutes
- If you didn't create this account, please ignore this email
- For security, never share this code with anyone

© 2024 Event Platform. All rights reserved.
    `;

    return { html, text };
  }

  /**
   * Clean up expired verification codes
   */
  cleanupExpiredCodes(): void {
    const now = new Date();
    for (const [id, code] of this.verificationCodes.entries()) {
      if (new Date(code.expiresAt) < now) {
        this.verificationCodes.delete(id);
      }
    }
  }
}
