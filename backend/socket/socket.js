import { Server } from "socket.io"
import http from "http"
import express from "express"

import Conversation from "../models/conversation-model/conversation.model.js"
import Message from "../models/message-model/message.model.js"

const app = express()

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
  },
})

const userSocketMap = {}

export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId]
}

io.on("connection", (socket) => {
  const handshakeUserId = socket.handshake.query.userId
  // We'll track the connected user's id (can be supplied via handshake or via explicit "join")
  let connectedUserId = null
  if (handshakeUserId && handshakeUserId !== "undefined") {
    connectedUserId = handshakeUserId
    userSocketMap[connectedUserId] = socket.id
  }

  socket.on("join", (joinedUserId) => {
    if (joinedUserId != null && joinedUserId !== "undefined") {
      connectedUserId = joinedUserId
      userSocketMap[joinedUserId] = socket.id
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap))
  })

  // Emit initial online users (if any)
  io.emit("getOnlineUsers", Object.keys(userSocketMap))

  // When client emits a message, persist and forward it
  socket.on("sendMessage", async ({ receiverId, message, senderId: suppliedSender }) => {
    try {
      // Prefer sender id supplied by client, fall back to connectedUserId
      const senderId = suppliedSender || connectedUserId

      if (!message || message.toString().trim().length === 0) return

      // Ensure there's a conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
      })

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [senderId, receiverId],
        })
      }

      const newMessage = new Message({
        senderId,
        receiverId,
        message,
        read: false,
      })

      conversation.messages.push(newMessage._id)
      await Promise.all([conversation.save(), newMessage.save()])

      const receiverSocketId = getReceiverSocketId(receiverId)
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage)
      }

      // Optionally emit back to sender to confirm persistence (server-normalized message)
      socket.emit("newMessage", newMessage)

      // Compute unread counts for the receiver and emit so their sidebar updates in real-time
      try {
        const unreadAgg = await Message.aggregate([
          { $match: { receiverId: receiverId, read: false } },
          { $group: { _id: "$senderId", count: { $sum: 1 } } }
        ])

        const counts = unreadAgg.reduce((acc, cur) => {
          acc[cur._id.toString()] = cur.count
          return acc
        }, {})

        if (receiverSocketId) {
          io.to(receiverSocketId).emit("unreadCounts", counts)
        }
      } catch (err) {
        console.error("Error computing unread counts on sendMessage:", err)
      }
    } catch (err) {
      console.error("Error in socket sendMessage handler:", err)
    }
  })

  socket.on("typing", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId)
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: connectedUserId })
    }
  })

  socket.on("stopTyping", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId)
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId: connectedUserId })
    }
  })

  socket.on("markMessageAsRead", async (messageId) => {
    try {
      const message = await Message.findById(messageId)

      if (message) {
        message.read = true
        await message.save()

        const senderSocketId = getReceiverSocketId(message.senderId)
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageRead", messageId)
        }
        // After marking read, recompute unread counts for this receiver and emit
        try {
          const receiverId = message.receiverId
          const unreadAgg = await Message.aggregate([
            { $match: { receiverId: receiverId, read: false } },
            { $group: { _id: "$senderId", count: { $sum: 1 } } }
          ])

          const counts = unreadAgg.reduce((acc, cur) => {
            acc[cur._id.toString()] = cur.count
            return acc
          }, {})

          const receiverSocket = getReceiverSocketId(receiverId)
          if (receiverSocket) {
            io.to(receiverSocket).emit("unreadCounts", counts)
          }
        } catch (err) {
          console.error("Error computing unread counts after markMessageAsRead:", err)
        }
      }
    } catch (error) {
      console.error("Error marking message as read:", error)
    }
  })

  socket.on("disconnect", () => {
    if (connectedUserId) delete userSocketMap[connectedUserId]
    io.emit("getOnlineUsers", Object.keys(userSocketMap))
  })
})

export { app, io, server }
