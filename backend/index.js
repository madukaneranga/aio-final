import dotenv from "dotenv";
import http from "http";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { setSocketInstance } from "./utils/socketUtils.js";
import app from "./app.js";

dotenv.config();

const SECRET = process.env.JWT_SECRET;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.log("Socket auth failed: No token provided");
    return next(new Error("Authentication error"));
  }
  try {
    const decoded = jwt.verify(token, SECRET);
    socket.userId = decoded.id || decoded._id || decoded.userId;
    if (!socket.userId) {
      console.log("User ID not found in token payload");
      return next(new Error("Authentication error"));
    }
    next();
  } catch (err) {
    console.log("Socket auth failed:", err.message);
    return next(new Error("Authentication error"));
  }
});

// Socket.IO connection logic
const userSocketMap = new Map();
io.userSocketMap = userSocketMap; // Attach to io instance

setSocketInstance(io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "userId:", socket.userId);
  userSocketMap.set(socket.userId, socket.id);
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    userSocketMap.delete(socket.userId);
  });
});

// Export notification helper (optional, for other files)
export const emitNotification = (userId, notification) => {
  const socketId = userSocketMap.get(userId);
  if (socketId) {
    io.to(socketId).emit("new-notification", notification);
  }
};

// Start DB + Server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
