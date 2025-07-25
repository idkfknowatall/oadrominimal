'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { votingService } from '@/lib/voting-service';
import type { VoteCount } from '@/lib/types';
import { VotingError, classifyError, formatErrorForLogging } from '@/lib/error-handling';
import { showConnectionErrorToast, showReconnectedToast } from '@/lib/voting-toast';
import { useOfflineState } from './use-offline-state';

// Connection states for real-time subscription
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

// Hook state interface
interface FirebaseVotesState {
  votes: VoteCount;
  userVote: 'like' | 'dislike' | null;
  loading: boolean;
  error: VotingError | null;
  connectionState: ConnectionState;
  lastUpdated: number | null;
}

// Return type for the hook
export interface UseFirebaseVotesReturn {
  votes: VoteCount;
  userVote: 'like' | 'dislike' | null;
  loading: boolean;
  error: VotingError | null;
  connectionState: ConnectionState;
  lastUpdated: number | null;
  retry: () => void;
  clearError: () => void;
  isOffline: boolean;
}

/**
 * Custom hook for real-time Firebase vote updates with connection management
 * Handles Firestore subscriptions, connection state, automatic reconnection, and proper cleanup
 * 
 * @param songId - The song ID to subscribe to (null to disable subscription)
 * @param userId - The Discord user ID (null if not authenticated)
 * @returns Real-time vote data and connection state
 */
export function useFirebaseVotes(
  songId: string | null,
  userId: string | null
): UseFirebaseVotesReturn {
  // Consolidated state management
  const [state, setState] = useState<FirebaseVotesState>({
    votes: { likes: 0, dislikes: 0, total: 0 },
    userVote: null,
    loading: false,
    error: null,
    connectionState: 'disconnected',
    lastUpdated: null,
  });

  // Refs for cleanup and subscription management
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  const currentSongIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  const wasConnectedRef = useRef(false);

  // Offline state management
  const { isOffline, wasOffline } = useOfflineState();

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Handle error with enhanced error classification
  const handleError = useCallback((error: unknown, context?: string) => {
    const votingError = error && typeof error === 'object' && 'type' in error 
      ? error as VotingError
      : classifyError(error, context);
    
    console.error(formatErrorForLogging(votingError));
    
    if (mountedRef.current) {
      setState(prev => ({ 
        ...prev, 
        error: votingError,
        connectionState: 'error',
        loading: false
      }));
    }

    // Show connection error toast for network/firebase errors
    if (votingError.type === 'network' || votingError.type === 'firebase') {
      showConnectionErrorToast(() => retry());
    }
  }, []);

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback((attempt: number): number => {
    return Math.min(baseReconnectDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
  }, []);

  // Load user's current vote
  const loadUserVote = useCallback(async (currentSongId: string, currentUserId: string) => {
    try {
      const userVote = await votingService.getUserVote(currentSongId, currentUserId);
      
      if (mountedRef.current && currentSongIdRef.current === currentSongId) {
        setState(prev => ({ ...prev, userVote }));
      }
    } catch (error) {
      // Don't treat user vote loading errors as critical
      console.warn('[useFirebaseVotes] Failed to load user vote:', error);
    }
  }, []);

  // Set up real-time subscription with connection management
  const setupSubscription = useCallback((currentSongId: string) => {
    if (!mountedRef.current) return;

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      connectionState: 'connecting',
      loading: true,
      error: null
    }));

    try {
      // Subscribe to real-time vote count updates
      const unsubscribe = votingService.subscribeToVoteUpdates(currentSongId, (votes) => {
        if (mountedRef.current && currentSongIdRef.current === currentSongId) {
          setState(prev => ({
            ...prev,
            votes,
            connectionState: 'connected',
            loading: false,
            error: null,
            lastUpdated: Date.now()
          }));

          // Show reconnection toast if we were previously disconnected
          if (wasConnectedRef.current && reconnectAttemptsRef.current > 0) {
            showReconnectedToast();
          }
          wasConnectedRef.current = true;

          // Reset reconnect attempts on successful update
          reconnectAttemptsRef.current = 0;
        }
      });

      unsubscribeRef.current = unsubscribe;

      // Load user vote if authenticated
      if (userId) {
        loadUserVote(currentSongId, userId);
      }

    } catch (error) {
      handleError(error, 'Subscription Setup');
      
      // Attempt reconnection if we haven't exceeded max attempts
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        scheduleReconnect(currentSongId);
      }
    }
  }, [userId, loadUserVote, handleError]);

  // Schedule automatic reconnection with exponential backoff
  const scheduleReconnect = useCallback((currentSongId: string) => {
    if (!mountedRef.current || currentSongIdRef.current !== currentSongId) return;

    const attempt = reconnectAttemptsRef.current;
    const delay = getReconnectDelay(attempt);

    setState(prev => ({ 
      ...prev, 
      connectionState: 'reconnecting',
      loading: false
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && currentSongIdRef.current === currentSongId) {
        reconnectAttemptsRef.current++;
        console.log(`[useFirebaseVotes] Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
        setupSubscription(currentSongId);
      }
    }, delay);
  }, [getReconnectDelay, setupSubscription]);

  // Manual retry function
  const retry = useCallback(() => {
    if (!songId) return;

    // Reset reconnect attempts
    reconnectAttemptsRef.current = 0;
    
    // Clear error state
    clearError();
    
    // Setup subscription
    setupSubscription(songId);
  }, [songId, clearError, setupSubscription]);

  // Main effect for managing subscriptions based on songId changes
  useEffect(() => {
    if (!songId) {
      // Clean up when no song is playing
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Reset state
      setState({
        votes: { likes: 0, dislikes: 0, total: 0 },
        userVote: null,
        loading: false,
        error: null,
        connectionState: 'disconnected',
        lastUpdated: null,
      });
      
      currentSongIdRef.current = null;
      reconnectAttemptsRef.current = 0;
      return;
    }

    // Skip if song hasn't changed
    if (currentSongIdRef.current === songId) {
      return;
    }

    currentSongIdRef.current = songId;
    reconnectAttemptsRef.current = 0;

    // Setup subscription for new song
    setupSubscription(songId);

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [songId, setupSubscription]);

  // Effect to handle user authentication changes
  useEffect(() => {
    if (songId && userId && currentSongIdRef.current === songId) {
      // Load user vote when user becomes authenticated
      loadUserVote(songId, userId);
    } else if (!userId) {
      // Clear user vote when user becomes unauthenticated
      setState(prev => ({ ...prev, userVote: null }));
    }
  }, [songId, userId, loadUserVote]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    votes: state.votes,
    userVote: state.userVote,
    loading: state.loading,
    error: state.error,
    connectionState: state.connectionState,
    lastUpdated: state.lastUpdated,
    retry,
    clearError,
    isOffline,
  };
}