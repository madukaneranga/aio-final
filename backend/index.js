import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import { existsSync } from "fs";
import jwt from "jsonwebtoken";

// Load env
dotenv.config();

// Globals
const SECRET = process.env.JWT_SECRET;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

// --- Socket.IO authentication middleware ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.log("Socket auth failed: No token provided");
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    console.log("Decoded token:", decoded); // print entire payload to inspect

    // Adjust the field below based on your decoded token shape
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

// --- Socket.IO setup ---
const userSocketMap = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "userId:", socket.userId);

  userSocketMap.set(socket.userId, socket.id);
  console.log("User Id "+ socket.userId)

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    userSocketMap.delete(socket.userId);
  });
});

// --- Export function to send real-time notifications ---
export const emitNotification = (userId, notification) => {
  const socketId = userSocketMap.get(userId);
  if (socketId) {
    io.to(socketId).emit("new-notification", notification);
  }
};

// --- Middleware ---
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL || "*",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Routes ---
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
import sitemapRoutes from "./routes/sitemap.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

console.log("Registering API routes");
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
app.use("/sitemap.xml", sitemapRoutes);

// --- React frontend serving ---
const distPath = path.resolve(__dirname, "../dist");
const indexHtmlPath = path.join(distPath, "index.html");

if (existsSync(indexHtmlPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(indexHtmlPath);
  });
}

app.get(/^\/(?!api|sitemap\.xml).*/, (req, res) => {
  res.sendFile(indexHtmlPath);
});

// --- Error handling ---
app.use(notFound);
app.use(errorHandler);

// --- Start DB and Server ---
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
