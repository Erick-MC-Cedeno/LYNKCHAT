"use client"

import { useState, useEffect } from "react"
import { AuthForm } from "@/components/auth-form"
import { ChatInterface } from "@/components/chat-interface"
import { encryptionService } from "@/lib/encryption"

export default function Home() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize encryption first
        await encryptionService.initialize()

        // Check if user is already logged in - backend doesn't have verify endpoint
        // Instead, we'll try to fetch user data to verify the session
        const response = await fetch("https://crispy-space-couscous-rqr4g6grxr4cw5wg-5000.app.github.dev/api/user", {
          credentials: "include", // Use cookies instead of Authorization header
        })

        if (response.ok) {
          // If we can fetch users, we're authenticated
          // We need to get current user info somehow - for now we'll set a placeholder
          // The real user data will be set during login
          setUser({ authenticated: true })
        }
      } catch (error) {
        console.error("[v0] App initialization failed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="cyber-glow rounded-lg p-8">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full"></div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {user ? <ChatInterface user={user} onLogout={() => setUser(null)} /> : <AuthForm onLogin={setUser} />}
    </main>
  )
}
