"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { apiClient, type User } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useSocket } from "@/lib/socket-context"
import { Shield, ShieldAlert } from "lucide-react"

interface UserListProps {
  selectedUserId: string | null
  onUserSelect: (userId: string, user: User) => void
}

export function UserList({ selectedUserId, onUserSelect }: UserListProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useAuth()
  const { onlineUsers } = useSocket()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await apiClient.getUsers()
        setUsers(fetchedUsers)
      } catch (error) {
        console.error("Failed to fetch users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  if (loading) {
    return (
      <div className="w-80 bg-sidebar border-r border-sidebar-border p-4">
        <div className="text-sidebar-foreground font-mono text-center">LOADING CONTACTS...</div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-sidebar-foreground font-mono text-lg font-bold">NEURAL CONTACTS</h2>
        <p className="text-sidebar-foreground/70 text-sm font-mono">{onlineUsers.length} nodes online</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {users.map((user) => {
            const isOnline = onlineUsers.includes(user._id)
            const hasEncryption = !!user.publicKey
            return (
              <button
                key={user._id}
                onClick={() => onUserSelect(user._id, user)}
                className={`w-full p-3 rounded-lg mb-2 flex items-center gap-3 transition-colors ${
                  selectedUserId === user._id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                }`}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.image || "/placeholder.svg"} alt={user.fullName} />
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-mono">
                      {user.fullName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-sidebar ${
                      isOnline ? "bg-primary" : "bg-muted"
                    }`}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-mono font-semibold">{user.fullName}</div>
                  <div className="text-sm opacity-70 font-mono">
                    @{user.username} • {isOnline ? "ONLINE" : "OFFLINE"}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {hasEncryption ? (
                    <Shield className="w-4 h-4 text-primary" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
