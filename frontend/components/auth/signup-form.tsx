"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"

interface SignupFormProps {
  onToggleMode: () => void
}

export function SignupForm({ onToggleMode }: SignupFormProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    gender: "",
    image: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { signup } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await signup(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-card border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground">LYINK</CardTitle>
        <CardDescription className="text-muted-foreground">Initialize new user profile</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground">
              Full Name
            </Label>
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              required
              className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
              placeholder="Enter your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              required
              className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
              placeholder="Choose a username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              required
              className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
              placeholder="Create a password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender" className="text-foreground">
              Gender
            </Label>
            <Select onValueChange={(value) => handleInputChange("gender", value)}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder="Select gender" />
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
            <Label htmlFor="image" className="text-foreground">
              Avatar URL (Optional)
            </Label>
            <Input
              id="image"
              type="url"
              value={formData.image}
              onChange={(e) => handleInputChange("image", e.target.value)}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
          {error && <div className="text-destructive text-sm text-center">{error}</div>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono"
          >
            {loading ? "INITIALIZING..." : "CREATE PROFILE"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={onToggleMode} className="text-primary hover:text-primary/80 text-sm font-mono">
            Already registered? Jack in here
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
