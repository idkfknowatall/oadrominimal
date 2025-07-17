import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { voteRequestSchema, type VoteResponse, type VotingErrorResponse } from '@/lib/voting-types';
import { z } from 'zod';

// Rate limiting map (in production, use Redis)
const voteRateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const key = `vote:${userId}`;
  const limit = voteRateLimit.get(key);

  if (!limit || now > limit.resetTime) {
    voteRateLimit.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }

  if (limit.count >= 10) { // 10 votes per minute
    return false;
  }

  limit.count++;
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    if (!user) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'User not found',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Check rate limit
    if (!checkRateLimit(user.id.toString())) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many votes. Please wait before voting again.',
      };
      return NextResponse.json(errorResponse, { status: 429 });
    }

    // Validate request body
    const body = await request.json();
    const validation = voteRequestSchema.safeParse(body);
    
    if (!validation.success) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid vote data',
        details: validation.error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { voteType } = validation.data;
    const { songId } = await params;

    // Validate songId
    if (!songId || songId.trim().length === 0) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid song ID',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Find or create song
      let song = await tx.song.findUnique({
        where: { songId },
      });

      if (!song) {
        // If song doesn't exist, we need more info to create it
        // For now, return error - songs should be created when they start playing
        throw new Error('Song not found');
      }

      // Check for existing vote
      const existingVote = await tx.vote.findUnique({
        where: {
          userId_songId: {
            userId: user.id,
            songId: song.id,
          },
        },
      });

      let vote;
      let oldVoteType: string | null = null;

      if (existingVote) {
        oldVoteType = existingVote.voteType;
        // Update existing vote
        vote = await tx.vote.update({
          where: { id: existingVote.id },
          data: { voteType, timestamp: new Date() },
        });
      } else {
        // Create new vote
        vote = await tx.vote.create({
          data: {
            userId: user.id,
            songId: song.id,
            voteType,
          },
        });
      }

      // Update song vote counts
      let likeCountChange = 0;
      let dislikeCountChange = 0;

      if (oldVoteType) {
        // Remove old vote count
        if (oldVoteType === 'like') likeCountChange -= 1;
        if (oldVoteType === 'dislike') dislikeCountChange -= 1;
      }

      // Add new vote count
      if (voteType === 'like') likeCountChange += 1;
      if (voteType === 'dislike') dislikeCountChange += 1;

      const updatedSong = await tx.song.update({
        where: { id: song.id },
        data: {
          likeCount: { increment: likeCountChange },
          dislikeCount: { increment: dislikeCountChange },
          totalVotes: { increment: oldVoteType ? 0 : 1 }, // Only increment if new vote
        },
      });

      return { vote, song: updatedSong };
    });

    const response: VoteResponse = {
      success: true,
      vote: {
        id: result.vote.id,
        userId: result.vote.userId,
        songId: result.vote.songId,
        voteType: result.vote.voteType as 'like' | 'dislike',
        timestamp: result.vote.timestamp,
      },
      votes: {
        songId: result.song.songId,
        likeCount: result.song.likeCount,
        dislikeCount: result.song.dislikeCount,
        totalVotes: result.song.totalVotes,
        userVote: result.vote.voteType as 'like' | 'dislike',
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Vote submission error:', error);
    
    const errorResponse: VotingErrorResponse = {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    if (!user) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'User not found',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { songId } = await params;

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Find song
      const song = await tx.song.findUnique({
        where: { songId },
      });

      if (!song) {
        throw new Error('Song not found');
      }

      // Find existing vote
      const existingVote = await tx.vote.findUnique({
        where: {
          userId_songId: {
            userId: user.id,
            songId: song.id,
          },
        },
      });

      if (!existingVote) {
        throw new Error('No vote found to remove');
      }

      // Delete vote
      await tx.vote.delete({
        where: { id: existingVote.id },
      });

      // Update song vote counts
      let likeCountChange = 0;
      let dislikeCountChange = 0;

      if (existingVote.voteType === 'like') likeCountChange = -1;
      if (existingVote.voteType === 'dislike') dislikeCountChange = -1;

      const updatedSong = await tx.song.update({
        where: { id: song.id },
        data: {
          likeCount: { increment: likeCountChange },
          dislikeCount: { increment: dislikeCountChange },
          totalVotes: { decrement: 1 },
        },
      });

      return { song: updatedSong };
    });

    const response: VoteResponse = {
      success: true,
      votes: {
        songId: result.song.songId,
        likeCount: result.song.likeCount,
        dislikeCount: result.song.dislikeCount,
        totalVotes: result.song.totalVotes,
        userVote: null,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Vote removal error:', error);
    
    const errorResponse: VotingErrorResponse = {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}