import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { VotingRateLimiter } from '@/lib/voting-rate-limiter';
import { featureFlags } from '@/lib/voting-feature-flags';
import { doc, runTransaction, increment } from 'firebase/firestore';
import { getFirestore } from '@/lib/firebase';

// Enhanced rate limiter with persistent storage simulation
class EnhancedVotingRateLimiter extends VotingRateLimiter {
  private ipLimiter = new Map<string, { count: number; resetTime: number }>();
  private voteCooldowns = new Map<string, number>();
  
  constructor() {
    super();
    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  canVoteByIP(ip: string, limit: number = 100): boolean {
    const now = Date.now();
    const window = 60 * 1000; // 1 minute
    
    const entry = this.ipLimiter.get(ip);
    if (!entry || now > entry.resetTime) {
      this.ipLimiter.set(ip, { count: 1, resetTime: now + window });
      return true;
    }
    
    if (entry.count >= limit) {
      return false;
    }
    
    entry.count++;
    return true;
  }

  canVoteOnSong(userId: string, songId: string, cooldownMs: number = 5000): boolean {
    const key = `${userId}:${songId}`;
    const now = Date.now();
    const lastVote = this.voteCooldowns.get(key);
    
    if (lastVote && (now - lastVote) < cooldownMs) {
      return false;
    }
    
    this.voteCooldowns.set(key, now);
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    
    // Cleanup IP limiter
    for (const [ip, entry] of this.ipLimiter.entries()) {
      if (now > entry.resetTime) {
        this.ipLimiter.delete(ip);
      }
    }
    
    // Cleanup vote cooldowns (keep only last hour)
    const oneHour = 60 * 60 * 1000;
    for (const [key, timestamp] of this.voteCooldowns.entries()) {
      if (now - timestamp > oneHour) {
        this.voteCooldowns.delete(key);
      }
    }
  }

  getRemainingCooldown(userId: string, songId: string): number {
    const key = `${userId}:${songId}`;
    const lastVote = this.voteCooldowns.get(key);
    if (!lastVote) return 0;
    
    const cooldownMs = 5000;
    const elapsed = Date.now() - lastVote;
    return Math.max(0, cooldownMs - elapsed);
  }

  get maxVotes(): number {
    return 30; // 30 votes per minute
  }

  get windowMs(): 60000 {
    return 60000; // 1 minute window
  }
}

// Global rate limiter instance
const enhancedRateLimiter = new EnhancedVotingRateLimiter();
// Use the imported feature flags

export class VoteCooldownError extends Error {
  constructor(
    message: string,
    public remainingMs: number,
    public songId: string
  ) {
    super(message);
    this.name = 'VoteCooldownError';
  }
}

export class IPRateLimitError extends Error {
  constructor(message: string, public ip: string) {
    super(message);
    this.name = 'IPRateLimitError';
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || remoteAddr || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session || !('user' in session) || !session.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = (session as any).user.id;
    const clientIP = getClientIP(request);
    
    // Parse request body
    const { songId, voteType } = await request.json();
    
    if (!songId || !['like', 'dislike'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid songId or voteType' },
        { status: 400 }
      );
    }

    // Check feature flags
    if (!featureFlags.enableVotingRateLimit) {
      // Fallback to basic voting without rate limiting
      return await performVote(userId, songId, voteType);
    }

    // Check IP-based rate limiting
    if (!enhancedRateLimiter.canVoteByIP(clientIP)) {
      return NextResponse.json(
        { 
          error: 'IP rate limit exceeded',
          type: 'IP_RATE_LIMIT',
          message: 'Too many votes from this IP address. Please try again later.',
          retryAfter: 60
        },
        { status: 429 }
      );
    }

    // Check user-based rate limiting
    if (!enhancedRateLimiter.canVote(userId)) {
      const remaining = enhancedRateLimiter.getRemainingVotes(userId);
      return NextResponse.json(
        { 
          error: 'User rate limit exceeded',
          type: 'USER_RATE_LIMIT',
          message: `You can only vote ${enhancedRateLimiter.maxVotes} times per minute. Please try again later.`,
          remaining,
          retryAfter: Math.ceil(enhancedRateLimiter.windowMs / 1000)
        },
        { status: 429 }
      );
    }

    // Check vote cooldown for this specific song
    if (!enhancedRateLimiter.canVoteOnSong(userId, songId)) {
      const remainingMs = enhancedRateLimiter.getRemainingCooldown(userId, songId);
      return NextResponse.json(
        { 
          error: 'Vote cooldown active',
          type: 'VOTE_COOLDOWN',
          message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds before voting on this song again.`,
          remainingMs,
          songId
        },
        { status: 429 }
      );
    }

    // Perform the vote
    const result = await performVote(userId, songId, voteType);
    
    // Record successful vote for rate limiting
    enhancedRateLimiter.recordAttempt(userId);
    
    return result;

  } catch (error) {
    console.error('Vote API error:', error);
    
    if (error instanceof VoteCooldownError) {
      return NextResponse.json(
        { 
          error: error.message,
          type: 'VOTE_COOLDOWN',
          remainingMs: error.remainingMs,
          songId: error.songId
        },
        { status: 429 }
      );
    }
    
    if (error instanceof IPRateLimitError) {
      return NextResponse.json(
        { 
          error: error.message,
          type: 'IP_RATE_LIMIT',
          ip: error.ip
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function performVote(userId: string, songId: string, voteType: 'like' | 'dislike') {
  try {
    const db = getFirestore();
    const result = await runTransaction(db, async (transaction) => {
      const voteRef = doc(db, 'votes', `${songId}_${userId}`);
      const songRef = doc(db, 'songs', songId);
      
      // Get current vote and song data
      const voteDoc = await transaction.get(voteRef);
      const songDoc = await transaction.get(songRef);
      
      if (!songDoc.exists()) {
        throw new Error('Song not found');
      }
      
      const currentVote = voteDoc.exists() ? voteDoc.data() : null;
      const songData = songDoc.data();
      
      // Calculate vote changes
      let likesChange = 0;
      let dislikesChange = 0;
      
      if (currentVote) {
        // User is changing their vote
        if (currentVote.type === 'like' && voteType === 'dislike') {
          likesChange = -1;
          dislikesChange = 1;
        } else if (currentVote.type === 'dislike' && voteType === 'like') {
          likesChange = 1;
          dislikesChange = -1;
        }
        // If same vote type, no change needed
      } else {
        // New vote
        if (voteType === 'like') {
          likesChange = 1;
        } else {
          dislikesChange = 1;
        }
      }
      
      // Update vote document
      transaction.set(voteRef, {
        userId,
        songId,
        type: voteType,
        timestamp: new Date(),
        ip: 'server-side' // Don't store actual IP for privacy
      });
      
      // Update song vote counts
      const updates: Record<string, any> = {};
      if (likesChange !== 0) {
        updates.likes = increment(likesChange);
      }
      if (dislikesChange !== 0) {
        updates.dislikes = increment(dislikesChange);
      }
      
      if (Object.keys(updates).length > 0) {
        transaction.update(songRef, updates);
      }
      
      return {
        success: true,
        voteType,
        newCounts: {
          likes: (songData.likes || 0) + likesChange,
          dislikes: (songData.dislikes || 0) + dislikesChange
        },
        changed: likesChange !== 0 || dislikesChange !== 0
      };
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Vote transaction error:', error);
    throw error;
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    rateLimiter: {
      enabled: featureFlags.enableVotingRateLimit,
      userLimit: enhancedRateLimiter.maxVotes,
      windowMs: enhancedRateLimiter.windowMs,
      cooldownMs: 5000
    }
  });
}