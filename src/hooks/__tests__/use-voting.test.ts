/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoting } from '../use-voting';
import { votingService } from '@/lib/voting-service';
import type { VoteCount } from '@/lib/types';

// Mock the voting service
jest.mock('@/lib/voting-service', () => ({
  votingService: {
    submitVote: jest.fn(),
    getVoteCounts: jest.fn(),
    getUserVote: jest.fn(),
    subscribeToVoteUpdates: jest.fn(),
  },
}));

const mockVotingService = votingService as jest.Mocked<typeof votingService>;

describe('useVoting', () => {
  const mockSongId = 'test-song-123';
  const mockUserId = 'discord-user-456';
  const mockSongTitle = 'Test Song';
  const mockSongArtist = 'Test Artist';

  const mockVoteCount: VoteCount = {
    likes: 5,
    dislikes: 2,
    total: 7,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockVotingService.getVoteCounts.mockResolvedValue(mockVoteCount);
    mockVotingService.getUserVote.mockResolvedValue(null);
    mockVotingService.submitVote.mockResolvedValue();
    mockVotingService.subscribeToVoteUpdates.mockReturnValue(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initial State', () => {
    it('should initialize with default state when no song is playing', () => {
      const { result } = renderHook(() =>
        useVoting(null, mockUserId, mockSongTitle, mockSongArtist)
      );

      expect(result.current.userVote).toBeNull();
      expect(result.current.voteCount).toEqual({ likes: 0, dislikes: 0, total: 0 });
      expect(result.current.isVoting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with default state when user is not authenticated', () => {
      const { result } = renderHook(() =>
        useVoting(mockSongId, null, mockSongTitle, mockSongArtist)
      );

      expect(result.current.userVote).toBeNull();
      expect(result.current.voteCount).toEqual({ likes: 0, dislikes: 0, total: 0 });
      expect(result.current.isVoting).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Data Loading', () => {
    it('should load initial voting data when song and user are provided', async () => {
      mockVotingService.getUserVote.mockResolvedValue('like');

      const { result } = renderHook(() =>
        useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
      );

      await waitFor(() => {
        expect(result.current.userVote).toBe('like');
        expect(result.current.voteCount).toEqual(mockVoteCount);
      });

      expect(mockVotingService.getVoteCounts).toHaveBeenCalledWith(mockSongId);
      expect(mockVotingService.getUserVote).toHaveBeenCalledWith(mockSongId, mockUserId);
    });

    it('should not load user vote when user is not authenticated', async () => {
      const { result } = renderHook(() =>
        useVoting(mockSongId, null, mockSongTitle, mockSongArtist)
      );

      await waitFor(() => {
        expect(result.current.voteCount).toEqual(mockVoteCount);
      });

      expect(mockVotingService.getVoteCounts).toHaveBeenCalledWith(mockSongId);
      expect(mockVotingService.getUserVote).not.toHaveBeenCalled();
      expect(result.current.userVote).toBeNull();
    });

    it('should handle errors during initial data loading', async () => {
      const errorMessage = 'Failed to load data';
      mockVotingService.getVoteCounts.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
      );

      await waitFor(() => {
        expect(result.current.error).toContain(errorMessage);
      });
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should subscribe to vote updates when song is provided', async () => {
      const mockUnsubscribe = jest.fn();
      mockVotingService.subscribeToVoteUpdates.mockReturnValue(mockUnsubscribe);

      const { result, unmount } = renderHook(() =>
        useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
      );

      await waitFor(() => {
        expect(mockVotingService.subscribeToVoteUpdates).toHaveBeenCalledWith(
          mockSongId,
          expect.any(Function)
        );
      });

      // Test that subscription callback updates state
      const subscriptionCallback = mockVotingService.subscribeToVoteUpdates.mock.calls[0][1];
      const newVoteCount: VoteCount = { likes: 10, dislikes: 3, total: 13 };

      act(() => {
        subscriptionCallback(newVoteCount);
      });

      expect(result.current.voteCount).toEqual(newVoteCount);

      // Test cleanup
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should not subscribe when no song is playing', () => {
      renderHook(() =>
        useVoting(null, mockUserId, mockSongTitle, mockSongArtist)
      );

      expect(mockVotingService.subscribeToVoteUpdates).not.toHaveBeenCalled();
    });

    it('should handle subscription errors gracefully', async () => {
      const errorMessage = 'Subscription failed';
      mockVotingService.subscribeToVoteUpdates.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const { result } = renderHook(() =>
        useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
      );

      await waitFor(() => {
        expect(result.current.error).toContain(errorMessage);
      });
    });
  });

  describe('Vote Submission', () => {
    it('should submit a like vote with optimistic updates', async () => {
      const { result } = renderHook(() =>
        useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
      );

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.voteCount).toEqual(mockVoteCount);
      });

      // Submit vote
      await act(async () => {
        await result.current.submitVote('like');
      });

      expect(mockVotingService.submitVote).toHaveBeenCalledWith(
        mockSongId,
        mockUserId,
        'like',
        mockSongTitle,
        mockSongArtist
      );

      expect(result.current.userVote).toBe('like');
      expect(result.current.isVoting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should submit a dislike vote with optimistic updates', async () => {
      const { result } = renderHook(() =>
        useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
      );

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.voteCount).toEqual(mockVoteCount);
      });

      // Submit vote
      await act(async () => {
        await result.current.submitVote('dislike');
      });

      expect(mockVotingService.submitVote).toHaveBeenCalledWith(
        mockSongId,
        mockUserId,
        'dislike',
        mockSongTitle,
        mockSongArtist
      );

      expect(result.current.userVote).toBe('dislike');
      expect(result.current.isVoting).toBe(false);
    });

    it('should handle vote changes (like to dislike)', async () => {
      // Start with a like vote
      mockVotingService.getUserVote.mockResolvedValue('like');

      const { result } = renderHook(() =>
        useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
      );

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.userVote).toBe('like');
      });

      // Change to dislike
      await act(async () => {
        await result.current.submitVote('dislike');
      });

      expect(result.current.userVote).toBe('dislike');
    });

    it('should prevent voting when no song is playing', async () => {
      const { result } = renderHook(() =>
        useVoting(null, mockUserId, mockSongTitle, mockSongArtist)
      );

      await act(async () => {
        await result.current.submitVote('like');
      });

      expect(mockVotingService.submitVote).not.toHaveBeenCalled();
      expect(result.current.error).toContain('No song is currently playing');
    });

    it('should prevent voting when user is not authenticated', async () => {
      const { result } = renderHook(() =>
        useVoting(mockSongId, null, mockSongTitle, mockSongArtist)
      );

      act(() => {
        result.current.submitVote('like');
      });

      expect(mockVotingService.submitVote).not.toHaveBeenCalled();
      expect(result.current.error).toContain('You must be logged in to vote');
    });

    it('should prevent voting when song information is missing', async () => {
      const { result } = renderHook(() =>
        useVoting(mockSongId, mockUserId, '', mockSongArtist)
      );

      act(() => {
        result.current.submitVote('like');
      });

      expect(mockVotingService.submitVote).not.toHaveBeenCalled();
      expect(result.current.error).toContain('Song information is not available');
    });

    it('should handle vote submission errors with rollback', async () => {
      const errorMessage = 'Vote submission failed';
      mockVotingService.submitVote.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
      );

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.voteCount).toEqual(mockVoteCount);
      });

      const initialState = {
        userVote: result.current.userVote,
        voteCount: result.current.voteCount,
      };

      // Submit vote that will fail
      await act(async () => {
        await result.current.submitVote('like');
      });

      // Should rollback to initial state
      expect(result.current.userVote).toBe(initialState.userVote);
      expect(result.current.voteCount).toEqual(initialState.voteCount);
      expect(result.current.error).toContain(errorMessage);
      expect(result.current.isVoting).toBe(false);
    });
  });

  describe('Song Changes', () => {
    it('should reset state when song changes to null', async () => {
      const { result, rerender } = renderHook(
        ({ songId }) => useVoting(songId, mockUserId, mockSongTitle, mockSongArtist),
        { initialProps: { songId: mockSongId } }
      );

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.voteCount).toEqual(mockVoteCount);
      });

      // Change to no song
      rerender({ songId: null });

      expect(result.current.userVote).toBeNull();
      expect(result.current.voteCount).toEqual({ likes: 0, dislikes: 0, total: 0 });
      expect(result.current.isVoting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load new data when song changes', async () => {
      const newSongId = 'new-song-789';
      const newVoteCount: VoteCount = { likes: 3, dislikes: 1, total: 4 };

      const { result, rerender } = renderHook(
        ({ songId }) => useVoting(songId, mockUserId, mockSongTitle, mockSongArtist),
        { initialProps: { songId: mockSongId } }
      );

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.voteCount).toEqual(mockVoteCount);
      });

      // Mock new song data
      mockVotingService.getVoteCounts.mockResolvedValue(newVoteCount);
      mockVotingService.getUserVote.mockResolvedValue('dislike');

      // Change song
      rerender({ songId: newSongId });

      await waitFor(() => {
        expect(result.current.voteCount).toEqual(newVoteCount);
        expect(result.current.userVote).toBe('dislike');
      });

      expect(mockVotingService.getVoteCounts).toHaveBeenCalledWith(newSongId);
      expect(mockVotingService.getUserVote).toHaveBeenCalledWith(newSongId, mockUserId);
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when clearError is called', async () => {
      const { result } = renderHook(() =>
        useVoting(null, mockUserId, mockSongTitle, mockSongArtist)
      );

      // Trigger an error
      await act(async () => {
        await result.current.submitVote('like');
      });

      expect(result.current.error).toBeTruthy();

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear errors before submitting new votes', async () => {
      const { result } = renderHook(() =>
        useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
      );

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.voteCount).toEqual(mockVoteCount);
      });

      // Cause an error first
      mockVotingService.submitVote.mockRejectedValueOnce(new Error('First error'));

      await act(async () => {
        await result.current.submitVote('like');
      });

      expect(result.current.error).toContain('First error');

      // Fix the service and submit again
      mockVotingService.submitVote.mockResolvedValue();

      await act(async () => {
        await result.current.submitVote('dislike');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should clean up subscriptions on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockVotingService.subscribeToVoteUpdates.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() =>
        useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
      );

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.voteCount).toEqual(mockVoteCount);
      });

      unmount();

      // Try to trigger state update after unmount (should not crash)
      const subscriptionCallback = mockVotingService.subscribeToVoteUpdates.mock.calls[0]?.[1];
      if (subscriptionCallback) {
        act(() => {
          subscriptionCallback({ likes: 999, dislikes: 999, total: 1998 });
        });
      }

      // Should not crash or cause warnings
    });
  });
});