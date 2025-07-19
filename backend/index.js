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
console.log("Starting route registrations");

console.log("Registering /api/auth routes");
app.use("/api/auth", authRoutes);
console.log("/api/auth routes registered");

console.log("Registering /api/users routes");
app.use("/api/users", userRoutes);
console.log("/api/users routes registered");

console.log("Registering /api/stores routes");
app.use("/api/stores", storeRoutes);
console.log("/api/stores routes registered");

console.log("Registering /api/products routes");
app.use("/api/products", productRoutes);
console.log("/api/products routes registered");

console.log("Registering /api/services routes");
app.use("/api/services", serviceRoutes);
console.log("/api/services routes registered");

console.log("Registering /api/orders routes");
app.use("/api/orders", orderRoutes);
console.log("/api/orders routes registered");

console.log("Registering /api/bookings routes");
app.use("/api/bookings", bookingRoutes);
console.log("/api/bookings routes registered");

console.log("Registering /api/payments routes");
app.use("/api/payments", paymentRoutes);
console.log("/api/payments routes registered");

console.log("Registering /api/reviews routes");
app.use("/api/reviews", reviewRoutes);
console.log("/api/reviews routes registered");

console.log("Registering /api/subscriptions routes");
app.use("/api/subscriptions", subscriptionRoutes);
console.log("/api/subscriptions routes registered");

console.log("Registering /api/commissions routes");
app.use("/api/commissions", commissionRoutes);
console.log("/api/commissions routes registered");

console.log("Registering /api/platform-settings routes");
app.use("/api/platform-settings", platformSettingsRoutes);
console.log("/api/platform-settings routes registered");

console.log("Registering /api/packages routes");
app.use("/api/packages", packageRoutes);
console.log("/api/packages routes registered");

console.log("Registering /api/notifications routes");
app.use("/api/notifications", notificationsRoutes);
console.log("/api/notifications routes registered");

console.log("All routes registered");

// === REACT BUILD ===
app.use(express.static(path.join(__dirname, "../dist")));

app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// SPA fallback
app.get("/", (req, res) => {
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
