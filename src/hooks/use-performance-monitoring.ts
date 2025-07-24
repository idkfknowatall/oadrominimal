import { useCallback, useRef } from 'react';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    averageLoadTime: number;
    averageRenderTime: number;
    errorRate: number;
    totalEvents: number;
  };
}

/**
 * Performance monitoring hook for tracking application metrics
 */
export function usePerformanceMonitoring() {
  const metricsRef = useRef<PerformanceMetric[]>([]);
  const startTimesRef = useRef<Map<string, number>>(new Map());

  const reportMetric = useCallback((name: string, value: number, metadata?: Record<string, any>) => {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    metricsRef.current.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (metricsRef.current.length > 1000) {
      metricsRef.current = metricsRef.current.slice(-1000);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] ${name}: ${value}ms`, metadata);
    }

    // Send to analytics service in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Placeholder for analytics integration
      // analytics.track('performance_metric', { name, value, metadata });
    }
  }, []);

  const startTimer = useCallback((name: string) => {
    startTimesRef.current.set(name, performance.now());
  }, []);

  const endTimer = useCallback((name: string, metadata?: Record<string, any>) => {
    const startTime = startTimesRef.current.get(name);
    if (startTime !== undefined) {
      const duration = performance.now() - startTime;
      reportMetric(name, duration, metadata);
      startTimesRef.current.delete(name);
      return duration;
    }
    return 0;
  }, [reportMetric]);

  const measureAsync = useCallback(async <T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      reportMetric(name, duration, { ...metadata, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      reportMetric(name, duration, { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }, [reportMetric]);

  const measureSync = useCallback(<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T => {
    const startTime = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      reportMetric(name, duration, { ...metadata, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      reportMetric(name, duration, { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }, [reportMetric]);

  const getReport = useCallback((): PerformanceReport => {
    const metrics = [...metricsRef.current];
    const loadTimeMetrics = metrics.filter(m => m.name.includes('load'));
    const renderTimeMetrics = metrics.filter(m => m.name.includes('render'));
    const errorMetrics = metrics.filter(m => m.metadata?.success === false);

    return {
      metrics,
      summary: {
        averageLoadTime: loadTimeMetrics.reduce((sum, m) => sum + m.value, 0) / loadTimeMetrics.length || 0,
        averageRenderTime: renderTimeMetrics.reduce((sum, m) => sum + m.value, 0) / renderTimeMetrics.length || 0,
        errorRate: metrics.length > 0 ? errorMetrics.length / metrics.length : 0,
        totalEvents: metrics.length
      }
    };
  }, []);

  const clearMetrics = useCallback(() => {
    metricsRef.current = [];
    startTimesRef.current.clear();
  }, []);

  return {
    reportMetric,
    startTimer,
    endTimer,
    measureAsync,
    measureSync,
    getReport,
    clearMetrics
  };
}