import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { NextApiRequest } from 'next'
import { Socket as NetSocket } from 'net'
import jwt from 'jsonwebtoken'

interface SocketWithIO extends NetSocket {
  server: HTTPServer & {
    io?: SocketIOServer
  }
}

interface NextApiResponseWithSocket extends Response {
  socket: SocketWithIO
}

export interface VoteUpdatePayload {
  songId: string
  likeCount: number
  dislikeCount: number
  userVote?: 'like' | 'dislike' | null
}

export interface DislikeFeedbackPayload {
  songId: string
  userId: string
  feedback: string
  timestamp: string
}

let io: SocketIOServer | null = null

export function initializeWebSocket(server: HTTPServer): SocketIOServer {
  if (io) {
    return io
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('Authentication error'))
      }

      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any
      socket.data.userId = decoded.sub
      socket.data.user = decoded
      next()
    } catch (err) {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`User ${socket.data.userId} connected to WebSocket`)

    // Join user to their personal room for targeted updates
    socket.join(`user:${socket.data.userId}`)

    // Join general voting updates room
    socket.join('voting-updates')

    // Handle admin users joining admin room
    if (socket.data.user?.id === '416034191369830402') {
      socket.join('admin')
      console.log('Admin user joined admin room')
    }

    socket.on('disconnect', () => {
      console.log(`User ${socket.data.userId} disconnected from WebSocket`)
    })

    // Handle vote events
    socket.on('vote', (data) => {
      console.log(`Vote event from user ${socket.data.userId}:`, data)
    })
  })

  return io
}

export function getWebSocketServer(): SocketIOServer | null {
  return io
}

// Broadcast vote update to all connected clients
export function broadcastVoteUpdate(payload: VoteUpdatePayload) {
  if (!io) return

  io.to('voting-updates').emit('vote-update', payload)
  console.log('Broadcasted vote update:', payload)
}

// Send targeted vote update to specific user
export function sendUserVoteUpdate(userId: string, payload: VoteUpdatePayload) {
  if (!io) return

  io.to(`user:${userId}`).emit('vote-update', payload)
  console.log(`Sent vote update to user ${userId}:`, payload)
}

// Send dislike feedback to admin
export function sendDislikeFeedbackToAdmin(payload: DislikeFeedbackPayload) {
  if (!io) return

  io.to('admin').emit('dislike-feedback', payload)
  console.log('Sent dislike feedback to admin:', payload)
}

// Initialize WebSocket in API route
export function initWebSocketInApiRoute(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    console.log('Initializing WebSocket server...')
    const io = initializeWebSocket(res.socket.server)
    res.socket.server.io = io
  }
  return res.socket.server.io
}