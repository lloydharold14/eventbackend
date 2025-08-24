// Environment configuration management

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { EnvironmentConfig } from '../types/common';
import { ConfigurationError } from '../errors/DomainError';

export class EnvironmentConfigManager {
  private static instance: EnvironmentConfigManager;
  private config: EnvironmentConfig | null = null;
  private ssmClient: SSMClient;

  private constructor() {
    this.ssmClient = new SSMClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  public static getInstance(): EnvironmentConfigManager {
    if (!EnvironmentConfigManager.instance) {
      EnvironmentConfigManager.instance = new EnvironmentConfigManager();
    }
    return EnvironmentConfigManager.instance;
  }

  public async loadConfig(): Promise<EnvironmentConfig> {
    if (this.config) {
      return this.config;
    }

    const environment = process.env.ENVIRONMENT || 'dev';
    
    try {
      this.config = {
        environment,
        region: process.env.AWS_REGION || 'us-east-1',
        database: {
          tablePrefix: await this.getParameter(`/${environment}/database/tablePrefix`),
          readCapacity: parseInt(await this.getParameter(`/${environment}/database/readCapacity`), 10),
          writeCapacity: parseInt(await this.getParameter(`/${environment}/database/writeCapacity`), 10)
        },
        security: {
          jwtSecret: await this.getParameter(`/${environment}/security/jwtSecret`),
          encryptionKey: await this.getParameter(`/${environment}/security/encryptionKey`),
          corsOrigins: (await this.getParameter(`/${environment}/security/corsOrigins`)).split(',')
        },
        integrations: {
          stripeSecretKey: await this.getParameter(`/${environment}/integrations/stripeSecretKey`),
          stripeWebhookSecret: await this.getParameter(`/${environment}/integrations/stripeWebhookSecret`),
          sesRegion: await this.getParameter(`/${environment}/integrations/sesRegion`),
          snsRegion: await this.getParameter(`/${environment}/integrations/snsRegion`)
        },
        monitoring: {
          logLevel: await this.getParameter(`/${environment}/monitoring/logLevel`),
          enableTracing: (await this.getParameter(`/${environment}/monitoring/enableTracing`)) === 'true',
          enableMetrics: (await this.getParameter(`/${environment}/monitoring/enableMetrics`)) === 'true'
        }
      };

      return this.config;
    } catch (error) {
      throw new ConfigurationError(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public getConfig(): EnvironmentConfig {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  private async getParameter(parameterName: string): Promise<string> {
    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true
      });

      const response = await this.ssmClient.send(command);
      
      if (!response.Parameter?.Value) {
        throw new ConfigurationError(`Parameter ${parameterName} not found or has no value`);
      }

      return response.Parameter.Value;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      // Fallback to environment variables for local development
      const envKey = parameterName.split('/').pop()?.toUpperCase();
      const envValue = process.env[envKey!];
      
      if (envValue) {
        return envValue;
      }

      throw new ConfigurationError(`Failed to retrieve parameter ${parameterName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async refreshConfig(): Promise<EnvironmentConfig> {
    this.config = null;
    return this.loadConfig();
  }
}

// Default configuration for local development
export const getDefaultConfig = (): EnvironmentConfig => ({
  environment: 'dev',
  region: 'us-east-1',
  database: {
    tablePrefix: 'event-management-dev',
    readCapacity: 5,
    writeCapacity: 5
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    encryptionKey: process.env.ENCRYPTION_KEY || 'dev-encryption-key-change-in-production',
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001']
  },
  integrations: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_...',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...',
    sesRegion: 'us-east-1',
    snsRegion: 'us-east-1'
  },
  monitoring: {
    logLevel: 'INFO',
    enableTracing: true,
    enableMetrics: true
  }
});

// Configuration validation
export function validateConfig(config: EnvironmentConfig): void {
  const requiredFields = [
    'environment',
    'region',
    'database.tablePrefix',
    'database.readCapacity',
    'database.writeCapacity',
    'security.jwtSecret',
    'security.encryptionKey',
    'integrations.stripeSecretKey',
    'integrations.stripeWebhookSecret'
  ];

  for (const field of requiredFields) {
    const value = field.split('.').reduce((obj, key) => obj?.[key as keyof typeof obj], config as any);
    if (!value) {
      throw new ConfigurationError(`Missing required configuration field: ${field}`);
    }
  }

  // Validate numeric fields
  if (config.database.readCapacity <= 0 || config.database.writeCapacity <= 0) {
    throw new ConfigurationError('Database capacity values must be positive');
  }

  // Validate security fields
  if (config.security.jwtSecret.length < 32) {
    throw new ConfigurationError('JWT secret must be at least 32 characters long');
  }

  if (config.security.encryptionKey.length < 32) {
    throw new ConfigurationError('Encryption key must be at least 32 characters long');
  }

  // Validate Stripe configuration
  if (!config.integrations.stripeSecretKey.startsWith('sk_')) {
    throw new ConfigurationError('Invalid Stripe secret key format');
  }

  if (!config.integrations.stripeWebhookSecret.startsWith('whsec_')) {
    throw new ConfigurationError('Invalid Stripe webhook secret format');
  }
}

// Environment-specific configuration helpers
export const isDevelopment = (): boolean => {
  return process.env.ENVIRONMENT === 'dev' || process.env.NODE_ENV === 'development';
};

export const isProduction = (): boolean => {
  return process.env.ENVIRONMENT === 'prod' || process.env.NODE_ENV === 'production';
};

export const isStaging = (): boolean => {
  return process.env.ENVIRONMENT === 'staging' || process.env.NODE_ENV === 'staging';
};

export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

// Configuration cache management
export class ConfigCache {
  private static cache = new Map<string, any>();
  private static cacheExpiry = new Map<string, number>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static set(key: string, value: any, ttl: number = ConfigCache.CACHE_TTL): void {
    ConfigCache.cache.set(key, value);
    ConfigCache.cacheExpiry.set(key, Date.now() + ttl);
  }

  static get(key: string): any | null {
    const expiry = ConfigCache.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      ConfigCache.cache.delete(key);
      ConfigCache.cacheExpiry.delete(key);
      return null;
    }
    return ConfigCache.cache.get(key);
  }

  static clear(): void {
    ConfigCache.cache.clear();
    ConfigCache.cacheExpiry.clear();
  }

  static has(key: string): boolean {
    return ConfigCache.get(key) !== null;
  }
}
