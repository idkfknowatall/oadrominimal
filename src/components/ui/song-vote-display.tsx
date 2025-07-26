'use client';

import * as React from 'react';
import { VotingInterface } from './voting-interface';
import { useNowPlaying } from '@/lib/api-cache';
import type { DiscordUser } from '@/lib/types';
import { isFirebaseConfigured } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, RefreshCw, Settings } from 'lucide-react';

export interface SongVoteDisplayProps {
  /**
   * Discord user information (null if not authenticated)
   */
  user: DiscordUser | null;
  
  /**
   * Whether the user is authenticated
   */
  isAuthenticated: boolean;
  
  /**
   * Optional callback when login is needed
   */
  onLoginRequired?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Component that displays voting interface for the current song
 * Gets song data from useNowPlaying hook and passes it to VotingInterface
 * No duplicate song information display - only voting functionality
 */
const SongVoteDisplay = React.forwardRef<HTMLDivElement, SongVoteDisplayProps>(
  ({ 
    user, 
    isAuthenticated, 
    onLoginRequired,
    className 
  }, ref) => {
    // Check if Firebase is configured
    const firebaseConfigured = React.useMemo(() => {
      try {
        return isFirebaseConfigured();
      } catch {
        return false;
      }
    }, []);

    // Get current song data from AzuraCast API
    const { data: nowPlayingData, error, isLoading, refresh } = useNowPlaying();
    
    // Extract current song from now playing data
    const currentSong = nowPlayingData?.liveSong || null;
    
    // Handle refresh button click
    const handleRefresh = React.useCallback(() => {
      refresh();
    }, [refresh]);

    // Loading state
    if (isLoading) {
      return (
        <div 
          ref={ref}
          className={cn(
            'flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-card border border-border',
            className
          )}
          role="status"
          aria-label="Loading voting interface"
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading voting interface...</p>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div 
          ref={ref}
          className={cn(
            'flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-card border border-destructive/20',
            className
          )}
          role="alert"
          aria-label="Error loading voting interface"
        >
          <AlertCircle className="h-6 w-6 text-destructive" />
          <div className="text-center">
            <p className="text-sm font-medium text-destructive mb-1">
              Failed to load voting interface
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {error.message || 'Unable to connect to the radio server'}
            </p>
            <button
              onClick={handleRefresh}
              className={cn(
                'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground',
                'underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-ring rounded'
              )}
              aria-label="Retry loading voting interface"
            >
              <RefreshCw className="h-3 w-3" />
              Try again
            </button>
          </div>
        </div>
      );
    }

    // Firebase not configured state
    if (!firebaseConfigured) {
      return (
        <div 
          ref={ref}
          className={cn(
            'flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-card border border-border',
            className
          )}
          role="region"
          aria-label="Voting system configuration required"
        >
          <Settings className="h-6 w-6 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-1">
              Voting System Available
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Firebase configuration required to enable song voting
            </p>
            <p className="text-xs text-muted-foreground">
              See <code className="bg-muted px-1 rounded">docs/FIREBASE_SETUP.md</code> for setup instructions
            </p>
          </div>
        </div>
      );
    }

    // No song playing state
    if (!currentSong) {
      return (
        <div 
          ref={ref}
          className={cn(
            'flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-card border border-border',
            className
          )}
          role="region"
          aria-label="No song currently playing"
        >
          <p className="text-sm text-muted-foreground">No song currently playing</p>
        </div>
      );
    }

    // Main voting interface - no duplicate song information
    return (
      <div 
        ref={ref}
        className={cn(
          'rounded-lg bg-card border border-border',
          className
        )}
        role="region"
        aria-label="Song voting interface"
      >
        {/* Only the voting interface - song info is displayed in the audio player */}
        <VotingInterface
          currentSong={currentSong}
          user={user}
          isAuthenticated={isAuthenticated}
          onLoginRequired={onLoginRequired}
          className="p-4"
        />
      </div>
    );
  }
);

SongVoteDisplay.displayName = 'SongVoteDisplay';

export { SongVoteDisplay };