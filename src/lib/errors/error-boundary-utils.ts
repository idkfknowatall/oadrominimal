import { ErrorInfo } from 'react';

// Common error boundary state interface
export interface BaseErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

// Common error boundary props interface
export interface BaseErrorBoundaryProps {
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
}

// Error context for reporting
export interface ErrorContext {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  errorInfo?: {
    componentStack: string;
  };
  userAgent: string;
  url: string;
  timestamp: string;
  eventId: string | null;
  [key: string]: unknown;
}

// Generate unique error event ID
export function generateErrorEventId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create error state from error
export function createErrorState(error: Error): Partial<BaseErrorState> {
  return {
    hasError: true,
    error,
    eventId: generateErrorEventId(),
  };
}

// Reset error state
export function createResetErrorState(): BaseErrorState {
  return {
    hasError: false,
    error: null,
    errorInfo: null,
    eventId: null,
  };
}

// Check if reset keys have changed
export function hasResetKeyChanged(
  currentKeys?: Array<string | number>,
  prevKeys?: Array<string | number>
): boolean {
  if (!currentKeys || !prevKeys) return false;
  return currentKeys.some((key, index) => key !== prevKeys[index]);
}

// Create error context for reporting
export function createErrorContext(
  error: Error,
  errorInfo: ErrorInfo | null,
  eventId: string | null,
  additionalContext?: Record<string, unknown>
): ErrorContext {
  const context: ErrorContext = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack || '',
    },
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    timestamp: new Date().toISOString(),
    eventId,
    ...additionalContext,
  };

  if (errorInfo) {
    context.errorInfo = {
      componentStack: errorInfo.componentStack || '',
    };
  }

  return context;
}

// Report error to console and monitoring service
export function reportError(
  error: Error,
  errorInfo: ErrorInfo | null,
  eventId: string | null,
  context?: Record<string, unknown>
): void {
  const errorContext = createErrorContext(error, errorInfo, eventId, context);

  // In development, log detailed error information
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Boundary Report');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Context:', errorContext);
    console.groupEnd();
  }

  // TODO: Integrate with monitoring service (Sentry, LogRocket, etc.)
  // Example: Sentry.captureException(error, { contexts: { errorBoundary: errorContext } });
}

// Copy error details to clipboard
export function copyErrorDetails(
  error: Error | null,
  errorInfo: ErrorInfo | null,
  eventId: string | null
): void {
  if (!error) return;

  const errorDetails = {
    eventId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    componentStack: errorInfo?.componentStack,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
  }
}

// Standard error boundary navigation actions
export const errorBoundaryActions = {
  reload: () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  },
  
  goHome: () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  },
};

// Retry mechanism with delay
export class RetryManager {
  private retryTimeoutId: number | null = null;

  constructor(
    private maxRetries: number = 3,
    private retryDelay: number = 1000
  ) {}

  canRetry(currentRetryCount: number): boolean {
    return currentRetryCount < this.maxRetries;
  }

  scheduleRetry(callback: () => void, currentRetryCount: number): boolean {
    if (!this.canRetry(currentRetryCount)) {
      return false;
    }

    this.retryTimeoutId = window.setTimeout(callback, this.retryDelay);
    return true;
  }

  clearRetry(): void {
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  cleanup(): void {
    this.clearRetry();
  }
}

// Error type classification
export type ErrorType = 'network' | 'timeout' | 'auth' | 'player' | 'async' | 'generic';

export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  if (message.includes('timeout') || message.includes('aborted')) {
    return 'timeout';
  }
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
    return 'auth';
  }
  if (message.includes('player') || message.includes('audio') || message.includes('media')) {
    return 'player';
  }
  if (message.includes('async') || error.name.includes('Async')) {
    return 'async';
  }
  return 'generic';
}

// Enhanced error for specific contexts
export function enhanceError(
  error: Error,
  context: { type: string; component?: string; operation?: string }
): Error {
  const enhancedError = new Error(`${context.type} Error: ${error.message}`);
  enhancedError.stack = error.stack || '';
  enhancedError.name = `${context.type}Error_${context.component || 'Unknown'}`;
  
  return enhancedError;
}