"use client"

import { useEffect, useState } from "react"
import { useSocket } from "@/lib/socket-context"
import { Wifi, WifiOff } from "lucide-react"

export function ConnectionStatus() {
  const { socket } = useSocket()
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (socket) {
      setIsConnected(socket.connected)

      const handleConnect = () => setIsConnected(true)
      const handleDisconnect = () => setIsConnected(false)

      socket.on("connect", handleConnect)
      socket.on("disconnect", handleDisconnect)

      return () => {
        socket.off("connect", handleConnect)
        socket.off("disconnect", handleDisconnect)
      }
    }
  }, [socket])

  return (
    <div className={`flex items-center gap-2 text-xs font-mono ${isConnected ? "text-primary" : "text-destructive"}`}>
      {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      <span>{isConnected ? "NEURAL LINK ACTIVE" : "CONNECTION LOST"}</span>
    </div>
  )
}
