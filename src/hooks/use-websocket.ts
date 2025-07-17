"use client"

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { VoteUpdatePayload, DislikeFeedbackPayload } from '@/lib/websocket-server'

interface UseWebSocketOptions {
  onVoteUpdate?: (payload: VoteUpdatePayload) => void
  onDislikeFeedback?: (payload: DislikeFeedbackPayload) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<any>(null)

  useEffect(() => {
    if (!session?.accessToken) return

    let socket: any = null

    const connectWebSocket = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { io } = await import('socket.io-client')
        
        socket = io(process.env.NEXT_PUBLIC_WS_URL || window.location.origin, {
          auth: {
            token: session.accessToken
          },
          transports: ['websocket', 'polling']
        })

        socketRef.current = socket

        socket.on('connect', () => {
          console.log('Connected to WebSocket')
          setIsConnected(true)
          setError(null)
          options.onConnect?.()
        })

        socket.on('disconnect', () => {
          console.log('Disconnected from WebSocket')
          setIsConnected(false)
          options.onDisconnect?.()
        })

        socket.on('connect_error', (err: Error) => {
          console.error('WebSocket connection error:', err)
          setError(err.message)
          setIsConnected(false)
        })

        socket.on('vote-update', (payload: VoteUpdatePayload) => {
          console.log('Received vote update:', payload)
          options.onVoteUpdate?.(payload)
        })

        socket.on('dislike-feedback', (payload: DislikeFeedbackPayload) => {
          console.log('Received dislike feedback:', payload)
          options.onDislikeFeedback?.(payload)
        })

      } catch (err) {
        console.error('Failed to initialize WebSocket:', err)
        setError('Failed to connect to WebSocket')
      }
    }

    connectWebSocket()

    return () => {
      if (socket) {
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [session?.accessToken, options.onVoteUpdate, options.onDislikeFeedback, options.onConnect, options.onDisconnect])

  const emit = (event: string, data: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data)
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event)
    }
  }

  return {
    isConnected,
    error,
    emit,
    socket: socketRef.current
  }
}

// Hook specifically for voting updates
export function useVotingWebSocket() {
  const [voteUpdates, setVoteUpdates] = useState<VoteUpdatePayload[]>([])
  const [dislikeFeedback, setDislikeFeedback] = useState<DislikeFeedbackPayload[]>([])

  const { isConnected, error, emit } = useWebSocket({
    onVoteUpdate: (payload) => {
      setVoteUpdates(prev => [payload, ...prev.slice(0, 99)]) // Keep last 100 updates
    },
    onDislikeFeedback: (payload) => {
      setDislikeFeedback(prev => [payload, ...prev.slice(0, 99)]) // Keep last 100 feedback
    }
  })

  const sendVote = (songId: string, voteType: 'like' | 'dislike') => {
    emit('vote', { songId, voteType })
  }

  const clearVoteUpdates = () => setVoteUpdates([])
  const clearDislikeFeedback = () => setDislikeFeedback([])

  return {
    isConnected,
    error,
    voteUpdates,
    dislikeFeedback,
    sendVote,
    clearVoteUpdates,
    clearDislikeFeedback
  }
}