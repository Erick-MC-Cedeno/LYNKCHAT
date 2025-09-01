
import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import connectDB from "./db/connectDB.js";
import {server} from './socket/socket.js'


import authRoutes from "./routes/auth-routes/auth.routes.js";
import userRoutes from "./routes/user-routes/user.routes.js";
import messageRoutes from "./routes/message-routes/message.routes.js";

dotenv.config();
 
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
	cors({
		origin: process.env.CLIENT_URL || true,
		credentials: true,
	})
);

// Simple in-memory rate limiter by IP
// Defaults: 5 requests per window (1 minute). Adjust with env:
// RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 5;
const RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : 60 * 1000;

const ipStore = new Map();

function rateLimiter(req, res, next) {
	try {
		const ip = req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "unknown";
		const now = Date.now();

		const entry = ipStore.get(ip) || { count: 0, start: now };

		// reset window
		if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
			entry.count = 0;
			entry.start = now;
		}

		entry.count += 1;
		ipStore.set(ip, entry);

		if (entry.count > RATE_LIMIT_MAX) {
			const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.start)) / 1000);
			res.set("Retry-After", String(retryAfterSec));
			return res.status(429).json({ error: "Too many requests" });
		}

		next();
	} catch (err) {
		// On error, allow the request to proceed but log the error
		console.error("Rate limiter error:", err);
		next();
	}
}

// Periodic cleanup to avoid memory bloat (remove entries older than 2 windows)
setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of ipStore.entries()) {
		if (now - entry.start > RATE_LIMIT_WINDOW_MS * 2) {
			ipStore.delete(ip);
		}
	}
}, Math.max(60000, RATE_LIMIT_WINDOW_MS));

// Mount rate limiter globally (applies to all routes)
app.use(rateLimiter);


// Connect to DB
connectDB();


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/messages", messageRoutes);



// 404 handler
app.use((req, res, next) => {
	res.status(404).json({ error: `Not Found - ${req.originalUrl}` });
});

// Generic error handler
app.use((err, _req, res, _next) => {
	console.error(err.stack || err.message || err);
	res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

export default app;