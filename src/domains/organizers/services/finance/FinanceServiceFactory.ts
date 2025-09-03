import { FinanceService } from './FinanceService';
import { logger } from '../../../../shared/utils/logger';

export class FinanceServiceFactory {
  private static instance: FinanceService | null = null;
  
  private constructor() {}
  
  /**
   * Get the singleton instance of FinanceService
   */
  public static getInstance(): FinanceService {
    if (!FinanceServiceFactory.instance) {
      FinanceServiceFactory.instance = FinanceServiceFactory.createFinanceService();
    }
    return FinanceServiceFactory.instance;
  }
  
  /**
   * Create a new instance of FinanceService with dependencies
   */
  private static createFinanceService(): FinanceService {
    try {
      // TODO: Inject actual dependencies when available
      const organizerService = {} as any; // Placeholder - will be replaced with actual service
      
      const financeService = new FinanceService(organizerService);
      
      logger.info('FinanceService created successfully', {
        service: 'FinanceService',
        timestamp: new Date().toISOString()
      });
      
      return financeService;
      
    } catch (error) {
      logger.error('Failed to create FinanceService', { error });
      throw new Error(`Failed to create FinanceService: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get the current FinanceService instance without creating a new one
   */
  public static getFinanceService(): FinanceService | null {
    return FinanceServiceFactory.instance;
  }
  
  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    FinanceServiceFactory.instance = null;
    logger.info('FinanceService instance reset');
  }
}
