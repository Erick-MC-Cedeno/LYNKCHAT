"use client"

import { useEffect, useState, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "./message-bubble"
import { MessageInput } from "./message-input"
import { TypingIndicator } from "./typing-indicator"
import { apiClient, type Message, type User } from "@/lib/api"
import { useSocket } from "@/lib/socket-context"
import { useAuth } from "@/lib/auth-context"
import { encryptionManager, type EncryptedMessage } from "@/lib/encryption"

interface ChatWindowProps {
  selectedUser: User | null
}

export function ChatWindow({ selectedUser }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { sendMessage, joinChat, leaveChat, typingUsers, onlineUsers } = useSocket()
  const { user: currentUser } = useAuth()

  useEffect(() => {
    if (!selectedUser) return

    const fetchMessages = async () => {
      setLoading(true)
      try {
        const fetchedMessages = await apiClient.getMessages(selectedUser._id)

        // Decrypt messages
        const decryptedMessages = fetchedMessages.map((message) => {
          try {
            if (message.senderId === currentUser?._id) {
              // Message sent by current user - decrypt using recipient's public key
              if (selectedUser.publicKey) {
                const encryptedData: EncryptedMessage = JSON.parse(message.message)
                const decryptedText = encryptionManager.decryptMessage(encryptedData, selectedUser.publicKey)
                return { ...message, message: decryptedText }
              }
            } else {
              // Message received from selected user - decrypt using their public key
              if (selectedUser.publicKey) {
                const encryptedData: EncryptedMessage = JSON.parse(message.message)
                const decryptedText = encryptionManager.decryptMessage(encryptedData, selectedUser.publicKey)
                return { ...message, message: decryptedText }
              }
            }
            return { ...message, message: "[ENCRYPTION KEY MISSING]" }
          } catch (error) {
            // If parsing fails, assume it's plain text (for backwards compatibility)
            return message
          }
        })

        setMessages(decryptedMessages)
        joinChat(selectedUser._id)
      } catch (error) {
        console.error("Failed to fetch messages:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    const handleNewMessage = (event: CustomEvent<Message>) => {
      const newMessage = event.detail
      if (
        newMessage.senderId === selectedUser._id ||
        (newMessage.senderId === currentUser?._id && newMessage.receiverId === selectedUser._id)
      ) {
        // Decrypt the new message
        let decryptedMessage = newMessage
        try {
          if (selectedUser.publicKey) {
            const encryptedData: EncryptedMessage = JSON.parse(newMessage.message)
            const decryptedText = encryptionManager.decryptMessage(encryptedData, selectedUser.publicKey)
            decryptedMessage = { ...newMessage, message: decryptedText }
          }
        } catch (error) {
          // If parsing fails, assume it's plain text
          console.log("[v0] Message appears to be plain text")
        }

        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((msg) => msg._id === decryptedMessage._id)) {
            return prev
          }
          return [...prev, decryptedMessage]
        })
      }
    }

    window.addEventListener("newMessage", handleNewMessage as EventListener)

    return () => {
      leaveChat(selectedUser._id)
      window.removeEventListener("newMessage", handleNewMessage as EventListener)
    }
  }, [selectedUser, joinChat, leaveChat, currentUser])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages])

  const handleSendMessage = async (messageText: string) => {
    if (!selectedUser || !selectedUser.publicKey) {
      console.error("Cannot send message: recipient public key not available")
      return
    }

    try {
      // Encrypt the message
      const encryptedData = encryptionManager.encryptMessage(messageText, selectedUser.publicKey)
      const encryptedMessageString = JSON.stringify(encryptedData)

      // Send encrypted message via socket
      sendMessage(selectedUser._id, encryptedMessageString)

      // Also send via API for persistence
      const newMessage = await apiClient.sendMessage(selectedUser._id, encryptedMessageString)

      // Add decrypted version to local state for display
      const decryptedMessage = { ...newMessage, message: messageText }
      setMessages((prev) => {
        if (prev.some((msg) => msg._id === newMessage._id)) {
          return prev
        }
        return [...prev, decryptedMessage]
      })
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  if (!selectedUser) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-mono text-primary mb-4">LYINK</div>
          <div className="text-muted-foreground font-mono">Select a contact to start neural communication</div>
        </div>
      </div>
    )
  }

  const isOnline = onlineUsers.includes(selectedUser._id)
  const isTyping = typingUsers[selectedUser._id]
  const hasEncryption = !!selectedUser.publicKey

  return (
    <div className="flex-1 bg-background flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-primary animate-pulse" : "bg-muted"}`}></div>
          <div className="flex-1">
            <h3 className="font-mono font-bold text-card-foreground">{selectedUser.fullName}</h3>
            <p className="text-sm text-muted-foreground font-mono">
              @{selectedUser.username} • {isOnline ? "ONLINE" : "OFFLINE"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hasEncryption ? "bg-primary" : "bg-destructive"}`}></div>
            <span className="text-xs font-mono text-muted-foreground">
              {hasEncryption ? "ENCRYPTED" : "UNENCRYPTED"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {loading ? (
          <div className="text-center text-muted-foreground font-mono">DECRYPTING MESSAGES...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground font-mono">No messages yet. Start the conversation!</div>
        ) : (
          <div>
            {messages.map((message) => (
              <MessageBubble key={message._id} message={message} sender={selectedUser} />
            ))}
            {isTyping && <TypingIndicator user={selectedUser} />}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      {hasEncryption ? (
        <MessageInput onSendMessage={handleSendMessage} selectedUser={selectedUser} />
      ) : (
        <div className="p-4 border-t border-border bg-card">
          <div className="text-center text-destructive font-mono text-sm">
            Cannot send messages: Encryption keys not available
          </div>
        </div>
      )}
    </div>
  )
}
