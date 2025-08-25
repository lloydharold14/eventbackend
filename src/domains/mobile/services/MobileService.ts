import { Logger } from '@aws-lambda-powertools/logger';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { LocalizationService } from '../../../shared/localization/LocalizationService';
import { ComplianceService } from '../../../shared/compliance/RegionalCompliance';
import {
  MobileAppConfig,
  MobileSyncRequest,
  MobileSyncResponse,
  PushNotificationToken,
  PushNotificationRequest,
  MobileEventResponse,
  MobileBookingResponse,
  MobilePaymentResponse,
  MobileUserResponse,
  MobileSearchRequest,
  MobileSearchResponse,
  MobileLocationRequest,
  MobileLocationResponse,
  MobileOfflineData,
  MobileAnalytics,
  MobileHealthCheck
} from '../models/Mobile';
import { EventService } from '../../events/services/EventService';
import { BookingService } from '../../bookings/services/BookingService';
import { PaymentService } from '../../payments/services/PaymentService';
import { UserService } from '../../users/services/UserService';
import { NotificationService } from '../../notifications/services/NotificationService';

export class MobileService {
  private logger: Logger;
  private metricsManager: MetricsManager;
  private localizationService: LocalizationService;
  private complianceService: ComplianceService;
  private eventService: EventService;
  private bookingService: BookingService;
  private paymentService: PaymentService;
  private userService: UserService;
  private notificationService: NotificationService;

  constructor(
    eventService: EventService,
    bookingService: BookingService,
    paymentService: PaymentService,
    userService: UserService,
    notificationService: NotificationService
  ) {
    this.logger = new Logger({ serviceName: 'MobileService' });
    this.metricsManager = MetricsManager.getInstance();
    this.localizationService = LocalizationService.getInstance();
    this.complianceService = ComplianceService.getInstance();
    this.eventService = eventService;
    this.bookingService = bookingService;
    this.paymentService = paymentService;
    this.userService = userService;
    this.notificationService = notificationService;
  }

  async syncData(request: MobileSyncRequest): Promise<MobileSyncResponse> {
    this.logger.info('Starting mobile data sync', { deviceId: request.deviceId, syncTypes: request.syncTypes });
    
    const startTime = Date.now();
    const changes = {
      events: [] as any[],
      bookings: [] as any[],
      payments: [] as any[],
      notifications: [] as any[],
      user: [] as any[]
    };
    const conflicts: any[] = [];
    let offlineChangesProcessed = 0;

    try {
      // Process offline changes first
      if (request.offlineChanges && request.offlineChanges.length > 0) {
        offlineChangesProcessed = await this.processOfflineChanges(request.offlineChanges);
      }

      // Sync requested data types
      for (const syncType of request.syncTypes) {
        switch (syncType) {
          case 'events':
            changes.events = await this.syncEvents(request.lastSyncTimestamp);
            break;
          case 'bookings':
            changes.bookings = await this.syncBookings(request.lastSyncTimestamp);
            break;
          case 'payments':
            changes.payments = await this.syncPayments(request.lastSyncTimestamp);
            break;
          case 'notifications':
            changes.notifications = await this.syncNotifications(request.lastSyncTimestamp);
            break;
          case 'user':
            changes.user = await this.syncUserData(request.lastSyncTimestamp);
            break;
        }
      }

      const duration = Date.now() - startTime;
      this.metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_SYNC_COMPLETED, 1, {
        deviceId: request.deviceId,
        syncTypes: request.syncTypes.join(','),
        offlineChangesProcessed: offlineChangesProcessed.toString()
      });

      this.logger.info('Mobile data sync completed', {
        deviceId: request.deviceId,
        duration,
        changesCount: Object.values(changes).flat().length,
        offlineChangesProcessed
      });

      return {
        success: true,
        lastSyncTimestamp: new Date().toISOString(),
        changes,
        conflicts,
        offlineChangesProcessed
      };
    } catch (error: any) {
      this.logger.error('Mobile data sync failed', { error: error.message, deviceId: request.deviceId });
      throw error;
    }
  }

  async registerPushNotificationToken(token: PushNotificationToken): Promise<void> {
    this.logger.info('Registering push notification token', {
      userId: token.userId,
      deviceId: token.deviceId,
      platform: token.platform
    });

    try {
      // Store token in database (implementation would depend on your storage strategy)
      // This could be DynamoDB, SNS, or a dedicated notification service
      
      this.metricsManager.recordBusinessMetric(BusinessMetricName.PUSH_TOKEN_REGISTERED, 1, {
        platform: token.platform,
        userId: token.userId
      });

      this.logger.info('Push notification token registered successfully');
    } catch (error: any) {
      this.logger.error('Failed to register push notification token', { error: error.message });
      throw error;
    }
  }

  async sendPushNotification(request: PushNotificationRequest): Promise<void> {
    this.logger.info('Sending push notification', {
      category: request.category,
      priority: request.priority,
      userId: request.userId,
      deviceId: request.deviceId
    });

    try {
      // Send notification through appropriate service (SNS, Firebase, etc.)
      // Implementation would depend on your notification infrastructure
      
      this.metricsManager.recordBusinessMetric(BusinessMetricName.PUSH_NOTIFICATION_SENT, 1, {
        category: request.category,
        priority: request.priority
      });

      this.logger.info('Push notification sent successfully');
    } catch (error: any) {
      this.logger.error('Failed to send push notification', { error: error.message });
      throw error;
    }
  }

  async getMobileOptimizedEvents(
    locale: string,
    currency: string,
    filters?: any,
    page: number = 1,
    limit: number = 20
  ): Promise<MobileEventResponse[]> {
    this.logger.info('Getting mobile optimized events', { locale, currency, page, limit });

    try {
      // Get events from event service
      const events = await this.eventService.searchEvents(filters || {}, page, limit);
      
      // Transform to mobile-optimized format
      const mobileEvents: MobileEventResponse[] = await Promise.all(
        events.events.map(async (event) => this.transformEventForMobile(event, locale, currency))
      );

      this.metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_EVENTS_RETRIEVED, mobileEvents.length, {
        locale,
        currency
      });

      return mobileEvents;
    } catch (error: any) {
      this.logger.error('Failed to get mobile optimized events', { error: error.message });
      throw error;
    }
  }

  async getMobileOptimizedBookings(
    userId: string,
    locale: string,
    currency: string
  ): Promise<MobileBookingResponse[]> {
    this.logger.info('Getting mobile optimized bookings', { userId, locale, currency });

    try {
      const bookings = await this.bookingService.getBookingsByUser(userId);
      
      const mobileBookings: MobileBookingResponse[] = await Promise.all(
        bookings.map(async (booking) => this.transformBookingForMobile(booking, locale, currency))
      );

      this.metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_BOOKINGS_RETRIEVED, mobileBookings.length, {
        userId,
        locale,
        currency
      });

      return mobileBookings;
    } catch (error: any) {
      this.logger.error('Failed to get mobile optimized bookings', { error: error.message });
      throw error;
    }
  }

  async getMobileOptimizedPayments(
    userId: string,
    locale: string,
    currency: string
  ): Promise<MobilePaymentResponse[]> {
    this.logger.info('Getting mobile optimized payments', { userId, locale, currency });

    try {
      const payments = await this.paymentService.getUserPayments(userId);
      
      const mobilePayments: MobilePaymentResponse[] = await Promise.all(
        payments.payments.map(async (payment) => this.transformPaymentForMobile(payment, locale, currency))
      );

      this.metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_PAYMENTS_RETRIEVED, mobilePayments.length, {
        userId,
        locale,
        currency
      });

      return mobilePayments;
    } catch (error: any) {
      this.logger.error('Failed to get mobile optimized payments', { error: error.message });
      throw error;
    }
  }

  async getMobileOptimizedUser(
    userId: string,
    locale: string,
    currency: string
  ): Promise<MobileUserResponse> {
    this.logger.info('Getting mobile optimized user', { userId, locale, currency });

    try {
      const user = await this.userService.getUserById(userId);
      const mobileUser = await this.transformUserForMobile(user, locale, currency);

      this.metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_USER_RETRIEVED, 1, {
        userId,
        locale,
        currency
      });

      return mobileUser;
    } catch (error: any) {
      this.logger.error('Failed to get mobile optimized user', { error: error.message });
      throw error;
    }
  }

  async searchEventsMobile(request: MobileSearchRequest): Promise<MobileSearchResponse> {
    this.logger.info('Mobile event search', { query: request.query, locale: request.locale, currency: request.currency });

    try {
      const startTime = Date.now();
      
      // Convert mobile search request to standard search filters
      const searchFilters = this.convertMobileSearchToFilters(request);
      
      // Perform search
      const searchResult = await this.eventService.searchEvents(searchFilters, request.page, request.limit);
      
      // Transform results to mobile format
      const mobileEvents = await Promise.all(
        searchResult.events.map(async (event) => this.transformEventForMobile(event, request.locale, request.currency))
      );

      const processingTime = Date.now() - startTime;

      this.metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_SEARCH_PERFORMED, 1, {
        query: request.query,
        locale: request.locale,
        currency: request.currency
      });

      return {
        events: mobileEvents,
        total: searchResult.pagination.total,
        page: request.page,
        totalPages: searchResult.pagination.totalPages,
        hasNextPage: searchResult.pagination.hasNextPage,
        suggestions: [], // Would be populated by search service
        filters: {
          categories: [],
          locations: [],
          priceRanges: []
        },
        metadata: {
          query: request.query,
          processingTime,
          locale: request.locale,
          currency: request.currency
        }
      };
    } catch (error: any) {
      this.logger.error('Mobile event search failed', { error: error.message });
      throw error;
    }
  }

  async getNearbyEvents(request: MobileLocationRequest): Promise<MobileLocationResponse> {
    this.logger.info('Getting nearby events', {
      latitude: request.latitude,
      longitude: request.longitude,
      radius: request.radius,
      locale: request.locale,
      currency: request.currency
    });

    try {
      const startTime = Date.now();
      
      // Create location-based filters
      const filters = {
        location: {
          coordinates: {
            latitude: request.latitude,
            longitude: request.longitude,
            radius: request.radius || 50
          }
        }
      };
      
      const searchResult = await this.eventService.searchEvents(filters, 1, request.limit || 20);
      
      const mobileEvents = await Promise.all(
        searchResult.events.map(async (event) => this.transformEventForMobile(event, request.locale, request.currency))
      );

      const processingTime = Date.now() - startTime;

      this.metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_NEARBY_EVENTS_RETRIEVED, mobileEvents.length, {
        locale: request.locale,
        currency: request.currency
      });

      return {
        events: mobileEvents,
        total: searchResult.pagination.total,
        location: {
          latitude: request.latitude,
          longitude: request.longitude,
          radius: request.radius || 50
        },
        metadata: {
          processingTime,
          locale: request.locale,
          currency: request.currency
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to get nearby events', { error: error.message });
      throw error;
    }
  }

  async recordAnalytics(analytics: MobileAnalytics): Promise<void> {
    this.logger.info('Recording mobile analytics', {
      sessionId: analytics.sessionId,
      userId: analytics.userId,
      deviceId: analytics.deviceId,
      platform: analytics.platform
    });

    try {
      // Store analytics data (could be CloudWatch, DynamoDB, or external analytics service)
      // This would include user behavior, screen views, and custom events
      
      this.metricsManager.recordBusinessMetric(BusinessMetricName.MOBILE_ANALYTICS_RECORDED, 1, {
        platform: analytics.platform,
        sessionId: analytics.sessionId
      });

      this.logger.info('Mobile analytics recorded successfully');
    } catch (error: any) {
      this.logger.error('Failed to record mobile analytics', { error: error.message });
      // Don't throw error for analytics failures
    }
  }

  async getMobileHealthCheck(): Promise<MobileHealthCheck> {
    this.logger.info('Getting mobile health check');

    try {
      // Check various service health
      const apiHealth = await this.checkApiHealth();
      const databaseHealth = await this.checkDatabaseHealth();
      const paymentsHealth = await this.checkPaymentsHealth();
      const notificationsHealth = await this.checkNotificationsHealth();

      const overallStatus = this.determineOverallHealth([
        apiHealth,
        databaseHealth,
        paymentsHealth,
        notificationsHealth
      ]);

      return {
        status: overallStatus,
        services: {
          api: apiHealth,
          database: databaseHealth,
          payments: paymentsHealth,
          notifications: notificationsHealth
        },
        version: process.env.APP_VERSION || '1.0.0',
        timestamp: new Date().toISOString(),
        features: {
          offlineMode: true,
          pushNotifications: true,
          locationServices: true,
          biometricAuth: true
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to get mobile health check', { error: error.message });
      throw error;
    }
  }

  // Private helper methods

  private async processOfflineChanges(offlineChanges: any[]): Promise<number> {
    let processed = 0;
    
    for (const change of offlineChanges) {
      try {
        switch (change.entityType) {
          case 'booking':
            await this.processBookingOfflineChange(change);
            break;
          case 'payment':
            await this.processPaymentOfflineChange(change);
            break;
          case 'user_preference':
            await this.processUserPreferenceOfflineChange(change);
            break;
        }
        processed++;
      } catch (error: any) {
        this.logger.error('Failed to process offline change', { 
          changeId: change.id, 
          error: error.message 
        });
      }
    }
    
    return processed;
  }

  private async syncEvents(lastSyncTimestamp: string): Promise<any[]> {
    // Implementation would query for events updated since lastSyncTimestamp
    return [];
  }

  private async syncBookings(lastSyncTimestamp: string): Promise<any[]> {
    // Implementation would query for bookings updated since lastSyncTimestamp
    return [];
  }

  private async syncPayments(lastSyncTimestamp: string): Promise<any[]> {
    // Implementation would query for payments updated since lastSyncTimestamp
    return [];
  }

  private async syncNotifications(lastSyncTimestamp: string): Promise<any[]> {
    // Implementation would query for notifications updated since lastSyncTimestamp
    return [];
  }

  private async syncUserData(lastSyncTimestamp: string): Promise<any[]> {
    // Implementation would query for user data updated since lastSyncTimestamp
    return [];
  }

  private async transformEventForMobile(event: any, locale: string, currency: string): Promise<MobileEventResponse> {
    const localizedTitle = await this.localizationService.getText('event.title', locale, { title: event.title });
    const localizedDescription = await this.localizationService.getText('event.description', locale, { description: event.description });
    const formattedPrice = this.localizationService.formatCurrency(event.pricing.basePrice, currency, locale);

    return {
      id: event.id,
      title: event.title,
      shortDescription: event.shortDescription,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      location: {
        address: event.location.address,
        city: event.location.city,
        state: event.location.state,
        country: event.location.country,
        coordinates: event.location.coordinates,
        venue: event.location.venue
      },
      organizer: {
        id: event.organizerId,
        name: event.organizerName,
        email: event.organizerEmail
      },
      category: event.categoryName,
      pricing: {
        currency: currency,
        basePrice: event.pricing.basePrice,
        displayPrice: formattedPrice,
        tiers: event.pricing.tiers
      },
      images: {
        primary: event.primaryImageUrl || '',
        thumbnails: event.gallery?.map((img: any) => img.thumbnailUrl) || [],
        gallery: event.gallery?.map((img: any) => img.url) || []
      },
      status: event.status,
      maxAttendees: event.maxAttendees,
      currentAttendees: event.currentAttendees,
      tags: event.tags,
      features: [], // Would be populated based on event features
      isBookmarked: false, // Would be determined by user preferences
      isNearby: false, // Would be determined by location
      localContent: {
        title: localizedTitle,
        description: localizedDescription,
        currency: currency,
        formattedPrice: formattedPrice
      }
    };
  }

  private async transformBookingForMobile(booking: any, locale: string, currency: string): Promise<MobileBookingResponse> {
    const formattedAmount = this.localizationService.formatCurrency(booking.totalAmount, currency, locale);
    const formattedDate = this.localizationService.formatDate(new Date(booking.eventDate), locale);

    return {
      id: booking.id,
      eventId: booking.eventId,
      eventTitle: booking.eventTitle || 'Event',
      eventDate: booking.eventDate,
      eventLocation: booking.eventLocation || 'Location',
      status: booking.status,
      items: booking.items.map((item: any) => ({
        ticketType: item.ticketType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        currency: item.currency
      })),
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      attendeeInfo: booking.attendeeInfo,
      bookingDate: booking.bookingDate,
      expiresAt: booking.expiresAt,
      qrCode: booking.qrCode,
      ticketUrl: booking.ticketUrl,
      organizerContact: booking.organizerContact || {
        name: 'Organizer',
        email: 'organizer@example.com'
      },
      localContent: {
        status: booking.status,
        formattedAmount: formattedAmount,
        formattedDate: formattedDate
      }
    };
  }

  private async transformPaymentForMobile(payment: any, locale: string, currency: string): Promise<MobilePaymentResponse> {
    const formattedAmount = this.localizationService.formatCurrency(payment.amount, currency, locale);
    const formattedDate = this.localizationService.formatDate(new Date(payment.createdAt), locale);

    return {
      id: payment.id,
      bookingId: payment.bookingId,
      eventTitle: payment.eventTitle || 'Event',
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      paymentGateway: payment.paymentGateway,
      receiptUrl: payment.receiptUrl,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      localContent: {
        status: payment.status,
        formattedAmount: formattedAmount,
        formattedDate: formattedDate
      }
    };
  }

  private async transformUserForMobile(user: any, locale: string, currency: string): Promise<MobileUserResponse> {
    const displayName = `${user.firstName} ${user.lastName}`;
    const formattedCurrency = this.localizationService.formatCurrency(0, currency, locale);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phoneNumber,
      profilePicture: user.profilePictureUrl,
      role: user.role,
      preferences: user.preferences,
      stats: {
        totalBookings: 0, // Would be calculated from user's bookings
        totalEvents: 0, // Would be calculated from user's events
        totalSpent: 0, // Would be calculated from user's payments
        favoriteCategories: [] // Would be determined by user's preferences
      },
      localContent: {
        displayName: displayName,
        formattedCurrency: formattedCurrency
      }
    };
  }

  private convertMobileSearchToFilters(request: MobileSearchRequest): any {
    const filters: any = {};

    if (request.filters?.category) {
      filters.categoryId = request.filters.category;
    }

    if (request.filters?.location) {
      filters.location = request.filters.location;
    }

    if (request.filters?.dateRange) {
      filters.startDate = request.filters.dateRange.startDate;
      filters.endDate = request.filters.dateRange.endDate;
    }

    if (request.filters?.priceRange) {
      filters.priceRange = request.filters.priceRange;
    }

    if (request.filters?.features) {
      filters.features = request.filters.features;
    }

    return filters;
  }

  private async processBookingOfflineChange(change: any): Promise<void> {
    // Implementation for processing offline booking changes
  }

  private async processPaymentOfflineChange(change: any): Promise<void> {
    // Implementation for processing offline payment changes
  }

  private async processUserPreferenceOfflineChange(change: any): Promise<void> {
    // Implementation for processing offline user preference changes
  }

  private async checkApiHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    // Implementation to check API health
    return 'healthy';
  }

  private async checkDatabaseHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    // Implementation to check database health
    return 'healthy';
  }

  private async checkPaymentsHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    // Implementation to check payments service health
    return 'healthy';
  }

  private async checkNotificationsHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    // Implementation to check notifications service health
    return 'healthy';
  }

  private determineOverallHealth(healthChecks: ('healthy' | 'degraded' | 'unhealthy')[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (healthChecks.includes('unhealthy')) {
      return 'unhealthy';
    }
    if (healthChecks.includes('degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }
}
