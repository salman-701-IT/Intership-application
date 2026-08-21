import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change path — Caddy uses it to route via XTransformPort
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface Presence {
  id: string
  name: string
  role: string
  avatarUrl?: string | null
}

const presence = new Map<string, Presence>() // socket.id -> presence

io.on('connection', (socket) => {
  console.log(`[chat-service] connected: ${socket.id}`)

  socket.on('identify', (data: Presence) => {
    presence.set(socket.id, data)
    socket.data.presence = data
    io.emit('presence', Array.from(presence.values()))
  })

  // Join a conversation room
  socket.on('join:conversation', (conversationId: string) => {
    socket.join(`conv:${conversationId}`)
  })

  socket.on('leave:conversation', (conversationId: string) => {
    socket.leave(`conv:${conversationId}`)
  })

  // Broadcast a chat message to a conversation room
  socket.on('message', (payload: { conversationId: string; senderId: string; senderName: string; senderAvatar?: string | null; content: string; createdAt: string; type?: string }) => {
    io.to(`conv:${payload.conversationId}`).emit('message', payload)
  })

  // Typing indicator
  socket.on('typing', (payload: { conversationId: string; userId: string; name: string; typing: boolean }) => {
    socket.to(`conv:${payload.conversationId}`).emit('typing', payload)
  })

  // Real-time notification fan-out to a user room
  socket.on('join:user', (userId: string) => {
    socket.join(`user:${userId}`)
  })

  socket.on('notify', (payload: { userId: string; notification: any }) => {
    io.to(`user:${payload.userId}`).emit('notification', payload.notification)
  })

  // Kanban task board live updates within a project room
  socket.on('join:project', (projectId: string) => {
    socket.join(`project:${projectId}`)
  })

  socket.on('task:moved', (payload: { projectId: string; taskId: string; status: string; order?: number; userId: string }) => {
    socket.to(`project:${payload.projectId}`).emit('task:moved', payload)
  })

  socket.on('disconnect', () => {
    const p = presence.get(socket.id)
    if (p) {
      presence.delete(socket.id)
      io.emit('presence', Array.from(presence.values()))
      console.log(`[chat-service] ${p.name} left`)
    }
  })

  socket.on('error', (err) => console.error(`[chat-service] socket error:`, err))
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[chat-service] WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
