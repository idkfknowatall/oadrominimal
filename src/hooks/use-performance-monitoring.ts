/**
 * Performance Monitoring Hook
 * Provides real-time performance metrics and monitoring capabilities
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PerformanceMetrics {
  // Memory metrics
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  
  // Performance timing
  responseTime: number;
  lastUpdateTime: number;
  
  // Request metrics
  requestCount: number;
  errorCount: number;
  successRate: number;
  
  // Component metrics
  renderCount: number;
  lastRenderTime: number;
  
  // Audio specific metrics
  audioBufferHealth?: number;
  audioDropouts?: number;
  audioLatency?: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
}

export interface PerformanceThresholds {
  memoryUsageWarning: number; // Percentage
  memoryUsageError: number; // Percentage
  responseTimeWarning: number; // Milliseconds
  responseTimeError: number; // Milliseconds
  errorRateWarning: number; // Percentage
  errorRateError: number; // Percentage
  audioBufferWarning: number; // Percentage
  audioBufferError: number; // Percentage
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  memoryUsageWarning: 70,
  memoryUsageError: 90,
  responseTimeWarning: 1000,
  responseTimeError: 3000,
  errorRateWarning: 5,
  errorRateError: 15,
  audioBufferWarning: 20,
  audioBufferError: 10,
};

/**
 * Gets current memory usage information
 */
function getMemoryUsage(): { used: number; total: number; percentage: number } {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    const used = memory.usedJSHeapSize || 0;
    const total = memory.totalJSHeapSize || 0;
    const percentage = total > 0 ? (used / total) * 100 : 0;
    
    return { used, total, percentage };
  }
  
  return { used: 0, total: 0, percentage: 0 };
}

/**
 * Measures the performance of an async function
 */
async function measurePerformance<T>(fn: () => Promise<T>): Promise<{
  result: T;
  duration: number;
  success: boolean;
  error?: Error;
}> {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    return { result, duration, success: true };
  } catch (error) {
    const duration = performance.now() - startTime;
    return { 
      result: null as T, 
      duration, 
      success: false, 
      error: error as Error 
    };
  }
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitoring(
  options: {
    enabled?: boolean;
    updateInterval?: number;
    thresholds?: Partial<PerformanceThresholds>;
    onAlert?: (alert: PerformanceAlert) => void;
    componentName?: string;
  } = {}
) {
  const {
    enabled = true,
    updateInterval = 5000, // 5 seconds
    thresholds = {},
    onAlert,
    componentName = 'Unknown',
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    responseTime: 0,
    lastUpdateTime: Date.now(),
    requestCount: 0,
    errorCount: 0,
    successRate: 100,
    renderCount: 0,
    lastRenderTime: Date.now(),
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const metricsRef = useRef(metrics);
  const renderCountRef = useRef(0);
  const thresholdsRef = useRef({ ...DEFAULT_THRESHOLDS, ...thresholds });

  // Update refs when metrics change
  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  // Track render count
  useEffect(() => {
    renderCountRef.current++;
    setMetrics(prev => ({
      ...prev,
      renderCount: renderCountRef.current,
      lastRenderTime: Date.now(),
    }));
  }, []);

  /**
   * Creates and dispatches an alert
   */
  const createAlert = useCallback((
    type: PerformanceAlert['type'],
    message: string,
    metric: keyof PerformanceMetrics,
    value: number,
    threshold: number
  ) => {
    const alert: PerformanceAlert = {
      type,
      message,
      timestamp: Date.now(),
      metric,
      value,
      threshold,
    };

    setAlerts(prev => [...prev.slice(-9), alert]); // Keep last 10 alerts
    onAlert?.(alert);

    console.warn(`[Performance Monitor: ${componentName}] ${type.toUpperCase()}: ${message}`, {
      metric,
      value,
      threshold,
    });
  }, [componentName, onAlert]);

  /**
   * Checks metrics against thresholds and creates alerts
   */
  const checkThresholds = useCallback((newMetrics: PerformanceMetrics) => {
    const t = thresholdsRef.current;

    // Memory usage alerts
    if (newMetrics.memoryUsage.percentage >= t.memoryUsageError) {
      createAlert(
        'error',
        `Memory usage critical: ${newMetrics.memoryUsage.percentage.toFixed(1)}%`,
        'memoryUsage',
        newMetrics.memoryUsage.percentage,
        t.memoryUsageError
      );
    } else if (newMetrics.memoryUsage.percentage >= t.memoryUsageWarning) {
      createAlert(
        'warning',
        `Memory usage high: ${newMetrics.memoryUsage.percentage.toFixed(1)}%`,
        'memoryUsage',
        newMetrics.memoryUsage.percentage,
        t.memoryUsageWarning
      );
    }

    // Response time alerts
    if (newMetrics.responseTime >= t.responseTimeError) {
      createAlert(
        'error',
        `Response time critical: ${newMetrics.responseTime.toFixed(0)}ms`,
        'responseTime',
        newMetrics.responseTime,
        t.responseTimeError
      );
    } else if (newMetrics.responseTime >= t.responseTimeWarning) {
      createAlert(
        'warning',
        `Response time high: ${newMetrics.responseTime.toFixed(0)}ms`,
        'responseTime',
        newMetrics.responseTime,
        t.responseTimeWarning
      );
    }

    // Error rate alerts
    const errorRate = 100 - newMetrics.successRate;
    if (errorRate >= t.errorRateError) {
      createAlert(
        'error',
        `Error rate critical: ${errorRate.toFixed(1)}%`,
        'successRate',
        errorRate,
        t.errorRateError
      );
    } else if (errorRate >= t.errorRateWarning) {
      createAlert(
        'warning',
        `Error rate high: ${errorRate.toFixed(1)}%`,
        'successRate',
        errorRate,
        t.errorRateWarning
      );
    }

    // Audio buffer alerts
    if (newMetrics.audioBufferHealth !== undefined) {
      if (newMetrics.audioBufferHealth <= t.audioBufferError) {
        createAlert(
          'error',
          `Audio buffer critical: ${newMetrics.audioBufferHealth.toFixed(1)}%`,
          'audioBufferHealth',
          newMetrics.audioBufferHealth,
          t.audioBufferError
        );
      } else if (newMetrics.audioBufferHealth <= t.audioBufferWarning) {
        createAlert(
          'warning',
          `Audio buffer low: ${newMetrics.audioBufferHealth.toFixed(1)}%`,
          'audioBufferHealth',
          newMetrics.audioBufferHealth,
          t.audioBufferWarning
        );
      }
    }
  }, [createAlert]);

  /**
   * Updates performance metrics
   */
  const updateMetrics = useCallback(() => {
    if (!enabled) return;

    const memoryUsage = getMemoryUsage();
    const now = Date.now();

    setMetrics(prev => {
      const newMetrics = {
        ...prev,
        memoryUsage,
        lastUpdateTime: now,
      };

      // Check thresholds
      checkThresholds(newMetrics);

      return newMetrics;
    });
  }, [enabled, checkThresholds]);

  /**
   * Measures and records the performance of an async operation
   */
  const measureOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    const measurement = await measurePerformance(operation);

    setMetrics(prev => {
      const newRequestCount = prev.requestCount + 1;
      const newErrorCount = measurement.success ? prev.errorCount : prev.errorCount + 1;
      const successRate = ((newRequestCount - newErrorCount) / newRequestCount) * 100;

      const newMetrics = {
        ...prev,
        responseTime: measurement.duration,
        requestCount: newRequestCount,
        errorCount: newErrorCount,
        successRate,
        lastUpdateTime: Date.now(),
      };

      checkThresholds(newMetrics);
      return newMetrics;
    });

    if (!measurement.success) {
      console.error(`[Performance Monitor: ${componentName}] Operation failed:`, {
        operationName,
        duration: measurement.duration,
        error: measurement.error,
      });
      throw measurement.error;
    }

    if (operationName) {
      console.debug(`[Performance Monitor: ${componentName}] Operation completed:`, {
        operationName,
        duration: measurement.duration,
      });
    }

    return measurement.result;
  }, [componentName, checkThresholds]);

  /**
   * Updates audio-specific metrics
   */
  const updateAudioMetrics = useCallback((audioMetrics: {
    bufferHealth?: number;
    dropouts?: number;
    latency?: number;
  }) => {
    setMetrics(prev => {
      const newMetrics = {
        ...prev,
        audioBufferHealth: audioMetrics.bufferHealth,
        audioDropouts: audioMetrics.dropouts,
        audioLatency: audioMetrics.latency,
        lastUpdateTime: Date.now(),
      };

      checkThresholds(newMetrics);
      return newMetrics;
    });
  }, [checkThresholds]);

  /**
   * Clears old alerts
   */
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  /**
   * Gets performance summary
   */
  const getPerformanceSummary = useCallback(() => {
    const errorRate = 100 - metrics.successRate;
    const isHealthy = 
      metrics.memoryUsage.percentage < thresholdsRef.current.memoryUsageWarning &&
      metrics.responseTime < thresholdsRef.current.responseTimeWarning &&
      errorRate < thresholdsRef.current.errorRateWarning;

    return {
      isHealthy,
      score: Math.max(0, 100 - (
        (metrics.memoryUsage.percentage / 100) * 30 +
        (Math.min(metrics.responseTime, 5000) / 5000) * 30 +
        (errorRate / 100) * 40
      )),
      criticalIssues: alerts.filter(a => a.type === 'error').length,
      warnings: alerts.filter(a => a.type === 'warning').length,
    };
  }, [metrics, alerts]);

  // Set up periodic updates
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(updateMetrics, updateInterval);
    return () => clearInterval(interval);
  }, [enabled, updateInterval, updateMetrics]);

  // Initial metrics update
  useEffect(() => {
    if (enabled) {
      updateMetrics();
    }
  }, [enabled, updateMetrics]);

  return {
    metrics,
    alerts,
    measureOperation,
    updateAudioMetrics,
    clearAlerts,
    getPerformanceSummary,
    isEnabled: enabled,
  };
}

/**
 * Performance monitoring provider for global metrics
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private listeners: Set<(metrics: Map<string, PerformanceMetrics>) => void> = new Set();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  registerComponent(componentName: string, metrics: PerformanceMetrics): void {
    this.metrics.set(componentName, metrics);
    this.notifyListeners();
  }

  unregisterComponent(componentName: string): void {
    this.metrics.delete(componentName);
    this.notifyListeners();
  }

  getGlobalMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  subscribe(listener: (metrics: Map<string, PerformanceMetrics>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.metrics));
  }
}

/**
 * Hook for global performance monitoring
 */
export function useGlobalPerformanceMonitoring() {
  const [globalMetrics, setGlobalMetrics] = useState<Map<string, PerformanceMetrics>>(new Map());
  const monitor = PerformanceMonitor.getInstance();

  useEffect(() => {
    const unsubscribe = monitor.subscribe(setGlobalMetrics);
    setGlobalMetrics(monitor.getGlobalMetrics());
    return unsubscribe;
  }, [monitor]);

  return {
    globalMetrics,
    getAggregatedMetrics: () => {
      const metrics = Array.from(globalMetrics.values());
      if (metrics.length === 0) return null;

      return {
        totalMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage.used, 0),
        averageResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
        totalRequests: metrics.reduce((sum, m) => sum + m.requestCount, 0),
        totalErrors: metrics.reduce((sum, m) => sum + m.errorCount, 0),
        averageSuccessRate: metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length,
      };
    },
  };
}