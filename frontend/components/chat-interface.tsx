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
import { encryptionService, type EncryptedMessage } from "@/lib/encryption"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    socketService.connect(user._id)

    socketService.onOnlineUsers((users: string[]) => {
      setOnlineUsers(users)
    })

    socketService.onNewMessage((message: any) => {
      try {
        const sender = users.find((u) => u._id === message.senderId)
        if (sender?.publicKey && message.message) {
          const encryptedData = JSON.parse(message.message) as EncryptedMessage
          const decryptedMessage = encryptionService.decryptMessage(encryptedData, sender.publicKey)
          setMessages((prev) => [...prev, { ...message, message: decryptedMessage }])
        } else {
          setMessages((prev) => [...prev, message])
        }
      } catch (error) {
        console.error("[v0] Failed to decrypt message:", error)
        setMessages((prev) => [...prev, message])
      }
    })

    return () => {
      socketService.disconnect()
    }
  }, [user._id, users])

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

          // Decrypt messages
          const decryptedMessages = messagesData.map((msg) => {
            try {
              if (msg.message && selectedUser.publicKey) {
                const encryptedData = JSON.parse(msg.message) as EncryptedMessage
                const senderPublicKey =
                  msg.senderId === user._id ? encryptionService.getPublicKey() : selectedUser.publicKey
                const decryptedMessage = encryptionService.decryptMessage(encryptedData, senderPublicKey)
                return { ...msg, message: decryptedMessage }
              }
              return msg
            } catch (error) {
              console.error("[v0] Failed to decrypt message:", error)
              return msg
            }
          })

          setMessages(decryptedMessages)
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
  }, [selectedUser, user._id, toast])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser || isLoading) return

    setIsLoading(true)
    try {
      let messageToSend = newMessage

      // Encrypt message if recipient has public key
      if (selectedUser.publicKey) {
        const encryptedData = encryptionService.encryptMessage(newMessage, selectedUser.publicKey)
        messageToSend = JSON.stringify(encryptedData)
      }

      const sentMessage = await messageAPI.sendMessage(selectedUser._id, messageToSend)

      // Add decrypted message to local state
      setMessages((prev) => [...prev, { ...sentMessage, message: newMessage }])
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
      encryptionService.clearKeys()
      socketService.disconnect()
      onLogout()
    }
  }

  return (
    <div className="h-screen flex bg-background">
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
                {user.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.fullName}</p>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
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
                        {contact.fullName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers.includes(contact._id) && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-accent rounded-full border-2 border-background cyber-glow"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact.fullName}</p>
                    <p className="text-sm text-muted-foreground">@{contact.username}</p>
                  </div>
                  {contact.publicKey && <Shield className="h-4 w-4 text-accent" />}
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
                    @{selectedUser.username}
                    {onlineUsers.includes(selectedUser._id) && <span className="text-accent">• Online</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent" />
                  <span className="text-sm text-accent">Encrypted</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${message.senderId === user._id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === user._id
                          ? "bg-accent text-accent-foreground message-glow"
                          : "bg-muted text-muted-foreground cyber-border"
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs opacity-70 mt-1">{new Date(message.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card/30 backdrop-blur-sm">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your encrypted message..."
                  className="flex-1 cyber-border bg-input"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="cyber-glow bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={isLoading || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Shield className="h-16 w-16 text-accent mx-auto mb-4 cyber-text" />
              <h3 className="text-xl font-semibold mb-2">Select a Contact</h3>
              <p className="text-muted-foreground">Choose someone to start an encrypted conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
