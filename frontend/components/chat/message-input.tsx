"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { useSocket } from "@/lib/socket-context"
import type { User } from "@/lib/api"

interface MessageInputProps {
  onSendMessage: (message: string) => void
  selectedUser: User
}

export function MessageInput({ onSendMessage, selectedUser }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const { startTyping, stopTyping } = useSocket()
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending) return

    setSending(true)
    try {
      await onSendMessage(message.trim())
      setMessage("")
      stopTyping(selectedUser._id)
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessage(value)

    if (value.trim()) {
      // Start typing
      startTyping(selectedUser._id)

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedUser._id)
      }, 3000)
    } else {
      // Stop typing if input is empty
      stopTyping(selectedUser._id)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="p-4 border-t border-border bg-card">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={message}
          onChange={handleInputChange}
          placeholder="Type your message..."
          disabled={sending}
          className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary font-mono"
        />
        <Button
          type="submit"
          disabled={!message.trim() || sending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
