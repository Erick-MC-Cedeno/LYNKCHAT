import dotenv from "dotenv"
import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

import connectDB from "./db/connectDB.js"
import { app, server } from "./socket/socket.js"

import authRoutes from "./routes/auth-routes/auth.routes.js"
import userRoutes from "./routes/user-routes/user.routes.js"
import messageRoutes from "./routes/message-routes/message.routes.js"

dotenv.config()

// Middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  }),
)

// Connect to DB
connectDB()

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/messages", messageRoutes)

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: `Not Found - ${req.originalUrl}` })
})

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack || err.message || err)
  res.status(500).json({ error: "Internal Server Error" })
})

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
