/**
 * Tests for useFirebaseVotes hook
 * Verifies real-time subscription management, connection state handling, and proper cleanup
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useFirebaseVotes } from '../use-firebase-votes';
import { votingService } from '@/lib/voting-service';
import type { VoteCount } from '@/lib/types';

// Mock the voting service
jest.mock('@/lib/voting-service', () => ({
  votingService: {
    subscribeToVoteUpdates: jest.fn(),
    getUserVote: jest.fn(),
  },
}));

const mockVotingService = votingService as jest.Mocked<typeof votingService>;

describe('useFirebaseVotes', () => {
  let mockUnsubscribe: jest.Mock;
  let mockCallback: (votes: VoteCount) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockUnsubscribe = jest.fn();
    
    // Mock subscribeToVoteUpdates to capture the callback
    mockVotingService.subscribeToVoteUpdates.mockImplementation((songId, callback) => {
      mockCallback = callback;
      return mockUnsubscribe;
    });
    
    // Mock getUserVote to return null by default
    mockVotingService.getUserVote.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default state when no songId provided', () => {
    const { result } = renderHook(() => useFirebaseVotes(null, null));

    expect(result.current.votes).toEqual({ likes: 0, dislikes: 0, total: 0 });
    expect(result.current.userVote).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.connectionState).toBe('disconnected');
    expect(result.current.lastUpdated).toBeNull();
  });

  it('should create subscription when songId is provided', async () => {
    const { result } = renderHook(() => useFirebaseVotes('song123', 'user123'));

    await waitFor(() => {
      expect(mockVotingService.subscribeToVoteUpdates).toHaveBeenCalledWith('song123', expect.any(Function));
    });

    expect(result.current.connectionState).toBe('connecting');
  });

  it('should update votes when callback is triggered', async () => {
    const { result } = renderHook(() => useFirebaseVotes('song123', 'user123'));

    await waitFor(() => {
      expect(mockCallback).toBeDefined();
    });

    const newVotes: VoteCount = { likes: 5, dislikes: 2, total: 7 };
    
    act(() => {
      mockCallback(newVotes);
    });

    expect(result.current.votes).toEqual(newVotes);
    expect(result.current.connectionState).toBe('connected');
    expect(result.current.loading).toBe(false);
    expect(result.current.lastUpdated).toBeGreaterThan(0);
  });

  it('should cleanup subscription on unmount', async () => {
    const { unmount } = renderHook(() => useFirebaseVotes('song123', 'user123'));

    await waitFor(() => {
      expect(mockVotingService.subscribeToVoteUpdates).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle subscription errors', async () => {
    const error = new Error('Subscription failed');
    mockVotingService.subscribeToVoteUpdates.mockImplementation(() => {
      throw error;
    });

    const { result } = renderHook(() => useFirebaseVotes('song123', 'user123'));

    await waitFor(() => {
      expect(result.current.error).toContain('Subscription failed');
      expect(result.current.connectionState).toBe('error');
      expect(result.current.loading).toBe(false);
    });
  });

  it('should provide retry functionality', async () => {
    const error = new Error('Connection failed');
    mockVotingService.subscribeToVoteUpdates
      .mockImplementationOnce(() => { throw error; })
      .mockImplementation((songId, callback) => {
        mockCallback = callback;
        return mockUnsubscribe;
      });

    const { result } = renderHook(() => useFirebaseVotes('song123', 'user123'));

    await waitFor(() => {
      expect(result.current.error).toContain('Connection failed');
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.connectionState).toBe('connecting');
    });
  });
});