'use client';

import React, { ReactNode } from 'react';
import { ConfigurableErrorBoundary } from './error-boundary-base';
import { GeneralErrorFallback } from './error-fallbacks/general-error-fallback';
import { useErrorHandler } from './error-boundary-base';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  eventId: string | null;
}

// Legacy class component for backward compatibility
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      eventId: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Prepare props for ConfigurableErrorBoundary
      const boundaryProps: any = {
        fallbackComponent: GeneralErrorFallback,
        context: { boundaryType: 'general', legacyMode: true }
      };

      if (this.props.showDetails !== undefined) {
        boundaryProps.showDetails = this.props.showDetails;
      }

      if (this.props.isolate !== undefined) {
        boundaryProps.isolate = this.props.isolate;
      }

      return (
        <ConfigurableErrorBoundary {...boundaryProps}>
          {/* This will immediately trigger the fallback */}
          {(() => { throw this.state.error; })()}
        </ConfigurableErrorBoundary>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper component for easier usage (updated implementation)
interface ErrorBoundaryWrapperProps extends Omit<ErrorBoundaryProps, 'children'> {
  children: ReactNode;
}

export default function ErrorBoundaryWrapper({ 
  children, 
  fallback,
  onError,
  showDetails,
  resetKeys,
  resetOnPropsChange,
  isolate,
}: ErrorBoundaryWrapperProps) {
  // Prepare props for ConfigurableErrorBoundary
  const boundaryProps: any = {
    onError,
    showDetails,
    resetKeys,
    resetOnPropsChange,
    isolate,
    context: { boundaryType: 'general' }
  };

  if (fallback) {
    boundaryProps.fallback = fallback;
  } else {
    boundaryProps.fallbackComponent = GeneralErrorFallback;
  }

  return (
    <ConfigurableErrorBoundary {...boundaryProps}>
      {children}
    </ConfigurableErrorBoundary>
  );
}

// Hook for manual error reporting (re-exported for compatibility)
export { useErrorHandler };