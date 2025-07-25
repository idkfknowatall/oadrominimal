'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorFallbackProps } from '../error-boundary-base';

export function GeneralErrorFallback({
  error,
  errorInfo,
  eventId,
  onRetry,
  onReload,
  onGoHome,
  onCopyDetails,
  canRetry,
  showDetails,
  isolate,
}: ErrorFallbackProps) {
  return (
    <div className={`flex items-center justify-center p-4 ${isolate ? 'min-h-[200px]' : 'min-h-screen'}`}>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-destructive">Something went wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Application Error</AlertTitle>
            <AlertDescription>
              An unexpected error occurred while rendering this component. 
              {eventId && (
                <span className="block mt-1 text-xs font-mono">
                  Error ID: {eventId}
                </span>
              )}
            </AlertDescription>
          </Alert>

          {showDetails && error && (
            <div className="space-y-2">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Error Details
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <div className="space-y-2 text-xs font-mono">
                    <div>
                      <strong>Error:</strong> {error.name}
                    </div>
                    <div>
                      <strong>Message:</strong> {error.message}
                    </div>
                    {error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap text-xs overflow-x-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap text-xs overflow-x-auto">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {canRetry && (
              <Button onClick={onRetry} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            <Button onClick={onReload} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            {!isolate && (
              <Button onClick={onGoHome} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            )}
            {showDetails && (
              <Button onClick={onCopyDetails} variant="ghost" size="sm">
                <Bug className="h-4 w-4 mr-2" />
                Copy Error Details
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            If this problem persists, please contact support with the error ID above.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}