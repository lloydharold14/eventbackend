export interface EnvironmentConfig {
  name: string;
  region: string;
  account?: string;
  
  // Infrastructure settings
  vpc: {
    maxAzs: number;
    natGateways: number;
    enableFlowLogs: boolean;
  };
  
  // Database settings
  dynamodb: {
    billingMode: 'PROVISIONED' | 'PAY_PER_REQUEST';
    readCapacity?: number;
    writeCapacity?: number;
    pointInTimeRecovery: boolean;
    backupRetention: number;
  };
  
  // Lambda settings
  lambda: {
    timeout: number;
    memorySize: number;
    reservedConcurrency?: number;
    environment: {
      LOG_LEVEL: string;
      NODE_ENV: string;
      POWERTOOLS_SERVICE_NAME: string;
    };
  };
  
  // API Gateway settings
  apiGateway: {
    throttlingRateLimit: number;
    throttlingBurstLimit: number;
    enableAccessLogging: boolean;
    enableDetailedMetrics: boolean;
  };
  
  // Security settings
  security: {
    enableWaf: boolean;
    enableShield: boolean;
    enableGuardDuty: boolean;
    enableCloudTrail: boolean;
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
  };
  
  // Monitoring settings
  monitoring: {
    enableXRay: boolean;
    enableCloudWatchLogs: boolean;
    enableCustomMetrics: boolean;
    enableAlarms: boolean;
    retentionDays: number;
  };
  
  // Scaling settings
  scaling: {
    autoScaling: boolean;
    minCapacity: number;
    maxCapacity: number;
    targetUtilization: number;
  };
  
  // Regional compliance
  compliance: {
    dataResidency: string[];
    gdprCompliance: boolean;
    pipedaCompliance: boolean;
    ccpaCompliance: boolean;
    waemuCompliance: boolean;
  };
  
  // Payment settings
  payments: {
    stripeEnabled: boolean;
    paypalEnabled: boolean;
    razorpayEnabled: boolean;
    testMode: boolean;
  };
  
  // Notification settings
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    sesRegion: string;
  };
  
  // Search settings
  search: {
    openSearchEnabled: boolean;
    instanceType: string;
    instanceCount: number;
    enableEncryption: boolean;
  };
  
  // Analytics settings
  analytics: {
    enableAnalytics: boolean;
    retentionDays: number;
    enableExport: boolean;
    enableRealTimeMetrics: boolean;
  };
  
  // Cost optimization
  costOptimization: {
    enableScheduler: boolean;
    enableSpotInstances: boolean;
    enableReservedInstances: boolean;
    budgetAlerts: boolean;
  };
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  dev: {
    name: 'dev',
    region: 'ca-central-1',
    
    vpc: {
      maxAzs: 2,
      natGateways: 1,
      enableFlowLogs: true,
    },
    
    dynamodb: {
      billingMode: 'PAY_PER_REQUEST',
      pointInTimeRecovery: true,
      backupRetention: 7,
    },
    
    lambda: {
      timeout: 30,
      memorySize: 512,
      environment: {
        LOG_LEVEL: 'DEBUG',
        NODE_ENV: 'development',
        POWERTOOLS_SERVICE_NAME: 'event-management-dev',
      },
    },
    
    apiGateway: {
      throttlingRateLimit: 1000,
      throttlingBurstLimit: 500,
      enableAccessLogging: true,
      enableDetailedMetrics: true,
    },
    
    security: {
      enableWaf: false,
      enableShield: false,
      enableGuardDuty: true,
      enableCloudTrail: true,
      encryptionAtRest: true,
      encryptionInTransit: true,
    },
    
    monitoring: {
      enableXRay: true,
      enableCloudWatchLogs: true,
      enableCustomMetrics: true,
      enableAlarms: false,
      retentionDays: 7,
    },
    
    scaling: {
      autoScaling: false,
      minCapacity: 1,
      maxCapacity: 5,
      targetUtilization: 70,
    },
    
    compliance: {
      dataResidency: ['CA'],
      gdprCompliance: false,
      pipedaCompliance: true,
      ccpaCompliance: false,
      waemuCompliance: false,
    },
    
    payments: {
      stripeEnabled: true,
      paypalEnabled: true,
      razorpayEnabled: false,
      testMode: true,
    },
    
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: false,
      sesRegion: 'ca-central-1',
    },
    
    search: {
      openSearchEnabled: true,
      instanceType: 't3.small.search',
      instanceCount: 1,
      enableEncryption: true,
    },
    
    analytics: {
      enableAnalytics: true,
      retentionDays: 30,
      enableExport: true,
      enableRealTimeMetrics: true,
    },
    
    costOptimization: {
      enableScheduler: false,
      enableSpotInstances: false,
      enableReservedInstances: false,
      budgetAlerts: true,
    },
  },
  
  staging: {
    name: 'staging',
    region: 'ca-central-1',
    
    vpc: {
      maxAzs: 3,
      natGateways: 2,
      enableFlowLogs: true,
    },
    
    dynamodb: {
      billingMode: 'PROVISIONED',
      readCapacity: 10,
      writeCapacity: 5,
      pointInTimeRecovery: true,
      backupRetention: 14,
    },
    
    lambda: {
      timeout: 60,
      memorySize: 1024,
      reservedConcurrency: 50,
      environment: {
        LOG_LEVEL: 'INFO',
        NODE_ENV: 'staging',
        POWERTOOLS_SERVICE_NAME: 'event-management-staging',
      },
    },
    
    apiGateway: {
      throttlingRateLimit: 5000,
      throttlingBurstLimit: 2000,
      enableAccessLogging: true,
      enableDetailedMetrics: true,
    },
    
    security: {
      enableWaf: true,
      enableShield: false,
      enableGuardDuty: true,
      enableCloudTrail: true,
      encryptionAtRest: true,
      encryptionInTransit: true,
    },
    
    monitoring: {
      enableXRay: true,
      enableCloudWatchLogs: true,
      enableCustomMetrics: true,
      enableAlarms: true,
      retentionDays: 30,
    },
    
    scaling: {
      autoScaling: true,
      minCapacity: 2,
      maxCapacity: 10,
      targetUtilization: 70,
    },
    
    compliance: {
      dataResidency: ['CA', 'US'],
      gdprCompliance: false,
      pipedaCompliance: true,
      ccpaCompliance: true,
      waemuCompliance: false,
    },
    
    payments: {
      stripeEnabled: true,
      paypalEnabled: true,
      razorpayEnabled: true,
      testMode: true,
    },
    
    notifications: {
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      sesRegion: 'ca-central-1',
    },
    
    search: {
      openSearchEnabled: true,
      instanceType: 't3.medium.search',
      instanceCount: 2,
      enableEncryption: true,
    },
    
    analytics: {
      enableAnalytics: true,
      retentionDays: 90,
      enableExport: true,
      enableRealTimeMetrics: true,
    },
    
    costOptimization: {
      enableScheduler: true,
      enableSpotInstances: false,
      enableReservedInstances: false,
      budgetAlerts: true,
    },
  },
  
  prod: {
    name: 'prod',
    region: 'ca-central-1',
    
    vpc: {
      maxAzs: 3,
      natGateways: 3,
      enableFlowLogs: true,
    },
    
    dynamodb: {
      billingMode: 'PROVISIONED',
      readCapacity: 50,
      writeCapacity: 25,
      pointInTimeRecovery: true,
      backupRetention: 35,
    },
    
    lambda: {
      timeout: 300,
      memorySize: 2048,
      reservedConcurrency: 200,
      environment: {
        LOG_LEVEL: 'WARN',
        NODE_ENV: 'production',
        POWERTOOLS_SERVICE_NAME: 'event-management-prod',
      },
    },
    
    apiGateway: {
      throttlingRateLimit: 10000,
      throttlingBurstLimit: 5000,
      enableAccessLogging: true,
      enableDetailedMetrics: true,
    },
    
    security: {
      enableWaf: true,
      enableShield: true,
      enableGuardDuty: true,
      enableCloudTrail: true,
      encryptionAtRest: true,
      encryptionInTransit: true,
    },
    
    monitoring: {
      enableXRay: true,
      enableCloudWatchLogs: true,
      enableCustomMetrics: true,
      enableAlarms: true,
      retentionDays: 90,
    },
    
    scaling: {
      autoScaling: true,
      minCapacity: 5,
      maxCapacity: 50,
      targetUtilization: 70,
    },
    
    compliance: {
      dataResidency: ['CA', 'US', 'EU'],
      gdprCompliance: true,
      pipedaCompliance: true,
      ccpaCompliance: true,
      waemuCompliance: true,
    },
    
    payments: {
      stripeEnabled: true,
      paypalEnabled: true,
      razorpayEnabled: true,
      testMode: false,
    },
    
    notifications: {
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      sesRegion: 'ca-central-1',
    },
    
    search: {
      openSearchEnabled: true,
      instanceType: 'm5.large.search',
      instanceCount: 3,
      enableEncryption: true,
    },
    
    analytics: {
      enableAnalytics: true,
      retentionDays: 365,
      enableExport: true,
      enableRealTimeMetrics: true,
    },
    
    costOptimization: {
      enableScheduler: true,
      enableSpotInstances: true,
      enableReservedInstances: true,
      budgetAlerts: true,
    },
  },
};

export function getEnvironmentConfig(environment: string): EnvironmentConfig {
  const config = ENVIRONMENTS[environment];
  if (!config) {
    throw new Error(`Environment configuration not found for: ${environment}`);
  }
  return config;
}

export function validateEnvironmentConfig(config: EnvironmentConfig): void {
  // Validate required fields
  if (!config.name || !config.region) {
    throw new Error('Environment name and region are required');
  }
  
  // Validate region
  const validRegions = ['ca-central-1', 'us-east-1', 'us-west-2', 'eu-west-1'];
  if (!validRegions.includes(config.region)) {
    throw new Error(`Invalid region: ${config.region}. Valid regions: ${validRegions.join(', ')}`);
  }
  
  // Validate DynamoDB settings
  if (config.dynamodb.billingMode === 'PROVISIONED') {
    if (!config.dynamodb.readCapacity || !config.dynamodb.writeCapacity) {
      throw new Error('Read and write capacity are required for PROVISIONED billing mode');
    }
  }
  
  // Validate Lambda settings
  if (config.lambda.timeout < 1 || config.lambda.timeout > 900) {
    throw new Error('Lambda timeout must be between 1 and 900 seconds');
  }
  
  if (config.lambda.memorySize < 128 || config.lambda.memorySize > 10240) {
    throw new Error('Lambda memory size must be between 128 and 10240 MB');
  }
  
  // Validate scaling settings
  if (config.scaling.minCapacity > config.scaling.maxCapacity) {
    throw new Error('Minimum capacity cannot be greater than maximum capacity');
  }
  
  // Validate compliance settings
  if (config.compliance.gdprCompliance && !config.compliance.dataResidency.includes('EU')) {
    throw new Error('EU data residency is required for GDPR compliance');
  }
}





