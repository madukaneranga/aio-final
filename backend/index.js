import dotenv from "dotenv";
dotenv.config();

import http from "http";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { Server } from "socket.io";
import app from "./app.js";

// --- Import Models ---
import User from "./models/User.js";
import Chat from "./models/Chat.js";
import ChatAnalytics from "./models/ChatAnalytics.js";

// --- Import Utilities ---
import { setSocketInstance } from "./utils/socketUtils.js";

// --- Environment Variables ---
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Validate required environment variables
if (!MONGO_URI) {
  console.error("❌ MONGO_URI environment variable is required");
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET environment variable is required");
  process.exit(1);
}

// --- Server Setup ---
const server = http.createServer(app);

// --- Socket.IO Configuration ---
const allowedOrigins = [
  "http://localhost:5173", // Vite dev server
  "http://localhost:3000", // React/Next.js dev
  "http://127.0.0.1:5173", // Alternative localhost
  process.env.CLIENT_URL, // Production frontend URL
  process.env.FRONTEND_URL, // Alternative env var
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // Allow both transports
  pingTimeout: 60000,
  pingInterval: 25000,
});

// --- Socket.IO Authentication Middleware ---
io.use(async (socket, next) => {
  try {
    // Parse cookies from handshake headers
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const token = cookies.token;

    if (!token) {
      console.log("❌ Socket auth failed: No token provided");
      return next(new Error("Authentication error: No token provided"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      console.log("❌ Socket auth failed: User not found");
      return next(new Error("Authentication error: User not found"));
    }

    // Attach user info to socket
    socket.userId = user._id.toString();
    socket.user = user;

    console.log(`✅ Socket authenticated: ${user.name} (${user._id})`);
    next();
  } catch (error) {
    console.log("❌ Socket auth failed:", error.message);
    return next(new Error("Authentication error: Invalid token"));
  }
});

// --- Socket.IO Connection Management ---
const userSocketMap = new Map();
const roomUserMap = new Map(); // Track users in rooms

// Attach socket utilities
io.userSocketMap = userSocketMap;
setSocketInstance(io);

import {
  initializeChatHandlers,
  handleChatDisconnect,
} from "./utils/chatSocketHandlers.js";
import { startOrderScheduler, stopOrderScheduler } from "./utils/scheduler.js";

io.on("connection", (socket) => {
  const { userId, user } = socket;

  console.log(
    `🔌 Socket connected: ${user.name} (${userId}) - Socket ID: ${socket.id}`
  );

  initializeChatHandlers(io, socket);

  // Join user to their personal room
  socket.join(userId);
  userSocketMap.set(userId, socket.id);

  // --- Socket Event Handlers ---

  // Join specific room (for chat, notifications, etc.)
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    // Track room membership
    if (!roomUserMap.has(roomId)) {
      roomUserMap.set(roomId, new Set());
    }
    roomUserMap.get(roomId).add(userId);

    console.log(`👥 User ${user.name} joined room: ${roomId}`);

    // Notify others in room
    socket.to(roomId).emit("user-joined", {
      userId,
      userName: user.name,
      userRole: user.role,
    });
  });

  // Leave specific room
  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);

    // Update room membership
    if (roomUserMap.has(roomId)) {
      roomUserMap.get(roomId).delete(userId);
      if (roomUserMap.get(roomId).size === 0) {
        roomUserMap.delete(roomId);
      }
    }

    console.log(`🚪 User ${user.name} left room: ${roomId}`);

    // Notify others in room
    socket.to(roomId).emit("user-left", {
      userId,
      userName: user.name,
    });
  });

  // Handle typing indicators
  socket.on("typing-start", (roomId) => {
    socket.to(roomId).emit("user-typing", {
      userId,
      userName: user.name,
      isTyping: true,
    });
  });

  socket.on("typing-stop", (roomId) => {
    socket.to(roomId).emit("user-typing", {
      userId,
      userName: user.name,
      isTyping: false,
    });
  });

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    handleChatDisconnect(io, socket);

    console.log(
      `🔌 Socket disconnected: ${user.name} (${userId}) - Reason: ${reason}`
    );

    // Remove from user socket map
    userSocketMap.delete(userId);

    // Remove from all rooms
    for (const [roomId, users] of roomUserMap.entries()) {
      if (users.has(userId)) {
        users.delete(userId);
        socket.to(roomId).emit("user-left", {
          userId,
          userName: user.name,
        });

        if (users.size === 0) {
          roomUserMap.delete(roomId);
        }
      }
    }
  });
});

// --- Socket.IO Utility Functions ---
export const emitNotification = (userId, notification) => {
  const socketId = userSocketMap.get(userId.toString());
  if (socketId) {
    io.to(userId.toString()).emit("new-notification", notification);
    console.log(`📬 Notification sent to ${userId}:`, notification.title);
    return true;
  } else {
    console.log(`📭 User ${userId} offline - notification queued`);
    return false;
  }
};

export const emitToRoom = (roomId, event, data) => {
  io.to(roomId).emit(event, data);
  console.log(`📡 Event '${event}' sent to room ${roomId}`);
};

export const emitToAll = (event, data) => {
  io.emit(event, data);
  console.log(`📢 Event '${event}' broadcast to all users`);
};

export const getOnlineUsersCount = () => {
  return userSocketMap.size;
};

export const getOnlineUsers = () => {
  return Array.from(userSocketMap.keys());
};

export const isUserOnline = (userId) => {
  return userSocketMap.has(userId.toString());
};

export const getRoomUsers = (roomId) => {
  return roomUserMap.get(roomId) ? Array.from(roomUserMap.get(roomId)) : [];
};

// --- Database Connection ---
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      // Modern MongoDB connection options
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

// --- Server Startup ---
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Socket.IO CORS origins:`, allowedOrigins);
      console.log(`📊 Online users: ${getOnlineUsersCount()}`);

      // Start order auto-confirmation scheduler
      startOrderScheduler();

      if (process.env.NODE_ENV === "development") {
        console.log(`🔧 API Base URL: http://localhost:${PORT}/api`);
        console.log(`🏠 Health Check: http://localhost:${PORT}/ping`);
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// --- Enhanced Graceful Shutdown ---
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log("⚠️ Shutdown already in progress, forcing exit...");
    process.exit(1);
  }

  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    console.log("🔌 HTTP server closed");
  });

  try {
    // Stop order scheduler
    console.log("⏰ Stopping order scheduler...");
    stopOrderScheduler();
    
    // Disconnect all socket connections
    console.log("🔌 Closing Socket.IO connections...");

    // Send disconnect message to all clients
    io.emit("server-shutdown", { message: "Server is shutting down" });

    // Close all socket connections
    const sockets = await io.fetchSockets();
    console.log(`🔌 Found ${sockets.length} active connections`);

    for (const socket of sockets) {
      socket.disconnect(true);
    }

    // Close Socket.IO server
    io.close(() => {
      console.log("🔌 Socket.IO server closed");
    });

    // Close MongoDB connection
    console.log("🗄️ Closing MongoDB connection...");
    await mongoose.connection.close();
    console.log("🗄️ MongoDB connection closed");

    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals with immediate force option
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Force close after 5 seconds (reduced from 10)
const forceShutdown = () => {
  setTimeout(() => {
    console.error("⚠️ Forcing server shutdown after timeout");
    process.exit(1);
  }, 5000);
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  forceShutdown();
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  forceShutdown();
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Start the server
startServer();
