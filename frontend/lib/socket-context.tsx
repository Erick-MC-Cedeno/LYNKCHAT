"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { io, type Socket } from "socket.io-client"
import { useAuth } from "./auth-context"
import type { Message } from "./api"

interface SocketContextType {
  socket: Socket | null
  onlineUsers: string[]
  sendMessage: (receiverId: string, message: string) => void
  joinChat: (userId: string) => void
  leaveChat: (userId: string) => void
  startTyping: (receiverId: string) => void
  stopTyping: (receiverId: string) => void
  typingUsers: Record<string, boolean>
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      // Connect to socket when user is authenticated
      const newSocket = io("http://localhost:3000", {
        query: {
          userId: user._id,
        },
      })

      newSocket.on("connect", () => {
        console.log("[v0] Connected to socket server")
      })

      newSocket.on("getOnlineUsers", (users: string[]) => {
        setOnlineUsers(users)
      })

      newSocket.on("newMessage", (message: Message) => {
        // This will be handled by individual chat components
        window.dispatchEvent(
          new CustomEvent("newMessage", {
            detail: message,
          }),
        )
      })

      newSocket.on("typing", ({ senderId }: { senderId: string }) => {
        setTypingUsers((prev) => ({ ...prev, [senderId]: true }))
      })

      newSocket.on("stopTyping", ({ senderId }: { senderId: string }) => {
        setTypingUsers((prev) => ({ ...prev, [senderId]: false }))
      })

      newSocket.on("disconnect", () => {
        console.log("[v0] Disconnected from socket server")
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    } else {
      // Disconnect socket when user logs out
      if (socket) {
        socket.close()
        setSocket(null)
        setOnlineUsers([])
        setTypingUsers({})
      }
    }
  }, [user])

  const sendMessage = (receiverId: string, message: string) => {
    if (socket) {
      socket.emit("sendMessage", { receiverId, message })
    }
  }

  const joinChat = (userId: string) => {
    if (socket) {
      socket.emit("joinChat", userId)
    }
  }

  const leaveChat = (userId: string) => {
    if (socket) {
      socket.emit("leaveChat", userId)
    }
  }

  const startTyping = (receiverId: string) => {
    if (socket) {
      socket.emit("typing", { receiverId })
    }
  }

  const stopTyping = (receiverId: string) => {
    if (socket) {
      socket.emit("stopTyping", { receiverId })
    }
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        sendMessage,
        joinChat,
        leaveChat,
        startTyping,
        stopTyping,
        typingUsers,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return context
}
