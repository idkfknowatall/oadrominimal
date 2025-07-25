'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorFallbackProps } from '../error-boundary-base';
import { classifyError } from '@/lib/errors/error-boundary-utils';

interface AsyncErrorFallbackProps extends ErrorFallbackProps {
  networkStatus?: 'online' | 'offline' | 'unknown';
  showNetworkStatus?: boolean;
}

export function AsyncErrorFallback({
  error,
  onRetry,
  onReload,
  canRetry,
  retryCount,
  maxRetries,
  isRetrying,
  networkStatus = 'unknown',
  showNetworkStatus = true,
}: AsyncErrorFallbackProps) {
  if (!error) return null;

  const errorType = classifyError(error);

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
              onClick={onRetry} 
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
            onClick={onReload} 
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
}