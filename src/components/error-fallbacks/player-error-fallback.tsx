'use client';

import React from 'react';
import { RefreshCw, AlertCircle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorFallbackProps } from '../error-boundary-base';

interface PlayerErrorFallbackProps extends ErrorFallbackProps {
  showMiniPlayer?: boolean;
}

export function PlayerErrorFallback({ 
  onRetry,
  onReload,
  showMiniPlayer = false,
  isRetrying,
}: PlayerErrorFallbackProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      onReload();
    }
  };

  if (showMiniPlayer) {
    // Minimal fallback for smaller player components
    return (
      <Card className="w-full max-w-md mx-auto bg-black/20 backdrop-blur-sm border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-center text-center space-y-2">
            <div className="w-full">
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Audio player encountered an error
              </p>
              <Button 
                onClick={handleRetry} 
                size="sm" 
                variant="outline"
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full fallback UI for main player
  return (
    <Card className="relative w-full max-w-md mx-auto bg-black/20 backdrop-blur-sm border-white/10 shadow-2xl shadow-primary/10 rounded-2xl">
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Album art placeholder */}
          <div className="relative mb-2 w-40 h-40 md:w-56 md:h-56">
            <div className="w-full h-full rounded-lg shadow-lg shadow-black/30 bg-muted flex items-center justify-center">
              <AlertCircle className="h-24 md:h-32 w-24 md:w-32 text-destructive" />
            </div>
            <div className="absolute inset-0 bg-black/20 rounded-lg ring-1 ring-inset ring-white/10"></div>
          </div>

          {/* Error message */}
          <div className="w-full flex flex-col justify-center items-center text-center min-h-[3rem] md:min-h-[4rem] mb-1">
            <h2 className="w-full text-lg md:text-xl font-headline font-bold tracking-tight text-destructive">
              Player Error
            </h2>
            <p className="w-full text-sm md:text-base text-muted-foreground">
              Unable to load audio player
            </p>
          </div>

          {/* Error alert */}
          <Alert variant="destructive" className="w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Audio Player Error</AlertTitle>
            <AlertDescription>
              The audio player encountered an unexpected error. This might be due to:
              <ul className="list-disc list-inside mt-2 text-xs space-y-1">
                <li>Network connectivity issues</li>
                <li>Audio stream problems</li>
                <li>Browser compatibility issues</li>
                <li>Temporary server issues</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Control buttons */}
          <div className="flex w-full items-center justify-center gap-4 mt-4">
            <div className="flex w-1/3 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                disabled
                aria-label="Volume (disabled)"
              >
                <Volume2 className="h-5 w-5 text-muted-foreground" />
              </Button>
              <div className="flex-1 h-2 bg-muted rounded-full">
                <div className="h-full w-0 bg-primary rounded-full"></div>
              </div>
            </div>

            <Button
              onClick={handleRetry}
              variant="destructive"
              size="icon"
              className="rounded-full h-16 w-16 shadow-lg"
              aria-label="Retry loading player"
              disabled={isRetrying}
            >
              {isRetrying ? (
                <RefreshCw className="h-8 w-8 animate-spin" />
              ) : (
                <RefreshCw className="h-8 w-8" />
              )}
            </Button>
            
            <div className="w-1/3 flex items-center justify-end gap-2" />
          </div>

          {/* Additional actions */}
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleRetry} 
              variant="outline" 
              size="sm"
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Player
                </>
              )}
            </Button>
            <Button 
              onClick={onReload} 
              variant="ghost" 
              size="sm"
            >
              Reload Page
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            If the problem persists, try refreshing the page or check your internet connection.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}