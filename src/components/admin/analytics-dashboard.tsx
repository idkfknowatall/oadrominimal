"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VoteAnalytics, SongAnalytics, TrendingAnalytics } from '@/lib/vote-analytics'
import { formatDistanceToNow } from 'date-fns'

interface AnalyticsDashboardProps {
  isAdmin: boolean
}

export function AnalyticsDashboard({ isAdmin }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<VoteAnalytics | null>(null)
  const [trending, setTrending] = useState<TrendingAnalytics | null>(null)
  const [selectedSong, setSelectedSong] = useState<SongAnalytics | null>(null)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load analytics data
  useEffect(() => {
    if (!isAdmin) return

    const loadAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        const [analyticsResponse, trendingResponse] = await Promise.all([
          fetch(`/api/admin/analytics?timeRange=${timeRange}`),
          fetch('/api/admin/analytics/trending')
        ])

        if (analyticsResponse.ok && trendingResponse.ok) {
          const analyticsData = await analyticsResponse.json()
          const trendingData = await trendingResponse.json()
          
          setAnalytics(analyticsData)
          setTrending(trendingData)
        } else {
          setError('Failed to load analytics data')
        }
      } catch (error) {
        console.error('Error loading analytics:', error)
        setError('Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [isAdmin, timeRange])

  const loadSongAnalytics = async (songId: string) => {
    try {
      const response = await fetch(`/api/admin/analytics/songs/${songId}?timeRange=${timeRange}`)
      if (response.ok) {
        const songData = await response.json()
        setSelectedSong(songData)
      }
    } catch (error) {
      console.error('Error loading song analytics:', error)
    }
  }

  const exportAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics/export?timeRange=${timeRange}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vote-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting analytics:', error)
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You don't have permission to view this dashboard.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Analytics...</CardTitle>
          <CardDescription>Please wait while we load the analytics data.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Voting patterns and song performance metrics</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportAnalytics} variant="outline">
            Export CSV
          </Button>
          <div className="flex space-x-1">
            {(['24h', '7d', '30d', 'all'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalVotes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.totalLikes.toLocaleString()} likes, {analytics.totalDislikes.toLocaleString()} dislikes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(analytics.averageRating * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Like ratio across all songs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.userEngagement.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.userEngagement.averageVotesPerUser.toFixed(1)} votes per user
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top Songs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.topSongs.length}</div>
              <p className="text-xs text-muted-foreground">
                Songs with votes in this period
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="songs">Top Songs</TabsTrigger>
          <TabsTrigger value="users">User Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Vote activity in the last 24 hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.recentActivity.slice(0, 10).map((activity, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Badge variant={activity.voteType === 'like' ? 'default' : 'destructive'}>
                            {activity.voteType}
                          </Badge>
                          <span>{activity.count} votes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Voters */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Voters</CardTitle>
                  <CardDescription>Most active users in this period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.userEngagement.topVoters.slice(0, 10).map((voter, index) => (
                      <div key={voter.userId} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">#{index + 1}</span>
                          <span className="text-sm">{voter.username}</span>
                        </div>
                        <Badge variant="secondary">{voter.voteCount} votes</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          {trending && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trending Songs */}
              <Card>
                <CardHeader>
                  <CardTitle>Trending</CardTitle>
                  <CardDescription>Songs with high recent activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trending.trending.map((song, index) => (
                      <div 
                        key={song.songId} 
                        className="cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => loadSongAnalytics(song.songId)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{song.title}</p>
                            <p className="text-xs text-muted-foreground">{song.artist}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="default">#{index + 1}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {song.recentVotes} recent votes
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Rising Songs */}
              <Card>
                <CardHeader>
                  <CardTitle>Rising</CardTitle>
                  <CardDescription>Songs with high growth rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trending.rising.map((song, index) => (
                      <div 
                        key={song.songId} 
                        className="cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => loadSongAnalytics(song.songId)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{song.title}</p>
                            <p className="text-xs text-muted-foreground">{song.artist}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary">+{(song.growthRate * 100).toFixed(0)}%</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {song.recentVotes} votes
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Controversial Songs */}
              <Card>
                <CardHeader>
                  <CardTitle>Controversial</CardTitle>
                  <CardDescription>Songs with mixed reactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trending.controversial.map((song, index) => (
                      <div 
                        key={song.songId} 
                        className="cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => loadSongAnalytics(song.songId)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{song.title}</p>
                            <p className="text-xs text-muted-foreground">{song.artist}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">{(song.ratio * 100).toFixed(0)}%</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {song.totalVotes} total votes
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="songs" className="space-y-4">
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Songs</CardTitle>
                <CardDescription>Songs ranked by like count and ratio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topSongs.map((song, index) => (
                    <div 
                      key={song.songId} 
                      className="flex justify-between items-center p-3 border rounded cursor-pointer hover:bg-muted/50"
                      onClick={() => loadSongAnalytics(song.songId)}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-lg">#{index + 1}</span>
                        <div>
                          <p className="font-medium">{song.title}</p>
                          <p className="text-sm text-muted-foreground">{song.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className="text-sm font-medium text-green-600">{song.likeCount}</p>
                          <p className="text-xs text-muted-foreground">likes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-red-600">{song.dislikeCount}</p>
                          <p className="text-xs text-muted-foreground">dislikes</p>
                        </div>
                        <Badge variant={song.ratio > 0.7 ? 'default' : song.ratio > 0.5 ? 'secondary' : 'destructive'}>
                          {(song.ratio * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement Stats</CardTitle>
                  <CardDescription>Overview of user voting behavior</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Active Users:</span>
                    <span className="font-medium">{analytics.userEngagement.activeUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Votes per User:</span>
                    <span className="font-medium">{analytics.userEngagement.averageVotesPerUser.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Votes:</span>
                    <span className="font-medium">{analytics.totalVotes}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Contributors</CardTitle>
                  <CardDescription>Users with the most votes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.userEngagement.topVoters.map((voter, index) => (
                      <div key={voter.userId} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="text-sm">{voter.username}</span>
                        </div>
                        <span className="text-sm font-medium">{voter.voteCount} votes</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Song Detail Modal */}
      {selectedSong && (
        <Card>
          <CardHeader>
            <CardTitle>Song Analytics: {selectedSong.title}</CardTitle>
            <CardDescription>by {selectedSong.artist}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{selectedSong.likeCount}</p>
                <p className="text-sm text-muted-foreground">Likes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{selectedSong.dislikeCount}</p>
                <p className="text-sm text-muted-foreground">Dislikes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{selectedSong.totalVotes}</p>
                <p className="text-sm text-muted-foreground">Total Votes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{(selectedSong.ratio * 100).toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Like Ratio</p>
              </div>
            </div>

            {selectedSong.topFeedbackCategories.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Dislike Feedback Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedSong.topFeedbackCategories.map((category) => (
                    <Badge key={category.category} variant="outline">
                      {category.category}: {category.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => setSelectedSong(null)} variant="outline">
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}