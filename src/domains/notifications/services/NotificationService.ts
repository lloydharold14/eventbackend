import { logger } from '../../../shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export enum NotificationType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  BOOKING_CANCELLATION = 'booking_cancellation',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  PAYMENT_FAILED = 'payment_failed',
  EVENT_REMINDER = 'event_reminder',
  EVENT_UPDATE = 'event_update',
  EVENT_CANCELLATION = 'event_cancellation'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
  READ = 'read'
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  title?: string;
  body: string;
  variables: string[];
}

export interface NotificationRequest {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  title?: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  scheduledAt?: string;
  expiresAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  title?: string;
  body: string;
  data?: Record<string, any>;
  status: NotificationStatus;
  priority: 'low' | 'normal' | 'high';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  scheduledAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResult {
  success: boolean;
  notificationId: string;
  message?: string;
  error?: string;
}

export class NotificationService {
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 5000;

  constructor() {
    // Initialize notification service
    logger.info('NotificationService initialized');
  }

  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    try {
      logger.info('Sending notification', { 
        userId: request.userId, 
        type: request.type, 
        channel: request.channel 
      });

      const notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: request.userId,
        type: request.type,
        channel: request.channel,
        subject: request.subject,
        title: request.title,
        body: request.body,
        data: request.data,
        status: NotificationStatus.PENDING,
        priority: request.priority || 'normal',
        retryCount: 0,
        maxRetries: this.maxRetries,
        scheduledAt: request.scheduledAt,
        expiresAt: request.expiresAt
      };

      // TODO: Save notification to database
      // const savedNotification = await this.notificationRepository.createNotification(notification);

      // Send notification based on channel
      const result = await this.sendNotificationByChannel(notification);

      if (result.success) {
        logger.info('Notification sent successfully', { 
          notificationId: result.notificationId,
          channel: request.channel 
        });
      } else {
        logger.error('Failed to send notification', { 
          notificationId: result.notificationId,
          error: result.error 
        });
      }

      return result;
    } catch (error: any) {
      logger.error('Error sending notification', { 
        error: error.message, 
        request 
      });
      return {
        success: false,
        notificationId: uuidv4(),
        error: error.message
      };
    }
  }

  async sendBookingConfirmation(
    userId: string, 
    bookingData: {
      bookingId: string;
      eventTitle: string;
      eventDate: string;
      eventLocation: string;
      attendeeName: string;
      ticketDetails: Array<{
        ticketType: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
      totalAmount: number;
      currency: string;
      bookingDate: string;
      qrCode: string;
      ticketUrl: string;
      organizerContact: {
        name: string;
        email: string;
        phone: string;
      };
    }
  ): Promise<NotificationResult> {
    const subject = `Booking Confirmation - ${bookingData.eventTitle}`;
    const body = this.generateBookingConfirmationEmail(bookingData);

    return this.sendNotification({
      userId,
      type: NotificationType.BOOKING_CONFIRMATION,
      channel: NotificationChannel.EMAIL,
      subject,
      body,
      data: bookingData,
      priority: 'high'
    });
  }

  async sendBookingCancellation(
    userId: string,
    bookingData: {
      bookingId: string;
      eventTitle: string;
      eventDate: string;
      totalAmount: number;
      currency: string;
      refundAmount?: number;
      cancellationReason?: string;
    }
  ): Promise<NotificationResult> {
    const subject = `Booking Cancellation - ${bookingData.eventTitle}`;
    const body = this.generateBookingCancellationEmail(bookingData);

    return this.sendNotification({
      userId,
      type: NotificationType.BOOKING_CANCELLATION,
      channel: NotificationChannel.EMAIL,
      subject,
      body,
      data: bookingData,
      priority: 'normal'
    });
  }

  async sendPaymentConfirmation(
    userId: string,
    paymentData: {
      paymentId: string;
      amount: number;
      currency: string;
      bookingId: string;
      eventTitle: string;
      paymentMethod: string;
      receiptUrl?: string;
    }
  ): Promise<NotificationResult> {
    const subject = `Payment Confirmation - ${paymentData.eventTitle}`;
    const body = this.generatePaymentConfirmationEmail(paymentData);

    return this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_CONFIRMATION,
      channel: NotificationChannel.EMAIL,
      subject,
      body,
      data: paymentData,
      priority: 'high'
    });
  }

  async sendPaymentFailed(
    userId: string,
    paymentData: {
      paymentId: string;
      amount: number;
      currency: string;
      bookingId: string;
      eventTitle: string;
      failureReason: string;
      retryUrl?: string;
    }
  ): Promise<NotificationResult> {
    const subject = `Payment Failed - ${paymentData.eventTitle}`;
    const body = this.generatePaymentFailedEmail(paymentData);

    return this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_FAILED,
      channel: NotificationChannel.EMAIL,
      subject,
      body,
      data: paymentData,
      priority: 'high'
    });
  }

  private async sendNotificationByChannel(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationResult> {
    const notificationId = uuidv4();

    try {
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          return await this.sendEmailNotification(notification, notificationId);
        case NotificationChannel.SMS:
          return await this.sendSMSNotification(notification, notificationId);
        case NotificationChannel.PUSH:
          return await this.sendPushNotification(notification, notificationId);
        case NotificationChannel.IN_APP:
          return await this.sendInAppNotification(notification, notificationId);
        default:
          throw new Error(`Unsupported notification channel: ${notification.channel}`);
      }
    } catch (error: any) {
      logger.error('Error sending notification by channel', { 
        channel: notification.channel, 
        error: error.message 
      });
      return {
        success: false,
        notificationId,
        error: error.message
      };
    }
  }

  private async sendEmailNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>, notificationId: string): Promise<NotificationResult> {
    // TODO: Integrate with AWS SES or other email service
    logger.info('Sending email notification', { 
      notificationId, 
      userId: notification.userId,
      subject: notification.subject 
    });

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      notificationId,
      message: 'Email sent successfully'
    };
  }

  private async sendSMSNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>, notificationId: string): Promise<NotificationResult> {
    // TODO: Integrate with AWS SNS or other SMS service
    logger.info('Sending SMS notification', { 
      notificationId, 
      userId: notification.userId 
    });

    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      success: true,
      notificationId,
      message: 'SMS sent successfully'
    };
  }

  private async sendPushNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>, notificationId: string): Promise<NotificationResult> {
    // TODO: Integrate with Firebase Cloud Messaging or other push service
    logger.info('Sending push notification', { 
      notificationId, 
      userId: notification.userId,
      title: notification.title 
    });

    // Simulate push notification sending
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      success: true,
      notificationId,
      message: 'Push notification sent successfully'
    };
  }

  private async sendInAppNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>, notificationId: string): Promise<NotificationResult> {
    // TODO: Save to database for in-app notification display
    logger.info('Sending in-app notification', { 
      notificationId, 
      userId: notification.userId,
      title: notification.title 
    });

    // Simulate in-app notification
    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      success: true,
      notificationId,
      message: 'In-app notification saved successfully'
    };
  }

  private generateBookingConfirmationEmail(bookingData: any): string {
    return `
      <h2>Booking Confirmation</h2>
      <p>Dear ${bookingData.attendeeName},</p>
      <p>Your booking has been confirmed for the following event:</p>
      
      <h3>Event Details</h3>
      <ul>
        <li><strong>Event:</strong> ${bookingData.eventTitle}</li>
        <li><strong>Date:</strong> ${bookingData.eventDate}</li>
        <li><strong>Location:</strong> ${bookingData.eventLocation}</li>
        <li><strong>Booking ID:</strong> ${bookingData.bookingId}</li>
      </ul>

      <h3>Ticket Details</h3>
      ${bookingData.ticketDetails.map((ticket: any) => `
        <div>
          <strong>${ticket.ticketType}</strong> - ${ticket.quantity} x ${bookingData.currency} ${ticket.unitPrice} = ${bookingData.currency} ${ticket.totalPrice}
        </div>
      `).join('')}

      <p><strong>Total Amount:</strong> ${bookingData.currency} ${bookingData.totalAmount}</p>
      
      <p>Your tickets are available at: <a href="${bookingData.ticketUrl}">${bookingData.ticketUrl}</a></p>
      
      <p>QR Code: ${bookingData.qrCode}</p>
      
      <h3>Organizer Contact</h3>
      <p>If you have any questions, please contact:</p>
      <ul>
        <li><strong>Name:</strong> ${bookingData.organizerContact.name}</li>
        <li><strong>Email:</strong> ${bookingData.organizerContact.email}</li>
        <li><strong>Phone:</strong> ${bookingData.organizerContact.phone}</li>
      </ul>
      
      <p>Thank you for your booking!</p>
    `;
  }

  private generateBookingCancellationEmail(bookingData: any): string {
    return `
      <h2>Booking Cancellation</h2>
      <p>Your booking has been cancelled for the following event:</p>
      
      <h3>Event Details</h3>
      <ul>
        <li><strong>Event:</strong> ${bookingData.eventTitle}</li>
        <li><strong>Date:</strong> ${bookingData.eventDate}</li>
        <li><strong>Booking ID:</strong> ${bookingData.bookingId}</li>
        <li><strong>Original Amount:</strong> ${bookingData.currency} ${bookingData.totalAmount}</li>
        ${bookingData.refundAmount ? `<li><strong>Refund Amount:</strong> ${bookingData.currency} ${bookingData.refundAmount}</li>` : ''}
      </ul>

      ${bookingData.cancellationReason ? `<p><strong>Reason:</strong> ${bookingData.cancellationReason}</p>` : ''}
      
      <p>If you have any questions about the cancellation or refund, please contact our support team.</p>
    `;
  }

  private generatePaymentConfirmationEmail(paymentData: any): string {
    return `
      <h2>Payment Confirmation</h2>
      <p>Your payment has been successfully processed for the following booking:</p>
      
      <h3>Payment Details</h3>
      <ul>
        <li><strong>Payment ID:</strong> ${paymentData.paymentId}</li>
        <li><strong>Booking ID:</strong> ${paymentData.bookingId}</li>
        <li><strong>Event:</strong> ${paymentData.eventTitle}</li>
        <li><strong>Amount:</strong> ${paymentData.currency} ${paymentData.amount}</li>
        <li><strong>Payment Method:</strong> ${paymentData.paymentMethod}</li>
      </ul>

      ${paymentData.receiptUrl ? `<p>Download your receipt: <a href="${paymentData.receiptUrl}">Receipt</a></p>` : ''}
      
      <p>Thank you for your payment!</p>
    `;
  }

  private generatePaymentFailedEmail(paymentData: any): string {
    return `
      <h2>Payment Failed</h2>
      <p>We were unable to process your payment for the following booking:</p>
      
      <h3>Booking Details</h3>
      <ul>
        <li><strong>Booking ID:</strong> ${paymentData.bookingId}</li>
        <li><strong>Event:</strong> ${paymentData.eventTitle}</li>
        <li><strong>Amount:</strong> ${paymentData.currency} ${paymentData.amount}</li>
      </ul>

      <h3>Failure Reason</h3>
      <p>${paymentData.failureReason}</p>

      ${paymentData.retryUrl ? `<p>Please try again: <a href="${paymentData.retryUrl}">Retry Payment</a></p>` : ''}
      
      <p>If you continue to experience issues, please contact our support team.</p>
    `;
  }
}
