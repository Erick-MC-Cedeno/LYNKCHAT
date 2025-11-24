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
      console.log("[v0] Socket connected")
      // Join user to their room
      this.socket?.emit("join", userId)
    })

    this.socket.on("disconnect", () => {
      console.log("[v0] Socket disconnected")
    })

    this.socket.on("connect_error", (error) => {
      console.error("[v0] Socket connection error:", error)
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

  // Listen for online users
  onOnlineUsers(callback: (users: string[]) => void): void {
    this.socket?.on("getOnlineUsers", callback)
  }

  // Send a message through socket
  sendMessage(message: SocketMessage): void {
    this.socket?.emit("sendMessage", message)
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
