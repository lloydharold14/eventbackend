import Joi from 'joi';

// Mobile Sync Request Schema
export const mobileSyncSchema = Joi.object({
  lastSyncTimestamp: Joi.string().isoDate().required(),
  deviceId: Joi.string().required(),
  syncTypes: Joi.array().items(
    Joi.string().valid('events', 'bookings', 'payments', 'notifications', 'user')
  ).min(1).required(),
  offlineChanges: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      type: Joi.string().valid('create', 'update', 'delete').required(),
      entityType: Joi.string().valid('booking', 'payment', 'user_preference').required(),
      entityId: Joi.string().required(),
      data: Joi.object().required(),
      timestamp: Joi.string().isoDate().required(),
      deviceId: Joi.string().required()
    })
  ).optional()
});

// Push Notification Token Schema
export const pushNotificationTokenSchema = Joi.object({
  userId: Joi.string().required(),
  deviceId: Joi.string().required(),
  platform: Joi.string().valid('android', 'ios', 'desktop', 'web').required(),
  token: Joi.string().required(),
  isActive: Joi.boolean().default(true),
  preferences: Joi.object({
    events: Joi.boolean().default(true),
    bookings: Joi.boolean().default(true),
    payments: Joi.boolean().default(true),
    marketing: Joi.boolean().default(false),
    reminders: Joi.boolean().default(true)
  }).default({
    events: true,
    bookings: true,
    payments: true,
    marketing: false,
    reminders: true
  })
});

// Push Notification Request Schema
export const pushNotificationRequestSchema = Joi.object({
  userId: Joi.string().optional(),
  deviceId: Joi.string().optional(),
  title: Joi.string().max(100).required(),
  body: Joi.string().max(500).required(),
  data: Joi.object().optional(),
  imageUrl: Joi.string().uri().optional(),
  actionUrl: Joi.string().uri().optional(),
  category: Joi.string().valid('event', 'booking', 'payment', 'reminder', 'marketing').required(),
  priority: Joi.string().valid('high', 'normal', 'low').default('normal'),
  ttl: Joi.number().integer().min(0).max(86400).optional(), // Max 24 hours
  badge: Joi.number().integer().min(0).optional(),
  sound: Joi.string().optional()
});

// Mobile Search Request Schema
export const mobileSearchSchema = Joi.object({
  query: Joi.string().max(200).required(),
  filters: Joi.object({
    category: Joi.string().optional(),
    location: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional(),
      radius: Joi.number().min(1).max(1000).optional(), // km
      city: Joi.string().optional()
    }).optional(),
    dateRange: Joi.object({
      startDate: Joi.string().isoDate().optional(),
      endDate: Joi.string().isoDate().optional()
    }).optional(),
    priceRange: Joi.object({
      min: Joi.number().min(0).optional(),
      max: Joi.number().min(0).optional()
    }).optional(),
    features: Joi.array().items(Joi.string()).optional()
  }).optional(),
  sortBy: Joi.string().valid('relevance', 'date', 'price', 'distance', 'popularity').default('relevance'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  locale: Joi.string().pattern(/^[a-z]{2}-[A-Z]{2}$/).required(),
  currency: Joi.string().length(3).required()
});

// Mobile Location Request Schema
export const mobileLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(1).max(1000).default(50), // km
  limit: Joi.number().integer().min(1).max(100).default(20),
  locale: Joi.string().pattern(/^[a-z]{2}-[A-Z]{2}$/).required(),
  currency: Joi.string().length(3).required()
});

// Mobile Analytics Schema
export const mobileAnalyticsSchema = Joi.object({
  sessionId: Joi.string().required(),
  userId: Joi.string().optional(),
  deviceId: Joi.string().required(),
  platform: Joi.string().valid('android', 'ios', 'desktop', 'web').required(),
  appVersion: Joi.string().required(),
  events: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      timestamp: Joi.string().isoDate().required(),
      properties: Joi.object().optional()
    })
  ).default([]),
  screenViews: Joi.array().items(
    Joi.object({
      screen: Joi.string().required(),
      timestamp: Joi.string().isoDate().required(),
      duration: Joi.number().min(0).optional()
    })
  ).default([]),
  userActions: Joi.array().items(
    Joi.object({
      action: Joi.string().required(),
      timestamp: Joi.string().isoDate().required(),
      target: Joi.string().optional(),
      properties: Joi.object().optional()
    })
  ).default([])
});

// Mobile App Config Schema
export const mobileAppConfigSchema = Joi.object({
  version: Joi.string().required(),
  buildNumber: Joi.string().required(),
  platform: Joi.string().valid('android', 'ios', 'desktop', 'web').required(),
  deviceId: Joi.string().required(),
  deviceModel: Joi.string().required(),
  osVersion: Joi.string().required(),
  appVersion: Joi.string().required(),
  supportedFeatures: Joi.array().items(Joi.string()).default([]),
  capabilities: Joi.object({
    pushNotifications: Joi.boolean().default(false),
    biometricAuth: Joi.boolean().default(false),
    offlineMode: Joi.boolean().default(false),
    locationServices: Joi.boolean().default(false),
    camera: Joi.boolean().default(false),
    fileStorage: Joi.boolean().default(false)
  }).default({
    pushNotifications: false,
    biometricAuth: false,
    offlineMode: false,
    locationServices: false,
    camera: false,
    fileStorage: false
  })
});

// Offline Change Schema
export const offlineChangeSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().valid('create', 'update', 'delete').required(),
  entityType: Joi.string().valid('booking', 'payment', 'user_preference').required(),
  entityId: Joi.string().required(),
  data: Joi.object().required(),
  timestamp: Joi.string().isoDate().required(),
  deviceId: Joi.string().required()
});

// Mobile Event Response Schema
export const mobileEventResponseSchema = Joi.object({
  id: Joi.string().required(),
  title: Joi.string().required(),
  shortDescription: Joi.string().optional(),
  description: Joi.string().required(),
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
  location: Joi.object({
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).optional(),
    venue: Joi.object({
      name: Joi.string().required(),
      capacity: Joi.number().integer().min(0).optional()
    }).optional()
  }).required(),
  organizer: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    email: Joi.string().email().required()
  }).required(),
  category: Joi.string().required(),
  pricing: Joi.object({
    currency: Joi.string().length(3).required(),
    basePrice: Joi.number().min(0).required(),
    displayPrice: Joi.string().required(),
    tiers: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        price: Joi.number().min(0).required(),
        availableQuantity: Joi.number().integer().min(0).required()
      })
    ).optional()
  }).required(),
  images: Joi.object({
    primary: Joi.string().uri().required(),
    thumbnails: Joi.array().items(Joi.string().uri()).default([]),
    gallery: Joi.array().items(Joi.string().uri()).default([])
  }).required(),
  status: Joi.string().required(),
  maxAttendees: Joi.number().integer().min(0).required(),
  currentAttendees: Joi.number().integer().min(0).required(),
  tags: Joi.array().items(Joi.string()).default([]),
  features: Joi.array().items(Joi.string()).default([]),
  isBookmarked: Joi.boolean().default(false),
  isNearby: Joi.boolean().default(false),
  distance: Joi.number().min(0).optional(),
  localContent: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    currency: Joi.string().length(3).required(),
    formattedPrice: Joi.string().required()
  }).required()
});

// Mobile Booking Response Schema
export const mobileBookingResponseSchema = Joi.object({
  id: Joi.string().required(),
  eventId: Joi.string().required(),
  eventTitle: Joi.string().required(),
  eventDate: Joi.string().isoDate().required(),
  eventLocation: Joi.string().required(),
  status: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      ticketType: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      unitPrice: Joi.number().min(0).required(),
      totalPrice: Joi.number().min(0).required(),
      currency: Joi.string().length(3).required()
    })
  ).required(),
  totalAmount: Joi.number().min(0).required(),
  currency: Joi.string().length(3).required(),
  attendeeInfo: Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().optional()
  }).required(),
  bookingDate: Joi.string().isoDate().required(),
  expiresAt: Joi.string().isoDate().required(),
  qrCode: Joi.string().optional(),
  ticketUrl: Joi.string().uri().optional(),
  organizerContact: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().optional()
  }).required(),
  localContent: Joi.object({
    status: Joi.string().required(),
    formattedAmount: Joi.string().required(),
    formattedDate: Joi.string().required()
  }).required()
});

// Mobile Payment Response Schema
export const mobilePaymentResponseSchema = Joi.object({
  id: Joi.string().required(),
  bookingId: Joi.string().required(),
  eventTitle: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().length(3).required(),
  status: Joi.string().required(),
  paymentMethod: Joi.string().required(),
  paymentGateway: Joi.string().required(),
  receiptUrl: Joi.string().uri().optional(),
  createdAt: Joi.string().isoDate().required(),
  processedAt: Joi.string().isoDate().optional(),
  localContent: Joi.object({
    status: Joi.string().required(),
    formattedAmount: Joi.string().required(),
    formattedDate: Joi.string().required()
  }).required()
});

// Mobile User Response Schema
export const mobileUserResponseSchema = Joi.object({
  id: Joi.string().required(),
  email: Joi.string().email().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  phone: Joi.string().optional(),
  profilePicture: Joi.string().uri().optional(),
  role: Joi.string().required(),
  preferences: Joi.object({
    language: Joi.string().required(),
    currency: Joi.string().length(3).required(),
    timezone: Joi.string().required(),
    emailNotifications: Joi.boolean().required(),
    smsNotifications: Joi.boolean().required(),
    pushNotifications: Joi.boolean().required(),
    marketingEmails: Joi.boolean().required()
  }).required(),
  stats: Joi.object({
    totalBookings: Joi.number().integer().min(0).required(),
    totalEvents: Joi.number().integer().min(0).required(),
    totalSpent: Joi.number().min(0).required(),
    favoriteCategories: Joi.array().items(Joi.string()).default([])
  }).required(),
  localContent: Joi.object({
    displayName: Joi.string().required(),
    formattedCurrency: Joi.string().required()
  }).required()
});

// Mobile Search Response Schema
export const mobileSearchResponseSchema = Joi.object({
  events: Joi.array().items(mobileEventResponseSchema).required(),
  total: Joi.number().integer().min(0).required(),
  page: Joi.number().integer().min(1).required(),
  totalPages: Joi.number().integer().min(0).required(),
  hasNextPage: Joi.boolean().required(),
  suggestions: Joi.array().items(Joi.string()).default([]),
  filters: Joi.object({
    categories: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        count: Joi.number().integer().min(0).required()
      })
    ).default([]),
    locations: Joi.array().items(
      Joi.object({
        city: Joi.string().required(),
        count: Joi.number().integer().min(0).required()
      })
    ).default([]),
    priceRanges: Joi.array().items(
      Joi.object({
        range: Joi.string().required(),
        count: Joi.number().integer().min(0).required()
      })
    ).default([])
  }).required(),
  metadata: Joi.object({
    query: Joi.string().required(),
    processingTime: Joi.number().min(0).required(),
    locale: Joi.string().required(),
    currency: Joi.string().length(3).required()
  }).required()
});

// Mobile Location Response Schema
export const mobileLocationResponseSchema = Joi.object({
  events: Joi.array().items(mobileEventResponseSchema).required(),
  total: Joi.number().integer().min(0).required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(1).max(1000).required(),
    city: Joi.string().optional(),
    country: Joi.string().optional()
  }).required(),
  metadata: Joi.object({
    processingTime: Joi.number().min(0).required(),
    locale: Joi.string().required(),
    currency: Joi.string().length(3).required()
  }).required()
});

// Mobile Health Check Schema
export const mobileHealthCheckSchema = Joi.object({
  status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
  services: Joi.object({
    api: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
    database: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
    payments: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
    notifications: Joi.string().valid('healthy', 'degraded', 'unhealthy').required()
  }).required(),
  version: Joi.string().required(),
  timestamp: Joi.string().isoDate().required(),
  features: Joi.object({
    offlineMode: Joi.boolean().required(),
    pushNotifications: Joi.boolean().required(),
    locationServices: Joi.boolean().required(),
    biometricAuth: Joi.boolean().required()
  }).required()
});
