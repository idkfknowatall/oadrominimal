/**
 * Comprehensive test suite for the Discord voting system
 * Tests all components, hooks, services, and integration scenarios
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook, act as hookAct } from '@testing-library/react-hooks';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Import components and hooks to test
import { VoteButton } from '@/components/ui/vote-button';
import { VotingInterface } from '@/components/ui/voting-interface';
import { SongVoteDisplay } from '@/components/ui/song-vote-display';
import { useVoting } from '@/hooks/use-voting';
import { useFirebaseVotes } from '@/hooks/use-firebase-votes';

// Import services and utilities
import { OptimizedFirebaseVotingService } from '@/lib/voting-service-optimized';
import { 
  votingCache, 
  voteDebouncer, 
  subscriptionPool, 
  performanceMonitor 
} from '@/lib/voting-performance';
import { classifyError, VotingError } from '@/lib/error-handling';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
}));

// Mock toast notifications
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock offline state
jest.mock('@/hooks/use-offline-state', () => ({
  useOfflineState: jest.fn(() => ({
    isOffline: false,
    isOnline: true,
    wasOffline: false,
    reconnectAttempts: 0,
    lastOnlineTime: Date.now(),
    checkConnection: jest.fn(() => true),
  })),
}));

describe('Discord Voting System - Comprehensive Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear caches and reset performance monitoring
    votingCache.cleanup();
    performanceMonitor.reset();
    voteDebouncer.cancelAll();
  });

  afterEach(() => {
    // Cleanup after each test
    subscriptionPool.cleanup();
  });

  describe('VoteButton Component', () => {
    const defaultProps = {
      type: 'like' as const,
      count: 5,
      isActive: false,
      isLoading: false,
      onClick: jest.fn(),
    };

    it('should render like button with correct count', () => {
      render(<VoteButton {...defaultProps} />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByLabelText('Like this song (5 likes)')).toBeInTheDocument();
    });

    it('should render dislike button with correct styling', () => {
      render(<VoteButton {...defaultProps} type="dislike" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-red-200');
      expect(screen.getByLabelText('Dislike this song (5 dislikes)')).toBeInTheDocument();
    });

    it('should show active state when isActive is true', () => {
      render(<VoteButton {...defaultProps} isActive={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-green-500');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show loading state when isLoading is true', () => {
      render(<VoteButton {...defaultProps} isLoading={true} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
      // Check for loading spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should call onClick when clicked', () => {
      const onClick = jest.fn();
      render(<VoteButton {...defaultProps} onClick={onClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
      render(<VoteButton {...defaultProps} disabled={true} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should animate count changes', () => {
      const { rerender } = render(<VoteButton {...defaultProps} count={5} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
      
      rerender(<VoteButton {...defaultProps} count={6} />);
      
      expect(screen.getByText('6')).toBeInTheDocument();
      // Check for animation class
      expect(screen.getByText('6')).toHaveClass('animate-in');
    });
  });

  describe('VotingInterface Component', () => {
    const mockSong = {
      id: 1,
      songId: 'test-song-1',
      title: 'Test Song',
      artist: 'Test Artist',
      albumArt: 'test-art.jpg',
      genre: 'Test',
      duration: 180,
    };

    const mockUser = {
      id: 'user123',
      username: 'testuser',
      avatar: 'avatar.jpg',
      discriminator: '1234',
    };

    const defaultProps = {
      currentSong: mockSong,
      user: mockUser,
      isAuthenticated: true,
      onLoginRequired: jest.fn(),
    };

    it('should render voting interface for authenticated user', () => {
      render(<VotingInterface {...defaultProps} />);
      
      expect(screen.getByLabelText('Song voting interface')).toBeInTheDocument();
      expect(screen.getByLabelText(/Like this song/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Dislike this song/)).toBeInTheDocument();
    });

    it('should show login message for unauthenticated user', () => {
      render(<VotingInterface {...defaultProps} isAuthenticated={false} user={null} />);
      
      expect(screen.getByText('Login with Discord to vote on songs')).toBeInTheDocument();
      expect(screen.getByText('Login with Discord')).toBeInTheDocument();
    });

    it('should show offline message when offline', () => {
      const { useOfflineState } = require('@/hooks/use-offline-state');
      useOfflineState.mockReturnValue({
        isOffline: true,
        isOnline: false,
        wasOffline: false,
        reconnectAttempts: 1,
        lastOnlineTime: null,
        checkConnection: jest.fn(() => false),
      });

      render(<VotingInterface {...defaultProps} />);
      
      expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    });

    it('should disable voting when no song is playing', () => {
      render(<VotingInterface {...defaultProps} currentSong={null} />);
      
      const likeButton = screen.getByLabelText(/Like this song/);
      const dislikeButton = screen.getByLabelText(/Dislike this song/);
      
      expect(likeButton).toBeDisabled();
      expect(dislikeButton).toBeDisabled();
    });

    it('should show vote summary when user has voted', () => {
      // Mock the useVoting hook to return a user vote
      jest.doMock('@/hooks/use-voting', () => ({
        useVoting: jest.fn(() => ({
          userVote: 'like',
          voteCount: { likes: 10, dislikes: 2, total: 12 },
          isVoting: false,
          submitVote: jest.fn(),
          error: null,
          clearError: jest.fn(),
          retryLastVote: jest.fn(),
          isOffline: false,
        })),
      }));

      render(<VotingInterface {...defaultProps} />);
      
      expect(screen.getByText('12 total votes')).toBeInTheDocument();
      expect(screen.getByText('You voted:')).toBeInTheDocument();
      expect(screen.getByText('like')).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    describe('VotingCache', () => {
      it('should cache and retrieve vote counts', () => {
        const songId = 'test-song-1';
        const voteCount = { likes: 5, dislikes: 2, total: 7 };
        
        // Cache should be empty initially
        expect(votingCache.getVoteCount(songId)).toBeNull();
        
        // Set cache
        votingCache.setVoteCount(songId, voteCount);
        
        // Should retrieve cached value
        expect(votingCache.getVoteCount(songId)).toEqual(voteCount);
      });

      it('should cache and retrieve user votes', () => {
        const songId = 'test-song-1';
        const userId = 'user123';
        const voteType = 'like';
        
        // Cache should be empty initially
        expect(votingCache.getUserVote(songId, userId)).toBeUndefined();
        
        // Set cache
        votingCache.setUserVote(songId, userId, voteType);
        
        // Should retrieve cached value
        expect(votingCache.getUserVote(songId, userId)).toBe(voteType);
      });

      it('should expire cache entries after TTL', async () => {
        const songId = 'test-song-1';
        const voteCount = { likes: 5, dislikes: 2, total: 7 };
        
        votingCache.setVoteCount(songId, voteCount);
        expect(votingCache.getVoteCount(songId)).toEqual(voteCount);
        
        // Mock time passing beyond TTL
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 35000); // 35 seconds
        
        // Should return null after TTL
        expect(votingCache.getVoteCount(songId)).toBeNull();
        
        jest.restoreAllMocks();
      });

      it('should clear song cache correctly', () => {
        const songId = 'test-song-1';
        const userId = 'user123';
        const voteCount = { likes: 5, dislikes: 2, total: 7 };
        
        votingCache.setVoteCount(songId, voteCount);
        votingCache.setUserVote(songId, userId, 'like');
        
        // Clear cache for song
        votingCache.clearSongCache(songId);
        
        expect(votingCache.getVoteCount(songId)).toBeNull();
        expect(votingCache.getUserVote(songId, userId)).toBeUndefined();
      });
    });

    describe('VoteDebouncer', () => {
      it('should debounce rapid vote submissions', async () => {
        const submitFn = jest.fn().mockResolvedValue(undefined);
        const key = 'user123:song456';
        
        // Submit multiple votes rapidly
        const promise1 = voteDebouncer.debounceVote(key, 'like', submitFn);
        const promise2 = voteDebouncer.debounceVote(key, 'dislike', submitFn);
        const promise3 = voteDebouncer.debounceVote(key, 'like', submitFn);
        
        await Promise.all([promise1, promise2, promise3]);
        
        // Should only call submit function once with the final vote
        expect(submitFn).toHaveBeenCalledTimes(1);
        expect(submitFn).toHaveBeenCalledWith('like');
      });

      it('should handle debounced vote errors', async () => {
        const submitFn = jest.fn().mockRejectedValue(new Error('Vote failed'));
        const key = 'user123:song456';
        
        await expect(voteDebouncer.debounceVote(key, 'like', submitFn))
          .rejects.toThrow('Vote failed');
      });
    });

    describe('PerformanceMonitor', () => {
      it('should track vote metrics correctly', () => {
        performanceMonitor.recordVoteAttempt();
        performanceMonitor.recordVoteSuccess(100);
        performanceMonitor.recordVoteFailure(200);
        
        const metrics = performanceMonitor.getMetrics();
        
        expect(metrics.voteSubmissions).toBe(1);
        expect(metrics.successfulVotes).toBe(1);
        expect(metrics.failedVotes).toBe(1);
        expect(metrics.averageResponseTime).toBe(150); // (100 + 200) / 2
        expect(metrics.successRate).toBe(50); // 1 success out of 2 total
      });

      it('should track cache metrics correctly', () => {
        performanceMonitor.recordCacheHit();
        performanceMonitor.recordCacheHit();
        performanceMonitor.recordCacheMiss();
        
        const metrics = performanceMonitor.getMetrics();
        
        expect(metrics.cacheHits).toBe(2);
        expect(metrics.cacheMisses).toBe(1);
        expect(metrics.cacheHitRate).toBe(66.67); // 2 hits out of 3 total
      });
    });
  });

  describe('Error Handling', () => {
    it('should classify Firebase errors correctly', () => {
      const firebaseError = {
        code: 'permission-denied',
        message: 'Insufficient permissions'
      };
      
      const classified = classifyError(firebaseError, 'Test Context');
      
      expect(classified.type).toBe('permission');
      expect(classified.severity).toBe('high');
      expect(classified.retryable).toBe(false);
      expect(classified.userMessage).toContain('permission');
    });

    it('should classify network errors correctly', () => {
      const networkError = new Error('Network connection failed');
      
      const classified = classifyError(networkError, 'Test Context');
      
      expect(classified.type).toBe('network');
      expect(classified.retryable).toBe(true);
      expect(classified.userMessage).toContain('connection');
    });

    it('should classify validation errors correctly', () => {
      const validationError = new Error('Song ID is required');
      
      const classified = classifyError(validationError, 'Test Context');
      
      expect(classified.type).toBe('validation');
      expect(classified.retryable).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete voting flow', async () => {
      const mockVotingService = {
        submitVote: jest.fn().mockResolvedValue(undefined),
        getVoteCounts: jest.fn().mockResolvedValue({ likes: 1, dislikes: 0, total: 1 }),
        getUserVote: jest.fn().mockResolvedValue('like'),
        subscribeToVoteUpdates: jest.fn().mockReturnValue(() => {}),
      };

      // Mock the voting service
      jest.doMock('@/lib/voting-service', () => ({
        votingService: mockVotingService,
      }));

      const { result } = renderHook(() => 
        useVoting('song123', 'user456', 'Test Song', 'Test Artist')
      );

      // Submit a vote
      await hookAct(async () => {
        await result.current.submitVote('like');
      });

      expect(mockVotingService.submitVote).toHaveBeenCalledWith(
        'song123',
        'user456',
        'like',
        'Test Song',
        'Test Artist'
      );
    });

    it('should handle offline voting gracefully', async () => {
      const { useOfflineState } = require('@/hooks/use-offline-state');
      useOfflineState.mockReturnValue({
        isOffline: true,
        isOnline: false,
        wasOffline: false,
        reconnectAttempts: 1,
        lastOnlineTime: null,
        checkConnection: jest.fn(() => false),
      });

      const { result } = renderHook(() => 
        useVoting('song123', 'user456', 'Test Song', 'Test Artist')
      );

      // Try to submit a vote while offline
      await hookAct(async () => {
        await result.current.submitVote('like');
      });

      // Should not throw error and should show offline state
      expect(result.current.isOffline).toBe(true);
    });

    it('should handle song changes correctly', async () => {
      const { result, rerender } = renderHook(
        ({ songId }) => useVoting(songId, 'user456', 'Test Song', 'Test Artist'),
        { initialProps: { songId: 'song123' } }
      );

      // Initial state
      expect(result.current.voteCount).toEqual({ likes: 0, dislikes: 0, total: 0 });

      // Change song
      rerender({ songId: 'song456' });

      // Should reset state for new song
      expect(result.current.userVote).toBeNull();
      expect(result.current.voteCount).toEqual({ likes: 0, dislikes: 0, total: 0 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on vote buttons', () => {
      render(
        <VoteButton 
          type="like" 
          count={5} 
          isActive={false} 
          onClick={jest.fn()} 
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Like this song (5 likes)');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    it('should be keyboard navigable', () => {
      render(
        <VotingInterface 
          currentSong={{
            id: 1,
            songId: 'test-song',
            title: 'Test Song',
            artist: 'Test Artist',
            albumArt: '',
            genre: 'Test',
            duration: 180,
          }}
          user={{
            id: 'user123',
            username: 'testuser',
            avatar: null,
            discriminator: '1234',
          }}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      const likeButton = screen.getByLabelText(/Like this song/);
      const dislikeButton = screen.getByLabelText(/Dislike this song/);

      // Should be focusable
      likeButton.focus();
      expect(likeButton).toHaveFocus();

      // Should be able to tab between buttons
      fireEvent.keyDown(likeButton, { key: 'Tab' });
      expect(dislikeButton).toHaveFocus();
    });
  });
});