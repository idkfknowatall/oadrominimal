'use client';

import * as React from 'react';
import { VoteButton } from './vote-button';
import { UserProfile } from './user-profile';
import { useVoting } from '@/hooks/use-voting';
import { useAuth } from '@/hooks/use-auth';
import type { ClientSong, DiscordUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LogIn, AlertCircle, WifiOff, RefreshCw } from 'lucide-react';

export interface VotingInterfaceProps {
  /**
   * Current song being played (null if no song is playing)
   */
  currentSong: ClientSong | null;
  
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
 * Main voting interface component that combines vote buttons and handles authentication
 * Integrates with useVoting hook for state management and provides responsive layout
 */
export const VotingInterface = React.forwardRef<HTMLDivElement, VotingInterfaceProps>(
  ({ 
    currentSong, 
    user, 
    isAuthenticated, 
    onLoginRequired,
    className 
  }, ref) => {
    // Get signOut function from useAuth hook
    const { signOut } = useAuth();
    
    // Extract song information for voting
    const songId = currentSong?.songId || null;
    const userId = user?.id || null;
    const songTitle = currentSong?.title;
    const songArtist = currentSong?.artist;

    // Use voting hook for state management
    const {
      userVote,
      voteCount,
      isVoting,
      submitVote,
      error,
      clearError,
      retryLastVote,
      isOffline,
    } = useVoting(songId, userId, songTitle, songArtist);

    // Handle vote submission
    const handleVote = React.useCallback(async (voteType: 'like' | 'dislike') => {
      if (!currentSong) {
        return;
      }

      try {
        await submitVote(voteType);
      } catch (err) {
        // Error is handled by the useVoting hook
        console.error('Vote submission failed:', err);
      }
    }, [currentSong, submitVote]);

    // Handle login button click
    const handleLoginClick = React.useCallback(() => {
      onLoginRequired?.();
    }, [onLoginRequired]);

    // Handle logout
    const handleLogout = React.useCallback(() => {
      signOut();
    }, [signOut]);

    // Clear error when component unmounts or song changes
    React.useEffect(() => {
      if (error) {
        const timer = setTimeout(clearError, 8000); // Auto-clear error after 8 seconds
        return () => clearTimeout(timer);
      }
    }, [error, clearError]);

    // Don't render if no song is playing
    if (!currentSong) {
      return (
        <div 
          ref={ref}
          className={cn(
            'flex items-center justify-center p-4 text-muted-foreground',
            className
          )}
        >
          <p className="text-sm">No song currently playing</p>
        </div>
      );
    }

    return (
      <div 
        ref={ref}
        className={cn('space-y-4', className)}
      >
        {/* User Profile (when authenticated) */}
        {isAuthenticated && user && (
          <UserProfile 
            user={user} 
            onLogout={handleLogout}
          />
        )}

        {/* Offline Warning */}
        {isOffline && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">You're offline. Votes will be synced when connection is restored.</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                  {error}
                </p>
                <div className="flex items-center gap-3">
                  {retryLastVote && (
                    <button
                      onClick={retryLastVote}
                      className="inline-flex items-center gap-1 text-xs underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-current/50 rounded"
                      aria-label="Retry last vote"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                  <button
                    onClick={clearError}
                    className="text-xs underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-current/50 rounded"
                    aria-label="Dismiss error"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Required Message */}
        {!isAuthenticated && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LogIn className="h-4 w-4" />
              <span>Login with Discord to vote on songs</span>
            </div>
            {onLoginRequired && (
              <button
                onClick={handleLoginClick}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
                  'bg-[#5865F2] text-white hover:bg-[#4752C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-offset-2',
                  'transition-colors duration-200'
                )}
                aria-label="Login with Discord to enable voting"
              >
                <LogIn className="h-4 w-4" />
                Login with Discord
              </button>
            )}
          </div>
        )}

        {/* Voting Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Like Button */}
          <VoteButton
            type="like"
            count={voteCount.likes}
            isActive={userVote === 'like'}
            isLoading={isVoting}
            disabled={!isAuthenticated || isVoting || isOffline}
            onClick={() => handleVote('like')}
            className="w-full sm:w-auto min-w-[120px]"
            aria-label={`Like this song${!isAuthenticated ? ' (login required)' : isOffline ? ' (offline)' : ''}`}
          />

          {/* Dislike Button */}
          <VoteButton
            type="dislike"
            count={voteCount.dislikes}
            isActive={userVote === 'dislike'}
            isLoading={isVoting}
            disabled={!isAuthenticated || isVoting || isOffline}
            onClick={() => handleVote('dislike')}
            className="w-full sm:w-auto min-w-[120px]"
            aria-label={`Dislike this song${!isAuthenticated ? ' (login required)' : isOffline ? ' (offline)' : ''}`}
          />
        </div>

        {/* Vote Summary (only show when authenticated) */}
        {isAuthenticated && voteCount.total > 0 && (
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>
              {voteCount.total} total vote{voteCount.total !== 1 ? 's' : ''}
            </span>
            {userVote && (
              <span className="flex items-center gap-1">
                You voted: 
                <span className={cn(
                  'font-medium',
                  userVote === 'like' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {userVote}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

VotingInterface.displayName = 'VotingInterface';