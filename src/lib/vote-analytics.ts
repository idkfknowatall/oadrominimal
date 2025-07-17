import { prisma } from '@/lib/database'
import { getCachedVoteCounts, setCachedTrendingSongs } from '@/lib/vote-cache'

export interface VoteAnalytics {
  totalVotes: number
  totalLikes: number
  totalDislikes: number
  averageRating: number
  topSongs: Array<{
    songId: string
    title: string
    artist: string
    likeCount: number
    dislikeCount: number
    ratio: number
  }>
  recentActivity: Array<{
    timestamp: string
    songId: string
    voteType: 'like' | 'dislike'
    count: number
  }>
  userEngagement: {
    activeUsers: number
    averageVotesPerUser: number
    topVoters: Array<{
      userId: string
      username: string
      voteCount: number
    }>
  }
}

export interface SongAnalytics {
  songId: string
  title: string
  artist: string
  totalVotes: number
  likeCount: number
  dislikeCount: number
  ratio: number
  hourlyBreakdown: Array<{
    hour: number
    likes: number
    dislikes: number
  }>
  dailyBreakdown: Array<{
    date: string
    likes: number
    dislikes: number
  }>
  topFeedbackCategories: Array<{
    category: string
    count: number
  }>
}

export interface TrendingAnalytics {
  trending: Array<{
    songId: string
    title: string
    artist: string
    score: number
    recentVotes: number
    momentum: number
  }>
  rising: Array<{
    songId: string
    title: string
    artist: string
    growthRate: number
    recentVotes: number
  }>
  controversial: Array<{
    songId: string
    title: string
    artist: string
    ratio: number
    totalVotes: number
    controversy: number
  }>
}

// Get overall voting analytics
export async function getVoteAnalytics(timeRange: '24h' | '7d' | '30d' | 'all' = '7d'): Promise<VoteAnalytics> {
  const timeFilter = getTimeFilter(timeRange)
  
  try {
    // Get total vote counts
    const totalStats = await prisma.vote.aggregate({
      where: timeFilter,
      _count: {
        id: true
      }
    })

    const voteTypeStats = await prisma.vote.groupBy({
      by: ['voteType'],
      where: timeFilter,
      _count: {
        id: true
      }
    })

    const totalLikes = voteTypeStats.find(stat => stat.voteType === 'like')?._count.id || 0
    const totalDislikes = voteTypeStats.find(stat => stat.voteType === 'dislike')?._count.id || 0
    const totalVotes = totalStats._count.id

    // Get top songs
    const topSongsData = await prisma.song.findMany({
      select: {
        id: true,
        title: true,
        artist: true,
        likeCount: true,
        dislikeCount: true
      },
      orderBy: [
        { likeCount: 'desc' },
        { dislikeCount: 'asc' }
      ],
      take: 10
    })

    const topSongs = topSongsData.map(song => ({
      songId: song.id,
      title: song.title,
      artist: song.artist,
      likeCount: song.likeCount,
      dislikeCount: song.dislikeCount,
      ratio: (song.likeCount + song.dislikeCount) > 0 
        ? song.likeCount / (song.likeCount + song.dislikeCount) 
        : 0
    }))

    // Get recent activity (hourly breakdown for last 24 hours)
    const recentActivity = await prisma.$queryRaw<Array<{
      hour: string
      songId: string
      voteType: 'like' | 'dislike'
      count: bigint
    }>>`
      SELECT 
        DATE_TRUNC('hour', "createdAt") as hour,
        "songId",
        "voteType",
        COUNT(*) as count
      FROM "Vote"
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', "createdAt"), "songId", "voteType"
      ORDER BY hour DESC
      LIMIT 100
    `

    const formattedRecentActivity = recentActivity.map(activity => ({
      timestamp: activity.hour,
      songId: activity.songId,
      voteType: activity.voteType,
      count: Number(activity.count)
    }))

    // Get user engagement stats
    const activeUsersCount = await prisma.vote.findMany({
      where: timeFilter,
      select: { userId: true },
      distinct: ['userId']
    })

    const topVoters = await prisma.vote.groupBy({
      by: ['userId'],
      where: timeFilter,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    })

    const topVotersWithNames = await Promise.all(
      topVoters.map(async (voter) => {
        const user = await prisma.user.findUnique({
          where: { id: voter.userId },
          select: { name: true }
        })
        return {
          userId: voter.userId,
          username: user?.name || 'Unknown User',
          voteCount: voter._count.id
        }
      })
    )

    return {
      totalVotes,
      totalLikes,
      totalDislikes,
      averageRating: totalVotes > 0 ? totalLikes / totalVotes : 0,
      topSongs,
      recentActivity: formattedRecentActivity,
      userEngagement: {
        activeUsers: activeUsersCount.length,
        averageVotesPerUser: activeUsersCount.length > 0 ? totalVotes / activeUsersCount.length : 0,
        topVoters: topVotersWithNames
      }
    }

  } catch (error) {
    console.error('Error getting vote analytics:', error)
    throw new Error('Failed to fetch vote analytics')
  }
}

// Get analytics for a specific song
export async function getSongAnalytics(songId: string, timeRange: '24h' | '7d' | '30d' | 'all' = '7d'): Promise<SongAnalytics> {
  const timeFilter = getTimeFilter(timeRange)
  
  try {
    // Get song details
    const song = await prisma.song.findUnique({
      where: { id: songId },
      select: {
        id: true,
        title: true,
        artist: true,
        likeCount: true,
        dislikeCount: true
      }
    })

    if (!song) {
      throw new Error('Song not found')
    }

    // Get hourly breakdown
    const hourlyData = await prisma.$queryRaw<Array<{
      hour: number
      voteType: 'like' | 'dislike'
      count: bigint
    }>>`
      SELECT 
        EXTRACT(HOUR FROM "createdAt") as hour,
        "voteType",
        COUNT(*) as count
      FROM "Vote"
      WHERE "songId" = ${songId} AND ${timeFilter ? 'TRUE' : 'TRUE'}
      GROUP BY EXTRACT(HOUR FROM "createdAt"), "voteType"
      ORDER BY hour
    `

    const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
      const likes = hourlyData.find(d => d.hour === hour && d.voteType === 'like')?.count || BigInt(0)
      const dislikes = hourlyData.find(d => d.hour === hour && d.voteType === 'dislike')?.count || BigInt(0)
      return {
        hour,
        likes: Number(likes),
        dislikes: Number(dislikes)
      }
    })

    // Get daily breakdown for the time range
    const dailyData = await prisma.$queryRaw<Array<{
      date: string
      voteType: 'like' | 'dislike'
      count: bigint
    }>>`
      SELECT 
        DATE("createdAt") as date,
        "voteType",
        COUNT(*) as count
      FROM "Vote"
      WHERE "songId" = ${songId} AND ${timeFilter ? 'TRUE' : 'TRUE'}
      GROUP BY DATE("createdAt"), "voteType"
      ORDER BY date DESC
      LIMIT 30
    `

    const dailyBreakdown = dailyData.reduce((acc, curr) => {
      const existing = acc.find(d => d.date === curr.date)
      if (existing) {
        if (curr.voteType === 'like') {
          existing.likes = Number(curr.count)
        } else {
          existing.dislikes = Number(curr.count)
        }
      } else {
        acc.push({
          date: curr.date,
          likes: curr.voteType === 'like' ? Number(curr.count) : 0,
          dislikes: curr.voteType === 'dislike' ? Number(curr.count) : 0
        })
      }
      return acc
    }, [] as Array<{ date: string; likes: number; dislikes: number }>)

    // Get feedback categories
    const feedbackCategories = await prisma.dislikeFeedback.groupBy({
      by: ['category'],
      where: {
        songId,
        ...(timeFilter && { createdAt: timeFilter.createdAt })
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    const topFeedbackCategories = feedbackCategories.map(category => ({
      category: category.category,
      count: category._count.id
    }))

    const totalVotes = song.likeCount + song.dislikeCount
    const ratio = totalVotes > 0 ? song.likeCount / totalVotes : 0

    return {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      totalVotes,
      likeCount: song.likeCount,
      dislikeCount: song.dislikeCount,
      ratio,
      hourlyBreakdown,
      dailyBreakdown,
      topFeedbackCategories
    }

  } catch (error) {
    console.error('Error getting song analytics:', error)
    throw new Error('Failed to fetch song analytics')
  }
}

// Get trending songs analytics
export async function getTrendingAnalytics(): Promise<TrendingAnalytics> {
  try {
    // Calculate trending songs (high recent activity + good ratio)
    const trendingData = await prisma.$queryRaw<Array<{
      songId: string
      title: string
      artist: string
      recentVotes: bigint
      totalLikes: bigint
      totalDislikes: bigint
    }>>`
      SELECT 
        s.id as "songId",
        s.title,
        s.artist,
        COUNT(v.id) as "recentVotes",
        s."likeCount" as "totalLikes",
        s."dislikeCount" as "totalDislikes"
      FROM "Song" s
      LEFT JOIN "Vote" v ON s.id = v."songId" AND v."createdAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY s.id, s.title, s.artist, s."likeCount", s."dislikeCount"
      HAVING COUNT(v.id) > 0
      ORDER BY COUNT(v.id) DESC, s."likeCount" DESC
      LIMIT 20
    `

    const trending = trendingData.map(song => {
      const totalVotes = Number(song.totalLikes) + Number(song.totalDislikes)
      const ratio = totalVotes > 0 ? Number(song.totalLikes) / totalVotes : 0
      const recentVotes = Number(song.recentVotes)
      
      // Trending score: recent activity * ratio * log(total votes)
      const score = recentVotes * ratio * Math.log(totalVotes + 1)
      const momentum = recentVotes / Math.max(totalVotes, 1)

      return {
        songId: song.songId,
        title: song.title,
        artist: song.artist,
        score,
        recentVotes,
        momentum
      }
    }).sort((a, b) => b.score - a.score)

    // Calculate rising songs (high growth rate)
    const risingData = await prisma.$queryRaw<Array<{
      songId: string
      title: string
      artist: string
      recentVotes: bigint
      previousVotes: bigint
    }>>`
      SELECT 
        s.id as "songId",
        s.title,
        s.artist,
        COUNT(CASE WHEN v."createdAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) as "recentVotes",
        COUNT(CASE WHEN v."createdAt" >= NOW() - INTERVAL '48 hours' AND v."createdAt" < NOW() - INTERVAL '24 hours' THEN 1 END) as "previousVotes"
      FROM "Song" s
      LEFT JOIN "Vote" v ON s.id = v."songId"
      GROUP BY s.id, s.title, s.artist
      HAVING COUNT(CASE WHEN v."createdAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) > 0
      ORDER BY COUNT(CASE WHEN v."createdAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) DESC
      LIMIT 20
    `

    const rising = risingData.map(song => {
      const recentVotes = Number(song.recentVotes)
      const previousVotes = Number(song.previousVotes)
      const growthRate = previousVotes > 0 ? (recentVotes - previousVotes) / previousVotes : recentVotes

      return {
        songId: song.songId,
        title: song.title,
        artist: song.artist,
        growthRate,
        recentVotes
      }
    }).sort((a, b) => b.growthRate - a.growthRate)

    // Calculate controversial songs (close to 50/50 ratio with high volume)
    const controversialData = await prisma.song.findMany({
      select: {
        id: true,
        title: true,
        artist: true,
        likeCount: true,
        dislikeCount: true
      },
      where: {
        AND: [
          { likeCount: { gt: 10 } },
          { dislikeCount: { gt: 10 } }
        ]
      },
      orderBy: {
        likeCount: 'desc'
      },
      take: 20
    })

    const controversial = controversialData.map(song => {
      const totalVotes = song.likeCount + song.dislikeCount
      const ratio = song.likeCount / totalVotes
      // Controversy score: how close to 0.5 the ratio is, weighted by total votes
      const controversy = (1 - Math.abs(ratio - 0.5) * 2) * Math.log(totalVotes)

      return {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        ratio,
        totalVotes,
        controversy
      }
    }).sort((a, b) => b.controversy - a.controversy)

    // Cache trending song IDs for quick access
    await setCachedTrendingSongs(trending.slice(0, 10).map(s => s.songId))

    return {
      trending: trending.slice(0, 10),
      rising: rising.slice(0, 10),
      controversial: controversial.slice(0, 10)
    }

  } catch (error) {
    console.error('Error getting trending analytics:', error)
    throw new Error('Failed to fetch trending analytics')
  }
}

// Helper function to get time filter for queries
function getTimeFilter(timeRange: '24h' | '7d' | '30d' | 'all') {
  switch (timeRange) {
    case '24h':
      return {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    case '7d':
      return {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    case '30d':
      return {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    case 'all':
    default:
      return {}
  }
}

// Export analytics data to CSV
export async function exportAnalyticsToCSV(timeRange: '24h' | '7d' | '30d' | 'all' = '7d'): Promise<string> {
  try {
    const analytics = await getVoteAnalytics(timeRange)
    
    const csvRows = [
      'Song ID,Title,Artist,Like Count,Dislike Count,Total Votes,Ratio',
      ...analytics.topSongs.map(song => 
        `${song.songId},"${song.title}","${song.artist}",${song.likeCount},${song.dislikeCount},${song.likeCount + song.dislikeCount},${song.ratio.toFixed(3)}`
      )
    ]
    
    return csvRows.join('\n')
  } catch (error) {
    console.error('Error exporting analytics to CSV:', error)
    throw new Error('Failed to export analytics')
  }
}