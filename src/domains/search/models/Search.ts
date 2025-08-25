export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSort[];
  pagination?: SearchPagination;
  facets?: string[];
  highlight?: boolean;
  suggest?: boolean;
}

export interface SearchFilters {
  organizerId?: string;
  categoryId?: string;
  eventType?: string[];
  status?: string[];
  visibility?: string[];
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  location?: {
    city?: string;
    state?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
      radius: number; // in kilometers
    };
  };
  priceRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  tags?: string[];
  keywords?: string[];
  hasAvailableSpots?: boolean;
  isFree?: boolean;
  isVirtual?: boolean;
  isHybrid?: boolean;
  maxAttendees?: {
    min?: number;
    max?: number;
  };
}

export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
}

export interface SearchPagination {
  page: number;
  limit: number;
  offset?: number;
}

export interface SearchResponse {
  hits: SearchHit[];
  total: {
    value: number;
    relation: 'eq' | 'gte';
  };
  aggregations?: SearchAggregations;
  suggestions?: SearchSuggestion[];
  pagination: SearchPagination;
  query: string;
  filters: SearchFilters;
  processingTimeMs: number;
}

export interface SearchHit {
  id: string;
  score: number;
  source: EventSearchDocument;
  highlights?: Record<string, string[]>;
}

export interface EventSearchDocument {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  categoryId: string;
  categoryName: string;
  type: string;
  status: string;
  visibility: string;
  
  // Date and Time
  startDate: string;
  endDate: string;
  timezone: string;
  isAllDay: boolean;
  
  // Location
  location: {
    type: 'physical' | 'virtual' | 'hybrid';
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    venue?: {
      name: string;
      description?: string;
      capacity?: number;
    };
    virtualMeetingUrl?: string;
    virtualMeetingPlatform?: string;
  };
  
  // Capacity and Pricing
  maxAttendees: number;
  currentAttendees: number;
  pricing: {
    model: string;
    currency: string;
    basePrice?: number;
    tiers?: Array<{
      name: string;
      price: number;
      description?: string;
      availableQuantity?: number;
    }>;
  };
  
  // Content
  tags: string[];
  keywords: string[];
  primaryImageUrl?: string;
  
  // Search-specific fields
  searchText: string; // Combined searchable text
  locationText: string; // Combined location text
  organizerText: string; // Combined organizer text
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  
  // Metadata for search
  _search_metadata?: {
    boost?: number;
    popularity?: number;
    relevance?: number;
    lastIndexed: string;
  };
}

export interface SearchAggregations {
  categories?: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  eventTypes?: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  locations?: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  priceRanges?: {
    buckets: Array<{
      key: string;
      doc_count: number;
      from?: number;
      to?: number;
    }>;
  };
  dateRanges?: {
    buckets: Array<{
      key: string;
      doc_count: number;
      from?: string;
      to?: string;
    }>;
  };
  organizers?: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export interface SearchSuggestion {
  text: string;
  score: number;
  type: 'title' | 'category' | 'location' | 'organizer' | 'tag';
  highlighted?: string;
}

export interface IndexEventRequest {
  event: EventSearchDocument;
  operation: 'index' | 'update' | 'delete';
}

export interface BulkIndexRequest {
  events: IndexEventRequest[];
}

export interface BulkIndexResponse {
  success: boolean;
  indexed: number;
  failed: number;
  errors?: Array<{
    eventId: string;
    error: string;
  }>;
}

export interface SearchSuggestionRequest {
  query: string;
  type?: 'title' | 'category' | 'location' | 'organizer' | 'tag';
  limit?: number;
}

export interface SearchSuggestionResponse {
  suggestions: SearchSuggestion[];
  query: string;
  processingTimeMs: number;
}

export interface SearchAnalytics {
  query: string;
  filters: SearchFilters;
  resultsCount: number;
  processingTimeMs: number;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface SearchIndexConfig {
  indexName: string;
  mappings: Record<string, any>;
  settings: Record<string, any>;
  aliases?: Record<string, any>;
}

export interface SearchHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  openSearchStatus: 'green' | 'yellow' | 'red';
  indexCount: number;
  documentCount: number;
  lastIndexed: string;
  errors?: string[];
  timestamp: string;
}

export interface SearchMetrics {
  totalSearches: number;
  averageResponseTime: number;
  topQueries: Array<{
    query: string;
    count: number;
  }>;
  searchByType: Record<string, number>;
  errorRate: number;
  period: {
    start: string;
    end: string;
  };
}

// OpenSearch specific types
export interface OpenSearchQuery {
  query: any;
  aggs?: Record<string, any>;
  sort?: any[];
  from?: number;
  size?: number;
  highlight?: any;
  suggest?: any;
  _source?: string[] | boolean;
}

export interface OpenSearchResponse {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number;
    hits: Array<{
      _index: string;
      _type: string;
      _id: string;
      _score: number;
      _source: any;
      highlight?: Record<string, string[]>;
    }>;
  };
  aggregations?: Record<string, any>;
  suggestions?: Record<string, any[]>;
}

export interface OpenSearchBulkResponse {
  took: number;
  errors: boolean;
  items: Array<{
    index?: {
      _index: string;
      _type: string;
      _id: string;
      _version: number;
      result: string;
      _shards: {
        total: number;
        successful: number;
        failed: number;
      };
      status: number;
      error?: {
        type: string;
        reason: string;
      };
    };
    update?: {
      _index: string;
      _type: string;
      _id: string;
      _version: number;
      result: string;
      _shards: {
        total: number;
        successful: number;
        failed: number;
      };
      status: number;
      error?: {
        type: string;
        reason: string;
      };
    };
    delete?: {
      _index: string;
      _type: string;
      _id: string;
      _version: number;
      result: string;
      _shards: {
        total: number;
        successful: number;
        failed: number;
      };
      status: number;
      error?: {
        type: string;
        reason: string;
      };
    };
  }>;
}
