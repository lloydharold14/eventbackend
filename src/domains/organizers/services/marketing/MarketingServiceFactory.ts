import { MarketingService } from './MarketingService';
import { logger } from '../../../../shared/utils/logger';

export class MarketingServiceFactory {
  private static instance: MarketingService | null = null;
  
  private constructor() {}
  
  /**
   * Get the singleton instance of MarketingService
   */
  public static getInstance(): MarketingService {
    if (!MarketingServiceFactory.instance) {
      MarketingServiceFactory.instance = MarketingServiceFactory.createMarketingService();
    }
    return MarketingServiceFactory.instance;
  }
  
  /**
   * Create a new instance of MarketingService with dependencies
   */
  private static createMarketingService(): MarketingService {
    try {
      // TODO: Inject actual dependencies when available
      const organizerService = {} as any; // Placeholder - will be replaced with actual service
      
      const marketingService = new MarketingService(organizerService);
      
      logger.info('MarketingService created successfully', {
        service: 'MarketingService',
        timestamp: new Date().toISOString()
      });
      
      return marketingService;
      
    } catch (error) {
      logger.error('Failed to create MarketingService', { error });
      throw new Error(`Failed to create MarketingService: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get the current MarketingService instance without creating a new one
   */
  public static getMarketingService(): MarketingService | null {
    return MarketingServiceFactory.instance;
  }
  
  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    MarketingServiceFactory.instance = null;
    logger.info('MarketingService instance reset');
  }
}
