import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";

// Route imports
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import storeRoutes from "./routes/stores.js";
import productRoutes from "./routes/products.js";
import serviceRoutes from "./routes/services.js";
import orderRoutes from "./routes/orders.js";
import bookingRoutes from "./routes/bookings.js";
import paymentRoutes from "./routes/payments.js";
import reviewRoutes from "./routes/reviews.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import commissionRoutes from "./routes/commissions.js";
import notificationsRoutes from "./routes/notifications.js";
import platformSettingsRoutes from "./routes/platformSettings.js";
import packageRoutes from "./routes/packages.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app); // for socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
  },
});

// === SOCKET.IO CONNECTIONS ===
const userSocketMap = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (userId) => {
    userSocketMap.set(userId, socket.id);
    console.log(`User ${userId} joined socket ${socket.id}`);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  });
});

// Export this function for routes to emit notifications
export const emitNotification = (userId, notification) => {
  const socketId = userSocketMap.get(userId);
  if (socketId) {
    io.to(socketId).emit("new-notification", notification);
  }
};

// === MIDDLEWARE ===
app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === FILES ===
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// === ROUTES ===
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/commissions", commissionRoutes);
app.use("/api/platform-settings", platformSettingsRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/notifications", notificationsRoutes);

// === REACT BUILD ===
app.use(express.static(path.join(__dirname, "../dist")));

app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../dist", "index.html"));
});

// === ERROR HANDLERS ===
app.use(notFound);
app.use(errorHandler);

// === CONNECT MONGO & START SERVER ===
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
