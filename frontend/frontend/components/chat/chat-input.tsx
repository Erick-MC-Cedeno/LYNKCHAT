"use client"

import type React from "react"
import { useState } from "react"
import encryptionManager from "path/to/encryptionManager"
import api from "path/to/api"

const ChatInput = () => {
  const [message, setMessage] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [user, setUser] = useState(null)
  const [sending, setSending] = useState(false)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !selectedUser || !user) return

    try {
      setSending(true)

      let messageToSend = message.trim()

      if (selectedUser.publicKey && encryptionManager.hasKeyPair()) {
        try {
          const encryptedMessage = encryptionManager.encryptMessage(messageToSend, selectedUser.publicKey)
          messageToSend = encryptedMessage
        } catch (error) {
          console.error("[v0] Failed to encrypt message:", error)
          // Send unencrypted if encryption fails
        }
      }

      await api.sendMessage(selectedUser._id, messageToSend)
      setMessage("")
    } catch (error) {
      console.error("[v0] Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  // ... existing code here ...

  return <div>{/* ... existing JSX here ... */}</div>
}

export default ChatInput
