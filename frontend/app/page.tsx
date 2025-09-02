"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthScreen } from "@/components/auth/auth-screen"
import { ChatLayout } from "@/components/chat/chat-layout"
import { ConnectionStatus } from "@/components/user/connection-status"

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-mono text-primary mb-4 animate-pulse">LYINK</div>
          <div className="text-muted-foreground font-mono mb-4">INITIALIZING NEURAL LINK...</div>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <div className="relative">
      <ChatLayout />
      <div className="absolute bottom-4 right-4 z-50">
        <ConnectionStatus />
      </div>
    </div>
  )
}
