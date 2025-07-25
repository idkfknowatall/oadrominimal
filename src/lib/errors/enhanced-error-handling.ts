/**
 * Enhanced error handling and recovery system
 * Implements circuit breaker pattern and structured logging
 */

import { logger } from '@/lib/logger';

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN', 
  HALF_OPEN = 'HALF_OPEN'
}

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

// Enhanced error class with context
export class EnhancedError extends Error {
  public readonly type: ErrorType;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    context: Record<string, any> = {},
    options: {
      recoverable?: boolean;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'EnhancedError';
    this.type = type;
    this.context = context;
    this.timestamp = new Date();
    this.recoverable = options.recoverable ?? true;
    this.retryable = options.retryable ?? false;
    
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      recoverable: this.recoverable,
      retryable: this.retryable,
      stack: this.stack,
      cause: this.cause instanceof Error ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : this.cause
    };
  }
}

// Circuit breaker configuration
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: ErrorType[];
}

// Circuit breaker implementation
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: Date;
  private successCount = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 60000, // 1 minute
      monitoringPeriod: config.monitoringPeriod ?? 300000, // 5 minutes
      expectedErrors: config.expectedErrors ?? [ErrorType.NETWORK, ErrorType.SERVER]
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        logger.info(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
      } else {
        throw new EnhancedError(
          `Circuit breaker ${this.name} is OPEN`,
          ErrorType.SERVER,
          {
            circuitBreaker: this.name,
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime
          },
          { recoverable: false, retryable: false }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime.getTime() >= this.config.resetTimeout
    );
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      logger.info(`Circuit breaker ${this.name} reset to CLOSED after successful operation`);
    }
  }

  private onFailure(error: unknown): void {
    const enhancedError = error instanceof EnhancedError 
      ? error 
      : new EnhancedError('Unknown error', ErrorType.UNKNOWN, { originalError: error });

    // Only count failures for expected error types
    if (this.config.expectedErrors?.includes(enhancedError.type)) {
      this.failureCount++;
      this.lastFailureTime = new Date();

      logger.warn(`Circuit breaker ${this.name} recorded failure`, {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
        errorType: enhancedError.type,
        errorMessage: enhancedError.message
      });

      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        logger.error(`Circuit breaker ${this.name} opened due to repeated failures`, {
          failureCount: this.failureCount,
          threshold: this.config.failureThreshold
        });
      }
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      config: this.config
    };
  }
}

// Global circuit breakers for different services
export const circuitBreakers = {
  discord: new CircuitBreaker('discord-api', {
    failureThreshold: 3,
    resetTimeout: 30000, // 30 seconds
    expectedErrors: [ErrorType.NETWORK, ErrorType.AUTHENTICATION, ErrorType.RATE_LIMIT]
  }),
  
  radioStream: new CircuitBreaker('radio-stream', {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    expectedErrors: [ErrorType.NETWORK, ErrorType.SERVER]
  }),

  metadata: new CircuitBreaker('metadata-service', {
    failureThreshold: 10,
    resetTimeout: 30000, // 30 seconds
    expectedErrors: [ErrorType.NETWORK, ErrorType.SERVER]
  })
};

// Error recovery strategies
export class ErrorRecovery {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delays?: number[];
      shouldRetry?: (error: Error) => boolean;
      onRetry?: (attempt: number, error: Error) => void;
    } = {}
  ): Promise<T> {
    const maxAttempts = options.maxAttempts ?? this.MAX_RETRY_ATTEMPTS;
    const delays = options.delays ?? this.RETRY_DELAYS;
    const shouldRetry = options.shouldRetry ?? ((error) => {
      if (error instanceof EnhancedError) {
        return error.retryable;
      }
      return false;
    });

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts || !shouldRetry(lastError)) {
          throw lastError;
        }

        const delay = delays[Math.min(attempt - 1, delays.length - 1)];
        
        if (options.onRetry) {
          options.onRetry(attempt, lastError);
        }

        logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
          error: lastError.message,
          attempt,
          maxAttempts,
          delay
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  static async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    options: {
      shouldUseFallback?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    const shouldUseFallback = options.shouldUseFallback ?? ((error) => {
      if (error instanceof EnhancedError) {
        return error.recoverable;
      }
      return true;
    });

    try {
      return await primary();
    } catch (error) {
      const enhancedError = error instanceof Error ? error : new Error(String(error));
      
      if (shouldUseFallback(enhancedError)) {
        logger.info('Using fallback operation due to primary failure', {
          primaryError: enhancedError.message
        });
        return await fallback();
      }
      
      throw enhancedError;
    }
  }
}

// Error reporting and analytics
export class ErrorReporter {
  private static errors: EnhancedError[] = [];
  private static readonly MAX_STORED_ERRORS = 100;

  static report(error: EnhancedError): void {
    // Add to in-memory store
    this.errors.unshift(error);
    if (this.errors.length > this.MAX_STORED_ERRORS) {
      this.errors.pop();
    }

    // Log the error
    logger.error('Error reported', error.toJSON());

    // In production, you would send to external monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, DataDog, etc.
      this.sendToMonitoringService(error);
    }
  }

  private static async sendToMonitoringService(error: EnhancedError): Promise<void> {
    try {
      // Placeholder for external monitoring service integration
      // await externalService.reportError(error.toJSON());
    } catch (reportingError) {
      logger.error('Failed to report error to monitoring service', {
        originalError: error.toJSON(),
        reportingError: reportingError instanceof Error ? reportingError.message : reportingError
      });
    }
  }

  static getRecentErrors(limit: number = 10): EnhancedError[] {
    return this.errors.slice(0, limit);
  }

  static getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    byRecoverable: { recoverable: number; nonRecoverable: number };
    recent: number; // Last hour
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const byType = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);

    const byRecoverable = this.errors.reduce(
      (acc, error) => {
        if (error.recoverable) {
          acc.recoverable++;
        } else {
          acc.nonRecoverable++;
        }
        return acc;
      },
      { recoverable: 0, nonRecoverable: 0 }
    );

    const recent = this.errors.filter(error => error.timestamp > oneHourAgo).length;

    return {
      total: this.errors.length,
      byType,
      byRecoverable,
      recent
    };
  }

  static clearErrors(): void {
    this.errors = [];
    logger.info('Error history cleared');
  }
}

// Utility functions for common error scenarios
export const ErrorUtils = {
  createNetworkError: (message: string, context: Record<string, any> = {}) =>
    new EnhancedError(message, ErrorType.NETWORK, context, { retryable: true }),

  createAuthError: (message: string, context: Record<string, any> = {}) =>
    new EnhancedError(message, ErrorType.AUTHENTICATION, context, { recoverable: false }),

  createValidationError: (message: string, context: Record<string, any> = {}) =>
    new EnhancedError(message, ErrorType.VALIDATION, context, { recoverable: false }),

  createRateLimitError: (message: string, context: Record<string, any> = {}) =>
    new EnhancedError(message, ErrorType.RATE_LIMIT, context, { retryable: true }),

  createServerError: (message: string, context: Record<string, any> = {}) =>
    new EnhancedError(message, ErrorType.SERVER, context, { retryable: true }),

  isRetryableError: (error: Error): boolean =>
    error instanceof EnhancedError && error.retryable,

  isRecoverableError: (error: Error): boolean =>
    error instanceof EnhancedError && error.recoverable
};