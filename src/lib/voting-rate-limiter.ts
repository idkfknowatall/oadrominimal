/**
 * Rate limiting service for voting to prevent abuse
 * Implements server-side rate limiting with Redis-like in-memory store
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limiter for voting actions
 * In production, this should be replaced with Redis or similar distributed cache
 */
class VotingRateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly windowMs = 60000; // 1 minute window
  private readonly maxRequests = 30; // 30 votes per minute per user
  
  /**
   * Check if a user can vote (rate limit check)
   * @param userId - Discord user ID
   * @returns true if user can vote, false if rate limited
   */
  canVote(userId: string): boolean {
    const now = Date.now();
    const key = `vote:${userId}`;
    const entry = this.limits.get(key);
    
    if (!entry || now > entry.resetTime) {
      // No entry or window expired, create new entry
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }
    
    if (entry.count >= this.maxRequests) {
      return false; // Rate limited
    }
    
    // Increment count
    entry.count++;
    return true;
  }
  
  /**
   * Get remaining votes for a user
   * @param userId - Discord user ID
   * @returns number of votes remaining in current window
   */
  getRemainingVotes(userId: string): number {
    const now = Date.now();
    const key = `vote:${userId}`;
    const entry = this.limits.get(key);
    
    if (!entry || now > entry.resetTime) {
      return this.maxRequests;
    }
    
    return Math.max(0, this.maxRequests - entry.count);
  }
  
  /**
   * Get time until rate limit resets
   * @param userId - Discord user ID
   * @returns milliseconds until reset, or 0 if not rate limited
   */
  getResetTime(userId: string): number {
    const now = Date.now();
    const key = `vote:${userId}`;
    const entry = this.limits.get(key);
    
    if (!entry || now > entry.resetTime) {
      return 0;
    }
    
    return entry.resetTime - now;
  }
  
  /**
   * Clean up expired entries (should be called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
  
  /**
   * Get current rate limit stats
   */
  getStats() {
    return {
      activeUsers: this.limits.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests
    };
  }
}

// Singleton instance
export const votingRateLimiter = new VotingRateLimiter();

// Clean up expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    votingRateLimiter.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Rate limiting error class
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public remainingTime: number,
    public remainingVotes: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}