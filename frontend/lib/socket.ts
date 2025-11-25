import { io, type Socket } from "socket.io-client"

const SOCKET_URL = "http://localhost:5000"

export interface SocketMessage {
  senderId: string
  receiverId: string
  message: string
  createdAt: string
}

class SocketService {
  private socket: Socket | null = null
  private static instance: SocketService

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  connect(userId: string): void {
    if (this.socket?.connected) {
      return
    }

    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    })

    this.socket.on("connect", () => {
      // Join user to their room
      this.socket?.emit("join", userId)
    })

    this.socket.on("disconnect", () => {
    })

    this.socket.on("connect_error", (error) => {
      // Connection errors are intentionally not logged to console to reduce noise
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Listen for new messages
  onNewMessage(callback: (message: SocketMessage) => void): void {
    this.socket?.on("newMessage", callback)
  }

  // Listen for typing events
  onTyping(callback: (payload: { senderId: string }) => void): void {
    this.socket?.on("typing", callback)
  }

  onStopTyping(callback: (payload: { senderId: string }) => void): void {
    this.socket?.on("stopTyping", callback)
  }

  // Listen for online users
  onOnlineUsers(callback: (users: string[]) => void): void {
    this.socket?.on("getOnlineUsers", callback)
  }

  // Listen for message updates (edits)
  onMessageUpdated(callback: (message: any) => void): void {
    this.socket?.on("messageUpdated", callback)
  }

  // Listen for unread counts updates
  onUnreadCounts(callback: (counts: Record<string, number>) => void): void {
    this.socket?.on("unreadCounts", callback)
  }

  // Listen for message read events (message id)
  onMessageRead(callback: (messageId: string) => void): void {
    this.socket?.on("messageRead", callback)
  }

  // Send a message through socket
  sendMessage(message: SocketMessage): void {
    this.socket?.emit("sendMessage", message)
  }

  // Emit typing / stopTyping events
  emitTyping(payload: { receiverId: string; senderId?: string }): void {
    this.socket?.emit("typing", payload)
  }

  emitStopTyping(payload: { receiverId: string; senderId?: string }): void {
    this.socket?.emit("stopTyping", payload)
  }

  // Mark a message as read (notify server)
  markMessageAsRead(messageId: string): void {
    this.socket?.emit("markMessageAsRead", messageId)
  }

  // Remove listeners
  off(event: string): void {
    this.socket?.off(event)
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

export const socketService = SocketService.getInstance()
