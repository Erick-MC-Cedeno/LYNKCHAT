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
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { sendMessage, joinChat, leaveChat, typingUsers, onlineUsers } = useSocket()
  const { user: currentUser } = useAuth()

  useEffect(() => {
    if (!selectedUser) return

    if (selectedUser._id === lastFetchedUserId) return

    const fetchMessages = async () => {
      setLoading(true)
      try {
        const fetchedMessages = await apiClient.getMessages(selectedUser._id)

        const decryptedMessages = fetchedMessages.map((message) => {
          try {
            const encryptedData: EncryptedMessage = JSON.parse(message.message)
            let decryptedText: string

            if (selectedUser.publicKey) {
              decryptedText = encryptionManager.decryptMessage(encryptedData, selectedUser.publicKey)
            } else {
              return { ...message, message: "[KEY MISSING]" }
            }

            return { ...message, message: decryptedText }
          } catch (error) {
            console.log("[v0] Failed to decrypt message, treating as plain text:", error)
            return message
          }
        })

        setMessages(decryptedMessages)
        setLastFetchedUserId(selectedUser._id)
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
      console.log("[v0] Handling new message in chat window:", newMessage)

      // Only handle messages for current conversation
      if (
        newMessage.senderId === selectedUser._id ||
        (newMessage.senderId === currentUser?._id && newMessage.receiverId === selectedUser._id)
      ) {
        let decryptedMessage = newMessage

        // Decrypt the message if it's encrypted
        try {
          const encryptedData: EncryptedMessage = JSON.parse(newMessage.message)
          if (selectedUser.publicKey) {
            const decryptedText = encryptionManager.decryptMessage(encryptedData, selectedUser.publicKey)
            decryptedMessage = { ...newMessage, message: decryptedText }
          }
        } catch (error) {
          // Message is already plain text or decryption failed
          console.log("[v0] Message appears to be plain text or decryption failed")
        }

        // Add message to state if it's not already there
        setMessages((prev) => {
          const messageExists = prev.some((msg) => msg._id === decryptedMessage._id)
          if (messageExists) {
            console.log("[v0] Message already exists, skipping")
            return prev
          }
          console.log("[v0] Adding new message to state")
          return [...prev, decryptedMessage]
        })
      }
    }

    window.addEventListener("socketNewMessage", handleNewMessage as EventListener)

    return () => {
      leaveChat(selectedUser._id)
      window.removeEventListener("socketNewMessage", handleNewMessage as EventListener)
    }
  }, [selectedUser, joinChat, leaveChat, currentUser, lastFetchedUserId])

  useEffect(() => {
    if (selectedUser && selectedUser._id !== lastFetchedUserId) {
      setMessages([])
    }
  }, [selectedUser, lastFetchedUserId])

  useEffect(() => {
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
      const encryptedData = encryptionManager.encryptMessage(messageText, selectedUser.publicKey)
      const encryptedMessageString = JSON.stringify(encryptedData)

      console.log("[v0] Sending message via socket")
      sendMessage(selectedUser._id, encryptedMessageString)

      // Then save to database
      const newMessage = await apiClient.sendMessage(selectedUser._id, encryptedMessageString)
      console.log("[v0] Message saved to database:", newMessage)

      // Add the message to local state immediately with decrypted text
      const localMessage = { ...newMessage, message: messageText }
      setMessages((prev) => {
        const messageExists = prev.some((msg) => msg._id === newMessage._id)
        if (messageExists) {
          return prev
        }
        return [...prev, localMessage]
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
