/**
 * Performance optimization utilities for the Discord voting system
 * Implements caching, debouncing, and connection pooling for optimal Firebase usage
 */

import { VoteCount } from './types';

/**
 * Cache entry for vote counts with TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * In-memory cache for vote counts and user votes
 */
class VotingCache {
  private voteCountCache = new Map<string, CacheEntry<VoteCount>>();
  private userVoteCache = new Map<string, CacheEntry<'like' | 'dislike' | null>>();
  
  // Cache TTL in milliseconds
  private readonly VOTE_COUNT_TTL = 30000; // 30 seconds
  private readonly USER_VOTE_TTL = 300000; // 5 minutes

  /**
   * Get cached vote counts for a song
   */
  getVoteCount(songId: string): VoteCount | null {
    const entry = this.voteCountCache.get(songId);
    if (!entry) return null;

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.voteCountCache.delete(songId);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache vote counts for a song
   */
  setVoteCount(songId: string, voteCount: VoteCount): void {
    this.voteCountCache.set(songId, {
      data: voteCount,
      timestamp: Date.now(),
      ttl: this.VOTE_COUNT_TTL
    });
  }

  /**
   * Get cached user vote for a song
   */
  getUserVote(songId: string, userId: string): 'like' | 'dislike' | null | undefined {
    const key = `${songId}:${userId}`;
    const entry = this.userVoteCache.get(key);
    if (!entry) return undefined;

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.userVoteCache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Cache user vote for a song
   */
  setUserVote(songId: string, userId: string, voteType: 'like' | 'dislike' | null): void {
    const key = `${songId}:${userId}`;
    this.userVoteCache.set(key, {
      data: voteType,
      timestamp: Date.now(),
      ttl: this.USER_VOTE_TTL
    });
  }

  /**
   * Clear all cached data for a song (useful when song changes)
   */
  clearSongCache(songId: string): void {
    this.voteCountCache.delete(songId);
    
    // Clear user votes for this song
    for (const key of this.userVoteCache.keys()) {
      if (key.startsWith(`${songId}:`)) {
        this.userVoteCache.delete(key);
      }
    }
  }

  /**
   * Clear expired cache entries
   */
  cleanup(): void {
    const now = Date.now();

    // Clean vote count cache
    for (const [key, entry] of this.voteCountCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.voteCountCache.delete(key);
      }
    }

    // Clean user vote cache
    for (const [key, entry] of this.userVoteCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.userVoteCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats() {
    return {
      voteCountCacheSize: this.voteCountCache.size,
      userVoteCacheSize: this.userVoteCache.size,
      totalCacheSize: this.voteCountCache.size + this.userVoteCache.size
    };
  }
}

/**
 * Debouncer for vote submissions to prevent rapid-fire voting
 */
class VoteDebouncer {
  private pendingVotes = new Map<string, {
    voteType: 'like' | 'dislike';
    timeout: NodeJS.Timeout;
    resolve: (value: void) => void;
    reject: (error: Error) => void;
  }>();

  private readonly DEBOUNCE_DELAY = 500; // 500ms debounce

  /**
   * Debounce vote submission for a user/song combination
   */
  debounceVote(
    key: string,
    voteType: 'like' | 'dislike',
    submitFn: (voteType: 'like' | 'dislike') => Promise<void>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear existing pending vote for this key
      const existing = this.pendingVotes.get(key);
      if (existing) {
        clearTimeout(existing.timeout);
        // Resolve the previous promise with the new vote
        existing.resolve();
      }

      // Set up new debounced vote
      const timeout = setTimeout(async () => {
        this.pendingVotes.delete(key);
        try {
          await submitFn(voteType);
          resolve();
        } catch (error) {
          reject(error as Error);
        }
      }, this.DEBOUNCE_DELAY);

      this.pendingVotes.set(key, {
        voteType,
        timeout,
        resolve,
        reject
      });
    });
  }

  /**
   * Cancel all pending votes (useful on component unmount)
   */
  cancelAll(): void {
    for (const [key, pending] of this.pendingVotes.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Vote cancelled'));
      this.pendingVotes.delete(key);
    }
  }

  /**
   * Get pending vote count for monitoring
   */
  getPendingCount(): number {
    return this.pendingVotes.size;
  }
}

/**
 * Connection pool manager for Firebase subscriptions
 */
class SubscriptionPool {
  private subscriptions = new Map<string, {
    unsubscribe: () => void;
    refCount: number;
    lastUsed: number;
  }>();

  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly MAX_IDLE_TIME = 300000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Get or create a subscription for a song
   */
  getSubscription(
    songId: string,
    createSubscription: () => () => void
  ): () => void {
    const existing = this.subscriptions.get(songId);
    
    if (existing) {
      // Increment reference count and update last used time
      existing.refCount++;
      existing.lastUsed = Date.now();
      
      // Return a function that decrements ref count when called
      return () => {
        const sub = this.subscriptions.get(songId);
        if (sub) {
          sub.refCount--;
          if (sub.refCount <= 0) {
            // Schedule cleanup after a delay to allow for quick re-subscriptions
            setTimeout(() => {
              const currentSub = this.subscriptions.get(songId);
              if (currentSub && currentSub.refCount <= 0) {
                currentSub.unsubscribe();
                this.subscriptions.delete(songId);
              }
            }, 5000); // 5 second grace period
          }
        }
      };
    }

    // Create new subscription
    const unsubscribe = createSubscription();
    this.subscriptions.set(songId, {
      unsubscribe,
      refCount: 1,
      lastUsed: Date.now()
    });

    // Return cleanup function
    return () => {
      const sub = this.subscriptions.get(songId);
      if (sub) {
        sub.refCount--;
        if (sub.refCount <= 0) {
          setTimeout(() => {
            const currentSub = this.subscriptions.get(songId);
            if (currentSub && currentSub.refCount <= 0) {
              currentSub.unsubscribe();
              this.subscriptions.delete(songId);
            }
          }, 5000);
        }
      }
    };
  }

  /**
   * Force cleanup of all subscriptions
   */
  cleanup(): void {
    for (const [songId, subscription] of this.subscriptions.entries()) {
      subscription.unsubscribe();
      this.subscriptions.delete(songId);
    }
  }

  /**
   * Start periodic cleanup of idle subscriptions
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      
      for (const [songId, subscription] of this.subscriptions.entries()) {
        if (subscription.refCount <= 0 && now - subscription.lastUsed > this.MAX_IDLE_TIME) {
          subscription.unsubscribe();
          this.subscriptions.delete(songId);
        }
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup timer (call on app shutdown)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cleanup();
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const totalSubs = this.subscriptions.size;
    const activeSubs = Array.from(this.subscriptions.values())
      .filter(sub => sub.refCount > 0).length;
    
    return {
      totalSubscriptions: totalSubs,
      activeSubscriptions: activeSubs,
      idleSubscriptions: totalSubs - activeSubs
    };
  }
}

/**
 * Performance monitor for voting operations
 */
class VotingPerformanceMonitor {
  private metrics = {
    voteSubmissions: 0,
    successfulVotes: 0,
    failedVotes: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
    lastResetTime: Date.now()
  };

  /**
   * Record a vote submission attempt
   */
  recordVoteAttempt(): void {
    this.metrics.voteSubmissions++;
  }

  /**
   * Record a successful vote
   */
  recordVoteSuccess(responseTime: number): void {
    this.metrics.successfulVotes++;
    this.updateResponseTime(responseTime);
  }

  /**
   * Record a failed vote
   */
  recordVoteFailure(responseTime: number): void {
    this.metrics.failedVotes++;
    this.updateResponseTime(responseTime);
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  /**
   * Update average response time
   */
  private updateResponseTime(responseTime: number): void {
    this.metrics.totalResponseTime += responseTime;
    const totalRequests = this.metrics.successfulVotes + this.metrics.failedVotes;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / totalRequests;
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    const totalVotes = this.metrics.successfulVotes + this.metrics.failedVotes;
    const successRate = totalVotes > 0 ? (this.metrics.successfulVotes / totalVotes) * 100 : 0;
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 ? (this.metrics.cacheHits / totalCacheRequests) * 100 : 0;

    return {
      ...this.metrics,
      successRate: Math.round(successRate * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      uptime: Date.now() - this.metrics.lastResetTime
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      voteSubmissions: 0,
      successfulVotes: 0,
      failedVotes: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      lastResetTime: Date.now()
    };
  }
}

// Export singleton instances
export const votingCache = new VotingCache();
export const voteDebouncer = new VoteDebouncer();
export const subscriptionPool = new SubscriptionPool();
export const performanceMonitor = new VotingPerformanceMonitor();

// Cleanup function for app shutdown
export function cleanupVotingPerformance(): void {
  voteDebouncer.cancelAll();
  subscriptionPool.destroy();
  performanceMonitor.reset();
}

// Auto-cleanup cache every 5 minutes
setInterval(() => {
  votingCache.cleanup();
}, 300000);