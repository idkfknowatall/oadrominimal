/**
 * Integration tests for VotingService with Firebase
 * These tests verify the service works with actual Firebase types
 */

import { FirebaseVotingService } from '../voting-service';
import { VoteCount } from '../types';

// Mock Firebase but with more realistic implementations
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({ _type: 'collection' })),
  doc: jest.fn(() => ({ id: 'mock-doc-id', _type: 'doc' })),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(() => ({ _type: 'query' })),
  where: jest.fn(() => ({ _type: 'where' })),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _type: 'timestamp' })),
  runTransaction: jest.fn(),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })
  }
}));

jest.mock('../firebase', () => ({
  getFirestore: jest.fn(() => ({ _type: 'firestore' })),
  FIREBASE_COLLECTIONS: {
    VOTES: 'votes',
    VOTE_AGGREGATES: 'vote-aggregates'
  },
  isFirebaseError: jest.fn((error: any) => 
    error && typeof error === 'object' && 'code' in error && 'message' in error
  )
}));

describe('VotingService Integration', () => {
  let votingService: FirebaseVotingService;

  beforeEach(() => {
    votingService = new FirebaseVotingService();
    jest.clearAllMocks();
  });

  describe('Type Safety', () => {
    it('should handle VoteCount type correctly', async () => {
      const { getDoc } = require('firebase/firestore');
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'song123',
          songId: 'song123',
          likes: 10,
          dislikes: 5,
          totalVotes: 15,
          lastUpdated: Date.now(),
          songTitle: 'Test Song',
          songArtist: 'Test Artist'
        })
      });

      const result: VoteCount = await votingService.getVoteCounts('song123');

      expect(result).toEqual({
        likes: 10,
        dislikes: 5,
        total: 15
      });

      // Verify type constraints
      expect(typeof result.likes).toBe('number');
      expect(typeof result.dislikes).toBe('number');
      expect(typeof result.total).toBe('number');
    });

    it('should handle vote type constraints', async () => {
      const { getDocs, runTransaction } = require('firebase/firestore');

      getDocs.mockResolvedValue({ empty: true, docs: [] });
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({ exists: () => false }),
          set: jest.fn(),
          update: jest.fn()
        };
        await callback(mockTransaction);
      });

      // Valid vote types should work
      await expect(
        votingService.submitVote('song123', 'user456', 'like', 'Test Song', 'Test Artist')
      ).resolves.not.toThrow();

      await expect(
        votingService.submitVote('song123', 'user456', 'dislike', 'Test Song', 'Test Artist')
      ).resolves.not.toThrow();

      // Invalid vote type should be caught by TypeScript (tested at compile time)
      // This would cause a TypeScript error: votingService.submitVote('song123', 'user456', 'invalid', 'Test Song', 'Test Artist')
    });

    it('should handle subscription callback types', () => {
      const { onSnapshot } = require('firebase/firestore');
      
      onSnapshot.mockImplementation((ref, onNext, onError) => {
        // Simulate callback with proper VoteCount type
        const mockVoteCount: VoteCount = {
          likes: 3,
          dislikes: 1,
          total: 4
        };
        
        onNext({
          exists: () => true,
          data: () => ({
            likes: mockVoteCount.likes,
            dislikes: mockVoteCount.dislikes,
            totalVotes: mockVoteCount.total
          })
        });
        
        return jest.fn(); // unsubscribe function
      });

      const mockCallback = jest.fn();
      const unsubscribe = votingService.subscribeToVoteUpdates('song123', mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        likes: 3,
        dislikes: 1,
        total: 4
      });

      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle Firebase-specific errors', async () => {
      const { getDocs } = require('firebase/firestore');
      const { isFirebaseError } = require('../firebase');

      const firebaseError = {
        code: 'permission-denied',
        message: 'Missing or insufficient permissions'
      };

      // Mock isFirebaseError to return true for our error
      isFirebaseError.mockImplementation((error) => 
        error && error.code === 'permission-denied'
      );
      
      getDocs.mockRejectedValue(firebaseError);

      await expect(
        votingService.getUserVote('song123', 'user456')
      ).rejects.toEqual(firebaseError);
    });

    it('should handle network errors with retry', async () => {
      const { getDoc } = require('firebase/firestore');
      const { isFirebaseError } = require('../firebase');

      let attemptCount = 0;
      getDoc.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const networkError = new Error('Network timeout');
          isFirebaseError.mockReturnValue(false);
          throw networkError;
        }
        return { exists: () => false };
      });

      const result = await votingService.getVoteCounts('song123');

      expect(result).toEqual({
        likes: 0,
        dislikes: 0,
        total: 0
      });

      expect(attemptCount).toBe(2);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle concurrent vote submissions', async () => {
      const { getDocs, runTransaction } = require('firebase/firestore');

      // Mock no existing votes
      getDocs.mockResolvedValue({ empty: true, docs: [] });

      // Mock successful transactions
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              likes: 5,
              dislikes: 2,
              totalVotes: 7
            })
          }),
          set: jest.fn(),
          update: jest.fn()
        };
        await callback(mockTransaction);
      });

      // Simulate concurrent votes
      const promises = [
        votingService.submitVote('song123', 'user1', 'like', 'Test Song', 'Test Artist'),
        votingService.submitVote('song123', 'user2', 'dislike', 'Test Song', 'Test Artist'),
        votingService.submitVote('song123', 'user3', 'like', 'Test Song', 'Test Artist')
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();
      expect(runTransaction).toHaveBeenCalledTimes(3);
    });

    it('should handle vote changes correctly', async () => {
      const { getDocs, runTransaction } = require('firebase/firestore');

      // Mock existing vote
      getDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'existing-vote',
          data: () => ({
            id: 'existing-vote',
            songId: 'song123',
            userId: 'user456',
            voteType: 'like',
            timestamp: Date.now() - 1000,
            songTitle: 'Test Song',
            songArtist: 'Test Artist'
          })
        }]
      });

      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              likes: 10,
              dislikes: 5,
              totalVotes: 15
            })
          }),
          set: jest.fn(),
          update: jest.fn()
        };
        await callback(mockTransaction);
      });

      // Change vote from like to dislike
      await expect(
        votingService.submitVote('song123', 'user456', 'dislike', 'Test Song', 'Test Artist')
      ).resolves.not.toThrow();

      expect(runTransaction).toHaveBeenCalledTimes(1);
    });
  });
});