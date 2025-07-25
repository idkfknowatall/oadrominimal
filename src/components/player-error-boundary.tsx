'use client';

import React, { ReactNode } from 'react';
import { ConfigurableErrorBoundary } from './error-boundary-base';
import { PlayerErrorFallback } from './error-fallbacks/player-error-fallback';

interface PlayerErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  showMiniPlayer?: boolean;
}

export default function PlayerErrorBoundary({
  children,
  onRetry,
  showMiniPlayer = false
}: PlayerErrorBoundaryProps) {
  // Create enhanced fallback component with player-specific props
  const PlayerFallbackWithProps = (props: any) => (
    <PlayerErrorFallback
      {...props}
      showMiniPlayer={showMiniPlayer}
      onRetry={onRetry || props.onRetry}
    />
  );

  return (
    <ConfigurableErrorBoundary
      fallbackComponent={PlayerFallbackWithProps}
      isolate={true}
      resetOnPropsChange={true}
      enableRetry={true}
      maxRetries={3}
      retryDelay={1000}
      context={{ 
        boundaryType: 'player', 
        showMiniPlayer,
        hasCustomRetry: !!onRetry 
      }}
    >
      {children}
    </ConfigurableErrorBoundary>
  );
}

// Specialized hook for player error handling
export function usePlayerErrorHandler() {
  return (error: Error, context?: { action?: string; component?: string }) => {
    console.error('Player error:', error, context);
    
    // Add player-specific error context
    const playerError = new Error(`Player Error: ${error.message}`);
    if (error.stack) {
      playerError.stack = error.stack;
    }
    playerError.name = `PlayerError_${context?.component || 'Unknown'}`;
    
    // TODO: Report to monitoring service
    // Example: Sentry.captureException(playerError, { tags: { component: 'player', action: context?.action } });
    
    throw playerError;
  };
}