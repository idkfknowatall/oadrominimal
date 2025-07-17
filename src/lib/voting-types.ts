import { z } from 'zod';

// Voting system types
export type VoteType = 'like' | 'dislike';

export interface VoteData {
  id: number;
  userId: number;
  songId: number;
  voteType: VoteType;
  timestamp: Date;
}

export interface SongVotes {
  songId: string;
  likeCount: number;
  dislikeCount: number;
  totalVotes: number;
  userVote?: VoteType | null;
}

export interface DislikeFeedback {
  id: number;
  voteId: number;
  userId: number;
  songId: number;
  reason: string;
  category: FeedbackCategory;
  isReviewed: boolean;
  reviewedBy?: number;
  reviewedAt?: Date;
  createdAt: Date;
}

export type FeedbackCategory = 'quality' | 'content' | 'technical' | 'other';

export interface UserProfile {
  id: number;
  discordId: string;
  username: string;
  discriminator?: string;
  avatar?: string;
  isAdmin: boolean;
}

// API Request/Response types
export interface VoteRequest {
  voteType: VoteType;
}

export interface VoteResponse {
  success: boolean;
  vote?: VoteData;
  votes: SongVotes;
  message?: string;
}

export interface DislikeFeedbackRequest {
  reason: string;
  category: FeedbackCategory;
}

export interface DislikeFeedbackResponse {
  success: boolean;
  feedback?: DislikeFeedback;
  message?: string;
}

export interface VotesResponse {
  success: boolean;
  votes: SongVotes;
}

export interface UserVoteResponse {
  success: boolean;
  vote?: VoteType | null;
}

// Analytics types
export interface VoteAnalytics {
  totalVotes: number;
  totalLikes: number;
  totalDislikes: number;
  likeRatio: number;
  topLikedSongs: Array<{
    songId: string;
    title: string;
    artist: string;
    likeCount: number;
  }>;
  topDislikedSongs: Array<{
    songId: string;
    title: string;
    artist: string;
    dislikeCount: number;
  }>;
  recentActivity: Array<{
    timestamp: Date;
    voteType: VoteType;
    songTitle: string;
    username: string;
  }>;
}

// WebSocket event types
export interface VoteUpdateEvent {
  type: 'vote_update';
  data: {
    songId: string;
    votes: SongVotes;
  };
}

export interface NewFeedbackEvent {
  type: 'new_feedback';
  data: {
    feedback: DislikeFeedback;
    song: {
      title: string;
      artist: string;
    };
    user: {
      username: string;
    };
  };
}

export type WebSocketEvent = VoteUpdateEvent | NewFeedbackEvent;

// Validation schemas
export const voteRequestSchema = z.object({
  voteType: z.enum(['like', 'dislike']),
});

export const dislikeFeedbackSchema = z.object({
  reason: z.string().min(10).max(1000),
  category: z.enum(['quality', 'content', 'technical', 'other']),
});

export const songIdSchema = z.string().min(1);

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

export interface RateLimitError {
  error: 'RATE_LIMIT_EXCEEDED';
  message: string;
  retryAfter: number;
  limit: RateLimitInfo;
}

// Error types
export type VotingError = 
  | 'UNAUTHORIZED'
  | 'SONG_NOT_FOUND'
  | 'INVALID_VOTE_TYPE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export interface VotingErrorResponse {
  success: false;
  error: VotingError;
  message: string;
  details?: any;
}

// Cache types
export interface CachedVotes {
  songId: string;
  likeCount: number;
  dislikeCount: number;
  totalVotes: number;
  lastUpdated: Date;
}

export interface CachedUserVote {
  userId: number;
  songId: string;
  voteType: VoteType | null;
  lastUpdated: Date;
}

// Admin types
export interface AdminFeedbackFilter {
  isReviewed?: boolean;
  category?: FeedbackCategory;
  dateFrom?: Date;
  dateTo?: Date;
  songId?: string;
  limit?: number;
  offset?: number;
}

export interface AdminFeedbackResponse {
  success: boolean;
  feedback: Array<DislikeFeedback & {
    song: {
      title: string;
      artist: string;
    };
    user: {
      username: string;
      avatar?: string;
    };
    reviewer?: {
      username: string;
    };
  }>;
  total: number;
  hasMore: boolean;
}

// Constants
export const ADMIN_DISCORD_ID = '416034191369830402';

export const VOTE_RATE_LIMITS = {
  VOTES_PER_MINUTE: 10,
  FEEDBACK_PER_HOUR: 5,
} as const;

export const FEEDBACK_CATEGORIES: Record<FeedbackCategory, string> = {
  quality: 'Audio Quality Issues',
  content: 'Inappropriate Content',
  technical: 'Technical Problems',
  other: 'Other Issues',
} as const;

// Type guards
export function isVoteType(value: unknown): value is VoteType {
  return typeof value === 'string' && ['like', 'dislike'].includes(value);
}

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === 'string' && ['quality', 'content', 'technical', 'other'].includes(value);
}

export function isVotingError(error: unknown): error is VotingErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    error.success === false &&
    'error' in error &&
    'message' in error
  );
}