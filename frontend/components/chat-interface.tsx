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
import { Send, Shield, LogOut, Users, Lock, ArrowLeft } from "lucide-react"
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true)
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

  // Helper function for robust ID comparison (handles string vs ObjectId)
  const isSameId = (id1?: string, id2?: string): boolean => {
    if (!id1 || !id2) return false
    return id1.toString() === id2.toString()
  }
  useEffect(() => {
    // Clear messages and typing indicator when switching conversations
    setMessages([])
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
      // Filter Level 1: Message must be relevant to current user
      const isRelevantToUser =
        isSameId(message.senderId, user._id) ||
        isSameId(message.receiverId, user._id)
      if (!isRelevantToUser) return

      // Filter Level 2: Message must belong to current conversation
      if (selectedUserRef.current) {
        const belongsToConversation =
          (isSameId(message.senderId, user._id) && isSameId(message.receiverId, selectedUserRef.current._id)) ||
          (isSameId(message.senderId, selectedUserRef.current._id) && isSameId(message.receiverId, user._id))

        if (!belongsToConversation) return
      }

      setMessages((prev) => {
        const tempIndex = prev.findIndex(
          (m) => m._id?.toString().startsWith("tmp-") && m.message === message.message && isSameId(m.senderId, message.senderId)
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
      if (selectedUserRef.current && isSameId(payload?.senderId, selectedUserRef.current._id)) {
        setIsTyping(true)
      }
    }

    const handleStopTyping = (payload: any) => {
      if (selectedUserRef.current && isSameId(payload?.senderId, selectedUserRef.current._id)) {
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
        // Error intentionally not logged to reduce noisy dev output
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
          // Error intentionally not logged to reduce noisy dev output
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
      const messageToSend = newMessage
      const tempId = `tmp-${Date.now()}`

      // Optimistically add message to UI
      const optimisticMessage: Message = {
        _id: tempId,
        senderId: user?._id || "",
        receiverId: selectedUser._id,
        message: messageToSend,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        read: false
      }

      if (selectedUser) {
        setMessages((prev) => [...prev, optimisticMessage])
      }

      setNewMessage("")

      // Send via API (CRUD) - this will persist to DB and trigger socket event for receiver
      const sentMessage = await messageAPI.sendMessage(selectedUser._id, messageToSend)

      // Replace optimistic message with real message
      setMessages((prev) =>
        prev.map(msg => msg._id === tempId ? sentMessage : msg)
      )

      // Stop typing when message is sent
      if (selectedUser && user?._id) {
        socketService.emitStopTyping({ receiverId: selectedUser._id, senderId: user._id })
      }

    } catch (error: any) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(msg => !msg._id?.startsWith("tmp-")))

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
      // Error intentionally not logged to reduce noisy dev output
    } finally {
      socketService.disconnect()
      onLogout()
    }
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden relative">
      {/* Mobile backdrop overlay */}
      {isMobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {/* Sidebar */}
      <div className={`
        w-full md:w-80
        fixed md:relative inset-y-0 left-0 z-50
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        border-r border-border bg-background/95 backdrop-blur-sm 
        transition-all duration-300 
        overflow-hidden
      `}>

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
                  onClick={() => {
                    setSelectedUser(contact)
                    setIsMobileSidebarOpen(false)
                  }}
                  className={`flex items-center gap-3 p-3 md:p-3 py-4 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${selectedUser?._id === contact._id ? "bg-accent/20 cyber-border" : ""
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
                {/* Back button for mobile */}
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="md:hidden p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Back to contacts"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
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
            <ScrollArea className="flex-1 px-3 md:px-6 py-4">
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
                            className={`max-w-[85%] sm:max-w-[75%] md:max-w-[60%] lg:max-w-md px-4 py-2 rounded-lg ${isMe
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
                    className="w-full h-10 sm:h-14 pr-11 sm:pr-14 py-2 sm:py-3 text-sm rounded-full border-2 cyber-border bg-input focus:ring-2 focus:ring-accent transition-all"
                    disabled={isLoading}
                  />

                  <Button
                    type="submit"
                    aria-label="Send message"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full cyber-glow bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-105 transition-transform shadow-lg"
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
