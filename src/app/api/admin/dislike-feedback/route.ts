import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { z } from 'zod'

const ADMIN_DISCORD_ID = '416034191369830402'

// GET /api/admin/dislike-feedback - Get all dislike feedback for admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.id !== ADMIN_DISCORD_ID) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereClause = status && status !== 'all' 
      ? { status: status as 'pending' | 'reviewed' | 'resolved' }
      : {}

    const [feedback, total] = await Promise.all([
      prisma.dislikeFeedback.findMany({
        where: whereClause,
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
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.dislikeFeedback.count({ where: whereClause })
    ])

    const formattedFeedback = feedback.map(item => ({
      id: item.id,
      songId: item.songId,
      songTitle: item.song.title,
      songArtist: item.song.artist,
      userId: item.userId,
      username: item.user.name || 'Unknown User',
      userImage: item.user.image,
      feedback: item.feedback,
      category: item.category,
      timestamp: item.createdAt.toISOString(),
      status: item.status,
      adminNotes: item.adminNotes,
      updatedAt: item.updatedAt.toISOString()
    }))

    return NextResponse.json({
      feedback: formattedFeedback,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching dislike feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/dislike-feedback - Create new feedback (for testing)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    const createFeedbackSchema = z.object({
      songId: z.string().min(1),
      feedback: z.string().min(1).max(1000),
      category: z.enum(['inappropriate', 'poor_quality', 'wrong_genre', 'offensive', 'other']).default('other')
    })

    const validatedData = createFeedbackSchema.parse(body)

    // Check if song exists
    const song = await prisma.song.findUnique({
      where: { id: validatedData.songId }
    })

    if (!song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      )
    }

    // Check if user already submitted feedback for this song
    const existingFeedback = await prisma.dislikeFeedback.findUnique({
      where: {
        userId_songId: {
          userId: session.user.id,
          songId: validatedData.songId
        }
      }
    })

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback already submitted for this song' },
        { status: 409 }
      )
    }

    const feedback = await prisma.dislikeFeedback.create({
      data: {
        userId: session.user.id,
        songId: validatedData.songId,
        feedback: validatedData.feedback,
        category: validatedData.category,
        status: 'pending'
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

    // Send real-time notification to admin
    const { sendDislikeFeedbackToAdmin } = await import('@/lib/websocket-server')
    sendDislikeFeedbackToAdmin({
      songId: feedback.songId,
      userId: feedback.userId,
      feedback: feedback.feedback,
      timestamp: feedback.createdAt.toISOString()
    })

    return NextResponse.json({
      id: feedback.id,
      message: 'Feedback submitted successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating dislike feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}