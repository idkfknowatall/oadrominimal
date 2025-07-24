import { useState, useCallback, useRef } from 'react';

export interface CircuitBreakerConfig {
  threshold: number;
  timeout: number;
  resetTimeout: number;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerStats {
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
}

/**
 * Circuit breaker hook for handling service failures gracefully
 */
export function useCircuitBreaker(config: CircuitBreakerConfig = {
  threshold: 3,
  timeout: 30000,
  resetTimeout: 60000
}) {
  const [state, setState] = useState<CircuitBreakerState>('closed');
  const [stats, setStats] = useState<CircuitBreakerStats>({
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0
  });
  
  const timeoutRef = useRef<NodeJS.Timeout>();

  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    const now = Date.now();

    // If circuit is open, check if we should move to half-open
    if (state === 'open') {
      if (now - stats.lastFailureTime > config.resetTimeout) {
        setState('half-open');
      } else {
        throw new Error('Circuit breaker is open - service unavailable');
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          timeoutRef.current = setTimeout(() => {
            reject(new Error('Circuit breaker timeout'));
          }, config.timeout);
        })
      ]);

      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Update success stats
      setStats(prev => ({
        ...prev,
        successes: prev.successes + 1,
        lastSuccessTime: now,
        failures: state === 'half-open' ? 0 : prev.failures // Reset failures if recovering
      }));

      // Move to closed state if we were half-open
      if (state === 'half-open') {
        setState('closed');
      }

      return result;
    } catch (error) {
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const newFailures = stats.failures + 1;
      
      setStats(prev => ({
        ...prev,
        failures: newFailures,
        lastFailureTime: now
      }));

      // Open circuit if threshold exceeded
      if (newFailures >= config.threshold) {
        setState('open');
      }

      throw error;
    }
  }, [state, stats, config]);

  const reset = useCallback(() => {
    setState('closed');
    setStats({
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0
    });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const getHealthStatus = useCallback(() => {
    const now = Date.now();
    const recentFailures = stats.lastFailureTime > now - 300000; // 5 minutes
    const successRate = stats.successes / (stats.successes + stats.failures) || 0;
    
    return {
      state,
      stats,
      isHealthy: state === 'closed' && !recentFailures && successRate > 0.8,
      successRate
    };
  }, [state, stats]);

  return {
    execute,
    reset,
    state,
    stats,
    getHealthStatus
  };
}