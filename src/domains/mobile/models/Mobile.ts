// Mobile-specific models for Compose Multiplatform integration

export interface MobileAppConfig {
  version: string;
  buildNumber: string;
  platform: 'android' | 'ios' | 'desktop' | 'web';
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  supportedFeatures: string[];
  capabilities: {
    pushNotifications: boolean;
    biometricAuth: boolean;
    offlineMode: boolean;
    locationServices: boolean;
    camera: boolean;
    fileStorage: boolean;
  };
}

export interface MobileSyncRequest {
  lastSyncTimestamp: string;
  deviceId: string;
  syncTypes: ('events' | 'bookings' | 'payments' | 'notifications' | 'user')[];
  offlineChanges?: OfflineChange[];
}

export interface OfflineChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'booking' | 'payment' | 'user_preference';
  entityId: string;
  data: any;
  timestamp: string;
  deviceId: string;
}

export interface MobileSyncResponse {
  success: boolean;
  lastSyncTimestamp: string;
  changes: {
    events: EventChange[];
    bookings: BookingChange[];
    payments: PaymentChange[];
    notifications: NotificationChange[];
    user: UserChange[];
  };
  conflicts: SyncConflict[];
  offlineChangesProcessed: number;
}

export interface EventChange {
  type: 'created' | 'updated' | 'deleted';
  eventId: string;
  data?: any;
  timestamp: string;
}

export interface BookingChange {
  type: 'created' | 'updated' | 'deleted';
  bookingId: string;
  data?: any;
  timestamp: string;
}

export interface PaymentChange {
  type: 'created' | 'updated' | 'deleted';
  paymentId: string;
  data?: any;
  timestamp: string;
}

export interface NotificationChange {
  type: 'created' | 'updated' | 'deleted';
  notificationId: string;
  data?: any;
  timestamp: string;
}

export interface UserChange {
  type: 'created' | 'updated' | 'deleted';
  userId: string;
  data?: any;
  timestamp: string;
}

export interface SyncConflict {
  entityType: string;
  entityId: string;
  localVersion: any;
  serverVersion: any;
  resolution: 'local' | 'server' | 'manual';
}

export interface PushNotificationToken {
  userId: string;
  deviceId: string;
  platform: 'android' | 'ios' | 'desktop' | 'web';
  token: string;
  isActive: boolean;
  preferences: {
    events: boolean;
    bookings: boolean;
    payments: boolean;
    marketing: boolean;
    reminders: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PushNotificationRequest {
  userId?: string;
  deviceId?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  category: 'event' | 'booking' | 'payment' | 'reminder' | 'marketing';
  priority: 'high' | 'normal' | 'low';
  ttl?: number;
  badge?: number;
  sound?: string;
}

export interface MobileEventResponse {
  id: string;
  title: string;
  shortDescription?: string;
  description: string;
  startDate: string;
  endDate: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    venue?: {
      name: string;
      capacity?: number;
    };
  };
  organizer: {
    id: string;
    name: string;
    email: string;
  };
  category: string;
  pricing: {
    currency: string;
    basePrice: number;
    displayPrice: string;
    tiers?: Array<{
      name: string;
      price: number;
      availableQuantity: number;
    }>;
  };
  images: {
    primary: string;
    thumbnails: string[];
    gallery: string[];
  };
  status: string;
  maxAttendees: number;
  currentAttendees: number;
  tags: string[];
  features: string[];
  isBookmarked: boolean;
  isNearby: boolean;
  distance?: number;
  localContent: {
    title: string;
    description: string;
    currency: string;
    formattedPrice: string;
  };
}

export interface MobileBookingResponse {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  status: string;
  items: Array<{
    ticketType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    currency: string;
  }>;
  totalAmount: number;
  currency: string;
  attendeeInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  bookingDate: string;
  expiresAt: string;
  qrCode?: string;
  ticketUrl?: string;
  organizerContact: {
    name: string;
    email: string;
    phone?: string;
  };
  localContent: {
    status: string;
    formattedAmount: string;
    formattedDate: string;
  };
}

export interface MobilePaymentResponse {
  id: string;
  bookingId: string;
  eventTitle: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paymentGateway: string;
  receiptUrl?: string;
  createdAt: string;
  processedAt?: string;
  localContent: {
    status: string;
    formattedAmount: string;
    formattedDate: string;
  };
}

export interface MobileUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profilePicture?: string;
  role: string;
  preferences: {
    language: string;
    currency: string;
    timezone: string;
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
  };
  stats: {
    totalBookings: number;
    totalEvents: number;
    totalSpent: number;
    favoriteCategories: string[];
  };
  localContent: {
    displayName: string;
    formattedCurrency: string;
  };
}

export interface MobileSearchRequest {
  query: string;
  filters?: {
    category?: string;
    location?: {
      latitude?: number;
      longitude?: number;
      radius?: number;
      city?: string;
    };
    dateRange?: {
      startDate?: string;
      endDate?: string;
    };
    priceRange?: {
      min?: number;
      max?: number;
    };
    features?: string[];
  };
  sortBy?: 'relevance' | 'date' | 'price' | 'distance' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page: number;
  limit: number;
  locale: string;
  currency: string;
}

export interface MobileSearchResponse {
  events: MobileEventResponse[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  suggestions: string[];
  filters: {
    categories: Array<{ id: string; name: string; count: number }>;
    locations: Array<{ city: string; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
  };
  metadata: {
    query: string;
    processingTime: number;
    locale: string;
    currency: string;
  };
}

export interface MobileLocationRequest {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
  locale: string;
  currency: string;
}

export interface MobileLocationResponse {
  events: MobileEventResponse[];
  total: number;
  location: {
    latitude: number;
    longitude: number;
    radius: number;
    city?: string;
    country?: string;
  };
  metadata: {
    processingTime: number;
    locale: string;
    currency: string;
  };
}

export interface MobileOfflineData {
  events: MobileEventResponse[];
  userBookings: MobileBookingResponse[];
  userPayments: MobilePaymentResponse[];
  userProfile: MobileUserResponse;
  lastSyncTimestamp: string;
  deviceId: string;
}

export interface MobileAnalytics {
  sessionId: string;
  userId?: string;
  deviceId: string;
  platform: string;
  appVersion: string;
  events: Array<{
    name: string;
    timestamp: string;
    properties?: Record<string, any>;
  }>;
  screenViews: Array<{
    screen: string;
    timestamp: string;
    duration?: number;
  }>;
  userActions: Array<{
    action: string;
    timestamp: string;
    target?: string;
    properties?: Record<string, any>;
  }>;
}

export interface MobileErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    localizedMessage?: string;
    details?: any;
    retryable: boolean;
    offlineFallback?: boolean;
  };
  timestamp: string;
  correlationId: string;
}

export interface MobileHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    api: 'healthy' | 'degraded' | 'unhealthy';
    database: 'healthy' | 'degraded' | 'unhealthy';
    payments: 'healthy' | 'degraded' | 'unhealthy';
    notifications: 'healthy' | 'degraded' | 'unhealthy';
  };
  version: string;
  timestamp: string;
  features: {
    offlineMode: boolean;
    pushNotifications: boolean;
    locationServices: boolean;
    biometricAuth: boolean;
  };
}
