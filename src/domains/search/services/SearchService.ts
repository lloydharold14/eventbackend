import { Client } from '@opensearch-project/opensearch';
import { Logger } from '@aws-lambda-powertools/logger';
import { MetricsManager, BusinessMetricName } from '../../../shared/utils/metrics';
import { traceAsyncOperation } from '../../../shared/utils/tracing';
import {
  SearchRequest,
  SearchResponse,
  SearchHit,
  EventSearchDocument,
  IndexEventRequest,
  BulkIndexRequest,
  BulkIndexResponse,
  SearchSuggestionRequest,
  SearchSuggestionResponse,
  SearchAnalytics,
  SearchHealthStatus,
  OpenSearchQuery,
  OpenSearchResponse,
  OpenSearchBulkResponse
} from '../models/Search';

export class SearchService {
  private client: Client;
  private logger: Logger;
  private metricsManager: MetricsManager;
  private indexName: string;

  constructor(opensearchEndpoint: string, indexName: string = 'events') {
    this.client = new Client({
      node: opensearchEndpoint,
      ssl: {
        rejectUnauthorized: false // For development - use proper SSL in production
      }
    });
    this.logger = new Logger({ serviceName: 'search-service' });
    this.metricsManager = MetricsManager.getInstance();
    this.indexName = indexName;
  }

  async searchEvents(request: SearchRequest): Promise<SearchResponse> {
    return traceAsyncOperation('searchEvents', async () => {
      const startTime = Date.now();
      
      try {
        const query = this.buildSearchQuery(request);
        const response = await this.client.search({
          index: this.indexName,
          body: query
        });

        const processingTime = Date.now() - startTime;
        this.metricsManager.recordBusinessMetric(BusinessMetricName.SEARCHES_PERFORMED, 1);
        this.metricsManager.recordBusinessMetric(BusinessMetricName.SEARCH_RESULTS_RETURNED, response.body.hits.total.value);
        this.metricsManager.recordApiPerformance('/search/events', 'POST', processingTime, 200);

        return this.mapOpenSearchResponse(response.body as OpenSearchResponse, request, processingTime);
      } catch (error) {
        const processingTime = Date.now() - startTime;
        this.metricsManager.recordApiPerformance('/search/events', 'POST', processingTime, 500);
        this.metricsManager.recordError('SEARCH_ERROR', 'SearchService', 'searchEvents');
        throw error;
      }
    });
  }

  async indexEvent(request: IndexEventRequest): Promise<void> {
    return traceAsyncOperation('indexEvent', async () => {
      try {
        const document = this.prepareEventDocument(request.event);
        
        if (request.operation === 'delete') {
          await this.client.delete({
            index: this.indexName,
            id: request.event.id
          });
        } else {
          await this.client.index({
            index: this.indexName,
            id: request.event.id,
            body: document
          });
        }

        this.metricsManager.recordBusinessMetric(BusinessMetricName.SEARCH_INDEX_UPDATED, 1);
        this.logger.info('Event indexed successfully', { eventId: request.event.id, operation: request.operation });
      } catch (error) {
        this.metricsManager.recordError('INDEXING_ERROR', 'SearchService', 'indexEvent');
        this.logger.error('Failed to index event', { error, eventId: request.event.id });
        throw error;
      }
    });
  }

  async bulkIndexEvents(request: BulkIndexRequest): Promise<BulkIndexResponse> {
    return traceAsyncOperation('bulkIndexEvents', async () => {
      try {
        const operations: any[] = [];
        request.events.forEach(event => {
          if (event.operation === 'delete') {
            operations.push({ delete: { _index: this.indexName, _id: event.event.id } });
          } else {
            const document = this.prepareEventDocument(event.event);
            operations.push({ index: { _index: this.indexName, _id: event.event.id } });
            operations.push(document);
          }
        });

        const response = await this.client.bulk({
          body: operations
        });

        const result = this.processBulkResponse(response.body as OpenSearchBulkResponse);
        this.metricsManager.recordBusinessMetric(BusinessMetricName.SEARCH_INDEX_UPDATED, result.indexed);
        
        this.logger.info('Bulk indexing completed', { 
          total: request.events.length, 
          indexed: result.indexed, 
          failed: result.failed 
        });

        return result;
      } catch (error) {
        this.metricsManager.recordError('BULK_INDEXING_ERROR', 'SearchService', 'bulkIndexEvents');
        this.logger.error('Bulk indexing failed', { error });
        throw error;
      }
    });
  }

  async searchSuggestions(request: SearchSuggestionRequest): Promise<SearchSuggestionResponse> {
    return traceAsyncOperation('searchSuggestions', async () => {
      const startTime = Date.now();
      
      try {
        const query = this.buildSuggestionQuery(request);
        const response = await this.client.search({
          index: this.indexName,
          body: query
        });

        const processingTime = Date.now() - startTime;
        const suggestions = this.extractSuggestions(response.body as OpenSearchResponse, request.type);

        return {
          suggestions,
          query: request.query,
          processingTimeMs: processingTime
        };
      } catch (error) {
        this.metricsManager.recordError('SUGGESTION_ERROR', 'SearchService', 'searchSuggestions');
        throw error;
      }
    });
  }

  async getHealthStatus(): Promise<SearchHealthStatus> {
    return traceAsyncOperation('getHealthStatus', async () => {
      try {
        const clusterHealth = await this.client.cluster.health();
        const indexStats = await this.client.indices.stats({ index: this.indexName });
        const indexInfo = await this.client.indices.get({ index: this.indexName });

        const documentCount = indexStats.body.indices[this.indexName]?.total?.docs?.count || 0;
        const indexCount = Object.keys(indexInfo.body).length;

        return {
          status: clusterHealth.body.status === 'green' ? 'healthy' : 
                  clusterHealth.body.status === 'yellow' ? 'degraded' : 'unhealthy',
          openSearchStatus: clusterHealth.body.status,
          indexCount,
          documentCount,
          lastIndexed: new Date().toISOString(),
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        this.logger.error('Health check failed', { error });
        return {
          status: 'unhealthy',
          openSearchStatus: 'red',
          indexCount: 0,
          documentCount: 0,
          lastIndexed: new Date().toISOString(),
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  async recordSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    return traceAsyncOperation('recordSearchAnalytics', async () => {
      try {
        await this.client.index({
          index: 'search-analytics',
          body: analytics
        });
      } catch (error) {
        this.logger.error('Failed to record search analytics', { error });
        // Don't throw error for analytics failures
      }
    });
  }

  private buildSearchQuery(request: SearchRequest): OpenSearchQuery {
    const query: OpenSearchQuery = {
      query: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: []
        }
      },
      from: (request.pagination?.page || 1) - 1,
      size: request.pagination?.limit || 20
    };

    // Add text search
    if (request.query) {
      query.query.bool.must.push({
        multi_match: {
          query: request.query,
          fields: [
            'title^3',
            'description^2',
            'searchText^2',
            'tags^1.5',
            'keywords^1.5',
            'categoryName^1',
            'organizerName^1',
            'locationText^1'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    // Add filters
    if (request.filters) {
      this.addFilters(query, request.filters);
    }

    // Add aggregations
    if (request.facets) {
      query.aggs = this.buildAggregations(request.facets);
    }

    // Add highlighting
    if (request.highlight) {
      query.highlight = {
        fields: {
          title: {},
          description: {},
          searchText: {}
        },
        pre_tags: ['<em>'],
        post_tags: ['</em>']
      };
    }

    // Add sorting
    if (request.sort && request.sort.length > 0) {
      query.sort = request.sort.map(sort => ({
        [sort.field]: { order: sort.order }
      }));
    } else {
      // Default sorting by relevance and date
      query.sort = [
        { _score: { order: 'desc' } },
        { startDate: { order: 'asc' } }
      ];
    }

    return query;
  }

  private buildSuggestionQuery(request: SearchSuggestionRequest): OpenSearchQuery {
    return {
      query: {
        bool: {
          should: [
            {
              prefix: {
                title: {
                  value: request.query,
                  boost: 3
                }
              }
            },
            {
              prefix: {
                categoryName: {
                  value: request.query,
                  boost: 2
                }
              }
            },
            {
              prefix: {
                locationText: {
                  value: request.query,
                  boost: 1.5
                }
              }
            },
            {
              prefix: {
                organizerName: {
                  value: request.query,
                  boost: 1
                }
              }
            }
          ]
        }
      },
      size: request.limit || 5,
      _source: ['title', 'categoryName', 'locationText', 'organizerName', 'tags']
    };
  }

  private addFilters(query: OpenSearchQuery, filters: any): void {
    if (filters.organizerId) {
      query.query.bool.filter.push({ term: { organizerId: filters.organizerId } });
    }

    if (filters.categoryId) {
      query.query.bool.filter.push({ term: { categoryId: filters.categoryId } });
    }

    if (filters.eventType && filters.eventType.length > 0) {
      query.query.bool.filter.push({ terms: { type: filters.eventType } });
    }

    if (filters.status && filters.status.length > 0) {
      query.query.bool.filter.push({ terms: { status: filters.status } });
    }

    if (filters.visibility && filters.visibility.length > 0) {
      query.query.bool.filter.push({ terms: { visibility: filters.visibility } });
    }

    if (filters.dateRange) {
      const dateFilter: any = { range: { startDate: {} } };
      if (filters.dateRange.startDate) {
        dateFilter.range.startDate.gte = filters.dateRange.startDate;
      }
      if (filters.dateRange.endDate) {
        dateFilter.range.startDate.lte = filters.dateRange.endDate;
      }
      query.query.bool.filter.push(dateFilter);
    }

    if (filters.location?.coordinates) {
      query.query.bool.filter.push({
        geo_distance: {
          distance: `${filters.location.coordinates.radius}km`,
          'location.coordinates': {
            lat: filters.location.coordinates.latitude,
            lon: filters.location.coordinates.longitude
          }
        }
      });
    }

    if (filters.priceRange) {
      const priceFilter: any = { range: { 'pricing.basePrice': {} } };
      if (filters.priceRange.min !== undefined) {
        priceFilter.range['pricing.basePrice'].gte = filters.priceRange.min;
      }
      if (filters.priceRange.max !== undefined) {
        priceFilter.range['pricing.basePrice'].lte = filters.priceRange.max;
      }
      query.query.bool.filter.push(priceFilter);
    }

    if (filters.hasAvailableSpots) {
      query.query.bool.filter.push({
        script: {
          script: {
            source: "doc['maxAttendees'].value > doc['currentAttendees'].value"
          }
        }
      });
    }

    if (filters.isFree !== undefined) {
      query.query.bool.filter.push({ term: { 'pricing.model': filters.isFree ? 'free' : 'paid' } });
    }

    if (filters.isVirtual !== undefined) {
      query.query.bool.filter.push({ term: { 'location.type': filters.isVirtual ? 'virtual' : 'physical' } });
    }
  }

  private buildAggregations(facets: string[]): Record<string, any> {
    const aggs: Record<string, any> = {};

    facets.forEach(facet => {
      switch (facet) {
        case 'categories':
          aggs.categories = {
            terms: { field: 'categoryName', size: 20 }
          };
          break;
        case 'eventTypes':
          aggs.eventTypes = {
            terms: { field: 'type', size: 20 }
          };
          break;
        case 'locations':
          aggs.locations = {
            terms: { field: 'location.city', size: 20 }
          };
          break;
        case 'priceRanges':
          aggs.priceRanges = {
            range: {
              field: 'pricing.basePrice',
              ranges: [
                { from: 0, to: 25 },
                { from: 25, to: 50 },
                { from: 50, to: 100 },
                { from: 100 }
              ]
            }
          };
          break;
        case 'organizers':
          aggs.organizers = {
            terms: { field: 'organizerName', size: 20 }
          };
          break;
      }
    });

    return aggs;
  }

  private prepareEventDocument(event: EventSearchDocument): EventSearchDocument {
    // Prepare search-specific fields
    const searchText = [
      event.title,
      event.description,
      event.shortDescription,
      event.tags.join(' '),
      event.keywords.join(' ')
    ].filter(Boolean).join(' ');

    const locationText = [
      event.location.address,
      event.location.city,
      event.location.state,
      event.location.country,
      event.location.venue?.name
    ].filter(Boolean).join(' ');

    const organizerText = [
      event.organizerName,
      event.organizerEmail
    ].filter(Boolean).join(' ');

    return {
      ...event,
      searchText,
      locationText,
      organizerText,
      _search_metadata: {
        boost: 1.0,
        popularity: 0,
        relevance: 0,
        lastIndexed: new Date().toISOString()
      }
    };
  }

  private mapOpenSearchResponse(
    response: OpenSearchResponse, 
    request: SearchRequest, 
    processingTime: number
  ): SearchResponse {
    const hits: SearchHit[] = response.hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      source: hit._source,
      highlights: hit.highlight
    }));

    return {
      hits,
      total: {
        value: response.hits.total.value,
        relation: response.hits.total.relation as 'eq' | 'gte'
      },
      aggregations: response.aggregations,
      pagination: {
        page: request.pagination?.page || 1,
        limit: request.pagination?.limit || 20
      },
      query: request.query,
      filters: request.filters || {},
      processingTimeMs: processingTime
    };
  }

  private extractSuggestions(response: OpenSearchResponse, type?: string): any[] {
    const suggestions: any[] = [];
    
    response.hits.hits.forEach(hit => {
      const source = hit._source;
      let text = '';
      let suggestionType = 'title';

      if (type === 'title' || !type) {
        text = source.title;
        suggestionType = 'title';
      } else if (type === 'category') {
        text = source.categoryName;
        suggestionType = 'category';
      } else if (type === 'location') {
        text = source.locationText;
        suggestionType = 'location';
      } else if (type === 'organizer') {
        text = source.organizerName;
        suggestionType = 'organizer';
      }

      if (text) {
        suggestions.push({
          text,
          score: hit._score,
          type: suggestionType
        });
      }
    });

    return suggestions;
  }

  private processBulkResponse(response: OpenSearchBulkResponse): BulkIndexResponse {
    const errors: Array<{ eventId: string; error: string }> = [];
    let indexed = 0;
    let failed = 0;

    response.items.forEach(item => {
      const operation = item.index || item.update || item.delete;
      if (operation?.error) {
        failed++;
        errors.push({
          eventId: operation._id,
          error: operation.error.reason
        });
      } else {
        indexed++;
      }
    });

    return {
      success: failed === 0,
      indexed,
      failed,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
