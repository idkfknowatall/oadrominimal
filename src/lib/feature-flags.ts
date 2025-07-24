/**
 * Feature flags configuration for better deployment control
 */

interface FeatureFlags {
  enableAdvancedVisualizer: boolean;
  enablePerformanceMonitoring: boolean;
  enableCircuitBreaker: boolean;
  enableEnhancedErrorReporting: boolean;
  enableA11yFeatures: boolean;
  enablePWAFeatures: boolean;
  enableAnalytics: boolean;
  enableExperimentalFeatures: boolean;
  maxRetryAttempts: number;
  circuitBreakerThreshold: number;
  performanceMetricsEnabled: boolean;
}

// Default feature flag values
const defaultFlags: FeatureFlags = {
  enableAdvancedVisualizer: false,
  enablePerformanceMonitoring: true,
  enableCircuitBreaker: true,
  enableEnhancedErrorReporting: true,
  enableA11yFeatures: true,
  enablePWAFeatures: true,
  enableAnalytics: false,
  enableExperimentalFeatures: false,
  maxRetryAttempts: 3,
  circuitBreakerThreshold: 5,
  performanceMetricsEnabled: true,
};

// Environment-based feature flags
const getFeatureFlags = (): FeatureFlags => {
  if (typeof window === 'undefined') {
    // Server-side defaults
    return {
      ...defaultFlags,
      enableAdvancedVisualizer: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_VISUALIZER === 'true',
      enablePerformanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING !== 'false',
      enableCircuitBreaker: process.env.NEXT_PUBLIC_ENABLE_CIRCUIT_BREAKER !== 'false',
      enableEnhancedErrorReporting: process.env.NEXT_PUBLIC_ENABLE_ENHANCED_ERROR_REPORTING !== 'false',
      enableA11yFeatures: process.env.NEXT_PUBLIC_ENABLE_A11Y_FEATURES !== 'false',
      enablePWAFeatures: process.env.NEXT_PUBLIC_ENABLE_PWA_FEATURES !== 'false',
      enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
      enableExperimentalFeatures: process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_FEATURES === 'true',
      maxRetryAttempts: parseInt(process.env.NEXT_PUBLIC_MAX_RETRY_ATTEMPTS || '3', 10),
      circuitBreakerThreshold: parseInt(process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      performanceMetricsEnabled: process.env.NEXT_PUBLIC_PERFORMANCE_METRICS_ENABLED !== 'false',
    };
  }

  // Client-side with localStorage override support
  const flags = {
    ...defaultFlags,
    enableAdvancedVisualizer: 
      localStorage.getItem('ff_advanced_visualizer') === 'true' || 
      process.env.NEXT_PUBLIC_ENABLE_ADVANCED_VISUALIZER === 'true',
    enablePerformanceMonitoring: 
      localStorage.getItem('ff_performance_monitoring') !== 'false' && 
      process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING !== 'false',
    enableCircuitBreaker: 
      localStorage.getItem('ff_circuit_breaker') !== 'false' && 
      process.env.NEXT_PUBLIC_ENABLE_CIRCUIT_BREAKER !== 'false',
    enableEnhancedErrorReporting: 
      localStorage.getItem('ff_enhanced_error_reporting') !== 'false' && 
      process.env.NEXT_PUBLIC_ENABLE_ENHANCED_ERROR_REPORTING !== 'false',
    enableA11yFeatures: 
      localStorage.getItem('ff_a11y_features') !== 'false' && 
      process.env.NEXT_PUBLIC_ENABLE_A11Y_FEATURES !== 'false',
    enablePWAFeatures: 
      localStorage.getItem('ff_pwa_features') !== 'false' && 
      process.env.NEXT_PUBLIC_ENABLE_PWA_FEATURES !== 'false',
    enableAnalytics: 
      localStorage.getItem('ff_analytics') === 'true' || 
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableExperimentalFeatures: 
      localStorage.getItem('ff_experimental_features') === 'true' || 
      process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_FEATURES === 'true',
    maxRetryAttempts: parseInt(
      localStorage.getItem('ff_max_retry_attempts') || 
      process.env.NEXT_PUBLIC_MAX_RETRY_ATTEMPTS || 
      '3', 10
    ),
    circuitBreakerThreshold: parseInt(
      localStorage.getItem('ff_circuit_breaker_threshold') || 
      process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_THRESHOLD || 
      '5', 10
    ),
    performanceMetricsEnabled: 
      localStorage.getItem('ff_performance_metrics') !== 'false' && 
      process.env.NEXT_PUBLIC_PERFORMANCE_METRICS_ENABLED !== 'false',
  };

  return flags;
};

export const featureFlags = getFeatureFlags();

// Helper functions for feature flag management
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  const flags = getFeatureFlags();
  return Boolean(flags[flag]);
};

export const setFeatureFlag = (flag: keyof FeatureFlags, value: boolean | number): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`ff_${flag.replace(/([A-Z])/g, '_$1').toLowerCase()}`, String(value));
  }
};

export const getFeatureFlag = <T extends keyof FeatureFlags>(flag: T): FeatureFlags[T] => {
  const flags = getFeatureFlags();
  return flags[flag];
};

// Development helpers
export const getAllFeatureFlags = (): FeatureFlags => getFeatureFlags();

export const resetFeatureFlags = (): void => {
  if (typeof window !== 'undefined') {
    Object.keys(defaultFlags).forEach(flag => {
      localStorage.removeItem(`ff_${flag.replace(/([A-Z])/g, '_$1').toLowerCase()}`);
    });
  }
};