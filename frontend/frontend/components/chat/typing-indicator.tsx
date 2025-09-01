"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { User } from "@/lib/api"

interface TypingIndicatorProps {
  user: User
}

export function TypingIndicator({ user }: TypingIndicatorProps) {
  return (
    <div className="flex gap-3 mb-4">
      <Avatar className="h-8 w-8 mt-1">
        <AvatarImage src={user.image || "/placeholder.svg"} alt={user.fullName} />
        <AvatarFallback className="bg-muted text-muted-foreground font-mono text-xs">
          {user.fullName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col max-w-xs lg:max-w-md">
        <div className="px-4 py-2 rounded-lg bg-card text-card-foreground border border-border font-mono text-sm">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-mono">typing...</div>
      </div>
    </div>
  )
}
