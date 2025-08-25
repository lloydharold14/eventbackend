export interface AnalyticsRequest {
  startDate: string;
  endDate: string;
  granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  filters?: AnalyticsFilters;
  groupBy?: string[];
  metrics: string[];
}

export interface AnalyticsFilters {
  eventIds?: string[];
  organizerIds?: string[];
  userIds?: string[];
  eventTypes?: string[];
  paymentMethods?: string[];
  regions?: string[];
  statuses?: string[];
}

export interface AnalyticsResponse {
  data: AnalyticsDataPoint[];
  summary: AnalyticsSummary;
  metadata: AnalyticsMetadata;
}

export interface AnalyticsDataPoint {
  timestamp: string;
  period: string;
  metrics: { [key: string]: number };
  dimensions?: { [key: string]: string };
}

export interface AnalyticsSummary {
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  averageTicketPrice: number;
  conversionRate: number;
  topPerformingEvents: EventPerformance[];
  topOrganizers: OrganizerPerformance[];
  revenueByPeriod: RevenueData[];
  userGrowth: UserGrowthData[];
}

export interface AnalyticsMetadata {
  requestId: string;
  generatedAt: string;
  dataSource: string;
  processingTime: number;
  recordCount: number;
}

export interface EventPerformance {
  eventId: string;
  eventTitle: string;
  organizerId: string;
  organizerName: string;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  conversionRate: number;
  views: number;
}

export interface OrganizerPerformance {
  organizerId: string;
  organizerName: string;
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  averageEventRating: number;
  activeEvents: number;
}

export interface RevenueData {
  period: string;
  revenue: number;
  bookings: number;
  averageTicketPrice: number;
  currency: string;
}

export interface UserGrowthData {
  period: string;
  newUsers: number;
  activeUsers: number;
  totalUsers: number;
  retentionRate: number;
}

export interface DashboardRequest {
  dashboardType: 'overview' | 'events' | 'revenue' | 'users' | 'organizers' | 'custom';
  timeRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  filters?: DashboardFilters;
}

export interface DashboardFilters {
  eventTypes?: string[];
  regions?: string[];
  organizers?: string[];
  statuses?: string[];
}

export interface DashboardResponse {
  dashboard: DashboardData;
  metadata: DashboardMetadata;
}

export interface DashboardData {
  overview: OverviewMetrics;
  charts: ChartData[];
  tables: TableData[];
  insights: InsightData[];
}

export interface OverviewMetrics {
  totalRevenue: number;
  totalEvents: number;
  totalBookings: number;
  totalUsers: number;
  growthRate: number;
  conversionRate: number;
  averageRating: number;
}

export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: ChartDataPoint[];
  config?: ChartConfig;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: { [key: string]: any };
}

export interface ChartConfig {
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  height?: number;
  width?: number;
}

export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
  pagination?: TablePagination;
}

export interface TablePagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
}

export interface InsightData {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'alert';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data?: { [key: string]: any };
}

export interface DashboardMetadata {
  generatedAt: string;
  dataFreshness: string;
  lastUpdated: string;
  refreshInterval: number;
}

export interface ReportRequest {
  reportType: 'revenue' | 'events' | 'users' | 'bookings' | 'custom';
  format: 'json' | 'csv' | 'pdf' | 'excel';
  timeRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  filters?: ReportFilters;
  groupBy?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface ReportFilters {
  eventIds?: string[];
  organizerIds?: string[];
  userIds?: string[];
  eventTypes?: string[];
  paymentMethods?: string[];
  regions?: string[];
  statuses?: string[];
  minAmount?: number;
  maxAmount?: number;
}

export interface ReportResponse {
  report: ReportData;
  metadata: ReportMetadata;
}

export interface ReportData {
  headers: string[];
  rows: any[][];
  summary: ReportSummary;
  charts?: ChartData[];
}

export interface ReportSummary {
  totalRecords: number;
  totalAmount?: number;
  averageAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
}

export interface ReportMetadata {
  reportId: string;
  generatedAt: string;
  format: string;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: string;
}

export interface RealTimeMetrics {
  activeUsers: number;
  activeEvents: number;
  pendingBookings: number;
  recentTransactions: number;
  systemHealth: SystemHealth;
  alerts: AlertData[];
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  services: ServiceHealth[];
  lastChecked: string;
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  errorRate: number;
  lastUpdated: string;
}

export interface AlertData {
  id: string;
  type: 'system' | 'business' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface AnalyticsExportRequest {
  exportType: 'events' | 'bookings' | 'payments' | 'users' | 'analytics';
  format: 'json' | 'csv' | 'excel';
  filters?: AnalyticsFilters;
  timeRange: 'all' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  includeMetadata?: boolean;
}

export interface AnalyticsExportResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt: string;
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  recordCount: number;
  fileSize?: number;
  generatedAt: string;
  format: string;
  filters?: AnalyticsFilters;
}

export interface AnalyticsConfig {
  retentionDays: number;
  aggregationIntervals: string[];
  realTimeEnabled: boolean;
  alertThresholds: AlertThresholds;
  exportFormats: string[];
  maxExportRecords: number;
}

export interface AlertThresholds {
  errorRate: number;
  responseTime: number;
  revenueDrop: number;
  userDrop: number;
  bookingDrop: number;
}

export interface AnalyticsHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: AnalyticsServiceHealth[];
  dataSources: DataSourceHealth[];
  lastUpdated: string;
}

export interface AnalyticsServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorCount: number;
  lastChecked: string;
}

export interface DataSourceHealth {
  source: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  recordCount: number;
  syncErrors: number;
}
