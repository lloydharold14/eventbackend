import { SupportService } from './SupportService';
import { logger } from '../../../../shared/utils/logger';

export class SupportServiceFactory {
  private static instance: SupportService | null = null;
  
  private constructor() {}
  
  /**
   * Get the singleton instance of SupportService
   */
  public static getInstance(): SupportService {
    if (!SupportServiceFactory.instance) {
      SupportServiceFactory.instance = SupportServiceFactory.createSupportService();
    }
    return SupportServiceFactory.instance;
  }
  
  /**
   * Create a new instance of SupportService with dependencies
   */
  private static createSupportService(): SupportService {
    try {
      // TODO: Inject actual dependencies when available
      const organizerService = {} as any; // Placeholder - will be replaced with actual service
      
      const supportService = new SupportService(organizerService);
      
      logger.info('SupportService created successfully', {
        service: 'SupportService',
        timestamp: new Date().toISOString()
      });
      
      return supportService;
      
    } catch (error) {
      logger.error('Failed to create SupportService', { error });
      throw new Error(`Failed to create SupportService: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get the current SupportService instance without creating a new one
   */
  public static getSupportService(): SupportService | null {
    return SupportServiceFactory.instance;
  }
  
  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    SupportServiceFactory.instance = null;
    logger.info('SupportService instance reset');
  }
}
