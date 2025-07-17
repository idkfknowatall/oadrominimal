import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getVoteAnalytics, exportAnalyticsToCSV } from '@/lib/vote-analytics'

const ADMIN_DISCORD_ID = '416034191369830402'

// GET /api/admin/analytics - Get voting analytics
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
    const timeRange = searchParams.get('timeRange') as '24h' | '7d' | '30d' | 'all' || '7d'
    const format = searchParams.get('format')

    if (format === 'csv') {
      const csvData = await exportAnalyticsToCSV(timeRange)
      
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="vote-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    const analytics = await getVoteAnalytics(timeRange)
    
    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}