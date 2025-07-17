import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { exportAnalyticsToCSV } from '@/lib/vote-analytics'

const ADMIN_DISCORD_ID = '416034191369830402'

// GET /api/admin/analytics/export - Export analytics data as CSV
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

    const csvData = await exportAnalyticsToCSV(timeRange)
    
    const filename = `vote-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`
    
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Error exporting analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}