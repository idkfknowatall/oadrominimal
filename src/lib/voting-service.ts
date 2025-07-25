/**
 * Voting Service Interface and Firebase Implementation
 * Handles vote submission, retrieval, and real-time updates for the Discord voting system
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Timestamp,
  Unsubscribe,
  FirestoreError
} from 'firebase/firestore';
import { getFirestore, FIREBASE_COLLECTIONS, isFirebaseError } from './firebase';
import { VoteDocument, VoteAggregateDocument, VoteCount, isVoteType } from './types';
import { 
  withEnhancedRetry, 
  classifyError, 
  formatErrorForLogging,
  VotingError 
} from './error-handling';
import { 
  votingCache, 
  voteDebouncer, 
  subscriptionPool, 
  performanceMonitor 
} from './voting-performance';

/**
 * Interface for voting service operations
 */
export interface VotingService {
  /**
   * Submit or update a vote for a song
   * @param songId - The AzuraCast song ID
   * @param userId - The Discord user ID
   * @param voteType - The type of vote ('like' or 'dislike')
   * @param songTitle - The song title for denormalization
   * @param songArtist - The song artist for denormalization
   */
  submitVote(
    songId: string,
    userId: string,
    voteType: 'like' | 'dislike',
    songTitle: string,
    songArtist: string
  ): Promise<void>;

  /**
   * Get current vote counts for a song
   * @param songId - The AzuraCast song ID
   * @returns Promise resolving to vote counts
   */
  getVoteCounts(songId: string): Promise<VoteCount>;

  /**
   * Get user's current vote for a song
   * @param songId - The AzuraCast song ID
   * @param userId - The Discord user ID
   * @returns Promise resolving to user's vote type or null if no vote
   */
  getUserVote(songId: string, userId: string): Promise<'like' | 'dislike' | null>;

  /**
   * Subscribe to real-time vote count updates for a song
   * @param songId - The AzuraCast song ID
   * @param callback - Callback function to handle vote count updates
   * @returns Unsubscribe function to stop listening
   */
  subscribeToVoteUpdates(songId: string, callback: (votes: VoteCount) => void): Unsubscribe;
}

/**
 * Firebase implementation of the VotingService
 */
export class FirebaseVotingService implements VotingService {
  private db: Firestore | null = null;

  private getDb(): Firestore {
    if (!this.db) {
      this.db = getFirestore();
    }
    return this.db;
  }

  /**
   * Submit or update a vote for a song with enhanced error handling
   */
  async submitVote(
    songId: string,
    userId: string,
    voteType: 'like' | 'dislike',
    songTitle: string,
    songArtist: string
  ): Promise<void> {
    // Validate inputs
    if (!songId?.trim()) {
      const error = classifyError(new Error('Song ID is required'), 'Vote Submission');
      console.error(formatErrorForLogging(error));
      throw error;
    }
    if (!userId?.trim()) {
      const error = classifyError(new Error('User ID is required'), 'Vote Submission');
      console.error(formatErrorForLogging(error));
      throw error;
    }
    if (!isVoteType(voteType)) {
      const error = classifyError(new Error('Invalid vote type'), 'Vote Submission');
      console.error(formatErrorForLogging(error));
      throw error;
    }
    if (!songTitle?.trim()) {
      const error = classifyError(new Error('Song title is required'), 'Vote Submission');
      console.error(formatErrorForLogging(error));
      throw error;
    }
    if (!songArtist?.trim()) {
      const error = classifyError(new Error('Song artist is required'), 'Vote Submission');
      console.error(formatErrorForLogging(error));
      throw error;
    }

    return withEnhancedRetry(async () => {
      await this.submitVoteInternal(songId, userId, voteType, songTitle, songArtist);
    }, 'Vote Submission');
  }

  /**
   * Internal vote submission with transaction handling
   */
  private async submitVoteInternal(
    songId: string,
    userId: string,
    voteType: 'like' | 'dislike',
    songTitle: string,
    songArtist: string
  ): Promise<void> {
    const timestamp = Date.now();

    // First, find existing vote outside transaction (queries can't be used in transactions)
    const votesRef = collection(this.getDb(), FIREBASE_COLLECTIONS.VOTES);
    const existingVoteQuery = query(
      votesRef,
      where('songId', '==', songId),
      where('userId', '==', userId)
    );

    const existingVoteSnapshot = await getDocs(existingVoteQuery);
    let existingVoteDocId: string | null = null;
    let existingVoteType: 'like' | 'dislike' | null = null;

    if (!existingVoteSnapshot.empty) {
      const existingVoteDoc = existingVoteSnapshot.docs[0];
      const existingVote = existingVoteDoc.data() as VoteDocument;
      existingVoteDocId = existingVoteDoc.id;
      existingVoteType = existingVote.voteType;
    }

    // Now run the transaction with the known vote document ID
    await runTransaction(this.getDb(), async (transaction) => {
      // Get current vote aggregate
      const aggregateRef = doc(this.getDb(), FIREBASE_COLLECTIONS.VOTE_AGGREGATES, songId);
      const aggregateSnapshot = await transaction.get(aggregateRef);
      
      let currentAggregate: VoteAggregateDocument = {
        id: songId,
        songId,
        likes: 0,
        dislikes: 0,
        totalVotes: 0,
        lastUpdated: timestamp,
        songTitle,
        songArtist
      };

      if (aggregateSnapshot.exists()) {
        const data = aggregateSnapshot.data();
        currentAggregate = {
          ...currentAggregate,
          ...data,
          lastUpdated: timestamp
        };
      }

      // Calculate new vote counts
      let newLikes = currentAggregate.likes;
      let newDislikes = currentAggregate.dislikes;

      if (existingVoteType) {
        // User is changing their vote - remove old vote
        if (existingVoteType === 'like') {
          newLikes--;
        } else {
          newDislikes--;
        }
      }

      // Add new vote
      if (voteType === 'like') {
        newLikes++;
      } else {
        newDislikes++;
      }

      const newTotal = newLikes + newDislikes;

      // Create or update vote document
      const voteData: VoteDocument = {
        id: existingVoteDocId || '', // Will be set by Firestore if new
        songId,
        userId,
        voteType,
        timestamp,
        songTitle,
        songArtist
      };

      if (existingVoteDocId) {
        // Update existing vote
        const existingVoteRef = doc(this.getDb(), FIREBASE_COLLECTIONS.VOTES, existingVoteDocId);
        transaction.update(existingVoteRef, {
          voteType,
          timestamp,
          songTitle,
          songArtist
        });
      } else {
        // Create new vote
        const newVoteRef = doc(votesRef);
        voteData.id = newVoteRef.id;
        transaction.set(newVoteRef, voteData);
      }

      // Update vote aggregate
      const updatedAggregate: VoteAggregateDocument = {
        ...currentAggregate,
        likes: newLikes,
        dislikes: newDislikes,
        totalVotes: newTotal,
        lastUpdated: timestamp
      };

      transaction.set(aggregateRef, updatedAggregate);
    });
  }

  /**
   * Get current vote counts for a song with enhanced error handling
   */
  async getVoteCounts(songId: string): Promise<VoteCount> {
    if (!songId?.trim()) {
      const error = classifyError(new Error('Song ID is required'), 'Get Vote Counts');
      console.error(formatErrorForLogging(error));
      throw error;
    }

    return withEnhancedRetry(async () => {
      const aggregateRef = doc(this.getDb(), FIREBASE_COLLECTIONS.VOTE_AGGREGATES, songId);
      const aggregateSnapshot = await getDoc(aggregateRef);

      if (!aggregateSnapshot.exists()) {
        return {
          likes: 0,
          dislikes: 0,
          total: 0
        };
      }

      const data = aggregateSnapshot.data() as VoteAggregateDocument;
      return {
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        total: data.totalVotes || 0
      };
    }, 'Get Vote Counts');
  }

  /**
   * Get user's current vote for a song with enhanced error handling
   */
  async getUserVote(songId: string, userId: string): Promise<'like' | 'dislike' | null> {
    if (!songId?.trim()) {
      const error = classifyError(new Error('Song ID is required'), 'Get User Vote');
      console.error(formatErrorForLogging(error));
      throw error;
    }
    if (!userId?.trim()) {
      const error = classifyError(new Error('User ID is required'), 'Get User Vote');
      console.error(formatErrorForLogging(error));
      throw error;
    }

    return withEnhancedRetry(async () => {
      const votesRef = collection(this.getDb(), FIREBASE_COLLECTIONS.VOTES);
      const userVoteQuery = query(
        votesRef,
        where('songId', '==', songId),
        where('userId', '==', userId)
      );

      const userVoteSnapshot = await getDocs(userVoteQuery);

      if (userVoteSnapshot.empty) {
        return null;
      }

      const voteDoc = userVoteSnapshot.docs[0];
      const voteData = voteDoc.data() as VoteDocument;
      
      return voteData.voteType;
    }, 'Get User Vote');
  }

  /**
   * Subscribe to real-time vote count updates for a song with enhanced error handling
   */
  subscribeToVoteUpdates(songId: string, callback: (votes: VoteCount) => void): Unsubscribe {
    if (!songId?.trim()) {
      const error = classifyError(new Error('Song ID is required'), 'Vote Subscription');
      console.error(formatErrorForLogging(error));
      throw error;
    }
    if (typeof callback !== 'function') {
      const error = classifyError(new Error('Callback function is required'), 'Vote Subscription');
      console.error(formatErrorForLogging(error));
      throw error;
    }

    const aggregateRef = doc(this.getDb(), FIREBASE_COLLECTIONS.VOTE_AGGREGATES, songId);

    return onSnapshot(
      aggregateRef,
      (snapshot) => {
        try {
          if (!snapshot.exists()) {
            callback({
              likes: 0,
              dislikes: 0,
              total: 0
            });
            return;
          }

          const data = snapshot.data() as VoteAggregateDocument;
          callback({
            likes: data.likes || 0,
            dislikes: data.dislikes || 0,
            total: data.totalVotes || 0
          });
        } catch (error) {
          const votingError = classifyError(error, 'Vote Update Processing');
          console.error(formatErrorForLogging(votingError));
          
          // Don't throw here as it would break the subscription
          // Instead, call callback with current known state or zeros
          callback({
            likes: 0,
            dislikes: 0,
            total: 0
          });
        }
      },
      (error) => {
        const votingError = classifyError(error, 'Vote Subscription');
        console.error(formatErrorForLogging(votingError));
        
        // Call callback with zeros on error to maintain UI consistency
        callback({
          likes: 0,
          dislikes: 0,
          total: 0
        });
      }
    );
  }


}

/**
 * Safe voting service that handles Firebase not being configured with enhanced error handling
 */
class SafeVotingService implements VotingService {
  private firebaseService: FirebaseVotingService | null = null;

  private getService(): FirebaseVotingService {
    if (!this.firebaseService) {
      this.firebaseService = new FirebaseVotingService();
    }
    return this.firebaseService;
  }

  async submitVote(
    songId: string,
    userId: string,
    voteType: 'like' | 'dislike',
    songTitle: string,
    songArtist: string
  ): Promise<void> {
    try {
      return await this.getService().submitVote(songId, userId, voteType, songTitle, songArtist);
    } catch (error) {
      // Check if it's a VotingError (from enhanced error handling)
      if (error && typeof error === 'object' && 'type' in error) {
        throw error; // Re-throw VotingError as-is
      }
      
      // Handle Firebase configuration errors
      if (error instanceof Error && error.message.includes('Firebase')) {
        const votingError = classifyError(error, 'Firebase Configuration');
        console.warn(formatErrorForLogging(votingError));
        return; // Silently fail for configuration issues
      }
      
      // Classify and re-throw other errors
      const votingError = classifyError(error, 'Safe Vote Submission');
      console.error(formatErrorForLogging(votingError));
      throw votingError;
    }
  }

  async getVoteCounts(songId: string): Promise<VoteCount> {
    try {
      return await this.getService().getVoteCounts(songId);
    } catch (error) {
      // Check if it's a VotingError (from enhanced error handling)
      if (error && typeof error === 'object' && 'type' in error) {
        throw error; // Re-throw VotingError as-is
      }
      
      // Handle Firebase configuration errors
      if (error instanceof Error && error.message.includes('Firebase')) {
        const votingError = classifyError(error, 'Firebase Configuration');
        console.warn(formatErrorForLogging(votingError));
        return { likes: 0, dislikes: 0, total: 0 }; // Return default for configuration issues
      }
      
      // Classify and re-throw other errors
      const votingError = classifyError(error, 'Safe Get Vote Counts');
      console.error(formatErrorForLogging(votingError));
      throw votingError;
    }
  }

  async getUserVote(songId: string, userId: string): Promise<'like' | 'dislike' | null> {
    try {
      return await this.getService().getUserVote(songId, userId);
    } catch (error) {
      // Check if it's a VotingError (from enhanced error handling)
      if (error && typeof error === 'object' && 'type' in error) {
        throw error; // Re-throw VotingError as-is
      }
      
      // Handle Firebase configuration errors
      if (error instanceof Error && error.message.includes('Firebase')) {
        const votingError = classifyError(error, 'Firebase Configuration');
        console.warn(formatErrorForLogging(votingError));
        return null; // Return null for configuration issues
      }
      
      // Classify and re-throw other errors
      const votingError = classifyError(error, 'Safe Get User Vote');
      console.error(formatErrorForLogging(votingError));
      throw votingError;
    }
  }

  subscribeToVoteUpdates(songId: string, callback: (votes: VoteCount) => void): Unsubscribe {
    try {
      return this.getService().subscribeToVoteUpdates(songId, callback);
    } catch (error) {
      // Check if it's a VotingError (from enhanced error handling)
      if (error && typeof error === 'object' && 'type' in error) {
        const votingError = error as VotingError;
        console.error(formatErrorForLogging(votingError));
        // Return a no-op unsubscribe function for subscription errors
        return () => {};
      }
      
      // Handle Firebase configuration errors
      if (error instanceof Error && error.message.includes('Firebase')) {
        const votingError = classifyError(error, 'Firebase Configuration');
        console.warn(formatErrorForLogging(votingError));
        return () => {}; // Return no-op for configuration issues
      }
      
      // Classify and log other errors, but don't throw (would break subscription setup)
      const votingError = classifyError(error, 'Safe Vote Subscription');
      console.error(formatErrorForLogging(votingError));
      return () => {};
    }
  }
}

// Export a singleton instance
export const votingService = new SafeVotingService();