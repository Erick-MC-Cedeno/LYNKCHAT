"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { User } from "./api"
import { apiClient } from "./api"
import { encryptionManager } from "./encryption"

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  signup: (data: {
    fullName: string
    username: string
    password: string
    gender: string
    image?: string
  }) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      // Initialize encryption
      await encryptionManager.initialize()

      // Check if user is already logged in
      const savedUser = localStorage.getItem("lynkchat_user")
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      }
      setLoading(false)
    }

    initializeAuth()
  }, [])

  const setupEncryption = async () => {
    try {
      if (!encryptionManager.hasKeyPair()) {
        // Generate new key pair
        const { publicKey, privateKey } = encryptionManager.generateKeyPair()
        encryptionManager.storeKeyPair(publicKey, privateKey)

        // Upload public key to server
        await apiClient.updatePublicKey(publicKey)
        console.log("[v0] Generated and uploaded new key pair")
      } else {
        // Upload existing public key to server (in case it's missing)
        const publicKey = encryptionManager.getPublicKey()
        await apiClient.updatePublicKey(publicKey)
        console.log("[v0] Uploaded existing public key")
      }
    } catch (error) {
      console.error("Failed to setup encryption:", error)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await apiClient.login({ username, password })
      setUser(response)
      localStorage.setItem("lynkchat_user", JSON.stringify(response))

      // Setup encryption after successful login
      await setupEncryption()
    } catch (error) {
      throw error
    }
  }

  const signup = async (data: {
    fullName: string
    username: string
    password: string
    gender: string
    image?: string
  }) => {
    try {
      const response = await apiClient.signup(data)
      setUser(response)
      localStorage.setItem("lynkchat_user", JSON.stringify(response))

      // Setup encryption after successful signup
      await setupEncryption()
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
      setUser(null)
      localStorage.removeItem("lynkchat_user")
      encryptionManager.clearKeys()
    } catch (error) {
      console.error("Logout error:", error)
      // Still clear local state even if API call fails
      setUser(null)
      localStorage.removeItem("lynkchat_user")
      encryptionManager.clearKeys()
    }
  }

  return <AuthContext.Provider value={{ user, login, signup, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
