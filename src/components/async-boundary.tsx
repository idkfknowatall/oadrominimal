'use client';

import React, { ReactNode, Component, ErrorInfo } from 'react';
import { ConfigurableErrorBoundary } from './error-boundary-base';
import { AsyncErrorFallback } from './error-fallbacks/async-error-fallback';
import { enhanceError } from '@/lib/errors/error-boundary-utils';

interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onAsyncError?: (error: Error, errorInfo?: ErrorInfo) => void;
  retryDelay?: number;
  maxRetries?: number;
  showNetworkStatus?: boolean;
}

interface AsyncBoundaryState {
  networkStatus: 'online' | 'offline' | 'unknown';
}

class AsyncBoundaryCore extends Component<AsyncBoundaryProps, AsyncBoundaryState> {
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
  private networkStatusHandler: (() => void) | null = null;

  constructor(props: AsyncBoundaryProps) {
    super(props);
    this.state = {
      networkStatus: typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'unknown',
    };
  }

  componentDidMount() {
    // Listen for unhandled promise rejections
    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection caught by AsyncBoundary:', event.reason);
      
      // Convert promise rejection to error
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      // Enhance error with async context
      const asyncError = enhanceError(error, { 
        type: 'Async',
        component: 'AsyncBoundary',
        operation: 'unhandled_promise_rejection'
      });
      
      // Prevent the default browser behavior
      event.preventDefault();
      
      // Re-throw to trigger error boundary
      throw asyncError;
    };

    // Listen for network status changes
    this.networkStatusHandler = () => {
      this.setState({
        networkStatus: navigator.onLine ? 'online' : 'offline'
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
      window.addEventListener('online', this.networkStatusHandler);
      window.addEventListener('offline', this.networkStatusHandler);
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined' && this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
      window.removeEventListener('online', this.networkStatusHandler!);
      window.removeEventListener('offline', this.networkStatusHandler!);
    }
  }

  render() {
    const { 
      children, 
      fallback, 
      onAsyncError, 
      retryDelay = 1000, 
      maxRetries = 3,
      showNetworkStatus = true 
    } = this.props;
    const { networkStatus } = this.state;

    // Create enhanced fallback component with async-specific props
    const AsyncFallbackWithProps = (props: any) => (
      <AsyncErrorFallback
        {...props}
        networkStatus={networkStatus}
        showNetworkStatus={showNetworkStatus}
      />
    );

    // Prepare props for ConfigurableErrorBoundary
    const boundaryProps: any = {
      onError: onAsyncError,
      retryDelay,
      maxRetries,
      enableRetry: true,
      context: { 
        boundaryType: 'async', 
        networkStatus,
        showNetworkStatus 
      }
    };

    if (fallback) {
      boundaryProps.fallback = fallback;
    } else {
      boundaryProps.fallbackComponent = AsyncFallbackWithProps;
    }

    return (
      <ConfigurableErrorBoundary {...boundaryProps}>
        {children}
      </ConfigurableErrorBoundary>
    );
  }
}

export default function AsyncBoundary(props: AsyncBoundaryProps) {
  return <AsyncBoundaryCore {...props} />;
}

// Hook for handling async errors manually
export function useAsyncErrorHandler() {
  return (asyncOperation: Promise<unknown>, errorContext?: { operation?: string; component?: string }) => {
    return asyncOperation.catch((error: Error) => {
      console.error('Async operation failed:', error, errorContext);
      
      // Enhance error with context
      const enhancedError = enhanceError(error, {
        type: 'Async',
        component: errorContext?.component || 'Unknown',
        operation: errorContext?.operation || 'unknown'
      });
      
      // TODO: Report to monitoring service
      // Example: Sentry.captureException(enhancedError, { tags: { type: 'async', operation: errorContext?.operation } });
      
      throw enhancedError;
    });
  };
}

// Utility function to wrap async operations with error handling
export function withAsyncErrorHandling<T>(
  asyncFn: () => Promise<T>,
  context?: { operation?: string; component?: string }
): Promise<T> {
  return asyncFn().catch((error: Error) => {
    console.error('Wrapped async operation failed:', error, context);
    
    const wrappedError = enhanceError(error, {
      type: 'Async',
      component: context?.component || 'Unknown',
      operation: context?.operation || 'wrapped_async_operation'
    });
    
    throw wrappedError;
  });
}