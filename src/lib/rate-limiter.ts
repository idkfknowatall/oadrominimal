/**
 * Enhanced rate limiting with Redis-like interface for better scalability
 * This provides a foundation for distributed rate limiting
 */

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string, route: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface RateLimitStore {
  get(key: string): Promise<{ count: number; resetTime: number } | null>;
  set(key: string, value: { count: number; resetTime: number }, ttl: number): Promise<void>;
  increment(key: string, ttl: number): Promise<{ count: number; resetTime: number }>;
}

// In-memory store implementation (for development/single instance)
class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const data = this.store.get(key);
    if (!data) return null;
    
    // Check if expired
    if (Date.now() > data.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return data;
  }

  async set(key: string, value: { count: number; resetTime: number }, ttl: number): Promise<void> {
    this.store.set(key, value);
    
    // Auto-cleanup expired entries
    setTimeout(() => {
      this.store.delete(key);
    }, ttl);
  }

  async increment(key: string, ttl: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const existing = await this.get(key);
    
    if (!existing) {
      const newData = { count: 1, resetTime: now + ttl };
      await this.set(key, newData, ttl);
      return newData;
    }
    
    const updatedData = { ...existing, count: existing.count + 1 };
    await this.set(key, updatedData, existing.resetTime - now);
    return updatedData;
  }
}

// Redis store implementation (for production/distributed systems)
class RedisStore implements RateLimitStore {
  private redis: any; // Redis client would be injected

  constructor(redisClient?: any) {
    this.redis = redisClient;
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    if (!this.redis) return null;
    
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: { count: number; resetTime: number }, ttl: number): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.setex(key, Math.ceil(ttl / 1000), JSON.stringify(value));
    } catch (error) {
      console.warn('Redis rate limit set failed:', error);
    }
  }

  async increment(key: string, ttl: number): Promise<{ count: number; resetTime: number }> {
    if (!this.redis) {
      // Fallback to memory store
      return new MemoryStore().increment(key, ttl);
    }
    
    try {
      const now = Date.now();
      const resetTime = now + ttl;
      
      const multi = this.redis.multi();
      multi.incr(key);
      multi.expire(key, Math.ceil(ttl / 1000));
      
      const results = await multi.exec();
      const count = results[0][1];
      
      return { count, resetTime };
    } catch (error) {
      console.warn('Redis rate limit increment failed:', error);
      // Fallback to memory store
      return new MemoryStore().increment(key, ttl);
    }
  }
}

export class EnhancedRateLimiter {
  private store: RateLimitStore;
  private defaultConfig: RateLimitConfig;

  constructor(store?: RateLimitStore, defaultConfig?: Partial<RateLimitConfig>) {
    this.store = store || new MemoryStore();
    this.defaultConfig = {
      limit: 100,
      windowMs: 60 * 1000, // 1 minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (identifier, route) => `rl:${identifier}:${route}`,
      ...defaultConfig
    };
  }

  async checkLimit(
    identifier: string, 
    route: string, 
    config?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = finalConfig.keyGenerator!(identifier, route);
    
    try {
      const data = await this.store.increment(key, finalConfig.windowMs);
      const allowed = data.count <= finalConfig.limit;
      
      const result: RateLimitResult = {
        allowed,
        limit: finalConfig.limit,
        remaining: Math.max(0, finalConfig.limit - data.count),
        resetTime: new Date(data.resetTime)
      };
      
      if (!allowed) {
        result.retryAfter = Math.ceil((data.resetTime - Date.now()) / 1000);
      }
      
      return result;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        limit: finalConfig.limit,
        remaining: finalConfig.limit,
        resetTime: new Date(Date.now() + finalConfig.windowMs)
      };
    }
  }

  async reset(identifier: string, route: string): Promise<void> {
    const key = this.defaultConfig.keyGenerator!(identifier, route);
    try {
      await this.store.set(key, { count: 0, resetTime: Date.now() + this.defaultConfig.windowMs }, 0);
    } catch (error) {
      console.warn('Rate limit reset failed:', error);
    }
  }
}

// Export singleton instance
export const rateLimiter = new EnhancedRateLimiter();

// Export store implementations for custom setups
export { MemoryStore, RedisStore };