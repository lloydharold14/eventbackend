import Joi from 'joi';

/**
 * Schema for search request validation
 */
export const searchRequestSchema = Joi.object({
  query: Joi.string().min(1).max(500).required().messages({
    'string.empty': 'Search query is required',
    'any.required': 'Search query is required',
    'string.min': 'Search query must be at least 1 character long',
    'string.max': 'Search query cannot exceed 500 characters'
  }),
  
  filters: Joi.object({
    organizerId: Joi.string().uuid().optional().messages({
      'string.guid': 'Organizer ID must be a valid UUID'
    }),
    
    categoryId: Joi.string().uuid().optional().messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),
    
    eventType: Joi.array().items(Joi.string()).optional().messages({
      'array.base': 'Event types must be an array'
    }),
    
    status: Joi.array().items(Joi.string()).optional().messages({
      'array.base': 'Status must be an array'
    }),
    
    visibility: Joi.array().items(Joi.string()).optional().messages({
      'array.base': 'Visibility must be an array'
    }),
    
    dateRange: Joi.object({
      startDate: Joi.date().optional().messages({
        'date.base': 'Start date must be a valid date'
      }),
      endDate: Joi.date().greater(Joi.ref('startDate')).optional().messages({
        'date.base': 'End date must be a valid date',
        'date.greater': 'End date must be after start date'
      })
    }).optional(),
    
    location: Joi.object({
      city: Joi.string().max(100).optional().messages({
        'string.max': 'City name cannot exceed 100 characters'
      }),
      state: Joi.string().max(100).optional().messages({
        'string.max': 'State name cannot exceed 100 characters'
      }),
      country: Joi.string().max(100).optional().messages({
        'string.max': 'Country name cannot exceed 100 characters'
      }),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90).required().messages({
          'number.base': 'Latitude must be a number',
          'number.min': 'Latitude must be between -90 and 90',
          'number.max': 'Latitude must be between -90 and 90',
          'any.required': 'Latitude is required'
        }),
        longitude: Joi.number().min(-180).max(180).required().messages({
          'number.base': 'Longitude must be a number',
          'number.min': 'Longitude must be between -180 and 180',
          'number.max': 'Longitude must be between -180 and 180',
          'any.required': 'Longitude is required'
        }),
        radius: Joi.number().min(0.1).max(1000).required().messages({
          'number.base': 'Radius must be a number',
          'number.min': 'Radius must be at least 0.1 km',
          'number.max': 'Radius cannot exceed 1000 km',
          'any.required': 'Radius is required'
        })
      }).optional()
    }).optional(),
    
    priceRange: Joi.object({
      min: Joi.number().min(0).optional().messages({
        'number.base': 'Minimum price must be a number',
        'number.min': 'Minimum price cannot be negative'
      }),
      max: Joi.number().min(0).optional().messages({
        'number.base': 'Maximum price must be a number',
        'number.min': 'Maximum price cannot be negative'
      }),
      currency: Joi.string().length(3).optional().messages({
        'string.length': 'Currency must be a 3-character code'
      })
    }).optional(),
    
    tags: Joi.array().items(Joi.string()).optional().messages({
      'array.base': 'Tags must be an array'
    }),
    
    keywords: Joi.array().items(Joi.string()).optional().messages({
      'array.base': 'Keywords must be an array'
    }),
    
    hasAvailableSpots: Joi.boolean().optional().messages({
      'boolean.base': 'Has available spots must be a boolean'
    }),
    
    isFree: Joi.boolean().optional().messages({
      'boolean.base': 'Is free must be a boolean'
    }),
    
    isVirtual: Joi.boolean().optional().messages({
      'boolean.base': 'Is virtual must be a boolean'
    }),
    
    isHybrid: Joi.boolean().optional().messages({
      'boolean.base': 'Is hybrid must be a boolean'
    }),
    
    maxAttendees: Joi.object({
      min: Joi.number().integer().min(1).optional().messages({
        'number.base': 'Minimum attendees must be a number',
        'number.integer': 'Minimum attendees must be an integer',
        'number.min': 'Minimum attendees must be at least 1'
      }),
      max: Joi.number().integer().min(1).optional().messages({
        'number.base': 'Maximum attendees must be a number',
        'number.integer': 'Maximum attendees must be an integer',
        'number.min': 'Maximum attendees must be at least 1'
      })
    }).optional()
  }).optional(),
  
  sort: Joi.array().items(
    Joi.object({
      field: Joi.string().required().messages({
        'string.empty': 'Sort field is required',
        'any.required': 'Sort field is required'
      }),
      order: Joi.string().valid('asc', 'desc').required().messages({
        'string.empty': 'Sort order is required',
        'any.required': 'Sort order is required',
        'any.only': 'Sort order must be asc or desc'
      })
    })
  ).optional().messages({
    'array.base': 'Sort must be an array'
  }),
  
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
  }).optional(),
  
  facets: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'Facets must be an array'
  }),
  
  highlight: Joi.boolean().default(false).messages({
    'boolean.base': 'Highlight must be a boolean'
  }),
  
  suggest: Joi.boolean().default(false).messages({
    'boolean.base': 'Suggest must be a boolean'
  })
});

/**
 * Schema for search suggestion request validation
 */
export const searchSuggestionRequestSchema = Joi.object({
  query: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Query is required',
    'any.required': 'Query is required',
    'string.min': 'Query must be at least 1 character long',
    'string.max': 'Query cannot exceed 100 characters'
  }),
  
  type: Joi.string().valid('title', 'category', 'location', 'organizer', 'tag').optional().messages({
    'any.only': 'Type must be one of: title, category, location, organizer, tag'
  }),
  
  limit: Joi.number().integer().min(1).max(20).default(5).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 20'
  })
});

/**
 * Schema for event search document validation
 */
export const eventSearchDocumentSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Event ID must be a valid UUID',
    'any.required': 'Event ID is required'
  }),
  
  title: Joi.string().min(1).max(200).required().messages({
    'string.empty': 'Title is required',
    'any.required': 'Title is required',
    'string.min': 'Title must be at least 1 character long',
    'string.max': 'Title cannot exceed 200 characters'
  }),
  
  description: Joi.string().min(1).max(5000).required().messages({
    'string.empty': 'Description is required',
    'any.required': 'Description is required',
    'string.min': 'Description must be at least 1 character long',
    'string.max': 'Description cannot exceed 5000 characters'
  }),
  
  shortDescription: Joi.string().max(500).optional().messages({
    'string.max': 'Short description cannot exceed 500 characters'
  }),
  
  organizerId: Joi.string().uuid().required().messages({
    'string.guid': 'Organizer ID must be a valid UUID',
    'any.required': 'Organizer ID is required'
  }),
  
  organizerName: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Organizer name is required',
    'any.required': 'Organizer name is required',
    'string.min': 'Organizer name must be at least 1 character long',
    'string.max': 'Organizer name cannot exceed 100 characters'
  }),
  
  organizerEmail: Joi.string().email().required().messages({
    'string.email': 'Organizer email must be a valid email address',
    'any.required': 'Organizer email is required'
  }),
  
  categoryId: Joi.string().uuid().required().messages({
    'string.guid': 'Category ID must be a valid UUID',
    'any.required': 'Category ID is required'
  }),
  
  categoryName: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Category name is required',
    'any.required': 'Category name is required',
    'string.min': 'Category name must be at least 1 character long',
    'string.max': 'Category name cannot exceed 100 characters'
  }),
  
  type: Joi.string().required().messages({
    'string.empty': 'Event type is required',
    'any.required': 'Event type is required'
  }),
  
  status: Joi.string().required().messages({
    'string.empty': 'Status is required',
    'any.required': 'Status is required'
  }),
  
  visibility: Joi.string().required().messages({
    'string.empty': 'Visibility is required',
    'any.required': 'Visibility is required'
  }),
  
  startDate: Joi.date().required().messages({
    'date.base': 'Start date must be a valid date',
    'any.required': 'Start date is required'
  }),
  
  endDate: Joi.date().greater(Joi.ref('startDate')).required().messages({
    'date.base': 'End date must be a valid date',
    'date.greater': 'End date must be after start date',
    'any.required': 'End date is required'
  }),
  
  timezone: Joi.string().required().messages({
    'string.empty': 'Timezone is required',
    'any.required': 'Timezone is required'
  }),
  
  isAllDay: Joi.boolean().required().messages({
    'boolean.base': 'Is all day must be a boolean',
    'any.required': 'Is all day is required'
  }),
  
  location: Joi.object({
    type: Joi.string().valid('physical', 'virtual', 'hybrid').required().messages({
      'string.empty': 'Location type is required',
      'any.required': 'Location type is required',
      'any.only': 'Location type must be physical, virtual, or hybrid'
    }),
    address: Joi.string().max(500).optional().messages({
      'string.max': 'Address cannot exceed 500 characters'
    }),
    city: Joi.string().max(100).optional().messages({
      'string.max': 'City cannot exceed 100 characters'
    }),
    state: Joi.string().max(100).optional().messages({
      'string.max': 'State cannot exceed 100 characters'
    }),
    country: Joi.string().max(100).optional().messages({
      'string.max': 'Country cannot exceed 100 characters'
    }),
    postalCode: Joi.string().max(20).optional().messages({
      'string.max': 'Postal code cannot exceed 20 characters'
    }),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required().messages({
        'number.base': 'Latitude must be a number',
        'number.min': 'Latitude must be between -90 and 90',
        'number.max': 'Latitude must be between -90 and 90',
        'any.required': 'Latitude is required'
      }),
      longitude: Joi.number().min(-180).max(180).required().messages({
        'number.base': 'Longitude must be a number',
        'number.min': 'Longitude must be between -180 and 180',
        'number.max': 'Longitude must be between -180 and 180',
        'any.required': 'Longitude is required'
      })
    }).optional(),
    venue: Joi.object({
      name: Joi.string().max(200).required().messages({
        'string.empty': 'Venue name is required',
        'any.required': 'Venue name is required',
        'string.max': 'Venue name cannot exceed 200 characters'
      }),
      description: Joi.string().max(1000).optional().messages({
        'string.max': 'Venue description cannot exceed 1000 characters'
      }),
      capacity: Joi.number().integer().min(1).optional().messages({
        'number.base': 'Venue capacity must be a number',
        'number.integer': 'Venue capacity must be an integer',
        'number.min': 'Venue capacity must be at least 1'
      })
    }).optional(),
    virtualMeetingUrl: Joi.string().uri().optional().messages({
      'string.uri': 'Virtual meeting URL must be a valid URL'
    }),
    virtualMeetingPlatform: Joi.string().max(100).optional().messages({
      'string.max': 'Virtual meeting platform cannot exceed 100 characters'
    })
  }).required().messages({
    'object.base': 'Location must be an object',
    'any.required': 'Location is required'
  }),
  
  maxAttendees: Joi.number().integer().min(1).required().messages({
    'number.base': 'Max attendees must be a number',
    'number.integer': 'Max attendees must be an integer',
    'number.min': 'Max attendees must be at least 1',
    'any.required': 'Max attendees is required'
  }),
  
  currentAttendees: Joi.number().integer().min(0).required().messages({
    'number.base': 'Current attendees must be a number',
    'number.integer': 'Current attendees must be an integer',
    'number.min': 'Current attendees cannot be negative',
    'any.required': 'Current attendees is required'
  }),
  
  pricing: Joi.object({
    model: Joi.string().required().messages({
      'string.empty': 'Pricing model is required',
      'any.required': 'Pricing model is required'
    }),
    currency: Joi.string().length(3).required().messages({
      'string.length': 'Currency must be a 3-character code',
      'any.required': 'Currency is required'
    }),
    basePrice: Joi.number().min(0).optional().messages({
      'number.base': 'Base price must be a number',
      'number.min': 'Base price cannot be negative'
    }),
    tiers: Joi.array().items(
      Joi.object({
        name: Joi.string().required().messages({
          'string.empty': 'Tier name is required',
          'any.required': 'Tier name is required'
        }),
        price: Joi.number().min(0).required().messages({
          'number.base': 'Tier price must be a number',
          'number.min': 'Tier price cannot be negative',
          'any.required': 'Tier price is required'
        }),
        description: Joi.string().max(500).optional().messages({
          'string.max': 'Tier description cannot exceed 500 characters'
        }),
        availableQuantity: Joi.number().integer().min(0).optional().messages({
          'number.base': 'Available quantity must be a number',
          'number.integer': 'Available quantity must be an integer',
          'number.min': 'Available quantity cannot be negative'
        })
      })
    ).optional().messages({
      'array.base': 'Tiers must be an array'
    })
  }).required().messages({
    'object.base': 'Pricing must be an object',
    'any.required': 'Pricing is required'
  }),
  
  tags: Joi.array().items(Joi.string()).default([]).messages({
    'array.base': 'Tags must be an array'
  }),
  
  keywords: Joi.array().items(Joi.string()).default([]).messages({
    'array.base': 'Keywords must be an array'
  }),
  
  primaryImageUrl: Joi.string().uri().optional().messages({
    'string.uri': 'Primary image URL must be a valid URL'
  }),
  
  createdAt: Joi.date().required().messages({
    'date.base': 'Created at must be a valid date',
    'any.required': 'Created at is required'
  }),
  
  updatedAt: Joi.date().required().messages({
    'date.base': 'Updated at must be a valid date',
    'any.required': 'Updated at is required'
  }),
  
  publishedAt: Joi.date().optional().messages({
    'date.base': 'Published at must be a valid date'
  })
});

/**
 * Schema for index event request validation
 */
export const indexEventRequestSchema = Joi.object({
  event: eventSearchDocumentSchema.required().messages({
    'object.base': 'Event must be an object',
    'any.required': 'Event is required'
  }),
  
  operation: Joi.string().valid('index', 'update', 'delete').required().messages({
    'string.empty': 'Operation is required',
    'any.required': 'Operation is required',
    'any.only': 'Operation must be index, update, or delete'
  })
});

/**
 * Schema for bulk index request validation
 */
export const bulkIndexRequestSchema = Joi.object({
  events: Joi.array().items(indexEventRequestSchema).min(1).max(1000).required().messages({
    'array.base': 'Events must be an array',
    'array.min': 'At least one event is required',
    'array.max': 'Cannot index more than 1000 events at once',
    'any.required': 'Events are required'
  })
});
