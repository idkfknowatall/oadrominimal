'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  BaseErrorState,
  BaseErrorBoundaryProps,
  createErrorState,
  createResetErrorState,
  hasResetKeyChanged,
  reportError,
  RetryManager,
} from '@/lib/errors/error-boundary-utils';

// Extended props for configurable error boundary
export interface ConfigurableErrorBoundaryProps extends BaseErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  retryDelay?: number;
  maxRetries?: number;
  enableRetry?: boolean;
  context?: Record<string, unknown>;
}

// Props passed to fallback components
export interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onCopyDetails: () => void;
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
  isRetrying: boolean;
  showDetails: boolean;
  isolate: boolean;
  context?: Record<string, unknown>;
}

interface ConfigurableErrorBoundaryState extends BaseErrorState {
  retryCount: number;
  isRetrying: boolean;
}

export class ConfigurableErrorBoundary extends Component<
  ConfigurableErrorBoundaryProps,
  ConfigurableErrorBoundaryState
> {
  private retryManager: RetryManager;

  constructor(props: ConfigurableErrorBoundaryProps) {
    super(props);
    
    this.state = {
      ...createResetErrorState(),
      retryCount: 0,
      isRetrying: false,
    };

    this.retryManager = new RetryManager(
      props.maxRetries || 3,
      props.retryDelay || 1000
    );
  }

  static getDerivedStateFromError(error: Error): Partial<ConfigurableErrorBoundaryState> {
    return createErrorState(error);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ConfigurableErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error with context
    reportError(error, errorInfo, this.state.eventId, {
      boundaryType: 'configurable',
      ...this.props.context,
    });
  }

  componentDidUpdate(prevProps: ConfigurableErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      if (hasResetKeyChanged(resetKeys, prevProps.resetKeys)) {
        this.resetErrorBoundary();
      }
    }

    // Reset error boundary when any props change (if enabled)
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    this.retryManager.cleanup();
  }

  private resetErrorBoundary = () => {
    this.retryManager.clearRetry();
    this.setState({
      ...createResetErrorState(),
      retryCount: 0,
      isRetrying: false,
    });
  };

  private handleRetry = () => {
    const { enableRetry = true } = this.props;
    const { retryCount } = this.state;

    if (!enableRetry || !this.retryManager.canRetry(retryCount)) {
      console.warn('Retry not available or max retries reached');
      return;
    }

    this.setState({
      isRetrying: true,
      retryCount: retryCount + 1,
    });

    const success = this.retryManager.scheduleRetry(() => {
      this.setState({ isRetrying: false });
      this.resetErrorBoundary();
    }, retryCount);

    if (!success) {
      this.setState({ isRetrying: false });
    }
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  private handleCopyDetails = () => {
    const { error, errorInfo, eventId } = this.state;
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
      context: this.props.context,
    };

    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
    }
  };

  render() {
    const { hasError, error, errorInfo, eventId, retryCount, isRetrying } = this.state;
    const {
      children,
      fallback,
      fallbackComponent: FallbackComponent,
      showDetails = process.env.NODE_ENV === 'development',
      isolate = false,
      maxRetries = 3,
      context,
    } = this.props;

    if (hasError) {
      const fallbackProps: ErrorFallbackProps = {
        error,
        errorInfo,
        eventId,
        onRetry: this.handleRetry,
        onReload: this.handleReload,
        onGoHome: this.handleGoHome,
        onCopyDetails: this.handleCopyDetails,
        canRetry: this.retryManager.canRetry(retryCount),
        retryCount,
        maxRetries,
        isRetrying,
        showDetails,
        isolate,
        context: context || {},
      };

      // Use custom fallback component if provided
      if (FallbackComponent) {
        return <FallbackComponent {...fallbackProps} />;
      }

      // Use custom fallback element if provided
      if (fallback) {
        return fallback;
      }

      // No fallback provided - let error bubble up
      throw error;
    }

    return children;
  }
}

// Hook for manual error reporting
export function useErrorHandler(context?: Record<string, unknown>) {
  return (error: Error, errorInfo?: Partial<ErrorInfo>) => {
    // Log error
    console.error('Manual error report:', error, errorInfo);
    
    // Report with context
    reportError(
      error,
      errorInfo as ErrorInfo,
      null,
      { type: 'manual', ...context }
    );
    
    // Re-throw to trigger error boundary
    throw error;
  };
}