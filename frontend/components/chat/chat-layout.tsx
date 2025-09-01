"use client"

import { useState } from "react"
import { UserList } from "./user-list"
import { ChatWindow } from "./chat-window"
import { UserProfile } from "../user/user-profile"
import { Button } from "@/components/ui/button"
import { LogOut, Menu, X, User } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useSocket } from "@/lib/socket-context"
import type { User as UserType } from "@/lib/api"

export function ChatLayout() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const { user, logout } = useAuth()
  const { onlineUsers } = useSocket()

  const handleUserSelect = (userId: string, userData: UserType) => {
    setSelectedUserId(userId)
    setSelectedUser(userData)
    setSidebarOpen(false) // Close sidebar on mobile after selection
    setShowProfile(false) // Close profile if open
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleShowProfile = () => {
    setShowProfile(true)
    setSidebarOpen(false)
  }

  if (showProfile) {
    return (
      <div className="h-screen bg-background flex flex-col">
        {/* Top Header */}
        <div className="bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold font-mono text-foreground">LYINK</h1>
            <span className="text-sm text-muted-foreground font-mono">PROFILE SETTINGS</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-mono">Neural ID: {user?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-foreground hover:text-destructive font-mono"
            >
              <LogOut className="w-4 h-4 mr-2" />
              DISCONNECT
            </Button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            <UserProfile onClose={() => setShowProfile(false)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Top Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-foreground"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <h1 className="text-2xl font-bold font-mono text-foreground">LYINK</h1>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground font-mono">{onlineUsers.length} online</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-sm text-muted-foreground font-mono">Neural ID: {user?.username}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowProfile}
            className="text-foreground hover:text-primary font-mono"
          >
            <User className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">PROFILE</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-foreground hover:text-destructive font-mono"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">DISCONNECT</span>
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Hidden on mobile unless open */}
        <div className={`${sidebarOpen ? "block" : "hidden"} lg:block absolute lg:relative z-10 h-full`}>
          <UserList selectedUserId={selectedUserId} onUserSelect={handleUserSelect} />
        </div>

        {/* Chat Window */}
        <ChatWindow selectedUser={selectedUser} />
      </div>
    </div>
  )
}
