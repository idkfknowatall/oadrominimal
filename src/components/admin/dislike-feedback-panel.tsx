"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useVotingWebSocket } from '@/hooks/use-websocket'
import { formatDistanceToNow } from 'date-fns'

interface DislikeFeedback {
  id: string
  songId: string
  songTitle: string
  songArtist: string
  userId: string
  username: string
  feedback: string
  category: string
  timestamp: string
  status: 'pending' | 'reviewed' | 'resolved'
  adminNotes?: string
}

interface DislikeFeedbackPanelProps {
  isAdmin: boolean
}

export function DislikeFeedbackPanel({ isAdmin }: DislikeFeedbackPanelProps) {
  const [feedbackList, setFeedbackList] = useState<DislikeFeedback[]>([])
  const [selectedFeedback, setSelectedFeedback] = useState<DislikeFeedback | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('pending')
  const [loading, setLoading] = useState(true)

  const { dislikeFeedback, isConnected } = useVotingWebSocket()

  // Load feedback from API
  useEffect(() => {
    if (!isAdmin) return

    const loadFeedback = async () => {
      try {
        const response = await fetch('/api/admin/dislike-feedback')
        if (response.ok) {
          const data = await response.json()
          setFeedbackList(data.feedback)
        }
      } catch (error) {
        console.error('Failed to load dislike feedback:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFeedback()
  }, [isAdmin])

  // Handle real-time feedback updates
  useEffect(() => {
    if (dislikeFeedback.length > 0) {
      const latestFeedback = dislikeFeedback[0]
      // Add new feedback to the list
      setFeedbackList(prev => {
        const exists = prev.find(f => f.id === latestFeedback.songId + latestFeedback.userId)
        if (!exists) {
          return [{
            id: latestFeedback.songId + latestFeedback.userId,
            songId: latestFeedback.songId,
            songTitle: 'Unknown Song', // Would be fetched from API
            songArtist: 'Unknown Artist',
            userId: latestFeedback.userId,
            username: 'Unknown User', // Would be fetched from API
            feedback: latestFeedback.feedback,
            category: 'general',
            timestamp: latestFeedback.timestamp,
            status: 'pending'
          }, ...prev]
        }
        return prev
      })
    }
  }, [dislikeFeedback])

  const filteredFeedback = feedbackList.filter(feedback => {
    if (filter === 'all') return true
    return feedback.status === filter
  })

  const updateFeedbackStatus = async (feedbackId: string, status: 'reviewed' | 'resolved', notes?: string) => {
    try {
      const response = await fetch(`/api/admin/dislike-feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, adminNotes: notes })
      })

      if (response.ok) {
        setFeedbackList(prev => prev.map(feedback => 
          feedback.id === feedbackId 
            ? { ...feedback, status, adminNotes: notes }
            : feedback
        ))
        setSelectedFeedback(null)
        setAdminNotes('')
      }
    } catch (error) {
      console.error('Failed to update feedback status:', error)
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You don't have permission to view this panel.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>Loading dislike feedback...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Dislike Feedback Management
            <div className="flex items-center space-x-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              <Badge variant="secondary">
                {filteredFeedback.length} items
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Review and manage user feedback for disliked songs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter buttons */}
          <div className="flex space-x-2 mb-4">
            {(['all', 'pending', 'reviewed', 'resolved'] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && (
                  <Badge variant="secondary" className="ml-2">
                    {feedbackList.filter(f => f.status === status).length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Feedback list */}
          <div className="space-y-4">
            {filteredFeedback.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No feedback found for the selected filter.
              </p>
            ) : (
              filteredFeedback.map((feedback) => (
                <Card key={feedback.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedFeedback(feedback)}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div>
                          <h4 className="font-semibold">{feedback.songTitle}</h4>
                          <p className="text-sm text-muted-foreground">by {feedback.songArtist}</p>
                        </div>
                        <p className="text-sm">{feedback.feedback}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>by {feedback.username}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(feedback.timestamp), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge variant={
                          feedback.status === 'pending' ? 'destructive' :
                          feedback.status === 'reviewed' ? 'default' : 'secondary'
                        }>
                          {feedback.status}
                        </Badge>
                        <Badge variant="outline">{feedback.category}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback detail modal */}
      {selectedFeedback && (
        <Card>
          <CardHeader>
            <CardTitle>Review Feedback</CardTitle>
            <CardDescription>
              {selectedFeedback.songTitle} by {selectedFeedback.songArtist}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>User Feedback</Label>
              <p className="mt-1 p-3 bg-muted rounded-md">{selectedFeedback.feedback}</p>
            </div>

            <div>
              <Label>Category</Label>
              <Badge variant="outline" className="mt-1">{selectedFeedback.category}</Badge>
            </div>

            <div>
              <Label>Submitted by</Label>
              <p className="mt-1 text-sm">{selectedFeedback.username} ({selectedFeedback.userId})</p>
            </div>

            <div>
              <Label>Timestamp</Label>
              <p className="mt-1 text-sm">{new Date(selectedFeedback.timestamp).toLocaleString()}</p>
            </div>

            {selectedFeedback.adminNotes && (
              <div>
                <Label>Previous Admin Notes</Label>
                <p className="mt-1 p-3 bg-muted rounded-md text-sm">{selectedFeedback.adminNotes}</p>
              </div>
            )}

            <div>
              <Label htmlFor="admin-notes">Admin Notes</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add notes about this feedback..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => updateFeedbackStatus(selectedFeedback.id, 'reviewed', adminNotes)}
                disabled={selectedFeedback.status === 'reviewed'}
              >
                Mark as Reviewed
              </Button>
              <Button
                onClick={() => updateFeedbackStatus(selectedFeedback.id, 'resolved', adminNotes)}
                disabled={selectedFeedback.status === 'resolved'}
                variant="outline"
              >
                Mark as Resolved
              </Button>
              <Button
                onClick={() => {
                  setSelectedFeedback(null)
                  setAdminNotes('')
                }}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}