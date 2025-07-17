import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { type VotesResponse, type UserVoteResponse, type VotingErrorResponse } from '@/lib/voting-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  try {
    const { songId } = await params;

    if (!songId || songId.trim().length === 0) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid song ID',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Get session for user vote info (optional)
    const session = await getServerSession(authOptions);
    let userVote: 'like' | 'dislike' | null = null;

    // Find song
    const song = await prisma.song.findUnique({
      where: { songId },
    });

    if (!song) {
      // Return zero counts for non-existent songs
      const response: VotesResponse = {
        success: true,
        votes: {
          songId,
          likeCount: 0,
          dislikeCount: 0,
          totalVotes: 0,
          userVote: null,
        },
      };
      return NextResponse.json(response);
    }

    // Get user vote if authenticated
    if (session?.user?.discordId) {
      const user = await prisma.user.findUnique({
        where: { discordId: session.user.discordId },
      });

      if (user) {
        const vote = await prisma.vote.findUnique({
          where: {
            userId_songId: {
              userId: user.id,
              songId: song.id,
            },
          },
        });

        if (vote) {
          userVote = vote.voteType as 'like' | 'dislike';
        }
      }
    }

    const response: VotesResponse = {
      success: true,
      votes: {
        songId: song.songId,
        likeCount: song.likeCount,
        dislikeCount: song.dislikeCount,
        totalVotes: song.totalVotes,
        userVote,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get votes error:', error);
    
    const errorResponse: VotingErrorResponse = {
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve vote information',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}