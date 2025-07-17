import { Redis } from 'redis'

let redis: Redis | null = null

// Initialize Redis client
export async function getRedisClient(): Promise<Redis> {
  if (!redis) {
    redis = new Redis({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })

    redis.on('error', (err) => {
      console.error('Redis connection error:', err)
    })

    redis.on('connect', () => {
      console.log('Connected to Redis')
    })

    try {
      await redis.connect()
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      redis = null
      throw error
    }
  }

  return redis
}

// Cache keys
const VOTE_COUNT_KEY = (songId: string) => `vote_count:${songId}`
const USER_VOTE_KEY = (userId: string, songId: string) => `user_vote:${userId}:${songId}`
const VOTE_STATS_KEY = (songId: string) => `vote_stats:${songId}`
const TRENDING_SONGS_KEY = 'trending_songs'

export interface VoteCounts {
  likeCount: number
  dislikeCount: number
  totalVotes: number
  ratio: number // like ratio (likes / total votes)
}

export interface UserVote {
  voteType: 'like' | 'dislike' | null
  timestamp?: string
}

// Get vote counts for a song from cache
export async function getCachedVoteCounts(songId: string): Promise<VoteCounts | null> {
  try {
    const client = await getRedisClient()
    const cached = await client.get(VOTE_COUNT_KEY(songId))
    
    if (cached) {
      return JSON.parse(cached)
    }
    
    return null
  } catch (error) {
    console.error('Error getting cached vote counts:', error)
    return null
  }
}

// Cache vote counts for a song
export async function setCachedVoteCounts(songId: string, counts: VoteCounts, ttl: number = 300): Promise<void> {
  try {
    const client = await getRedisClient()
    await client.setex(VOTE_COUNT_KEY(songId), ttl, JSON.stringify(counts))
  } catch (error) {
    console.error('Error caching vote counts:', error)
  }
}

// Get user's vote for a song from cache
export async function getCachedUserVote(userId: string, songId: string): Promise<UserVote | null> {
  try {
    const client = await getRedisClient()
    const cached = await client.get(USER_VOTE_KEY(userId, songId))
    
    if (cached) {
      return JSON.parse(cached)
    }
    
    return null
  } catch (error) {
    console.error('Error getting cached user vote:', error)
    return null
  }
}

// Cache user's vote for a song
export async function setCachedUserVote(userId: string, songId: string, vote: UserVote, ttl: number = 3600): Promise<void> {
  try {
    const client = await getRedisClient()
    await client.setex(USER_VOTE_KEY(userId, songId), ttl, JSON.stringify(vote))
  } catch (error) {
    console.error('Error caching user vote:', error)
  }
}

// Remove user's vote from cache
export async function removeCachedUserVote(userId: string, songId: string): Promise<void> {
  try {
    const client = await getRedisClient()
    await client.del(USER_VOTE_KEY(userId, songId))
  } catch (error) {
    console.error('Error removing cached user vote:', error)
  }
}

// Invalidate vote counts cache for a song
export async function invalidateVoteCountsCache(songId: string): Promise<void> {
  try {
    const client = await getRedisClient()
    await client.del(VOTE_COUNT_KEY(songId))
    await client.del(VOTE_STATS_KEY(songId))
  } catch (error) {
    console.error('Error invalidating vote counts cache:', error)
  }
}

// Get trending songs from cache
export async function getCachedTrendingSongs(): Promise<string[] | null> {
  try {
    const client = await getRedisClient()
    const cached = await client.get(TRENDING_SONGS_KEY)
    
    if (cached) {
      return JSON.parse(cached)
    }
    
    return null
  } catch (error) {
    console.error('Error getting cached trending songs:', error)
    return null
  }
}

// Cache trending songs
export async function setCachedTrendingSongs(songIds: string[], ttl: number = 900): Promise<void> {
  try {
    const client = await getRedisClient()
    await client.setex(TRENDING_SONGS_KEY, ttl, JSON.stringify(songIds))
  } catch (error) {
    console.error('Error caching trending songs:', error)
  }
}

// Batch get vote counts for multiple songs
export async function getBatchCachedVoteCounts(songIds: string[]): Promise<Map<string, VoteCounts>> {
  const results = new Map<string, VoteCounts>()
  
  try {
    const client = await getRedisClient()
    const keys = songIds.map(id => VOTE_COUNT_KEY(id))
    const cached = await client.mget(...keys)
    
    cached.forEach((value, index) => {
      if (value) {
        try {
          const counts = JSON.parse(value)
          results.set(songIds[index], counts)
        } catch (error) {
          console.error(`Error parsing cached vote counts for song ${songIds[index]}:`, error)
        }
      }
    })
  } catch (error) {
    console.error('Error getting batch cached vote counts:', error)
  }
  
  return results
}

// Batch set vote counts for multiple songs
export async function setBatchCachedVoteCounts(voteCounts: Map<string, VoteCounts>, ttl: number = 300): Promise<void> {
  try {
    const client = await getRedisClient()
    const pipeline = client.pipeline()
    
    voteCounts.forEach((counts, songId) => {
      pipeline.setex(VOTE_COUNT_KEY(songId), ttl, JSON.stringify(counts))
    })
    
    await pipeline.exec()
  } catch (error) {
    console.error('Error batch caching vote counts:', error)
  }
}

// Increment vote count in cache (for real-time updates)
export async function incrementCachedVoteCount(songId: string, voteType: 'like' | 'dislike', increment: number = 1): Promise<VoteCounts | null> {
  try {
    const client = await getRedisClient()
    const cached = await getCachedVoteCounts(songId)
    
    if (cached) {
      const updated = { ...cached }
      
      if (voteType === 'like') {
        updated.likeCount += increment
      } else {
        updated.dislikeCount += increment
      }
      
      updated.totalVotes = updated.likeCount + updated.dislikeCount
      updated.ratio = updated.totalVotes > 0 ? updated.likeCount / updated.totalVotes : 0
      
      await setCachedVoteCounts(songId, updated)
      return updated
    }
    
    return null
  } catch (error) {
    console.error('Error incrementing cached vote count:', error)
    return null
  }
}

// Health check for Redis connection
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedisClient()
    const result = await client.ping()
    return result === 'PONG'
  } catch (error) {
    console.error('Redis health check failed:', error)
    return false
  }
}

// Close Redis connection
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    try {
      await redis.quit()
      redis = null
    } catch (error) {
      console.error('Error closing Redis connection:', error)
    }
  }
}