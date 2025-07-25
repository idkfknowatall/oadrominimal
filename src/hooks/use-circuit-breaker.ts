/**
 * Circuit Breaker Pattern Implementation
 * Provides automatic failure detection and recovery for external service calls
 */

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time in ms before attempting recovery
  monitoringPeriod: number; // Time window for failure counting
  successThreshold: number; // Successes needed to close circuit from half-open
  onStateChange?: (state: CircuitBreakerState, error?: Error) => void;
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  nextAttempt?: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private nextAttempt?: number;
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      successThreshold: 3,
      ...options,
    };
  }

  /**
   * Executes a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.onStateChange('HALF_OPEN');
      } else {
        throw new Error(`Circuit breaker is OPEN. Next attempt in ${this.getTimeToNextAttempt()}ms`);
      }
    }

    this.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Records a successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.reset();
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failures = 0;
    }
  }

  /**
   * Records a failed execution
   */
  private onFailure(error: Error): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.open();
    } else if (this.state === 'CLOSED' && this.failures >= this.options.failureThreshold) {
      this.open();
    }

    this.onStateChange(this.state, error);
  }

  /**
   * Opens the circuit breaker
   */
  private open(): void {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.options.recoveryTimeout;
    this.successes = 0;
    this.onStateChange('OPEN');
  }

  /**
   * Resets the circuit breaker to closed state
   */
  private reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = undefined;
    this.onStateChange('CLOSED');
  }

  /**
   * Checks if we should attempt to reset from open state
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttempt !== undefined && Date.now() >= this.nextAttempt;
  }

  /**
   * Gets time until next attempt is allowed
   */
  private getTimeToNextAttempt(): number {
    if (this.nextAttempt === undefined) return 0;
    return Math.max(0, this.nextAttempt - Date.now());
  }

  /**
   * Calls the state change callback if provided
   */
  private onStateChange(state: CircuitBreakerState, error?: Error): void {
    if (this.options.onStateChange) {
      this.options.onStateChange(state, error);
    }
  }

  /**
   * Gets current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttempt: this.nextAttempt,
    };
  }

  /**
   * Manually opens the circuit breaker
   */
  forceOpen(): void {
    this.open();
  }

  /**
   * Manually closes the circuit breaker
   */
  forceClose(): void {
    this.reset();
  }

  /**
   * Checks if the circuit breaker allows requests
   */
  isRequestAllowed(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'HALF_OPEN') return true;
    if (this.state === 'OPEN') return this.shouldAttemptReset();
    return false;
  }
}

/**
 * React hook for using circuit breaker in components
 */
import { useCallback, useRef, useState, useEffect } from 'react';

export interface UseCircuitBreakerOptions extends Partial<CircuitBreakerOptions> {
  name?: string; // For logging/monitoring
}

export function useCircuitBreaker(options: UseCircuitBreakerOptions = {}) {
  const circuitBreakerRef = useRef<CircuitBreaker>();
  const [stats, setStats] = useState<CircuitBreakerStats>();

  // Initialize circuit breaker
  if (!circuitBreakerRef.current) {
    circuitBreakerRef.current = new CircuitBreaker({
      ...options,
      onStateChange: (state, error) => {
        if (options.name) {
          console.log(`[Circuit Breaker: ${options.name}] State changed to ${state}`, error?.message);
        }
        setStats(circuitBreakerRef.current!.getStats());
        options.onStateChange?.(state, error);
      },
    });
  }

  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    if (!circuitBreakerRef.current) {
      throw new Error('Circuit breaker not initialized');
    }
    
    try {
      const result = await circuitBreakerRef.current.execute(fn);
      setStats(circuitBreakerRef.current.getStats());
      return result;
    } catch (error) {
      setStats(circuitBreakerRef.current.getStats());
      throw error;
    }
  }, []);

  const forceOpen = useCallback(() => {
    circuitBreakerRef.current?.forceOpen();
    setStats(circuitBreakerRef.current?.getStats());
  }, []);

  const forceClose = useCallback(() => {
    circuitBreakerRef.current?.forceClose();
    setStats(circuitBreakerRef.current?.getStats());
  }, []);

  const isRequestAllowed = useCallback(() => {
    return circuitBreakerRef.current?.isRequestAllowed() ?? false;
  }, []);

  // Update stats on mount
  useEffect(() => {
    if (circuitBreakerRef.current) {
      setStats(circuitBreakerRef.current.getStats());
    }
  }, []);

  return {
    execute,
    forceOpen,
    forceClose,
    isRequestAllowed,
    stats,
  };
}

/**
 * Circuit breaker for Discord API calls
 */
export const discordCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  recoveryTimeout: 30000, // 30 seconds
  monitoringPeriod: 120000, // 2 minutes
  successThreshold: 2,
  onStateChange: (state, error) => {
    console.log(`[Discord Circuit Breaker] State: ${state}`, error?.message);
  },
});

/**
 * Circuit breaker for radio streaming API calls
 */
export const radioStreamCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  monitoringPeriod: 300000, // 5 minutes
  successThreshold: 3,
  onStateChange: (state, error) => {
    console.log(`[Radio Stream Circuit Breaker] State: ${state}`, error?.message);
  },
});

/**
 * Utility function to create a circuit breaker with common settings
 */
export function createCircuitBreaker(
  name: string,
  options: Partial<CircuitBreakerOptions> = {}
): CircuitBreaker {
  return new CircuitBreaker({
    failureThreshold: 5,
    recoveryTimeout: 60000,
    monitoringPeriod: 300000,
    successThreshold: 3,
    onStateChange: (state, error) => {
      console.log(`[Circuit Breaker: ${name}] State: ${state}`, error?.message);
    },
    ...options,
  });
}