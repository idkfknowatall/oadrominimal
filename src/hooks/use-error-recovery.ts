'use client';

import { useEffect, useCallback, useRef } from 'react';

interface ErrorRecoveryOptions {
  onError?: (error: Error, source: 'javascript' | 'unhandledrejection' | 'resource') => void;
  onRecovery?: () => void;
  enableGlobalErrorHandling?: boolean;
  enableUnhandledRejectionHandling?: boolean;
  enableResourceErrorHandling?: boolean;
  reportErrors?: boolean;
}

interface ErrorContext {
  timestamp: number;
  userAgent: string;
  url: string;
  source: 'javascript' | 'unhandledrejection' | 'resource';
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}

export function useErrorRecovery(options: ErrorRecoveryOptions = {}) {
  const {
    onError,
    onRecovery,
    enableGlobalErrorHandling = true,
    enableUnhandledRejectionHandling = true,
    enableResourceErrorHandling = true,
    reportErrors = true,
  } = options;

  const errorCountRef = useRef(0);
  const lastErrorTimeRef = useRef(0);
  const errorThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // Create error context
  const createErrorContext = useCallback((
    source: 'javascript' | 'unhandledrejection' | 'resource',
    additionalInfo?: Partial<ErrorContext>
  ): ErrorContext => {
    return {
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      source,
      ...additionalInfo,
    };
  }, []);

  // Report error to monitoring service
  const reportError = useCallback((error: Error, context: ErrorContext) => {
    if (!reportErrors) return;

    const errorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      errorCount: errorCountRef.current,
    };

    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Global Error Recovery Report');
      console.error('Error:', error);
      console.error('Context:', context);
      console.error('Report:', errorReport);
      console.groupEnd();
    }

    // TODO: Integrate with monitoring service
    // Example: Sentry.captureException(error, { extra: errorReport });
  }, [reportErrors]);

  // Throttled error handler to prevent spam
  const handleError = useCallback((error: Error, context: ErrorContext) => {
    const now = Date.now();
    const timeSinceLastError = now - lastErrorTimeRef.current;

    // Throttle errors if they're happening too frequently (within 1 second)
    if (timeSinceLastError < 1000) {
      if (errorThrottleRef.current) {
        clearTimeout(errorThrottleRef.current);
      }
      
      errorThrottleRef.current = setTimeout(() => {
        handleError(error, context);
      }, 1000);
      return;
    }

    lastErrorTimeRef.current = now;
    errorCountRef.current += 1;

    // Report the error
    reportError(error, context);

    // Call custom error handler
    if (onError) {
      try {
        onError(error, context.source);
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError);
      }
    }
  }, [onError, reportError]);

  // Global JavaScript error handler
  const handleGlobalError = useCallback((event: ErrorEvent) => {
    const error = event.error || new Error(event.message || 'Unknown error');
    const context = createErrorContext('javascript', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: error.stack,
    });

    handleError(error, context);
  }, [handleError, createErrorContext]);

  // Unhandled promise rejection handler
  const handleUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason) || 'Unhandled promise rejection');
    
    const context = createErrorContext('unhandledrejection', {
      stack: error.stack,
    });

    handleError(error, context);

    // Prevent the default browser behavior
    event.preventDefault();
  }, [handleError, createErrorContext]);

  // Resource loading error handler
  const handleResourceError = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    const error = new Error(`Resource failed to load: ${target.tagName}`);
    const context = createErrorContext('resource', {
      filename: ('src' in target ? (target as HTMLImageElement).src : null) || ('href' in target ? (target as HTMLLinkElement).href : null) || 'unknown',
    });

    handleError(error, context);
  }, [handleError, createErrorContext]);

  // Recovery function
  const recover = useCallback(() => {
    errorCountRef.current = 0;
    lastErrorTimeRef.current = 0;
    
    if (errorThrottleRef.current) {
      clearTimeout(errorThrottleRef.current);
      errorThrottleRef.current = null;
    }

    if (onRecovery) {
      onRecovery();
    }

    console.log('Error recovery completed');
  }, [onRecovery]);

  // Force error for testing
  const triggerTestError = useCallback((type: 'sync' | 'async' | 'resource' = 'sync') => {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('triggerTestError is only available in development mode');
      return;
    }

    switch (type) {
      case 'sync':
        throw new Error('Test synchronous error from useErrorRecovery');
      case 'async':
        Promise.reject(new Error('Test async error from useErrorRecovery'));
        break;
      case 'resource':
        const img = document.createElement('img');
        img.src = 'https://invalid-url-for-testing.com/nonexistent.jpg';
        document.body.appendChild(img);
        setTimeout(() => document.body.removeChild(img), 1000);
        break;
    }
  }, []);

  // Setup error listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Global JavaScript errors
    if (enableGlobalErrorHandling) {
      window.addEventListener('error', handleGlobalError);
    }

    // Unhandled promise rejections
    if (enableUnhandledRejectionHandling) {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    // Resource loading errors (images, scripts, etc.)
    if (enableResourceErrorHandling) {
      document.addEventListener('error', handleResourceError, true); // Use capture phase
    }

    // Cleanup function
    return () => {
      if (enableGlobalErrorHandling) {
        window.removeEventListener('error', handleGlobalError);
      }
      
      if (enableUnhandledRejectionHandling) {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
      
      if (enableResourceErrorHandling) {
        document.removeEventListener('error', handleResourceError, true);
      }

      if (errorThrottleRef.current) {
        clearTimeout(errorThrottleRef.current);
      }
    };
  }, [
    enableGlobalErrorHandling,
    enableUnhandledRejectionHandling,
    enableResourceErrorHandling,
    handleGlobalError,
    handleUnhandledRejection,
    handleResourceError,
  ]);

  return {
    recover,
    triggerTestError,
    errorCount: errorCountRef.current,
    reportError: (error: Error, source: 'javascript' | 'unhandledrejection' | 'resource' = 'javascript') => {
      const context = createErrorContext(source);
      handleError(error, context);
    },
  };
}

// Utility hook for component-level error handling
export function useComponentErrorHandler(componentName: string) {
  const { reportError } = useErrorRecovery();

  return useCallback((error: Error, errorInfo?: { action?: string; props?: unknown }) => {
    console.error(`Error in ${componentName}:`, error, errorInfo);

    // Create enhanced error with component context
    const enhancedError = new Error(`${componentName}: ${error.message}`);
    enhancedError.stack = error.stack;
    enhancedError.name = `ComponentError_${componentName}`;

    // Report the error
    reportError(enhancedError);

    // TODO: Report to monitoring service with component context
    // Example: Sentry.captureException(enhancedError, {
    //   tags: { component: componentName },
    //   extra: {
    //     component: componentName,
    //     action: errorInfo?.action,
    //     props: errorInfo?.props,
    //     timestamp: new Date().toISOString(),
    //   }
    // });

    // Re-throw to trigger error boundary
    throw enhancedError;
  }, [componentName, reportError]);
}

// Hook for handling async operations with error recovery
export function useAsyncErrorRecovery() {
  const { reportError } = useErrorRecovery();

  return useCallback(<T>(
    asyncOperation: () => Promise<T>,
    context?: { operation?: string; component?: string; retries?: number }
  ): Promise<T> => {
    const { operation = 'unknown', component = 'unknown', retries = 0 } = context || {};

    const executeWithRetry = async (attempt: number = 0): Promise<T> => {
      try {
        return await asyncOperation();
      } catch (error) {
        const asyncError = error instanceof Error ? error : new Error(String(error));
        
        console.error(`Async operation failed (${operation}) - attempt ${attempt + 1}:`, asyncError);

        // Report the error
        reportError(asyncError, 'unhandledrejection');

        // Retry if attempts remaining
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
          console.log(`Retrying ${operation} in ${delay}ms...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeWithRetry(attempt + 1);
        }

        // No more retries, throw enhanced error
        const enhancedError = new Error(`${operation} failed after ${attempt + 1} attempts: ${asyncError.message}`);
        enhancedError.stack = asyncError.stack;
        enhancedError.name = `AsyncError_${component}`;
        
        throw enhancedError;
      }
    };

    return executeWithRetry();
  }, [reportError]);
}