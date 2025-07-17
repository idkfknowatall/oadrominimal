import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getSongAnalytics } from '@/lib/vote-analytics'

const ADMIN_DISCORD_ID = '416034191369830402'

// GET /api/admin/analytics/songs/[songId] - Get analytics for specific song
export async function GET(
  request: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.id !== ADMIN_DISCORD_ID) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') as '24h' | '7d' | '30d' | 'all' || '7d'

    const songAnalytics = await getSongAnalytics(params.songId, timeRange)
    
    return NextResponse.json(songAnalytics)

  } catch (error) {
    console.error('Error fetching song analytics:', error)
    
    if (error instanceof Error && error.message === 'Song not found') {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}