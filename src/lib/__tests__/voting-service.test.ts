/**
 * Tests for VotingService and FirebaseVotingService
 */

import { FirebaseVotingService, VotingService } from '../voting-service';
import { VoteCount } from '../types';

// Mock Firebase Firestore
const mockRunTransaction = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  setDoc: jest.fn(),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  runTransaction: (...args: any[]) => mockRunTransaction(...args),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000 })
  }
}));

// Mock Firebase setup
jest.mock('../firebase', () => ({
  getFirestore: jest.fn(() => ({})),
  FIREBASE_COLLECTIONS: {
    VOTES: 'votes',
    VOTE_AGGREGATES: 'vote-aggregates'
  },
  isFirebaseError: jest.fn((error: any) => 
    error && typeof error === 'object' && 'code' in error && 'message' in error
  )
}));

describe('FirebaseVotingService', () => {
  let votingService: VotingService;

  beforeEach(() => {
    votingService = new FirebaseVotingService();
    jest.clearAllMocks();
  });

  describe('submitVote', () => {
    const mockSongId = 'song123';
    const mockUserId = 'user456';
    const mockSongTitle = 'Test Song';
    const mockSongArtist = 'Test Artist';

    beforeEach(() => {
      // Mock no existing vote (getDocs called outside transaction)
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: []
      });

      // Mock successful transaction
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn()
        };

        // Mock no existing aggregate
        mockTransaction.get.mockResolvedValueOnce({
          exists: () => false
        });

        await callback(mockTransaction);
      });

      mockDoc.mockReturnValue({ id: 'mock-doc-id' });
      mockCollection.mockReturnValue({});
      mockQuery.mockReturnValue({});
      mockWhere.mockReturnValue({});
    });

    it('should submit a new vote successfully', async () => {
      await expect(
        votingService.submitVote(mockSongId, mockUserId, 'like', mockSongTitle, mockSongArtist)
      ).resolves.not.toThrow();

      expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    });

    it('should validate required parameters', async () => {
      await expect(
        votingService.submitVote('', mockUserId, 'like', mockSongTitle, mockSongArtist)
      ).rejects.toThrow('Song ID is required');

      await expect(
        votingService.submitVote(mockSongId, '', 'like', mockSongTitle, mockSongArtist)
      ).rejects.toThrow('User ID is required');

      await expect(
        votingService.submitVote(mockSongId, mockUserId, 'invalid' as any, mockSongTitle, mockSongArtist)
      ).rejects.toThrow('Invalid vote type');

      await expect(
        votingService.submitVote(mockSongId, mockUserId, 'like', '', mockSongArtist)
      ).rejects.toThrow('Song title is required');

      await expect(
        votingService.submitVote(mockSongId, mockUserId, 'like', mockSongTitle, '')
      ).rejects.toThrow('Song artist is required');
    });

    it('should handle existing vote updates', async () => {
      // Mock existing vote (getDocs called outside transaction)
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'existing-vote-id',
          data: () => ({
            id: 'existing-vote-id',
            songId: mockSongId,
            userId: mockUserId,
            voteType: 'dislike',
            timestamp: Date.now() - 1000,
            songTitle: mockSongTitle,
            songArtist: mockSongArtist
          })
        }]
      });

      // Mock transaction with existing aggregate
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn()
        };

        // Mock existing aggregate
        mockTransaction.get.mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            id: mockSongId,
            songId: mockSongId,
            likes: 5,
            dislikes: 3,
            totalVotes: 8,
            lastUpdated: Date.now() - 1000,
            songTitle: mockSongTitle,
            songArtist: mockSongArtist
          })
        });

        await callback(mockTransaction);
      });

      await expect(
        votingService.submitVote(mockSongId, mockUserId, 'like', mockSongTitle, mockSongArtist)
      ).resolves.not.toThrow();

      expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      let attemptCount = 0;
      mockRunTransaction.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Network error');
          (error as any).code = 'unavailable';
          throw error;
        }
        // Succeed on third attempt
      });

      await expect(
        votingService.submitVote(mockSongId, mockUserId, 'like', mockSongTitle, mockSongArtist)
      ).resolves.not.toThrow();

      expect(mockRunTransaction).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const permissionError = new Error('Permission denied');
      (permissionError as any).code = 'permission-denied';
      mockRunTransaction.mockRejectedValue(permissionError);

      await expect(
        votingService.submitVote(mockSongId, mockUserId, 'like', mockSongTitle, mockSongArtist)
      ).rejects.toThrow('Permission denied');

      expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('getVoteCounts', () => {
    const mockSongId = 'song123';

    it('should return vote counts for existing song', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: mockSongId,
          songId: mockSongId,
          likes: 10,
          dislikes: 3,
          totalVotes: 13,
          lastUpdated: Date.now(),
          songTitle: 'Test Song',
          songArtist: 'Test Artist'
        })
      });

      const result = await votingService.getVoteCounts(mockSongId);

      expect(result).toEqual({
        likes: 10,
        dislikes: 3,
        total: 13
      });
    });

    it('should return zero counts for non-existing song', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await votingService.getVoteCounts(mockSongId);

      expect(result).toEqual({
        likes: 0,
        dislikes: 0,
        total: 0
      });
    });

    it('should validate song ID parameter', async () => {
      await expect(votingService.getVoteCounts('')).rejects.toThrow('Song ID is required');
    });

    it('should retry on network errors', async () => {
      let attemptCount = 0;
      mockGetDoc.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Network timeout');
        }
        return {
          exists: () => false
        };
      });

      const result = await votingService.getVoteCounts(mockSongId);

      expect(result).toEqual({
        likes: 0,
        dislikes: 0,
        total: 0
      });
      expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserVote', () => {
    const mockSongId = 'song123';
    const mockUserId = 'user456';

    it('should return user vote when exists', async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          data: () => ({
            id: 'vote123',
            songId: mockSongId,
            userId: mockUserId,
            voteType: 'like',
            timestamp: Date.now(),
            songTitle: 'Test Song',
            songArtist: 'Test Artist'
          })
        }]
      });

      const result = await votingService.getUserVote(mockSongId, mockUserId);

      expect(result).toBe('like');
    });

    it('should return null when no vote exists', async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: []
      });

      const result = await votingService.getUserVote(mockSongId, mockUserId);

      expect(result).toBeNull();
    });

    it('should validate parameters', async () => {
      await expect(votingService.getUserVote('', mockUserId)).rejects.toThrow('Song ID is required');
      await expect(votingService.getUserVote(mockSongId, '')).rejects.toThrow('User ID is required');
    });
  });

  describe('subscribeToVoteUpdates', () => {
    const mockSongId = 'song123';
    const mockCallback = jest.fn();

    beforeEach(() => {
      mockCallback.mockClear();
    });

    it('should set up real-time subscription', () => {
      const mockUnsubscribe = jest.fn();
      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      const unsubscribe = votingService.subscribeToVoteUpdates(mockSongId, mockCallback);

      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call callback with vote counts on updates', () => {
      const mockSnapshot = {
        exists: () => true,
        data: () => ({
          likes: 5,
          dislikes: 2,
          totalVotes: 7
        })
      };

      mockOnSnapshot.mockImplementation((ref, onNext, onError) => {
        // Simulate immediate callback
        onNext(mockSnapshot);
        return jest.fn();
      });

      votingService.subscribeToVoteUpdates(mockSongId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        likes: 5,
        dislikes: 2,
        total: 7
      });
    });

    it('should handle non-existing documents', () => {
      const mockSnapshot = {
        exists: () => false
      };

      mockOnSnapshot.mockImplementation((ref, onNext, onError) => {
        onNext(mockSnapshot);
        return jest.fn();
      });

      votingService.subscribeToVoteUpdates(mockSongId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        likes: 0,
        dislikes: 0,
        total: 0
      });
    });

    it('should handle subscription errors gracefully', () => {
      const mockError = new Error('Subscription failed');

      mockOnSnapshot.mockImplementation((ref, onNext, onError) => {
        onError(mockError);
        return jest.fn();
      });

      votingService.subscribeToVoteUpdates(mockSongId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        likes: 0,
        dislikes: 0,
        total: 0
      });
    });

    it('should validate parameters', () => {
      expect(() => votingService.subscribeToVoteUpdates('', mockCallback))
        .toThrow('Song ID is required');
      
      expect(() => votingService.subscribeToVoteUpdates(mockSongId, null as any))
        .toThrow('Callback function is required');
    });
  });
});