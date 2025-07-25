'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { votingService } from '@/lib/voting-service';
import type { VoteCount } from '@/lib/types';
import { VotingError, classifyError, formatErrorForLogging } from '@/lib/error-handling';
import { 
  showVoteSuccessToast, 
  showVotingErrorToast, 
  showVoteChangeToast,
  showAuthRequiredToast,
  showOfflineToast
} from '@/lib/voting-toast';
import { useOfflineState } from './use-offline-state';

// Hook state interface for better type safety
interface VotingState {
  userVote: 'like' | 'dislike' | null;
  voteCount: VoteCount;
  isVoting: boolean;
  error: VotingError | null;
  lastVoteAttempt: number | null;
}

// Return type for the hook
export interface UseVotingReturn {
  userVote: 'like' | 'dislike' | null;
  voteCount: VoteCount;
  isVoting: boolean;
  submitVote: (type: 'like' | 'dislike') => Promise<void>;
  error: VotingError | null;
  clearError: () => void;
  retryLastVote: () => Promise<void>;
  isOffline: boolean;
}

/**
 * Custom hook for managing voting state for the current song
 * Handles user authentication state integration, optimistic updates, and real-time subscriptions
 * 
 * @param songId - The current song ID (null if no song is playing)
 * @param userId - The Discord user ID (null if not authenticated)
 * @param songTitle - The current song title for vote submission
 * @param songArtist - The current song artist for vote submission
 * @returns Voting state and actions
 */
export function useVoting(
  songId: string | null,
  userId: string | null,
  songTitle?: string,
  songArtist?: string
): UseVotingReturn {
  // Consolidated state management
  const [state, setState] = useState<VotingState>({
    userVote: null,
    voteCount: { likes: 0, dislikes: 0, total: 0 },
    isVoting: false,
    error: null,
    lastVoteAttempt: null,
  });

  // Refs for cleanup and subscription management
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  const currentSongIdRef = useRef<string | null>(null);
  const lastVoteTypeRef = useRef<'like' | 'dislike' | null>(null);

  // Offline state management
  const { isOffline, wasOffline } = useOfflineState();

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Handle error with enhanced error classification and user feedback
  const handleError = useCallback((error: unknown, context?: string) => {
    const votingError = error && typeof error === 'object' && 'type' in error 
      ? error as VotingError
      : classifyError(error, context);
    
    console.error(formatErrorForLogging(votingError));
    
    if (mountedRef.current) {
      setState(prev => ({ 
        ...prev, 
        error: votingError, 
        isVoting: false 
      }));
    }

    // Show appropriate toast notification
    showVotingErrorToast(votingError, () => {
      if (lastVoteTypeRef.current) {
        retryLastVote();
      }
    });
  }, []);

  // Submit vote with optimistic updates and enhanced error handling
  const submitVote = useCallback(async (voteType: 'like' | 'dislike') => {
    // Check offline state first
    if (isOffline) {
      showOfflineToast();
      return;
    }

    // Validation checks
    if (!songId) {
      const error = classifyError(new Error('No song is currently playing'), 'Vote Validation');
      handleError(error);
      return;
    }

    if (!userId) {
      showAuthRequiredToast();
      return;
    }

    if (!songTitle || !songArtist) {
      const error = classifyError(new Error('Song information is not available'), 'Vote Validation');
      handleError(error);
      return;
    }

    // Clear any existing errors
    clearError();

    // Store current state for rollback on error
    const previousState = state;
    const previousVote = state.userVote;
    lastVoteTypeRef.current = voteType;
    
    // Optimistic update - immediately update UI
    setState(prev => {
      const newVoteCount = { ...prev.voteCount };
      
      // Remove previous vote if exists
      if (prev.userVote === 'like') {
        newVoteCount.likes = Math.max(0, newVoteCount.likes - 1);
      } else if (prev.userVote === 'dislike') {
        newVoteCount.dislikes = Math.max(0, newVoteCount.dislikes - 1);
      }
      
      // Add new vote
      if (voteType === 'like') {
        newVoteCount.likes += 1;
      } else {
        newVoteCount.dislikes += 1;
      }
      
      newVoteCount.total = newVoteCount.likes + newVoteCount.dislikes;
      
      return {
        ...prev,
        userVote: voteType,
        voteCount: newVoteCount,
        isVoting: true,
        error: null,
        lastVoteAttempt: Date.now(),
      };
    });

    try {
      // Submit vote to Firebase
      await votingService.submitVote(songId, userId, voteType, songTitle, songArtist);
      
      // Update state to reflect successful submission
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isVoting: false }));
        
        // Show appropriate success toast
        if (previousVote && previousVote !== voteType) {
          showVoteChangeToast(previousVote, voteType, songTitle);
        } else {
          showVoteSuccessToast(voteType, songTitle);
        }
      }
    } catch (error) {
      // Rollback optimistic update on error
      if (mountedRef.current) {
        setState({
          ...previousState,
          isVoting: false,
        });
        
        // Handle error with enhanced error handling
        handleError(error, 'Vote Submission');
      }
    }
  }, [songId, userId, songTitle, songArtist, state, handleError, clearError, isOffline]);

  // Retry last vote attempt
  const retryLastVote = useCallback(async () => {
    if (lastVoteTypeRef.current) {
      await submitVote(lastVoteTypeRef.current);
    }
  }, [submitVote]);

  // Load initial voting data when song or user changes
  useEffect(() => {
    if (!songId) {
      // Reset state when no song is playing
      setState({
        userVote: null,
        voteCount: { likes: 0, dislikes: 0, total: 0 },
        isVoting: false,
        error: null,
      });
      currentSongIdRef.current = null;
      return;
    }

    // Skip if song hasn't changed
    if (currentSongIdRef.current === songId) {
      return;
    }

    currentSongIdRef.current = songId;

    const loadInitialData = async () => {
      try {
        // Load vote counts and user's current vote in parallel
        const [voteCount, userVote] = await Promise.all([
          votingService.getVoteCounts(songId),
          userId ? votingService.getUserVote(songId, userId) : Promise.resolve(null),
        ]);

        if (mountedRef.current && currentSongIdRef.current === songId) {
          setState(prev => ({
            ...prev,
            userVote,
            voteCount,
            error: null,
          }));
        }
      } catch (error) {
        if (mountedRef.current && currentSongIdRef.current === songId) {
          handleError(error, 'Initial Load');
        }
      }
    };

    loadInitialData();
  }, [songId, userId, handleError]);

  // Set up real-time subscription for vote count updates
  useEffect(() => {
    if (!songId) {
      // Clean up subscription when no song is playing
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    try {
      // Subscribe to real-time vote count updates
      const unsubscribe = votingService.subscribeToVoteUpdates(songId, (voteCount) => {
        if (mountedRef.current && currentSongIdRef.current === songId) {
          setState(prev => ({
            ...prev,
            voteCount,
          }));
        }
      });

      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      handleError(error, 'Subscription');
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [songId, handleError]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  return {
    userVote: state.userVote,
    voteCount: state.voteCount,
    isVoting: state.isVoting,
    submitVote,
    error: state.error,
    clearError,
    retryLastVote,
    isOffline,
  };
}