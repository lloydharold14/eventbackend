// Joi validation schemas for all domain entities

import Joi from 'joi';
import { UserRole, EventStatus, BookingStatus, PaymentStatus, PaymentMethod, RefundPolicy } from '../types/common';

// Base validation schemas
export const baseEntitySchema = Joi.object({
  id: Joi.string().uuid().required(),
  createdAt: Joi.date().iso().required(),
  updatedAt: Joi.date().iso().required(),
  version: Joi.number().integer().min(0).required()
});

// User validation schemas
export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username cannot exceed 30 characters',
    'any.required': 'Username is required'
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required'
  }),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required'
  }),
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  dateOfBirth: Joi.date().max('now').optional().messages({
    'date.max': 'Date of birth cannot be in the future'
  }),
  acceptTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must accept the terms and conditions',
    'any.required': 'Terms and conditions acceptance is required'
  }),
  marketingConsent: Joi.boolean().optional(),
  role: Joi.string().valid(...Object.values(UserRole)).default(UserRole.ORGANIZER).messages({
    'any.only': 'Invalid user role'
  })
});

export const userLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  }),
  rememberMe: Joi.boolean().optional()
});

export const userUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters'
  }),
  lastName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters'
  }),
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  dateOfBirth: Joi.date().max('now').optional().messages({
    'date.max': 'Date of birth cannot be in the future'
  }),
  profilePictureUrl: Joi.string().uri().optional().messages({
    'string.uri': 'Please provide a valid URL for profile picture'
  }),
  bio: Joi.string().max(500).optional().messages({
    'string.max': 'Bio cannot exceed 500 characters'
  }),
  preferences: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    smsNotifications: Joi.boolean().optional(),
    pushNotifications: Joi.boolean().optional(),
    marketingEmails: Joi.boolean().optional(),
    language: Joi.string().length(2).optional(),
    timezone: Joi.string().optional(),
    currency: Joi.string().length(3).optional(),
    privacySettings: Joi.object({
      profileVisibility: Joi.string().valid('public', 'private', 'friends').optional(),
      showEmail: Joi.boolean().optional(),
      showPhone: Joi.boolean().optional(),
      showDateOfBirth: Joi.boolean().optional(),
      allowDirectMessages: Joi.boolean().optional()
    }).optional()
  }).optional(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    postalCode: Joi.string().required(),
    isDefault: Joi.boolean().optional()
  }).optional(),
  socialLinks: Joi.object({
    website: Joi.string().uri().optional(),
    twitter: Joi.string().optional(),
    linkedin: Joi.string().optional(),
    instagram: Joi.string().optional(),
    facebook: Joi.string().optional()
  }).optional()
});

export const userSearchSchema = Joi.object({
  role: Joi.string().valid('admin', 'organizer', 'attendee').optional(),
  status: Joi.string().valid('active', 'pending_verification', 'suspended').optional(),
  emailVerified: Joi.boolean().optional(),
  phoneVerified: Joi.boolean().optional(),
  createdAfter: Joi.date().optional(),
  createdBefore: Joi.date().optional(),
  searchTerm: Joi.string().min(2).optional().messages({
    'string.min': 'Search term must be at least 2 characters long'
  })
});

export const emailVerificationSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Verification token is required'
  })
});

export const phoneVerificationSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,}$/).required().messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'any.required': 'Phone number is required'
  }),
  code: Joi.string().length(6).pattern(/^\d{6}$/).required().messages({
    'string.length': 'Verification code must be 6 digits',
    'string.pattern.base': 'Verification code must contain only numbers',
    'any.required': 'Verification code is required'
  })
});

export const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
    'string.min': 'New password must be at least 8 characters long',
    'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'New password is required'
  })
});

export const passwordResetSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

export const passwordResetConfirmSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
    'string.min': 'New password must be at least 8 characters long',
    'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'New password is required'
  })
});

// Event validation schemas
export const eventLocationSchema = Joi.object({
  type: Joi.string().valid('physical', 'virtual', 'hybrid').required(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    postalCode: Joi.string().required()
  }).when('type', {
    is: 'physical',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  venue: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    capacity: Joi.number().positive().optional(),
    amenities: Joi.array().items(Joi.string()).optional()
  }).optional(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }).optional(),
  virtualMeetingUrl: Joi.string().uri().when('type', {
    is: Joi.string().valid('virtual', 'hybrid'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  virtualMeetingPlatform: Joi.string().when('type', {
    is: Joi.string().valid('virtual', 'hybrid'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  virtualMeetingInstructions: Joi.string().optional()
});

export const eventSettingsSchema = Joi.object({
  allowWaitlist: Joi.boolean().default(true),
  allowCancellations: Joi.boolean().default(true),
  cancellationPolicy: Joi.string().max(1000).optional(),
  refundPolicy: Joi.string().max(1000).optional(),
  requireApproval: Joi.boolean().default(false),
  maxAttendeesPerBooking: Joi.number().integer().min(1).max(100).default(10),
  allowGroupBookings: Joi.boolean().default(true),
  maxGroupSize: Joi.number().integer().min(2).optional(),
  requirePaymentConfirmation: Joi.boolean().default(true),
  sendReminders: Joi.boolean().default(true),
  reminderSchedule: Joi.object({
    daysBefore: Joi.array().items(Joi.number().integer().min(1).max(365)).optional(),
    hoursBefore: Joi.array().items(Joi.number().integer().min(1).max(168)).optional()
  }).optional(),
  allowSocialSharing: Joi.boolean().default(true),
  allowComments: Joi.boolean().default(true),
  requireModeration: Joi.boolean().default(false),
  customFields: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('text', 'number', 'email', 'phone', 'select', 'checkbox').required(),
    required: Joi.boolean().default(false),
    options: Joi.array().items(Joi.string()).when('type', {
      is: 'select',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    placeholder: Joi.string().optional()
  })).max(20).optional().messages({
    'array.max': 'Cannot have more than 20 custom fields'
  })
});

export const eventCreationSchema = Joi.object({
  title: Joi.string().min(3).max(200).required().messages({
    'string.empty': 'Event title is required',
    'string.min': 'Event title must be at least 3 characters long',
    'string.max': 'Event title cannot exceed 200 characters',
    'any.required': 'Event title is required'
  }),
  description: Joi.string().min(10).max(5000).required().messages({
    'string.empty': 'Event description is required',
    'string.min': 'Event description must be at least 10 characters long',
    'string.max': 'Event description cannot exceed 5000 characters',
    'any.required': 'Event description is required'
  }),
  shortDescription: Joi.string().max(500).optional().messages({
    'string.max': 'Short description cannot exceed 500 characters'
  }),
  categoryId: Joi.string().uuid().required().messages({
    'string.empty': 'Event category is required',
    'string.guid': 'Invalid category ID format',
    'any.required': 'Event category is required'
  }),
  type: Joi.string().valid('conference', 'workshop', 'seminar', 'webinar', 'concert', 'sports', 'exhibition', 'networking', 'hackathon', 'meetup', 'trade_show', 'festival', 'other').required().messages({
    'string.empty': 'Event type is required',
    'any.only': 'Invalid event type',
    'any.required': 'Event type is required'
  }),
  visibility: Joi.string().valid('public', 'private', 'invite_only').required().messages({
    'string.empty': 'Event visibility is required',
    'any.only': 'Invalid visibility setting',
    'any.required': 'Event visibility is required'
  }),
  startDate: Joi.date().greater('now').required().messages({
    'date.base': 'Invalid start date format',
    'date.greater': 'Start date must be in the future',
    'any.required': 'Start date is required'
  }),
  endDate: Joi.date().greater(Joi.ref('startDate')).required().messages({
    'date.base': 'Invalid end date format',
    'date.greater': 'End date must be after start date',
    'any.required': 'End date is required'
  }),
  timezone: Joi.string().required().messages({
    'string.empty': 'Timezone is required',
    'any.required': 'Timezone is required'
  }),
  isAllDay: Joi.boolean().default(false),
  location: eventLocationSchema.required().messages({
    'object.base': 'Location information is required',
    'any.required': 'Location information is required'
  }),
  maxAttendees: Joi.number().integer().min(1).max(100000).required().messages({
    'number.base': 'Maximum attendees must be a number',
    'number.integer': 'Maximum attendees must be a whole number',
    'number.min': 'Maximum attendees must be at least 1',
    'number.max': 'Maximum attendees cannot exceed 100,000',
    'any.required': 'Maximum attendees is required'
  }),
  pricing: Joi.object({
    model: Joi.string().valid('free', 'paid', 'donation', 'tiered').required(),
    currency: Joi.string().length(3).required(),
    basePrice: Joi.number().min(0).when('model', {
      is: 'free',
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    tiers: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      price: Joi.number().min(0).required(),
      description: Joi.string().optional(),
      availableQuantity: Joi.number().positive().optional(),
      earlyBirdPrice: Joi.number().min(0).optional(),
      earlyBirdEndDate: Joi.date().greater('now').optional()
    })).when('model', {
      is: 'tiered',
      then: Joi.array().min(1).required(),
      otherwise: Joi.array().optional()
    }),
    earlyBirdDiscount: Joi.object({
      percentage: Joi.number().min(0).max(100).required(),
      endDate: Joi.date().greater('now').required()
    }).optional(),
    groupDiscount: Joi.object({
      minAttendees: Joi.number().integer().min(2).required(),
      percentage: Joi.number().min(0).max(100).required()
    }).optional(),
    taxRate: Joi.number().min(0).max(100).optional(),
    processingFee: Joi.number().min(0).optional()
  }).required().messages({
    'object.base': 'Pricing information is required',
    'any.required': 'Pricing information is required'
  }),
  tags: Joi.array().items(Joi.string().min(1).max(50)).max(20).optional().messages({
    'array.max': 'Cannot have more than 20 tags'
  }),
  keywords: Joi.array().items(Joi.string().min(1).max(100)).max(50).optional().messages({
    'array.max': 'Cannot have more than 50 keywords'
  }),
  settings: eventSettingsSchema.optional(),
  seoTitle: Joi.string().max(60).optional().messages({
    'string.max': 'SEO title cannot exceed 60 characters'
  }),
  seoDescription: Joi.string().max(160).optional().messages({
    'string.max': 'SEO description cannot exceed 160 characters'
  }),
  seoKeywords: Joi.array().items(Joi.string().min(1).max(50)).max(10).optional().messages({
    'array.max': 'Cannot have more than 10 SEO keywords'
  })
});

export const eventUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional().messages({
    'string.min': 'Event title must be at least 3 characters long',
    'string.max': 'Event title cannot exceed 200 characters'
  }),
  description: Joi.string().min(10).max(5000).optional().messages({
    'string.min': 'Event description must be at least 10 characters long',
    'string.max': 'Event description cannot exceed 5000 characters'
  }),
  shortDescription: Joi.string().max(500).optional().messages({
    'string.max': 'Short description cannot exceed 500 characters'
  }),
  categoryId: Joi.string().uuid().optional().messages({
    'string.guid': 'Invalid category ID format'
  }),
  type: Joi.string().valid('conference', 'workshop', 'seminar', 'webinar', 'concert', 'sports', 'exhibition', 'networking', 'hackathon', 'meetup', 'trade_show', 'festival', 'other').optional().messages({
    'any.only': 'Invalid event type'
  }),
  visibility: Joi.string().valid('public', 'private', 'invite_only').optional().messages({
    'any.only': 'Invalid visibility setting'
  }),
  startDate: Joi.date().greater('now').optional().messages({
    'date.base': 'Invalid start date format',
    'date.greater': 'Start date must be in the future'
  }),
  endDate: Joi.date().greater(Joi.ref('startDate')).optional().messages({
    'date.base': 'Invalid end date format',
    'date.greater': 'End date must be after start date'
  }),
  timezone: Joi.string().optional(),
  isAllDay: Joi.boolean().optional(),
  location: eventLocationSchema.optional(),
  maxAttendees: Joi.number().integer().min(1).max(100000).optional().messages({
    'number.integer': 'Maximum attendees must be a whole number',
    'number.min': 'Maximum attendees must be at least 1',
    'number.max': 'Maximum attendees cannot exceed 100,000'
  }),
  pricing: Joi.object({
    model: Joi.string().valid('free', 'paid', 'donation', 'tiered').required(),
    currency: Joi.string().length(3).required(),
    basePrice: Joi.number().min(0).when('model', {
      is: 'free',
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    tiers: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      price: Joi.number().min(0).required(),
      description: Joi.string().optional(),
      availableQuantity: Joi.number().positive().optional(),
      earlyBirdPrice: Joi.number().min(0).optional(),
      earlyBirdEndDate: Joi.date().greater('now').optional()
    })).when('model', {
      is: 'tiered',
      then: Joi.array().min(1).required(),
      otherwise: Joi.array().optional()
    }),
    earlyBirdDiscount: Joi.object({
      percentage: Joi.number().min(0).max(100).required(),
      endDate: Joi.date().greater('now').required()
    }).optional(),
    groupDiscount: Joi.object({
      minAttendees: Joi.number().integer().min(2).required(),
      percentage: Joi.number().min(0).max(100).required()
    }).optional(),
    taxRate: Joi.number().min(0).max(100).optional(),
    processingFee: Joi.number().min(0).optional()
  }).optional(),
  tags: Joi.array().items(Joi.string().min(1).max(50)).max(20).optional().messages({
    'array.max': 'Cannot have more than 20 tags'
  }),
  keywords: Joi.array().items(Joi.string().min(1).max(100)).max(50).optional().messages({
    'array.max': 'Cannot have more than 50 keywords'
  }),
  settings: eventSettingsSchema.optional(),
  seoTitle: Joi.string().max(60).optional().messages({
    'string.max': 'SEO title cannot exceed 60 characters'
  }),
  seoDescription: Joi.string().max(160).optional().messages({
    'string.max': 'SEO description cannot exceed 160 characters'
  }),
  seoKeywords: Joi.array().items(Joi.string().min(1).max(50)).max(10).optional().messages({
    'array.max': 'Cannot have more than 10 SEO keywords'
  })
});

export const eventCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Category name is required',
    'string.min': 'Category name must be at least 2 characters long',
    'string.max': 'Category name cannot exceed 100 characters',
    'any.required': 'Category name is required'
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Category description cannot exceed 500 characters'
  }),
  icon: Joi.string().max(50).optional().messages({
    'string.max': 'Icon name cannot exceed 50 characters'
  }),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional().messages({
    'string.pattern.base': 'Color must be a valid hex color code (e.g., #FF0000)'
  }),
  parentCategoryId: Joi.string().uuid().optional().messages({
    'string.guid': 'Invalid parent category ID format'
  })
});

export const eventMediaSchema = Joi.object({
  type: Joi.string().valid('image', 'video', 'document', 'audio').required().messages({
    'string.empty': 'Media type is required',
    'any.only': 'Invalid media type',
    'any.required': 'Media type is required'
  }),
  url: Joi.string().uri().required().messages({
    'string.empty': 'Media URL is required',
    'string.uri': 'Invalid URL format',
    'any.required': 'Media URL is required'
  }),
  thumbnailUrl: Joi.string().uri().optional().messages({
    'string.uri': 'Invalid thumbnail URL format'
  }),
  filename: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Filename is required',
    'string.max': 'Filename cannot exceed 255 characters',
    'any.required': 'Filename is required'
  }),
  fileSize: Joi.number().positive().max(100 * 1024 * 1024).required().messages({
    'number.base': 'File size must be a number',
    'number.positive': 'File size must be positive',
    'number.max': 'File size cannot exceed 100MB',
    'any.required': 'File size is required'
  }),
  mimeType: Joi.string().required().messages({
    'string.empty': 'MIME type is required',
    'any.required': 'MIME type is required'
  }),
  isPrimary: Joi.boolean().default(false),
  altText: Joi.string().max(255).optional().messages({
    'string.max': 'Alt text cannot exceed 255 characters'
  }),
  caption: Joi.string().max(500).optional().messages({
    'string.max': 'Caption cannot exceed 500 characters'
  })
});

// Booking validation schemas
export const bookingCreationSchema = Joi.object({
  eventId: Joi.string().uuid().required().messages({
    'string.guid': 'Event ID must be a valid UUID',
    'any.required': 'Event ID is required'
  }),
  ticketQuantity: Joi.number().integer().min(1).max(100).required().messages({
    'number.min': 'Ticket quantity must be at least 1',
    'number.max': 'Ticket quantity cannot exceed 100',
    'any.required': 'Ticket quantity is required'
  }),
  attendeeInfo: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
  }).required()
});

export const bookingUpdateSchema = Joi.object({
  status: Joi.string().valid(...Object.values(BookingStatus)).optional(),
  checkInStatus: Joi.string().valid('not_checked_in', 'checked_in', 'no_show').optional()
});

// Payment validation schemas
export const paymentCreationSchema = Joi.object({
  bookingId: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Payment amount must be positive',
    'number.precision': 'Payment amount must have maximum 2 decimal places',
    'any.required': 'Payment amount is required'
  }),
  currency: Joi.string().length(3).default('USD').required(),
  paymentMethod: Joi.string().valid(...Object.values(PaymentMethod)).required(),
  stripePaymentIntentId: Joi.string().optional()
});

export const paymentUpdateSchema = Joi.object({
  status: Joi.string().valid(...Object.values(PaymentStatus)).optional(),
  refundAmount: Joi.number().positive().precision(2).optional(),
  refundReason: Joi.string().max(500).optional()
});

// Search and filtering schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'startDate', 'price').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const eventSearchSchema = Joi.object({
  query: Joi.string().min(2).max(100).optional(),
  category: Joi.string().optional(),
  location: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  status: Joi.string().valid(...Object.values(EventStatus)).optional(),
  organizerId: Joi.string().uuid().optional()
}).concat(paginationSchema);

// Authentication schemas
export const tokenValidationSchema = Joi.object({
  token: Joi.string().required(),
  correlationId: Joi.string().uuid().optional()
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// Webhook validation schemas
export const stripeWebhookSchema = Joi.object({
  type: Joi.string().required(),
  data: Joi.object({
    object: Joi.object().required()
  }).required(),
  created: Joi.number().required()
});

// File upload schemas
export const fileUploadSchema = Joi.object({
  file: Joi.object({
    mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/webp').required(),
    size: Joi.number().max(5 * 1024 * 1024).required(), // 5MB max
    originalname: Joi.string().required()
  }).required()
});

// Notification schemas
export const notificationSchema = Joi.object({
  recipientId: Joi.string().uuid().required(),
  type: Joi.string().valid('email', 'sms', 'push').required(),
  subject: Joi.string().max(200).required(),
  message: Joi.string().max(2000).required(),
  metadata: Joi.object().optional()
});

// Validation helper functions
export function validateSchema<T>(schema: Joi.Schema, data: any): { isValid: boolean; data?: T; errors?: Joi.ValidationError } {
  const result = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false
  });

  if (result.error) {
    return {
      isValid: false,
      errors: result.error
    };
  }

  return {
    isValid: true,
    data: result.value as T
  };
}

// Type-safe validation helper
export function validateSchemaTyped<T>(schema: Joi.Schema, data: any): { isValid: true; data: T } | { isValid: false; errors: Joi.ValidationError } {
  const result = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false
  });

  if (result.error) {
    return {
      isValid: false,
      errors: result.error
    };
  }

  return {
    isValid: true,
    data: result.value as T
  };
}

export function sanitizeInput<T>(schema: Joi.Schema, data: any): T {
  const result = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false
  });
  
  if (result.error) {
    throw new Error(`Validation failed: ${result.error.details.map((d: any) => d.message).join(', ')}`);
  }
  
  return result.value as T;
}

// Custom validation rules
export const customValidationRules = {
  // Validate that end date is after start date
  endDateAfterStart: (value: any, helpers: Joi.CustomHelpers) => {
    const { startDate } = helpers.state.ancestors[0];
    if (startDate && value <= startDate) {
      return helpers.error('any.invalid');
    }
    return value;
  },

  // Validate phone number format
  phoneFormat: (value: any, helpers: Joi.CustomHelpers) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  },

  // Validate currency code
  currencyCode: (value: any, helpers: Joi.CustomHelpers) => {
    const currencyRegex = /^[A-Z]{3}$/;
    if (!currencyRegex.test(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }
};

// Booking validation schemas
export const createBookingSchema = Joi.object({
  eventId: Joi.string().uuid().required().messages({
    'string.guid': 'Event ID must be a valid UUID',
    'any.required': 'Event ID is required'
  }),
  items: Joi.array().items(Joi.object({
    ticketType: Joi.string().valid('general', 'vip', 'early_bird', 'student', 'senior', 'child').required().messages({
      'any.only': 'Invalid ticket type',
      'any.required': 'Ticket type is required'
    }),
    quantity: Joi.number().integer().min(1).max(100).required().messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be a whole number',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 100',
      'any.required': 'Quantity is required'
    }),
    ticketDetails: Joi.object({
      seatNumber: Joi.string().max(20).optional().messages({
        'string.max': 'Seat number cannot exceed 20 characters'
      }),
      section: Joi.string().max(50).optional().messages({
        'string.max': 'Section cannot exceed 50 characters'
      }),
      row: Joi.string().max(20).optional().messages({
        'string.max': 'Row cannot exceed 20 characters'
      }),
      specialRequirements: Joi.array().items(Joi.string().max(200)).max(10).optional().messages({
        'array.max': 'Cannot have more than 10 special requirements',
        'string.max': 'Special requirement cannot exceed 200 characters'
      })
    }).optional()
  })).min(1).required().messages({
    'array.min': 'At least one booking item is required',
    'any.required': 'Booking items are required'
  }),
  attendeeInfo: Joi.object({
    firstName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,}$/).optional().messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
    specialRequirements: Joi.array().items(Joi.string().max(200)).max(10).optional().messages({
      'array.max': 'Cannot have more than 10 special requirements',
      'string.max': 'Special requirement cannot exceed 200 characters'
    })
  }).required().messages({
    'any.required': 'Attendee information is required'
  }),
  paymentMethodId: Joi.string().required().messages({
    'any.required': 'Payment method ID is required'
  }),
  notes: Joi.string().max(1000).optional().messages({
    'string.max': 'Notes cannot exceed 1000 characters'
  })
});

export const updateBookingSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'refunded', 'expired').optional().messages({
    'any.only': 'Invalid booking status'
  }),
  attendeeInfo: Joi.object({
    firstName: Joi.string().min(2).max(50).optional().messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters'
    }),
    lastName: Joi.string().min(2).max(50).optional().messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
    email: Joi.string().email().optional().messages({
      'string.email': 'Please provide a valid email address'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,}$/).optional().messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
    specialRequirements: Joi.array().items(Joi.string().max(200)).max(10).optional().messages({
      'array.max': 'Cannot have more than 10 special requirements',
      'string.max': 'Special requirement cannot exceed 200 characters'
    })
  }).optional(),
  notes: Joi.string().max(1000).optional().messages({
    'string.max': 'Notes cannot exceed 1000 characters'
  }),
  metadata: Joi.object().optional()
});

export const bookingFiltersSchema = Joi.object({
  userId: Joi.string().uuid().optional().messages({
    'string.guid': 'User ID must be a valid UUID'
  }),
  eventId: Joi.string().uuid().optional().messages({
    'string.guid': 'Event ID must be a valid UUID'
  }),
  organizerId: Joi.string().uuid().optional().messages({
    'string.guid': 'Organizer ID must be a valid UUID'
  }),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'refunded', 'expired').optional().messages({
    'any.only': 'Invalid booking status'
  }),
  paymentStatus: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled').optional().messages({
    'any.only': 'Invalid payment status'
  }),
  startDate: Joi.date().iso().optional().messages({
    'date.format': 'Start date must be a valid ISO date'
  }),
  endDate: Joi.date().iso().optional().messages({
    'date.format': 'End date must be a valid ISO date'
  }),
  page: Joi.number().integer().min(1).max(1000).optional().messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be a whole number',
    'number.min': 'Page must be at least 1',
    'number.max': 'Page cannot exceed 1000'
  }),
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be a whole number',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100'
  })
});
