import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getTrendingAnalytics } from '@/lib/vote-analytics'

const ADMIN_DISCORD_ID = '416034191369830402'

// GET /api/admin/analytics/trending - Get trending songs analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.id !== ADMIN_DISCORD_ID) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const trending = await getTrendingAnalytics()
    
    return NextResponse.json(trending)

  } catch (error) {
    console.error('Error fetching trending analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}