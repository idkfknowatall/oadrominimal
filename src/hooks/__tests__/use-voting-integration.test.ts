/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoting } from '../use-voting';
import { FirebaseVotingService } from '@/lib/voting-service';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  getFirestore: jest.fn(() => ({})),
  FIREBASE_COLLECTIONS: {
    VOTES: 'votes',
    VOTE_AGGREGATES: 'vote-aggregates',
  },
  isFirebaseError: jest.fn(() => false),
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(),
  runTransaction: jest.fn(),
  Timestamp: {},
}));

describe('useVoting Integration', () => {
  const mockSongId = 'integration-song-123';
  const mockUserId = 'integration-user-456';
  const mockSongTitle = 'Integration Test Song';
  const mockSongArtist = 'Integration Test Artist';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should integrate with FirebaseVotingService', () => {
    const { result } = renderHook(() =>
      useVoting(mockSongId, mockUserId, mockSongTitle, mockSongArtist)
    );

    // Should initialize with default state
    expect(result.current.userVote).toBeNull();
    expect(result.current.voteCount).toEqual({ likes: 0, dislikes: 0, total: 0 });
    expect(result.current.isVoting).toBe(false);
    expect(result.current.error).toBeNull();

    // Should have submitVote function
    expect(typeof result.current.submitVote).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('should handle service instantiation correctly', () => {
    // This test verifies that the hook can be instantiated with a real service
    // without throwing errors during the initial setup
    expect(() => {
      const service = new FirebaseVotingService();
      expect(service).toBeDefined();
    }).not.toThrow();
  });

  it('should handle parameter validation', () => {
    const { result } = renderHook(() =>
      useVoting(null, null, '', '')
    );

    // Should handle null/empty parameters gracefully
    expect(result.current.userVote).toBeNull();
    expect(result.current.voteCount).toEqual({ likes: 0, dislikes: 0, total: 0 });
    expect(result.current.isVoting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle song changes correctly', () => {
    const { result, rerender } = renderHook(
      ({ songId }) => useVoting(songId, mockUserId, mockSongTitle, mockSongArtist),
      { initialProps: { songId: mockSongId } }
    );

    // Initial state
    expect(result.current.voteCount).toEqual({ likes: 0, dislikes: 0, total: 0 });

    // Change to null song
    rerender({ songId: null });
    expect(result.current.voteCount).toEqual({ likes: 0, dislikes: 0, total: 0 });
    expect(result.current.userVote).toBeNull();

    // Change back to a song
    rerender({ songId: 'new-song-id' });
    expect(result.current.voteCount).toEqual({ likes: 0, dislikes: 0, total: 0 });
  });

  it('should handle user authentication changes', () => {
    const { result, rerender } = renderHook(
      ({ userId }) => useVoting(mockSongId, userId, mockSongTitle, mockSongArtist),
      { initialProps: { userId: mockUserId } }
    );

    // Initial state with user
    expect(result.current.error).toBeNull();

    // Change to no user
    rerender({ userId: null });
    expect(result.current.error).toBeNull(); // Should not error just from user change

    // Try to vote without user
    act(() => {
      result.current.submitVote('like');
    });

    expect(result.current.error).toContain('You must be logged in to vote');
  });

  it('should handle missing song information', () => {
    const { result } = renderHook(() =>
      useVoting(mockSongId, mockUserId, '', mockSongArtist)
    );

    act(() => {
      result.current.submitVote('like');
    });

    expect(result.current.error).toContain('Song information is not available');
  });

  it('should provide error clearing functionality', () => {
    const { result } = renderHook(() =>
      useVoting(null, mockUserId, mockSongTitle, mockSongArtist)
    );

    // Trigger an error
    act(() => {
      result.current.submitVote('like');
    });

    expect(result.current.error).toBeTruthy();

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});