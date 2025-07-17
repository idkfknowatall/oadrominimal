import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { dislikeFeedbackSchema, type DislikeFeedbackResponse, type VotingErrorResponse } from '@/lib/voting-types';

// Rate limiting for feedback submissions
const feedbackRateLimit = new Map<string, { count: number; resetTime: number }>();

function checkFeedbackRateLimit(userId: string): boolean {
  const now = Date.now();
  const key = `feedback:${userId}`;
  const limit = feedbackRateLimit.get(key);

  if (!limit || now > limit.resetTime) {
    feedbackRateLimit.set(key, { count: 1, resetTime: now + 3600000 }); // 1 hour window
    return true;
  }

  if (limit.count >= 5) { // 5 feedback submissions per hour
    return false;
  }

  limit.count++;
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { voteId: string } }
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
    if (!checkFeedbackRateLimit(user.id.toString())) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many feedback submissions. Please wait before submitting again.',
      };
      return NextResponse.json(errorResponse, { status: 429 });
    }

    // Validate request body
    const body = await request.json();
    const validation = dislikeFeedbackSchema.safeParse(body);
    
    if (!validation.success) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid feedback data',
        details: validation.error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { reason, category } = validation.data;
    const voteId = parseInt(params.voteId);

    if (isNaN(voteId)) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid vote ID',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Verify the vote exists and belongs to the user
    const vote = await prisma.vote.findFirst({
      where: {
        id: voteId,
        userId: user.id,
        voteType: 'dislike', // Only allow feedback for dislikes
      },
      include: {
        song: true,
      },
    });

    if (!vote) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Vote not found or not a dislike vote',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Check if feedback already exists for this vote
    const existingFeedback = await prisma.dislikeFeedback.findFirst({
      where: { voteId },
    });

    if (existingFeedback) {
      const errorResponse: VotingErrorResponse = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Feedback already submitted for this vote',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Create feedback
    const feedback = await prisma.dislikeFeedback.create({
      data: {
        voteId,
        userId: user.id,
        songId: vote.songId,
        reason,
        category,
      },
    });

    // TODO: Send notification to admin (WebSocket or other mechanism)
    // This would notify the admin (416034191369830402) about new feedback

    const response: DislikeFeedbackResponse = {
      success: true,
      feedback: {
        id: feedback.id,
        voteId: feedback.voteId,
        userId: feedback.userId,
        songId: feedback.songId,
        reason: feedback.reason,
        category: feedback.category as any,
        isReviewed: feedback.isReviewed,
        reviewedBy: feedback.reviewedBy || undefined,
        reviewedAt: feedback.reviewedAt || undefined,
        createdAt: feedback.createdAt,
      },
      message: 'Feedback submitted successfully',
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Feedback submission error:', error);
    
    const errorResponse: VotingErrorResponse = {
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to submit feedback',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}