import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { z } from 'zod'

const ADMIN_DISCORD_ID = '416034191369830402'

// GET /api/admin/dislike-feedback/[feedbackId] - Get specific feedback
export async function GET(
  request: NextRequest,
  { params }: { params: { feedbackId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.id !== ADMIN_DISCORD_ID) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const feedback = await prisma.dislikeFeedback.findUnique({
      where: { id: params.feedbackId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        song: {
          select: {
            id: true,
            title: true,
            artist: true
          }
        }
      }
    })

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    const formattedFeedback = {
      id: feedback.id,
      songId: feedback.songId,
      songTitle: feedback.song.title,
      songArtist: feedback.song.artist,
      userId: feedback.userId,
      username: feedback.user.name || 'Unknown User',
      userImage: feedback.user.image,
      feedback: feedback.feedback,
      category: feedback.category,
      timestamp: feedback.createdAt.toISOString(),
      status: feedback.status,
      adminNotes: feedback.adminNotes,
      updatedAt: feedback.updatedAt.toISOString()
    }

    return NextResponse.json({ feedback: formattedFeedback })

  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/dislike-feedback/[feedbackId] - Update feedback status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { feedbackId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.id !== ADMIN_DISCORD_ID) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    const updateFeedbackSchema = z.object({
      status: z.enum(['pending', 'reviewed', 'resolved']).optional(),
      adminNotes: z.string().max(1000).optional()
    })

    const validatedData = updateFeedbackSchema.parse(body)

    // Check if feedback exists
    const existingFeedback = await prisma.dislikeFeedback.findUnique({
      where: { id: params.feedbackId }
    })

    if (!existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    const updatedFeedback = await prisma.dislikeFeedback.update({
      where: { id: params.feedbackId },
      data: {
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.adminNotes !== undefined && { adminNotes: validatedData.adminNotes }),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        song: {
          select: {
            id: true,
            title: true,
            artist: true
          }
        }
      }
    })

    const formattedFeedback = {
      id: updatedFeedback.id,
      songId: updatedFeedback.songId,
      songTitle: updatedFeedback.song.title,
      songArtist: updatedFeedback.song.artist,
      userId: updatedFeedback.userId,
      username: updatedFeedback.user.name || 'Unknown User',
      userImage: updatedFeedback.user.image,
      feedback: updatedFeedback.feedback,
      category: updatedFeedback.category,
      timestamp: updatedFeedback.createdAt.toISOString(),
      status: updatedFeedback.status,
      adminNotes: updatedFeedback.adminNotes,
      updatedAt: updatedFeedback.updatedAt.toISOString()
    }

    return NextResponse.json({
      feedback: formattedFeedback,
      message: 'Feedback updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/dislike-feedback/[feedbackId] - Delete feedback
export async function DELETE(
  request: NextRequest,
  { params }: { params: { feedbackId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.id !== ADMIN_DISCORD_ID) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Check if feedback exists
    const existingFeedback = await prisma.dislikeFeedback.findUnique({
      where: { id: params.feedbackId }
    })

    if (!existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    await prisma.dislikeFeedback.delete({
      where: { id: params.feedbackId }
    })

    return NextResponse.json({
      message: 'Feedback deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}