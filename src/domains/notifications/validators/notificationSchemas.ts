import Joi from 'joi';
import { NotificationType, NotificationChannel } from '../services/NotificationService';

/**
 * Schema for notification request validation
 */
export const notificationRequestSchema = Joi.object({
  userId: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required'
  }),
  
  type: Joi.string().valid(...Object.values(NotificationType)).required().messages({
    'string.empty': 'Notification type is required',
    'any.required': 'Notification type is required',
    'any.only': 'Invalid notification type'
  }),
  
  channel: Joi.string().valid(...Object.values(NotificationChannel)).required().messages({
    'string.empty': 'Notification channel is required',
    'any.required': 'Notification channel is required',
    'any.only': 'Invalid notification channel'
  }),
  
  subject: Joi.string().when('channel', {
    is: NotificationChannel.EMAIL,
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.empty': 'Subject is required for email notifications',
    'any.required': 'Subject is required for email notifications'
  }),
  
  title: Joi.string().when('channel', {
    is: NotificationChannel.PUSH,
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.empty': 'Title is required for push notifications',
    'any.required': 'Title is required for push notifications'
  }),
  
  body: Joi.string().required().min(1).max(5000).messages({
    'string.empty': 'Notification body is required',
    'any.required': 'Notification body is required',
    'string.min': 'Notification body must be at least 1 character long',
    'string.max': 'Notification body cannot exceed 5000 characters'
  }),
  
  data: Joi.object().optional().messages({
    'object.base': 'Data must be an object'
  }),
  
  priority: Joi.string().valid('low', 'normal', 'high').default('normal').messages({
    'any.only': 'Priority must be low, normal, or high'
  }),
  
  scheduledAt: Joi.date().greater('now').optional().messages({
    'date.base': 'Scheduled date must be a valid date',
    'date.greater': 'Scheduled date must be in the future'
  }),
  
  expiresAt: Joi.date().greater('now').optional().messages({
    'date.base': 'Expiration date must be a valid date',
    'date.greater': 'Expiration date must be in the future'
  })
});

/**
 * Schema for booking confirmation notification
 */
export const bookingConfirmationSchema = Joi.object({
  userId: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required'
  }),
  
  bookingData: Joi.object({
    bookingId: Joi.string().required().messages({
      'string.empty': 'Booking ID is required',
      'any.required': 'Booking ID is required'
    }),
    
    eventTitle: Joi.string().required().messages({
      'string.empty': 'Event title is required',
      'any.required': 'Event title is required'
    }),
    
    eventDate: Joi.date().required().messages({
      'date.base': 'Event date must be a valid date',
      'any.required': 'Event date is required'
    }),
    
    eventLocation: Joi.string().required().messages({
      'string.empty': 'Event location is required',
      'any.required': 'Event location is required'
    }),
    
    attendeeName: Joi.string().required().messages({
      'string.empty': 'Attendee name is required',
      'any.required': 'Attendee name is required'
    }),
    
    ticketDetails: Joi.array().items(
      Joi.object({
        ticketType: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        unitPrice: Joi.number().positive().required(),
        totalPrice: Joi.number().positive().required()
      })
    ).min(1).required().messages({
      'array.min': 'At least one ticket detail is required',
      'any.required': 'Ticket details are required'
    }),
    
    totalAmount: Joi.number().positive().required().messages({
      'number.base': 'Total amount must be a number',
      'number.positive': 'Total amount must be positive',
      'any.required': 'Total amount is required'
    }),
    
    currency: Joi.string().length(3).required().messages({
      'string.length': 'Currency must be 3 characters (ISO code)',
      'any.required': 'Currency is required'
    }),
    
    bookingDate: Joi.date().required().messages({
      'date.base': 'Booking date must be a valid date',
      'any.required': 'Booking date is required'
    }),
    
    qrCode: Joi.string().optional(),
    
    ticketUrl: Joi.string().uri().optional().messages({
      'string.uri': 'Ticket URL must be a valid URI'
    }),
    
    organizerContact: Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().optional()
    }).required().messages({
      'any.required': 'Organizer contact information is required'
    })
  }).required().messages({
    'any.required': 'Booking data is required'
  })
});

/**
 * Schema for booking cancellation notification
 */
export const bookingCancellationSchema = Joi.object({
  userId: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required'
  }),
  
  bookingData: Joi.object({
    bookingId: Joi.string().required().messages({
      'string.empty': 'Booking ID is required',
      'any.required': 'Booking ID is required'
    }),
    
    eventTitle: Joi.string().required().messages({
      'string.empty': 'Event title is required',
      'any.required': 'Event title is required'
    }),
    
    eventDate: Joi.date().required().messages({
      'date.base': 'Event date must be a valid date',
      'any.required': 'Event date is required'
    }),
    
    totalAmount: Joi.number().positive().required().messages({
      'number.base': 'Total amount must be a number',
      'number.positive': 'Total amount must be positive',
      'any.required': 'Total amount is required'
    }),
    
    currency: Joi.string().length(3).required().messages({
      'string.length': 'Currency must be 3 characters (ISO code)',
      'any.required': 'Currency is required'
    }),
    
    refundAmount: Joi.number().positive().optional().messages({
      'number.base': 'Refund amount must be a number',
      'number.positive': 'Refund amount must be positive'
    }),
    
    cancellationReason: Joi.string().optional()
  }).required().messages({
    'any.required': 'Booking data is required'
  })
});

/**
 * Schema for payment confirmation notification
 */
export const paymentConfirmationSchema = Joi.object({
  userId: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required'
  }),
  
  paymentData: Joi.object({
    paymentId: Joi.string().required().messages({
      'string.empty': 'Payment ID is required',
      'any.required': 'Payment ID is required'
    }),
    
    amount: Joi.number().positive().required().messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required'
    }),
    
    currency: Joi.string().length(3).required().messages({
      'string.length': 'Currency must be 3 characters (ISO code)',
      'any.required': 'Currency is required'
    }),
    
    bookingId: Joi.string().required().messages({
      'string.empty': 'Booking ID is required',
      'any.required': 'Booking ID is required'
    }),
    
    eventTitle: Joi.string().required().messages({
      'string.empty': 'Event title is required',
      'any.required': 'Event title is required'
    }),
    
    paymentMethod: Joi.string().required().messages({
      'string.empty': 'Payment method is required',
      'any.required': 'Payment method is required'
    }),
    
    receiptUrl: Joi.string().uri().optional().messages({
      'string.uri': 'Receipt URL must be a valid URI'
    })
  }).required().messages({
    'any.required': 'Payment data is required'
  })
});

/**
 * Schema for payment failed notification
 */
export const paymentFailedSchema = Joi.object({
  userId: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required'
  }),
  
  paymentData: Joi.object({
    paymentId: Joi.string().required().messages({
      'string.empty': 'Payment ID is required',
      'any.required': 'Payment ID is required'
    }),
    
    amount: Joi.number().positive().required().messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required'
    }),
    
    currency: Joi.string().length(3).required().messages({
      'string.length': 'Currency must be 3 characters (ISO code)',
      'any.required': 'Currency is required'
    }),
    
    bookingId: Joi.string().required().messages({
      'string.empty': 'Booking ID is required',
      'any.required': 'Booking ID is required'
    }),
    
    eventTitle: Joi.string().required().messages({
      'string.empty': 'Event title is required',
      'any.required': 'Event title is required'
    }),
    
    failureReason: Joi.string().required().messages({
      'string.empty': 'Failure reason is required',
      'any.required': 'Failure reason is required'
    }),
    
    retryUrl: Joi.string().uri().optional().messages({
      'string.uri': 'Retry URL must be a valid URI'
    })
  }).required().messages({
    'any.required': 'Payment data is required'
  })
});

/**
 * Schema for bulk notification request
 */
export const bulkNotificationSchema = Joi.object({
  notifications: Joi.array().items(notificationRequestSchema).min(1).max(100).required().messages({
    'array.min': 'At least one notification is required',
    'array.max': 'Maximum 100 notifications allowed per request',
    'any.required': 'Notifications array is required'
  }),
  
  templateId: Joi.string().optional().messages({
    'string.empty': 'Template ID cannot be empty'
  }),
  
  variables: Joi.object().optional().messages({
    'object.base': 'Variables must be an object'
  })
});

/**
 * Schema for notification template
 */
export const notificationTemplateSchema = Joi.object({
  id: Joi.string().required().messages({
    'string.empty': 'Template ID is required',
    'any.required': 'Template ID is required'
  }),
  
  type: Joi.string().valid(...Object.values(NotificationType)).required().messages({
    'string.empty': 'Template type is required',
    'any.required': 'Template type is required',
    'any.only': 'Invalid template type'
  }),
  
  channel: Joi.string().valid(...Object.values(NotificationChannel)).required().messages({
    'string.empty': 'Template channel is required',
    'any.required': 'Template channel is required',
    'any.only': 'Invalid template channel'
  }),
  
  subject: Joi.string().when('channel', {
    is: NotificationChannel.EMAIL,
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.empty': 'Subject is required for email templates',
    'any.required': 'Subject is required for email templates'
  }),
  
  title: Joi.string().when('channel', {
    is: NotificationChannel.PUSH,
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.empty': 'Title is required for push templates',
    'any.required': 'Title is required for push templates'
  }),
  
  body: Joi.string().required().min(1).max(5000).messages({
    'string.empty': 'Template body is required',
    'any.required': 'Template body is required',
    'string.min': 'Template body must be at least 1 character long',
    'string.max': 'Template body cannot exceed 5000 characters'
  }),
  
  variables: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'Variables must be an array of strings'
  })
});
