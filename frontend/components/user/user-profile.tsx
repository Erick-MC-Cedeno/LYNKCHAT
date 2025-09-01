"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { encryptionManager } from "@/lib/encryption"
import { apiClient } from "@/lib/api"
import { Shield, Key, Copy, RefreshCw } from "lucide-react"

interface UserProfileProps {
  onClose: () => void
}

export function UserProfile({ onClose }: UserProfileProps) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    gender: user?.gender || "",
    image: user?.image || "",
  })

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Note: The API doesn't have an update user endpoint in the documentation
      // This would typically call something like apiClient.updateUser(formData)
      console.log("[v0] Would update user with:", formData)
      setEditing(false)
    } catch (error) {
      console.error("Failed to update profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateKeys = async () => {
    if (
      !confirm("Are you sure? This will regenerate your encryption keys and you won't be able to read old messages.")
    ) {
      return
    }

    setLoading(true)
    try {
      // Clear existing keys
      encryptionManager.clearKeys()

      // Generate new key pair
      const { publicKey, privateKey } = encryptionManager.generateKeyPair()
      encryptionManager.storeKeyPair(publicKey, privateKey)

      // Upload new public key to server
      await apiClient.updatePublicKey(publicKey)

      alert("Encryption keys regenerated successfully!")
    } catch (error) {
      console.error("Failed to regenerate keys:", error)
      alert("Failed to regenerate keys. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyPublicKey = () => {
    try {
      const publicKey = encryptionManager.getPublicKey()
      navigator.clipboard.writeText(publicKey)
      alert("Public key copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy public key:", error)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground font-mono flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image || "/placeholder.svg"} alt={user.fullName} />
              <AvatarFallback className="bg-primary text-primary-foreground font-mono">
                {user.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            NEURAL PROFILE
          </CardTitle>
          <CardDescription className="text-muted-foreground font-mono">
            Manage your identity in the neural network
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground font-mono">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="bg-input border-border text-foreground font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-foreground font-mono">
                  Gender
                </Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="male" className="text-popover-foreground">
                      Male
                    </SelectItem>
                    <SelectItem value="female" className="text-popover-foreground">
                      Female
                    </SelectItem>
                    <SelectItem value="other" className="text-popover-foreground">
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image" className="text-foreground font-mono">
                  Avatar URL
                </Label>
                <Input
                  id="image"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="bg-input border-border text-foreground font-mono"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono"
                >
                  {loading ? "SAVING..." : "SAVE CHANGES"}
                </Button>
                <Button
                  onClick={() => setEditing(false)}
                  variant="outline"
                  className="border-border text-foreground font-mono"
                >
                  CANCEL
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground font-mono text-sm">FULL NAME</Label>
                  <div className="text-foreground font-mono">{user.fullName}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground font-mono text-sm">USERNAME</Label>
                  <div className="text-foreground font-mono">@{user.username}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground font-mono text-sm">GENDER</Label>
                  <div className="text-foreground font-mono capitalize">{user.gender}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground font-mono text-sm">NODE ID</Label>
                  <div className="text-foreground font-mono text-xs">{user._id}</div>
                </div>
              </div>
              <Button
                onClick={() => setEditing(true)}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-mono"
              >
                EDIT PROFILE
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Encryption Management */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground font-mono flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            ENCRYPTION KEYS
          </CardTitle>
          <CardDescription className="text-muted-foreground font-mono">
            Manage your end-to-end encryption keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground font-mono text-sm">PUBLIC KEY STATUS</Label>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-foreground font-mono text-sm">ACTIVE & SYNCHRONIZED</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground font-mono text-sm">PUBLIC KEY</Label>
            <div className="flex gap-2">
              <Input
                value={
                  encryptionManager.hasKeyPair() ? encryptionManager.getPublicKey().substring(0, 32) + "..." : "No key"
                }
                readOnly
                className="bg-input border-border text-foreground font-mono text-xs"
              />
              <Button
                onClick={copyPublicKey}
                size="sm"
                variant="outline"
                className="border-border text-foreground bg-transparent"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleRegenerateKeys}
              disabled={loading}
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground font-mono bg-transparent"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {loading ? "REGENERATING..." : "REGENERATE KEYS"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            Warning: Regenerating keys will make old messages unreadable.
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground font-mono flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            ACCOUNT MANAGEMENT
          </CardTitle>
          <CardDescription className="text-muted-foreground font-mono">
            Manage your account settings and data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={onClose} className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono">
              RETURN TO CHAT
            </Button>
            <Button
              variant="outline"
              className="border-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground font-mono bg-transparent"
              disabled
            >
              CHANGE PASSWORD (Coming Soon)
            </Button>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground font-mono bg-transparent"
              disabled
            >
              DELETE ACCOUNT (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
