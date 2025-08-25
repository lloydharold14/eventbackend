import { jest } from '@jest/globals';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.ENVIRONMENT = 'test';
  process.env.AWS_REGION = 'us-east-1';
  process.env.SERVICE_NAME = 'test-service';
  process.env.LOG_LEVEL = 'ERROR';
  process.env.ENABLE_TRACING = 'false';
  process.env.ENABLE_METRICS = 'false';
  process.env.JWT_SECRET = 'test-jwt-secret-32-chars-long';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
  
  // Mock AWS SDK
  jest.mock('@aws-sdk/client-dynamodb');
  jest.mock('@aws-sdk/lib-dynamodb');
  jest.mock('@aws-sdk/client-cloudwatch');
  jest.mock('@aws-sdk/client-s3');
  jest.mock('@aws-sdk/client-sqs');
  jest.mock('@aws-sdk/client-eventbridge');
  jest.mock('@aws-sdk/client-cognito-identity-provider');
  
  // Mock external services
  jest.mock('stripe');
  jest.mock('jsonwebtoken');
  jest.mock('bcryptjs');
  jest.mock('crypto');
  
  // Mock AWS Lambda Powertools
  jest.mock('@aws-lambda-powertools/logger');
  jest.mock('@aws-lambda-powertools/tracer');
  jest.mock('@aws-lambda-powertools/metrics');
  
  // Mock X-Ray
  jest.mock('aws-xray-sdk-core');
  
  // Suppress console output during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
});

// Global test teardown
afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
  
  // Clean up environment variables
  delete process.env.NODE_ENV;
  delete process.env.ENVIRONMENT;
  delete process.env.AWS_REGION;
  delete process.env.SERVICE_NAME;
  delete process.env.LOG_LEVEL;
  delete process.env.ENABLE_TRACING;
  delete process.env.ENABLE_METRICS;
  delete process.env.JWT_SECRET;
  delete process.env.ENCRYPTION_KEY;
});

// Global beforeEach
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset timer mocks
  jest.useFakeTimers();
});

// Global afterEach
afterEach(() => {
  // Restore real timers
  jest.useRealTimers();
  
  // Clear any remaining timers
  jest.clearAllTimers();
});

// Global test utilities
global.testUtils = {
  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate random string
  randomString: (length: number = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Generate random email
  randomEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
  
  // Generate random UUID
  randomUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  
  // Mock date
  mockDate: (date: Date) => {
    jest.useFakeTimers();
    jest.setSystemTime(date);
  },
  
  // Restore date
  restoreDate: () => {
    jest.useRealTimers();
  },
};

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  toBeValidDate(received: string) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime());
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },
  
  toHaveValidStructure(received: any, structure: any) {
    const checkStructure = (obj: any, schema: any): boolean => {
      if (typeof schema === 'function') {
        return schema(obj);
      }
      
      if (Array.isArray(schema)) {
        if (!Array.isArray(obj)) return false;
        return obj.every(item => checkStructure(item, schema[0]));
      }
      
      if (typeof schema === 'object' && schema !== null) {
        if (typeof obj !== 'object' || obj === null) return false;
        
        for (const key in schema) {
          if (!(key in obj)) return false;
          if (!checkStructure(obj[key], schema[key])) return false;
        }
        
        return true;
      }
      
      return obj === schema;
    };
    
    const pass = checkStructure(received, structure);
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to match structure ${JSON.stringify(structure)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to match structure ${JSON.stringify(structure)}`,
        pass: false,
      };
    }
  },
});

// Declare global types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidDate(): R;
      toHaveValidStructure(structure: any): R;
    }
  }
  
  var testUtils: {
    wait: (ms: number) => Promise<void>;
    randomString: (length?: number) => string;
    randomEmail: () => string;
    randomUUID: () => string;
    mockDate: (date: Date) => void;
    restoreDate: () => void;
  };
}

export {};
