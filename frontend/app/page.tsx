"use client"

import { useState, useEffect } from "react"
import { AuthForm } from "@/components/auth-form"
import { ChatInterface } from "@/components/chat-interface"

export default function Home() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if user is already logged in - backend doesn't have verify endpoint
        // Instead, we'll try to fetch user data to verify the session
        const response = await fetch("http://localhost:5000/api/auth/me", {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
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
