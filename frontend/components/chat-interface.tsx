"use client"

import type React from "react"
import { authAPI, userAPI, messageAPI, type User, type Message } from "@/lib/api"
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
  const selectedUserRef = useRef<User | null>(null)
  const { toast } = useToast()

  // Sync ref for socket listeners
  useEffect(() => {
    selectedUserRef.current = selectedUser
  }, [selectedUser])

  // Helper to safely format usernames
  const sanitizeUsername = (uname?: string) => {
    if (!uname) return "unknown"
    return uname.includes("@") ? uname.split("@")[0] : uname
  }

  // Helper for ID comparison
  const isSameId = (id1?: string, id2?: string) => id1?.toString() === id2?.toString()

  // Reset state on conversation switch
  useEffect(() => {
    setMessages([])
    setIsTyping(false)
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [selectedUser])

  // Socket connection and event handlers
  useEffect(() => {
    socketService.connect(user?._id)

    const handleNewMessage = (message: any) => {
      const isRelevant = isSameId(message.senderId, user._id) || isSameId(message.receiverId, user._id)
      if (!isRelevant) return

      if (selectedUserRef.current) {
        const currentId = selectedUserRef.current._id
        const belongsToChat =
          (isSameId(message.senderId, user._id) && isSameId(message.receiverId, currentId)) ||
          (isSameId(message.senderId, currentId) && isSameId(message.receiverId, user._id))

        if (!belongsToChat) return
      }

      setMessages((prev) => {
        const tempIndex = prev.findIndex(m =>
          m._id?.toString().startsWith("tmp-") &&
          m.message === message.message &&
          isSameId(m.senderId, message.senderId)
        )

        if (tempIndex !== -1) {
          const copy = [...prev]
          copy[tempIndex] = message
          return copy
        }
        return [...prev, message]
      })
    }

    const handleTypingStatus = (payload: any, isTyping: boolean) => {
      if (selectedUserRef.current && isSameId(payload?.senderId, selectedUserRef.current._id)) {
        setIsTyping(isTyping)
      }
    }

    socketService.onOnlineUsers(setOnlineUsers)
    socketService.onNewMessage(handleNewMessage)
    socketService.onTyping((p) => handleTypingStatus(p, true))
    socketService.onStopTyping((p) => handleTypingStatus(p, false))

    return () => {
      socketService.off("getOnlineUsers")
      socketService.off("newMessage")
      socketService.off("typing")
      socketService.off("stopTyping")
      socketService.disconnect()
    }
  }, [user?._id])

  // Fetch contacts
  useEffect(() => {
    userAPI.getAllUsers()
      .then(setUsers)
      .catch(() => toast({ title: "Failed to load contacts", variant: "destructive" }))
  }, [toast])

  // Fetch messages
  useEffect(() => {
    if (!selectedUser) return
    messageAPI.getMessages(selectedUser._id)
      .then(setMessages)
      .catch(() => toast({ title: "Failed to load messages", variant: "destructive" }))
  }, [selectedUser, toast])

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, 50)
  }, [messages])

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)

    if (!selectedUser || !user?._id) return

    socketService.emitTyping({ receiverId: selectedUser._id, senderId: user._id })

    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)

    typingTimeoutRef.current = window.setTimeout(() => {
      if (selectedUser && user?._id) {
        socketService.emitStopTyping({ receiverId: selectedUser._id, senderId: user._id })
      }
      typingTimeoutRef.current = null
    }, 1500)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser || isLoading) return

    setIsLoading(true)
    const tempId = `tmp-${Date.now()}`
    const messageContent = newMessage

    // Optimistic update
    const optimisticMsg: Message = {
      _id: tempId,
      senderId: user._id,
      receiverId: selectedUser._id,
      message: messageContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      read: false
    }

    setMessages(prev => [...prev, optimisticMsg])
    setNewMessage("")

    try {
      const sentMessage = await messageAPI.sendMessage(selectedUser._id, messageContent)
      setMessages(prev => prev.map(msg => msg._id === tempId ? sentMessage : msg))
      socketService.emitStopTyping({ receiverId: selectedUser._id, senderId: user._id })
    } catch (error: any) {
      setMessages(prev => prev.filter(msg => msg._id !== tempId))
      toast({ title: "Failed to send", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } finally {
      socketService.disconnect()
      onLogout()
    }
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden relative">
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-full md:w-80 fixed md:relative inset-y-0 left-0 z-50
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 border-r border-border bg-background/95 backdrop-blur-sm 
        transition-all duration-300 overflow-hidden
      `}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-accent cyber-text" />
              <h2 className="text-xl font-bold cyber-text">LYNKCHAT</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
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
              <p className="font-medium truncate">{user?.fullName || "Unknown"}</p>
              <p className="text-sm text-muted-foreground">@{sanitizeUsername(user?.username)}</p>
            </div>
            <Lock className="h-4 w-4 text-accent" />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-accent" />
            <h3 className="font-semibold">Contacts</h3>
            <Badge variant="secondary" className="ml-auto">{users.length}</Badge>
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
                  className={`flex items-center gap-3 p-3 py-4 rounded-lg cursor-pointer transition-all hover:bg-muted/50 
                    ${selectedUser?._id === contact._id ? "bg-accent/20 cyber-border" : ""}`}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {contact?.fullName?.charAt(0)?.toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers.includes(contact._id) && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-accent rounded-full border-2 border-background cyber-glow" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact?.fullName || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">@{sanitizeUsername(contact?.username)}</p>
                  </div>
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
            <div className="p-4 border-b border-border bg-card/30 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="md:hidden p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Back"
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
                  {isTyping && <p className="text-xs text-accent mt-1">typing...</p>}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 px-3 md:px-6 py-4">
              <div className="flex justify-center">
                <div className="w-full max-w-3xl space-y-6">
                  {messages.map((message) => {
                    const isMe = message.senderId === user?._id
                    return (
                      <div key={message._id} className={`flex items-end px-6 w-full ${isMe ? "justify-end" : "justify-start"}`}>
                        {!isMe && (
                          <div className="mr-2 flex-shrink-0">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-secondary text-secondary-foreground">
                                {selectedUser?.fullName?.charAt(0)?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                        <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[60%] lg:max-w-md px-4 py-2 rounded-lg 
                          ${isMe ? "bg-accent text-accent-foreground message-glow" : "bg-muted text-muted-foreground cyber-border"}`}>
                          <p className="text-sm">{message.message}</p>
                          <p className="text-xs opacity-70 mt-1">{new Date(message.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-card/30 backdrop-blur-sm">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Input
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="w-full h-10 sm:h-14 pr-11 sm:pr-14 py-2 sm:py-3 text-sm rounded-full border-2 cyber-border bg-input focus:ring-2 focus:ring-accent transition-all"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
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
