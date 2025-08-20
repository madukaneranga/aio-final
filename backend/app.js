import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import cookieParser from "cookie-parser";

// --- Express App Setup ---
const app = express();

// Globals for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CORS Configuration ---
const allowedOrigins = [
  "http://localhost:5173", // Vite dev server
  "http://localhost:3000", // React/Next.js dev
  "http://127.0.0.1:5173", // Alternative localhost
  process.env.CLIENT_URL, // Production frontend URL
  process.env.FRONTEND_URL, // Alternative env var
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: allowedOrigins,
  credentials: true, // Allow cookies
  optionsSuccessStatus: 200, // Legacy browser support
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Accept",
    "X-Requested-With",
    "Origin",
    "Cache-Control",
  ],
  exposedHeaders: ["Set-Cookie"], // Allow frontend to see cookie headers
};

// --- Global Middleware ---
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// --- Development Logging ---
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(
      `${new Date().toISOString()} - ${req.method} ${
        req.path
      } - Origin: ${req.get("Origin")}`
    );
    next();
  });
}

// --- Health Check ---
app.get("/ping", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// --- Static File Serving ---
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- API Routes ---
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
import walletRoutes from "./routes/wallet.js";
import adminRoutes from "./routes/admin.js";
import analyticsRoutes from "./routes/analytics.js";
import emailSubscriptionRoutes from "./routes/emailSubscriptions.js";
import categoriesRoutes from "./routes/categories.js";
import postRoutes from "./routes/posts.js";
import flashDealRoutes from "./routes/flashDeals.js";
import chatRoutes from "./routes/chats.js";

// Route Registration
if (process.env.NODE_ENV !== "test") {
  console.log("🔗 Registering API routes...");
  console.log("🌐 CORS origins configured:", allowedOrigins);
}

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
app.use("/api/wallet", walletRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/email-subscriptions", emailSubscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/flash-deals", flashDealRoutes);
app.use("/api/chat", chatRoutes);

// Special routes
app.use("/sitemap.xml", sitemapRoutes);

// --- Frontend Serving (Production) ---
const distPath = path.resolve(__dirname, "../dist");
const indexHtmlPath = path.join(distPath, "index.html");

if (existsSync(indexHtmlPath)) {
  if (process.env.NODE_ENV !== "test") {
    console.log("📦 Serving frontend build from:", distPath);
  }
  app.use(express.static(distPath));

  // Catch-all handler for React Router
  app.get(/^\/(?!api|sitemap\.xml|uploads).*/, (req, res) => {
    res.sendFile(indexHtmlPath);
  });
} else if (process.env.NODE_ENV !== "test") {
  console.log("⚠️  Frontend build not found - API only mode");
}

// --- Error Handling ---
import { errorHandler, notFound } from "./middleware/errorHandler.js";

app.use(notFound);
app.use(errorHandler);

export default app;