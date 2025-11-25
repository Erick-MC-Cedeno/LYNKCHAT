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
import { Send, Shield, LogOut, Users, Lock, ArrowLeft, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>("")
  const [editingViaComposer, setEditingViaComposer] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

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
    socketService.onMessageUpdated((updatedMessage: any) => {
      // Only update if the message belongs to the currently opened conversation
      if (!selectedUserRef.current) return
      const currentId = selectedUserRef.current._id
      const belongsToChat =
        (isSameId(updatedMessage.senderId, user._id) && isSameId(updatedMessage.receiverId, currentId)) ||
        (isSameId(updatedMessage.senderId, currentId) && isSameId(updatedMessage.receiverId, user._id))

      if (!belongsToChat) return

      setMessages(prev => prev.map(m => m._id === updatedMessage._id ? updatedMessage : m))
    })
    socketService.onTyping((p) => handleTypingStatus(p, true))
    socketService.onStopTyping((p) => handleTypingStatus(p, false))

    return () => {
      socketService.off("getOnlineUsers")
      socketService.off("newMessage")
      socketService.off("messageUpdated")
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

    // Only do optimistic update when sending a new message (not when editing)
    const optimisticMsg: Message = {
      _id: tempId,
      senderId: user._id,
      receiverId: selectedUser._id,
      message: messageContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      read: false
    }

    try {
      if (editingMessageId && editingViaComposer) {
        // We're editing an existing message via the composer
        const updated = await messageAPI.updateMessage(editingMessageId, messageContent)
        setMessages(prev => prev.map(m => m._id === updated._id ? updated : m))
        setEditingMessageId(null)
        setEditingViaComposer(false)
        setNewMessage("")
        toast({ title: "Message updated" })
      } else {
        // optimistic append
        setMessages(prev => [...prev, optimisticMsg])
        setNewMessage("")
        const sentMessage = await messageAPI.sendMessage(selectedUser._id, messageContent)
        setMessages(prev => prev.map(msg => msg._id === tempId ? sentMessage : msg))
        socketService.emitStopTyping({ receiverId: selectedUser._id, senderId: user._id })
      }
    } catch (error: any) {
      if (!editingMessageId || !editingViaComposer) {
        setMessages(prev => prev.filter(msg => msg._id !== tempId))
      }
      toast({ title: editingMessageId && editingViaComposer ? "Failed to update" : "Failed to send", description: error.message, variant: "destructive" })
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

  const handleDeleteMessage = async (messageId: string) => {
    if (!messageId) return
    const ok = window.confirm("Delete this message? This cannot be undone.")
    if (!ok) return

    try {
      await messageAPI.deleteMessage(messageId)
      setMessages(prev => prev.filter(m => m._id !== messageId))
      toast({ title: "Message deleted" })
    } catch (error: any) {
      toast({ title: "Failed to delete message", description: error.message || "", variant: "destructive" })
    }
  }

  const handleDeleteConversation = async () => {
    if (!selectedUser) return
    const ok = window.confirm(`Delete conversation with ${selectedUser.fullName}? This will remove all messages.`)
    if (!ok) return

    try {
      await messageAPI.deleteConversation(selectedUser._id)
      setMessages([])
      setSelectedUser(null)
      toast({ title: "Conversation deleted" })
    } catch (error: any) {
      toast({ title: "Failed to delete conversation", description: error.message || "", variant: "destructive" })
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
                  className={`flex items-center gap-3 p-3 py-4 rounded-lg transition-all hover:bg-muted/50 relative ${
                    selectedUser?._id === contact._id ? "bg-accent/20 cyber-border" : ""
                  }`}
                >
                  <div
                    onClick={() => {
                      setSelectedUser(contact)
                      setIsMobileSidebarOpen(false)
                    }}
                    className="flex items-center flex-1 gap-3 cursor-pointer"
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

                  {/* Contact actions: three-dots menu to delete conversation */}
                  <div className="ml-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-full hover:bg-muted transition-colors" aria-label={`Contact menu ${contact.fullName}`}>
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={async () => {
                            const ok = window.confirm(
                              `Delete conversation with ${contact.fullName}? This will remove all messages.`,
                            )
                            if (!ok) return

                            try {
                              await messageAPI.deleteConversation(contact._id)
                              // If currently viewing this conversation, clear it
                              if (selectedUser?._id === contact._id) {
                                setSelectedUser(null)
                                setMessages([])
                              }
                              toast({ title: "Conversation deleted" })
                            } catch (err: any) {
                              toast({ title: "Failed to delete conversation", description: err?.message || "", variant: "destructive" })
                            }
                          }}
                        >
                          Delete conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

            <ScrollArea className="flex-1 px-3 md:px-6 pt-8 md:pt-12 pb-4">
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
                        <div className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[60%] lg:max-w-md px-4 py-2 rounded-lg 
                          ${isMe ? "bg-accent text-accent-foreground message-glow" : "bg-muted text-muted-foreground cyber-border"}`}>
                          {editingMessageId === message._id && !editingViaComposer ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="bg-transparent border border-border text-sm p-2"
                              />
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={async () => {
                                    const newText = editingText.trim()
                                    if (!newText) return toast({ title: "Message cannot be empty", variant: "destructive" })
                                    // optimistic update
                                    setMessages(prev => prev.map(m => m._id === message._id ? { ...m, message: newText, updatedAt: new Date().toISOString() } : m))
                                    setEditingMessageId(null)
                                    try {
                                      const updated = await messageAPI.updateMessage(message._id, newText)
                                      setMessages(prev => prev.map(m => m._id === updated._id ? updated : m))
                                      toast({ title: "Message updated" })
                                    } catch (err: any) {
                                      toast({ title: "Failed to update", description: err?.message || "", variant: "destructive" })
                                    }
                                  }}
                                >
                                  Save
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingMessageId(null); setEditingText("") }}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm">{message.message}</p>
                              <p className="text-xs opacity-70 mt-1">{new Date(message.createdAt).toLocaleTimeString()}</p>
                            </>
                          )}

                          {/* Three-dots menu for message actions (visible to sender or receiver) */}
                          {isMe && (
                            <div className={`absolute -top-2 ${isMe ? "-left-8" : "-right-8"}`}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1 rounded-full hover:bg-muted transition-colors">
                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent sideOffset={6}>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (message._id?.toString().startsWith("tmp-")) return
                                      // populate main composer with message text and focus it
                                      setEditingMessageId(message._id)
                                      setNewMessage(message.message)
                                      setEditingViaComposer(true)
                                      setTimeout(() => inputRef.current?.focus(), 50)
                                    }}
                                  >
                                    Edit message
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => handleDeleteMessage(message._id)}
                                  >
                                    Delete message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
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
                    ref={inputRef}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="w-full h-10 sm:h-14 pr-11 sm:pr-14 py-2 sm:py-3 text-sm rounded-full border-2 cyber-border bg-input focus:ring-2 focus:ring-accent transition-all"
                    disabled={isLoading}
                  />
                  {editingViaComposer && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingMessageId(null); setEditingViaComposer(false); setNewMessage(prev => prev + "x") }}>
                        x
                      </Button>
                    </div>
                  )}
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
