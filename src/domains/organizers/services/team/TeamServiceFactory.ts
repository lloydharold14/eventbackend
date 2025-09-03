import { TeamService } from './TeamService';
import { logger } from '../../../../shared/utils/logger';

export class TeamServiceFactory {
  private static instance: TeamService | null = null;
  
  private constructor() {}
  
  /**
   * Get the singleton instance of TeamService
   */
  public static getInstance(): TeamService {
    if (!TeamServiceFactory.instance) {
      TeamServiceFactory.instance = TeamServiceFactory.createTeamService();
    }
    return TeamServiceFactory.instance;
  }
  
  /**
   * Create a new instance of TeamService with dependencies
   */
  private static createTeamService(): TeamService {
    try {
      // TODO: Inject actual dependencies when available
      const organizerService = {} as any; // Placeholder - will be replaced with actual service
      
      const teamService = new TeamService(organizerService);
      
      logger.info('TeamService created successfully', {
        service: 'TeamService',
        timestamp: new Date().toISOString()
      });
      
      return teamService;
      
    } catch (error) {
      logger.error('Failed to create TeamService', { error });
      throw new Error(`Failed to create TeamService: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get the current TeamService instance without creating a new one
   */
  public static getTeamService(): TeamService | null {
    return TeamServiceFactory.instance;
  }
  
  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    TeamServiceFactory.instance = null;
    logger.info('TeamService instance reset');
  }
}
