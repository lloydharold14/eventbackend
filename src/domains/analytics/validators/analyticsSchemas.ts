import Joi from 'joi';

export const analyticsRequestSchema = Joi.object({
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
  granularity: Joi.string().valid('hour', 'day', 'week', 'month', 'quarter', 'year').required(),
  filters: Joi.object({
    eventIds: Joi.array().items(Joi.string().uuid()),
    organizerIds: Joi.array().items(Joi.string().uuid()),
    userIds: Joi.array().items(Joi.string().uuid()),
    eventTypes: Joi.array().items(Joi.string()),
    paymentMethods: Joi.array().items(Joi.string()),
    regions: Joi.array().items(Joi.string()),
    statuses: Joi.array().items(Joi.string())
  }).optional(),
  groupBy: Joi.array().items(Joi.string()).optional(),
  metrics: Joi.array().items(Joi.string()).min(1).required()
});

export const dashboardRequestSchema = Joi.object({
  dashboardType: Joi.string().valid('overview', 'events', 'revenue', 'users', 'organizers', 'custom').required(),
  timeRange: Joi.string().valid('today', 'week', 'month', 'quarter', 'year', 'custom').required(),
  customStartDate: Joi.string().isoDate().when('timeRange', {
    is: 'custom',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  customEndDate: Joi.string().isoDate().when('timeRange', {
    is: 'custom',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  filters: Joi.object({
    eventTypes: Joi.array().items(Joi.string()),
    regions: Joi.array().items(Joi.string()),
    organizers: Joi.array().items(Joi.string().uuid()),
    statuses: Joi.array().items(Joi.string())
  }).optional()
});

export const reportRequestSchema = Joi.object({
  reportType: Joi.string().valid('revenue', 'events', 'users', 'bookings', 'custom').required(),
  format: Joi.string().valid('json', 'csv', 'pdf', 'excel').required(),
  timeRange: Joi.string().valid('today', 'week', 'month', 'quarter', 'year', 'custom').required(),
  customStartDate: Joi.string().isoDate().when('timeRange', {
    is: 'custom',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  customEndDate: Joi.string().isoDate().when('timeRange', {
    is: 'custom',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  filters: Joi.object({
    eventIds: Joi.array().items(Joi.string().uuid()),
    organizerIds: Joi.array().items(Joi.string().uuid()),
    userIds: Joi.array().items(Joi.string().uuid()),
    eventTypes: Joi.array().items(Joi.string()),
    paymentMethods: Joi.array().items(Joi.string()),
    regions: Joi.array().items(Joi.string()),
    statuses: Joi.array().items(Joi.string()),
    minAmount: Joi.number().positive(),
    maxAmount: Joi.number().positive()
  }).optional(),
  groupBy: Joi.array().items(Joi.string()).optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  limit: Joi.number().integer().min(1).max(1000).optional()
});

export const analyticsExportRequestSchema = Joi.object({
  exportType: Joi.string().valid('events', 'bookings', 'payments', 'users', 'analytics').required(),
  format: Joi.string().valid('json', 'csv', 'excel').required(),
  filters: Joi.object({
    eventIds: Joi.array().items(Joi.string().uuid()),
    organizerIds: Joi.array().items(Joi.string().uuid()),
    userIds: Joi.array().items(Joi.string().uuid()),
    eventTypes: Joi.array().items(Joi.string()),
    paymentMethods: Joi.array().items(Joi.string()),
    regions: Joi.array().items(Joi.string()),
    statuses: Joi.array().items(Joi.string())
  }).optional(),
  timeRange: Joi.string().valid('all', 'custom').required(),
  customStartDate: Joi.string().isoDate().when('timeRange', {
    is: 'custom',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  customEndDate: Joi.string().isoDate().when('timeRange', {
    is: 'custom',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  includeMetadata: Joi.boolean().optional()
});

export const analyticsFiltersSchema = Joi.object({
  eventIds: Joi.array().items(Joi.string().uuid()),
  organizerIds: Joi.array().items(Joi.string().uuid()),
  userIds: Joi.array().items(Joi.string().uuid()),
  eventTypes: Joi.array().items(Joi.string()),
  paymentMethods: Joi.array().items(Joi.string()),
  regions: Joi.array().items(Joi.string()),
  statuses: Joi.array().items(Joi.string())
});

export const dashboardFiltersSchema = Joi.object({
  eventTypes: Joi.array().items(Joi.string()),
  regions: Joi.array().items(Joi.string()),
  organizers: Joi.array().items(Joi.string().uuid()),
  statuses: Joi.array().items(Joi.string())
});

export const reportFiltersSchema = Joi.object({
  eventIds: Joi.array().items(Joi.string().uuid()),
  organizerIds: Joi.array().items(Joi.string().uuid()),
  userIds: Joi.array().items(Joi.string().uuid()),
  eventTypes: Joi.array().items(Joi.string()),
  paymentMethods: Joi.array().items(Joi.string()),
  regions: Joi.array().items(Joi.string()),
  statuses: Joi.array().items(Joi.string()),
  minAmount: Joi.number().positive(),
  maxAmount: Joi.number().positive()
});

export const analyticsDataPointSchema = Joi.object({
  timestamp: Joi.string().isoDate().required(),
  period: Joi.string().required(),
  metrics: Joi.object().pattern(Joi.string(), Joi.number()).required(),
  dimensions: Joi.object().pattern(Joi.string(), Joi.string()).optional()
});

export const analyticsSummarySchema = Joi.object({
  totalEvents: Joi.number().integer().min(0).required(),
  totalBookings: Joi.number().integer().min(0).required(),
  totalRevenue: Joi.number().min(0).required(),
  totalUsers: Joi.number().integer().min(0).required(),
  averageTicketPrice: Joi.number().min(0).required(),
  conversionRate: Joi.number().min(0).max(100).required(),
  topPerformingEvents: Joi.array().items(Joi.object({
    eventId: Joi.string().uuid().required(),
    eventTitle: Joi.string().required(),
    organizerId: Joi.string().uuid().required(),
    organizerName: Joi.string().required(),
    totalBookings: Joi.number().integer().min(0).required(),
    totalRevenue: Joi.number().min(0).required(),
    averageRating: Joi.number().min(0).max(5).required(),
    conversionRate: Joi.number().min(0).max(100).required(),
    views: Joi.number().integer().min(0).required()
  })).optional(),
  topOrganizers: Joi.array().items(Joi.object({
    organizerId: Joi.string().uuid().required(),
    organizerName: Joi.string().required(),
    totalEvents: Joi.number().integer().min(0).required(),
    totalBookings: Joi.number().integer().min(0).required(),
    totalRevenue: Joi.number().min(0).required(),
    averageEventRating: Joi.number().min(0).max(5).required(),
    activeEvents: Joi.number().integer().min(0).required()
  })).optional(),
  revenueByPeriod: Joi.array().items(Joi.object({
    period: Joi.string().required(),
    revenue: Joi.number().min(0).required(),
    bookings: Joi.number().integer().min(0).required(),
    averageTicketPrice: Joi.number().min(0).required(),
    currency: Joi.string().required()
  })).optional(),
  userGrowth: Joi.array().items(Joi.object({
    period: Joi.string().required(),
    newUsers: Joi.number().integer().min(0).required(),
    activeUsers: Joi.number().integer().min(0).required(),
    totalUsers: Joi.number().integer().min(0).required(),
    retentionRate: Joi.number().min(0).max(100).required()
  })).optional()
});

export const overviewMetricsSchema = Joi.object({
  totalRevenue: Joi.number().min(0).required(),
  totalEvents: Joi.number().integer().min(0).required(),
  totalBookings: Joi.number().integer().min(0).required(),
  totalUsers: Joi.number().integer().min(0).required(),
  growthRate: Joi.number().required(),
  conversionRate: Joi.number().min(0).max(100).required(),
  averageRating: Joi.number().min(0).max(5).required()
});

export const chartDataSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().valid('line', 'bar', 'pie', 'area').required(),
  title: Joi.string().required(),
  data: Joi.array().items(Joi.object({
    label: Joi.string().required(),
    value: Joi.number().required(),
    color: Joi.string().optional(),
    metadata: Joi.object().optional()
  })).required(),
  config: Joi.object({
    showLegend: Joi.boolean().optional(),
    showGrid: Joi.boolean().optional(),
    animate: Joi.boolean().optional(),
    height: Joi.number().integer().min(1).optional(),
    width: Joi.number().integer().min(1).optional()
  }).optional()
});

export const tableDataSchema = Joi.object({
  id: Joi.string().required(),
  title: Joi.string().required(),
  headers: Joi.array().items(Joi.string()).required(),
  rows: Joi.array().items(Joi.array().items(Joi.string())).required(),
  pagination: Joi.object({
    currentPage: Joi.number().integer().min(1).required(),
    totalPages: Joi.number().integer().min(1).required(),
    totalRecords: Joi.number().integer().min(0).required(),
    pageSize: Joi.number().integer().min(1).required()
  }).optional()
});

export const insightDataSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().valid('trend', 'anomaly', 'recommendation', 'alert').required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  data: Joi.object().optional()
});

export const realTimeMetricsSchema = Joi.object({
  activeUsers: Joi.number().integer().min(0).required(),
  activeEvents: Joi.number().integer().min(0).required(),
  pendingBookings: Joi.number().integer().min(0).required(),
  recentTransactions: Joi.number().integer().min(0).required(),
  systemHealth: Joi.object({
    status: Joi.string().valid('healthy', 'warning', 'critical').required(),
    services: Joi.array().items(Joi.object({
      service: Joi.string().required(),
      status: Joi.string().valid('healthy', 'warning', 'critical').required(),
      responseTime: Joi.number().min(0).required(),
      errorRate: Joi.number().min(0).max(100).required(),
      lastUpdated: Joi.string().isoDate().required()
    })).required(),
    lastChecked: Joi.string().isoDate().required()
  }).required(),
  alerts: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('system', 'business', 'security').required(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    title: Joi.string().required(),
    message: Joi.string().required(),
    timestamp: Joi.string().isoDate().required(),
    acknowledged: Joi.boolean().required(),
    acknowledgedBy: Joi.string().optional(),
    acknowledgedAt: Joi.string().isoDate().optional()
  })).required()
});

export const analyticsHealthStatusSchema = Joi.object({
  status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
  services: Joi.array().items(Joi.object({
    service: Joi.string().required(),
    status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
    responseTime: Joi.number().min(0).required(),
    errorCount: Joi.number().integer().min(0).required(),
    lastChecked: Joi.string().isoDate().required()
  })).required(),
  dataSources: Joi.array().items(Joi.object({
    source: Joi.string().required(),
    status: Joi.string().valid('connected', 'disconnected', 'error').required(),
    lastSync: Joi.string().isoDate().required(),
    recordCount: Joi.number().integer().min(0).required(),
    syncErrors: Joi.number().integer().min(0).required()
  })).required(),
  lastUpdated: Joi.string().isoDate().required()
});
