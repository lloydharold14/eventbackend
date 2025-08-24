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
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'any.required': 'Password is required'
  }),
  role: Joi.string().valid(...Object.values(UserRole)).default(UserRole.ORGANIZER).messages({
    'any.only': 'Invalid user role'
  })
});

export const userUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  profileImageUrl: Joi.string().uri().optional()
});

export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Event validation schemas
export const eventLocationSchema = Joi.object({
  address: Joi.string().min(5).max(200).required().messages({
    'string.min': 'Address must be at least 5 characters long',
    'string.max': 'Address cannot exceed 200 characters',
    'any.required': 'Address is required'
  }),
  city: Joi.string().min(2).max(50).required().messages({
    'string.min': 'City must be at least 2 characters long',
    'string.max': 'City cannot exceed 50 characters',
    'any.required': 'City is required'
  }),
  state: Joi.string().min(2).max(50).required().messages({
    'string.min': 'State must be at least 2 characters long',
    'string.max': 'State cannot exceed 50 characters',
    'any.required': 'State is required'
  }),
  country: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Country must be at least 2 characters long',
    'string.max': 'Country cannot exceed 50 characters',
    'any.required': 'Country is required'
  }),
  postalCode: Joi.string().min(3).max(20).required().messages({
    'string.min': 'Postal code must be at least 3 characters long',
    'string.max': 'Postal code cannot exceed 20 characters',
    'any.required': 'Postal code is required'
  }),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }).optional()
});

export const eventSettingsSchema = Joi.object({
  allowWaitlist: Joi.boolean().default(false),
  requireApproval: Joi.boolean().default(false),
  maxTicketsPerOrder: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.min': 'Maximum tickets per order must be at least 1',
    'number.max': 'Maximum tickets per order cannot exceed 100'
  }),
  refundPolicy: Joi.string().valid(...Object.values(RefundPolicy)).default(RefundPolicy.NO_REFUNDS),
  checkInRequired: Joi.boolean().default(true)
});

export const eventCreationSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Event title must be at least 3 characters long',
    'string.max': 'Event title cannot exceed 100 characters',
    'any.required': 'Event title is required'
  }),
  description: Joi.string().min(10).max(5000).required().messages({
    'string.min': 'Event description must be at least 10 characters long',
    'string.max': 'Event description cannot exceed 5000 characters',
    'any.required': 'Event description is required'
  }),
  startDate: Joi.date().greater('now').required().messages({
    'date.greater': 'Event start date must be in the future',
    'any.required': 'Event start date is required'
  }),
  endDate: Joi.date().greater(Joi.ref('startDate')).required().messages({
    'date.greater': 'Event end date must be after start date',
    'any.required': 'Event end date is required'
  }),
  location: eventLocationSchema.required(),
  category: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Category must be at least 2 characters long',
    'string.max': 'Category cannot exceed 50 characters',
    'any.required': 'Category is required'
  }),
  maxAttendees: Joi.number().integer().min(1).max(100000).required().messages({
    'number.min': 'Maximum attendees must be at least 1',
    'number.max': 'Maximum attendees cannot exceed 100,000',
    'any.required': 'Maximum attendees is required'
  }),
  price: Joi.number().min(0).max(10000).precision(2).default(0).messages({
    'number.min': 'Price cannot be negative',
    'number.max': 'Price cannot exceed $10,000',
    'number.precision': 'Price must have maximum 2 decimal places'
  }),
  currency: Joi.string().length(3).default('USD').messages({
    'string.length': 'Currency must be a 3-letter code (e.g., USD, EUR)'
  }),
  bannerImageUrl: Joi.string().uri().optional(),
  settings: eventSettingsSchema.optional()
});

export const eventUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(5000).optional(),
  startDate: Joi.date().greater('now').optional(),
  endDate: Joi.date().greater(Joi.ref('startDate')).optional(),
  location: eventLocationSchema.optional(),
  category: Joi.string().min(2).max(50).optional(),
  maxAttendees: Joi.number().integer().min(1).max(100000).optional(),
  price: Joi.number().min(0).max(10000).precision(2).optional(),
  currency: Joi.string().length(3).optional(),
  bannerImageUrl: Joi.string().uri().optional(),
  settings: eventSettingsSchema.optional(),
  status: Joi.string().valid(...Object.values(EventStatus)).optional()
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

// User management schemas
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
  marketingConsent: Joi.boolean().optional()
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
  const { value, error } = validateSchema<T>(schema, data);
  
  if (error) {
    throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
  }
  
  return value;
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
