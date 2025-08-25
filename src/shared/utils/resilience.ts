import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'resilience' });

// Circuit Breaker States
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

// Circuit Breaker Configuration
export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  recoveryTimeout: number;       // Time in ms to wait before trying again
  expectedExceptionTypes: string[]; // Exception types that count as failures
  monitorInterval: number;       // Interval to check circuit state
  minimumRequestCount: number;   // Minimum requests before considering failure rate
}

// Default circuit breaker configuration
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  expectedExceptionTypes: ['NetworkError', 'TimeoutError', 'ServiceUnavailableError'],
  monitorInterval: 10000, // 10 seconds
  minimumRequestCount: 10,
};

// Circuit Breaker Implementation
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        logger.info('Circuit breaker transitioning to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.successCount++;
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      logger.info('Circuit breaker reset to CLOSED');
    }
  }

  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    const isExpectedFailure = this.config.expectedExceptionTypes.some(
      type => error.name === type || error.message.includes(type)
    );

    if (isExpectedFailure && this.shouldOpenCircuit()) {
      this.state = CircuitBreakerState.OPEN;
      logger.warn('Circuit breaker opened', {
        failureCount: this.failureCount,
        error: error.message,
      });
    }
  }

  private shouldOpenCircuit(): boolean {
    const totalRequests = this.successCount + this.failureCount;
    if (totalRequests < this.config.minimumRequestCount) {
      return false;
    }

    const failureRate = this.failureCount / totalRequests;
    return this.failureCount >= this.config.failureThreshold || failureRate > 0.5;
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats(): { state: CircuitBreakerState; failureCount: number; successCount: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }
}

// Retry Configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: ['NetworkError', 'TimeoutError', 'ServiceUnavailableError', 'ThrottlingException'],
};

// Retry with Exponential Backoff Implementation
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt > retryConfig.maxRetries) {
        logger.error('Max retries exceeded', {
          maxRetries: retryConfig.maxRetries,
          error: lastError.message,
        });
        throw lastError;
      }

      const isRetryable = retryConfig.retryableErrors.some(
        errorType => 
          lastError.name === errorType || 
          lastError.message.includes(errorType)
      );

      if (!isRetryable) {
        logger.warn('Non-retryable error encountered', {
          error: lastError.message,
          attempt,
        });
        throw lastError;
      }

      const delay = calculateDelay(attempt, retryConfig);
      
      logger.info('Retrying operation', {
        attempt,
        delay,
        error: lastError.message,
      });

      await sleep(delay);
    }
  }

  throw lastError!;
}

// Calculate delay with exponential backoff and optional jitter
function calculateDelay(attempt: number, config: RetryConfig): number {
  let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  
  if (config.jitter) {
    const jitter = Math.random() * 0.1 * delay; // 10% jitter
    delay += jitter;
  }
  
  return Math.min(delay, config.maxDelay);
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Bulkhead Configuration
export interface BulkheadConfig {
  maxConcurrentExecutions: number;
  maxQueueSize: number;
  queueTimeout: number;
}

// Default bulkhead configuration
export const DEFAULT_BULKHEAD_CONFIG: BulkheadConfig = {
  maxConcurrentExecutions: 10,
  maxQueueSize: 100,
  queueTimeout: 5000, // 5 seconds
};

// Bulkhead Implementation
export class Bulkhead {
  private currentExecutions: number = 0;
  private queue: Array<() => void> = [];
  private config: BulkheadConfig;

  constructor(config: Partial<BulkheadConfig> = {}) {
    this.config = { ...DEFAULT_BULKHEAD_CONFIG, ...config };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.currentExecutions >= this.config.maxConcurrentExecutions) {
      if (this.queue.length >= this.config.maxQueueSize) {
        throw new Error('Bulkhead queue is full');
      }

      // Wait for a slot to become available
      await this.waitForSlot();
    }

    this.currentExecutions++;
    
    try {
      return await operation();
    } finally {
      this.currentExecutions--;
      this.processQueue();
    }
  }

  private async waitForSlot(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Bulkhead queue timeout'));
      }, this.config.queueTimeout);

      this.queue.push(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.currentExecutions < this.config.maxConcurrentExecutions) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  getStats(): { currentExecutions: number; queueLength: number } {
    return {
      currentExecutions: this.currentExecutions,
      queueLength: this.queue.length,
    };
  }
}

// Timeout Configuration
export interface TimeoutConfig {
  timeoutMs: number;
  timeoutMessage: string;
}

// Default timeout configuration
export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  timeoutMs: 30000, // 30 seconds
  timeoutMessage: 'Operation timed out',
};

// Timeout Implementation
export async function withTimeout<T>(
  operation: () => Promise<T>,
  config: Partial<TimeoutConfig> = {}
): Promise<T> {
  const timeoutConfig = { ...DEFAULT_TIMEOUT_CONFIG, ...config };

  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutConfig.timeoutMessage));
      }, timeoutConfig.timeoutMs);
    }),
  ]);
}

// Resilience Manager - Combines all patterns
export class ResilienceManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private bulkheads: Map<string, Bulkhead> = new Map();

  // Execute with all resilience patterns
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    options: {
      circuitBreakerKey?: string;
      bulkheadKey?: string;
      retryConfig?: Partial<RetryConfig>;
      timeoutConfig?: Partial<TimeoutConfig>;
      circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
      bulkheadConfig?: Partial<BulkheadConfig>;
    } = {}
  ): Promise<T> {
    let resilientOperation = operation;

    // Apply timeout
    if (options.timeoutConfig) {
      resilientOperation = () => withTimeout(operation, options.timeoutConfig);
    }

    // Apply retry
    if (options.retryConfig) {
      const originalOperation = resilientOperation;
      resilientOperation = () => retryWithBackoff(originalOperation, options.retryConfig);
    }

    // Apply bulkhead
    if (options.bulkheadKey) {
      const bulkhead = this.getBulkhead(options.bulkheadKey, options.bulkheadConfig);
      const originalOperation = resilientOperation;
      resilientOperation = () => bulkhead.execute(originalOperation);
    }

    // Apply circuit breaker
    if (options.circuitBreakerKey) {
      const circuitBreaker = this.getCircuitBreaker(options.circuitBreakerKey, options.circuitBreakerConfig);
      return circuitBreaker.execute(resilientOperation);
    }

    return resilientOperation();
  }

  private getCircuitBreaker(key: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, new CircuitBreaker(config));
    }
    return this.circuitBreakers.get(key)!;
  }

  private getBulkhead(key: string, config?: Partial<BulkheadConfig>): Bulkhead {
    if (!this.bulkheads.has(key)) {
      this.bulkheads.set(key, new Bulkhead(config));
    }
    return this.bulkheads.get(key)!;
  }

  // Get statistics for monitoring
  getStats(): {
    circuitBreakers: Record<string, { state: CircuitBreakerState; failureCount: number; successCount: number }>;
    bulkheads: Record<string, { currentExecutions: number; queueLength: number }>;
  } {
    const circuitBreakerStats: Record<string, any> = {};
    const bulkheadStats: Record<string, any> = {};

    this.circuitBreakers.forEach((breaker, key) => {
      circuitBreakerStats[key] = breaker.getStats();
    });

    this.bulkheads.forEach((bulkhead, key) => {
      bulkheadStats[key] = bulkhead.getStats();
    });

    return {
      circuitBreakers: circuitBreakerStats,
      bulkheads: bulkheadStats,
    };
  }
}

// Global resilience manager instance
export const resilienceManager = new ResilienceManager();

// Convenience functions for common patterns
export async function resilientHTTPRequest<T>(
  operation: () => Promise<T>,
  serviceName: string
): Promise<T> {
  return resilienceManager.executeWithResilience(operation, {
    circuitBreakerKey: `http-${serviceName}`,
    bulkheadKey: `http-${serviceName}`,
    retryConfig: { maxRetries: 3, baseDelay: 1000 },
    timeoutConfig: { timeoutMs: 10000 },
    circuitBreakerConfig: { failureThreshold: 3, recoveryTimeout: 30000 },
    bulkheadConfig: { maxConcurrentExecutions: 5, maxQueueSize: 50 },
  });
}

export async function resilientDatabaseOperation<T>(
  operation: () => Promise<T>,
  tableName: string
): Promise<T> {
  return resilienceManager.executeWithResilience(operation, {
    circuitBreakerKey: `db-${tableName}`,
    bulkheadKey: `db-${tableName}`,
    retryConfig: { maxRetries: 2, baseDelay: 500 },
    timeoutConfig: { timeoutMs: 5000 },
    circuitBreakerConfig: { failureThreshold: 5, recoveryTimeout: 60000 },
    bulkheadConfig: { maxConcurrentExecutions: 20, maxQueueSize: 100 },
  });
}

export async function resilientExternalServiceCall<T>(
  operation: () => Promise<T>,
  serviceName: string
): Promise<T> {
  return resilienceManager.executeWithResilience(operation, {
    circuitBreakerKey: `external-${serviceName}`,
    bulkheadKey: `external-${serviceName}`,
    retryConfig: { maxRetries: 3, baseDelay: 2000 },
    timeoutConfig: { timeoutMs: 15000 },
    circuitBreakerConfig: { failureThreshold: 3, recoveryTimeout: 60000 },
    bulkheadConfig: { maxConcurrentExecutions: 3, maxQueueSize: 20 },
  });
}
