"use client"

import type React from "react"
import { authAPI, userAPI, messageAPI, type User, type Message } from "@/lib/api" // Fixed import to use correct file path for authAPI
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Send, Shield, LogOut, Users, Lock } from "lucide-react"
import { socketService } from "@/lib/socket"

interface ChatInterfaceProps {
  user: User
  onLogout: () => void
}

export function ChatInterface({ user, onLogout }: ChatInterfaceProps) {
  // Encryption removed: messages are plain text strings

  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<number | null>(null)
  const { toast } = useToast()
  const selectedUserRef = useRef<User | null>(null)

  // Keep ref in sync with selectedUser so listeners can read the latest value
  useEffect(() => {
    selectedUserRef.current = selectedUser
  }, [selectedUser])
  const sanitizeUsername = (uname?: string) => {
    if (!uname) return "unknown"
    try {
      return uname.includes("@") ? uname.split("@")[0] : uname
    } catch (e) {
      return uname
    }
  }
  useEffect(() => {
    // clear typing indicator and any pending timeout when switching conversations
    setIsTyping(false)
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [selectedUser])

  // Establish socket connection and listeners once per logged-in user
  useEffect(() => {
    socketService.connect(user?._id)

    const handleOnline = (users: string[]) => setOnlineUsers(users)
    const handleNewMessage = (message: any) => {
      setMessages((prev) => {
        const tempIndex = prev.findIndex(
          (m) => m._id?.toString().startsWith("tmp-") && m.message === message.message && m.senderId === message.senderId
        )

        if (tempIndex !== -1) {
          const copy = [...prev]
          copy[tempIndex] = message
          return copy
        }

        return [...prev, message]
      })
    }

    const handleTyping = (payload: any) => {
      if (selectedUserRef.current && payload?.senderId === selectedUserRef.current._id) {
        setIsTyping(true)
      }
    }

    const handleStopTyping = (payload: any) => {
      if (selectedUserRef.current && payload?.senderId === selectedUserRef.current._id) {
        setIsTyping(false)
      }
    }

    socketService.onOnlineUsers(handleOnline)
    socketService.onNewMessage(handleNewMessage)
    socketService.onTyping(handleTyping)
    socketService.onStopTyping(handleStopTyping)

    return () => {
      socketService.off("getOnlineUsers")
      socketService.off("newMessage")
      socketService.off("typing")
      socketService.off("stopTyping")
      socketService.disconnect()
    }
  }, [user?._id])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersData = await userAPI.getAllUsers()
        setUsers(usersData)
      } catch (error) {
        console.error("[v0] Failed to fetch users:", error)
        toast({
          title: "Failed to load contacts",
          description: "Please refresh the page.",
          variant: "destructive",
        })
      }
    }

    fetchUsers()
  }, [toast])

  useEffect(() => {
    if (selectedUser) {
      const fetchMessages = async () => {
        try {
          const messagesData = await messageAPI.getMessages(selectedUser._id)

          // Messages are plain text — store as received
          setMessages(messagesData)
        } catch (error) {
          console.error("[v0] Failed to fetch messages:", error)
          toast({
            title: "Failed to load messages",
            description: "Please try again.",
            variant: "destructive",
          })
        }
      }

      fetchMessages()
    }
  }, [selectedUser, user?._id, toast])

  // Scroll to bottom when messages change
  useEffect(() => {
    // Delay scrolling slightly to ensure ScrollArea viewport has rendered
    const scrollToBottom = () => {
      try {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
      } catch (e) {
        // ignore
      }
    }

    const id = window.setTimeout(scrollToBottom, 50)
    return () => window.clearTimeout(id)
  }, [messages, selectedUser?._id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser || isLoading) return

    setIsLoading(true)
    try {
      let messageToSend = newMessage

      // Send plaintext message (E2E removed)
      messageToSend = newMessage
      // Send via socket for real-time delivery. Server should persist and broadcast.
      const socketPayload = {
        senderId: user?._id || "",
        receiverId: selectedUser._id,
        message: messageToSend,
        createdAt: new Date().toISOString(),
      }

      // Emit through socket
      socketService.sendMessage(socketPayload)

      // Stop typing when message is sent
      if (selectedUser && user?._id) {
        socketService.emitStopTyping({ receiverId: selectedUser._id, senderId: user._id })
      }

      // Optimistically add message to UI
      setMessages((prev) => [
        ...prev,
        {
          _id: `tmp-${Date.now()}`,
          senderId: socketPayload.senderId,
          receiverId: socketPayload.receiverId,
          message: socketPayload.message,
          createdAt: socketPayload.createdAt,
        } as Message,
      ])
      setNewMessage("")
    } catch (error: any) {
      console.error("[v0] Failed to send message:", error)
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error("[v0] Logout error:", error)
    } finally {
      socketService.disconnect()
      onLogout()
    }
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card/30 backdrop-blur-sm">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-accent cyber-text" />
              <h2 className="text-xl font-bold cyber-text">LYNKCHAT</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cyber-border">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-accent text-accent-foreground">
                {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.fullName || "Unknown User"}</p>
              <p className="text-sm text-muted-foreground">@{sanitizeUsername(user?.username)}</p>
            </div>
            <Lock className="h-4 w-4 text-accent" />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-accent" />
            <h3 className="font-semibold">Contacts</h3>
            <Badge variant="secondary" className="ml-auto">
              {users.length}
            </Badge>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-2">
              {users.map((contact) => (
                <div
                  key={contact._id}
                  onClick={() => setSelectedUser(contact)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                    selectedUser?._id === contact._id ? "bg-accent/20 cyber-border" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {contact?.fullName?.charAt(0)?.toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers.includes(contact._id) && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-accent rounded-full border-2 border-background cyber-glow"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact?.fullName || "Unknown Contact"}</p>
                    <p className="text-sm text-muted-foreground">@{sanitizeUsername(contact?.username)}</p>
                  </div>
                    {/* publicKey removed — encryption disabled */}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card/30 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {selectedUser.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedUser.fullName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    @{sanitizeUsername(selectedUser.username)}
                    {onlineUsers.includes(selectedUser._id) && <span className="text-accent">• Online</span>}
                  </p>
                  {isTyping && (
                    <p className="text-xs text-accent mt-1">typing...</p>
                  )}
                </div>
                  {/* Encryption disabled */}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="flex justify-center">
                <div className="w-full max-w-3xl">
                  <div className="space-y-6">
                    {messages.map((message) => {
                  const isMe = message.senderId === user?._id

                  return (
                    <div
                      key={message._id}
                      className={`flex items-end px-6 w-full ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      {/* For incoming messages show contact avatar; outgoing messages have no avatar */}
                      {!isMe && (
                        <div className="mr-2 flex-shrink-0">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-secondary text-secondary-foreground">
                              {selectedUser?.fullName?.charAt(0)?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}

                      <div
                        className={`max-w-[60%] lg:max-w-md px-4 py-2 rounded-lg ${
                          isMe
                            ? "bg-accent text-accent-foreground message-glow"
                            : "bg-muted text-muted-foreground cyber-border"
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        <p className="text-xs opacity-70 mt-1">{new Date(message.createdAt).toLocaleTimeString()}</p>
                      </div>
                      
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card/30 backdrop-blur-sm">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Input
                    value={newMessage}
                    onChange={(e) => {
                      const val = e.target.value
                      setNewMessage(val)

                      // emit typing event to the selected user
                      if (selectedUser && user?._id) {
                        socketService.emitTyping({ receiverId: selectedUser._id, senderId: user._id })

                        // reset stop-typing timeout
                        if (typingTimeoutRef.current) {
                          window.clearTimeout(typingTimeoutRef.current)
                        }
                        typingTimeoutRef.current = window.setTimeout(() => {
                          if (selectedUser && user?._id) {
                            socketService.emitStopTyping({ receiverId: selectedUser._id, senderId: user._id })
                          }
                          typingTimeoutRef.current = null
                        }, 1500)
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full pr-10 cyber-border bg-input"
                    disabled={isLoading}
                  />

                  <Button
                    type="submit"
                    aria-label="Send message"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 cyber-glow bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={isLoading || !newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                <Shield className="h-16 w-16 text-accent mx-auto mb-4 cyber-text" />
                <h3 className="text-xl font-semibold mb-2">Select a Contact</h3>
                <p className="text-muted-foreground">Choose someone to start a conversation</p>
              </div>
          </div>
        )}
      </div>
    </div>
  )
}
