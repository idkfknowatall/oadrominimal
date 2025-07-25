'use client';

import React, { ReactNode, Component, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onAsyncError?: (error: Error, errorInfo?: ErrorInfo) => void;
  retryDelay?: number;
  maxRetries?: number;
  showNetworkStatus?: boolean;
}

interface AsyncBoundaryState {
  hasAsyncError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
  networkStatus: 'online' | 'offline' | 'unknown';
}

class AsyncBoundaryCore extends Component<AsyncBoundaryProps, AsyncBoundaryState> {
  private retryTimeoutId: number | null = null;
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
  private networkStatusHandler: (() => void) | null = null;

  constructor(props: AsyncBoundaryProps) {
    super(props);
    this.state = {
      hasAsyncError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
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
      
      this.handleAsyncError(error);
      
      // Prevent the default browser behavior
      event.preventDefault();
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
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
    }

    if (typeof window !== 'undefined' && this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
      window.removeEventListener('online', this.networkStatusHandler!);
      window.removeEventListener('offline', this.networkStatusHandler!);
    }
  }

  private handleAsyncError = (error: Error, errorInfo?: ErrorInfo) => {
    console.error('AsyncBoundary caught async error:', error, errorInfo);

    this.setState({
      hasAsyncError: true,
      error,
    });

    // Call custom error handler if provided
    if (this.props.onAsyncError) {
      this.props.onAsyncError(error, errorInfo);
    }

    // Report error with async context
    this.reportAsyncError(error, errorInfo);
  };

  private reportAsyncError = (error: Error, errorInfo?: ErrorInfo) => {
    const asyncContext = {
      type: 'async_error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo,
      networkStatus: this.state.networkStatus,
      retryCount: this.state.retryCount,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Async Error Boundary Report');
      console.error('Async Error:', error);
      console.error('Context:', asyncContext);
      console.groupEnd();
    }

    // TODO: Report to monitoring service
    // Example: Sentry.captureException(error, { contexts: { asyncBoundary: asyncContext } });
  };

  private resetAsyncError = () => {
    this.setState({
      hasAsyncError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  private handleRetry = async () => {
    const { retryDelay = 1000, maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn('Max retries reached for AsyncBoundary');
      return;
    }

    this.setState({ 
      isRetrying: true,
      retryCount: retryCount + 1,
    });

    // Wait for retry delay
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState({ isRetrying: false });
      this.resetAsyncError();
    }, retryDelay);
  };

  private getErrorType = (error: Error): 'network' | 'timeout' | 'auth' | 'generic' => {
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
    return 'generic';
  };

  private renderErrorFallback = () => {
    const { error, isRetrying, retryCount, networkStatus } = this.state;
    const { maxRetries = 3, showNetworkStatus = true } = this.props;
    
    if (!error) return null;

    const errorType = this.getErrorType(error);
    const canRetry = retryCount < maxRetries;

    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            {errorType === 'network' ? (
              <WifiOff className="h-6 w-6 text-destructive" />
            ) : errorType === 'timeout' ? (
              <Clock className="h-6 w-6 text-destructive" />
            ) : (
              <AlertCircle className="h-6 w-6 text-destructive" />
            )}
            <CardTitle className="text-destructive">
              {errorType === 'network' ? 'Connection Error' :
               errorType === 'timeout' ? 'Request Timeout' :
               errorType === 'auth' ? 'Authentication Error' :
               'Async Operation Failed'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {errorType === 'network' ? 'Network Connection Problem' :
               errorType === 'timeout' ? 'Operation Timed Out' :
               errorType === 'auth' ? 'Authentication Required' :
               'Unexpected Error'}
            </AlertTitle>
            <AlertDescription>
              {errorType === 'network' ? 
                'Unable to connect to the server. Please check your internet connection.' :
               errorType === 'timeout' ?
                'The operation took too long to complete. This might be due to slow network or server issues.' :
               errorType === 'auth' ?
                'You need to be logged in to perform this action.' :
                error.message || 'An unexpected error occurred during an async operation.'}
            </AlertDescription>
          </Alert>

          {showNetworkStatus && (
            <div className="flex items-center gap-2 text-sm">
              {networkStatus === 'online' ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">Online</span>
                </>
              ) : networkStatus === 'offline' ? (
                <>
                  <WifiOff className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Offline</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Network status unknown</span>
                </>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {canRetry && (
              <Button 
                onClick={this.handleRetry} 
                disabled={isRetrying}
                variant="default"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry ({retryCount}/{maxRetries})
                  </>
                )}
              </Button>
            )}
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Reload Page
            </Button>
          </div>

          {retryCount >= maxRetries && (
            <div className="text-sm text-muted-foreground">
              Maximum retry attempts reached. Please reload the page or try again later.
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  render() {
    const { children, fallback } = this.props;
    const { hasAsyncError } = this.state;

    if (hasAsyncError) {
      return fallback || this.renderErrorFallback();
    }

    return children;
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
      const enhancedError = new Error(`Async Error (${errorContext?.operation || 'unknown'}): ${error.message}`);
      enhancedError.stack = error.stack || '';
      enhancedError.name = `AsyncError_${errorContext?.component || 'Unknown'}`;
      
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
    
    const wrappedError = new Error(`${context?.operation || 'Async operation'} failed: ${error.message}`);
    wrappedError.stack = error.stack || '';
    wrappedError.name = `AsyncError_${context?.component || 'Unknown'}`;
    
    throw wrappedError;
  });
}