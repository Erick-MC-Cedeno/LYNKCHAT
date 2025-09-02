"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Message, User } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface MessageBubbleProps {
  message: Message
  sender: User
}

export function MessageBubble({ message, sender }: MessageBubbleProps) {
  const { user: currentUser } = useAuth()
  const isOwnMessage = message.senderId === currentUser?._id

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className={`flex gap-3 mb-4 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="h-8 w-8 mt-1">
        <AvatarImage src={sender.image || "/placeholder.svg"} alt={sender.fullName} />
        <AvatarFallback className="bg-muted text-muted-foreground font-mono text-xs">
          {sender.fullName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col max-w-xs lg:max-w-md ${isOwnMessage ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-2 rounded-lg font-mono text-sm ${
            isOwnMessage ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground border border-border"
          }`}
        >
          {message.message}
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-mono">{formatTime(message.createdAt)}</div>
      </div>
    </div>
  )
}
