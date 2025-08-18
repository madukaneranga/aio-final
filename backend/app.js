import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";


// --- Express setup ---
const app = express();

// Globals for __dirname, used for static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL || "*",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/ping", (req, res) => {
  res.send("pong");
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Routes (import and use them) ---
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
app.use("/api/wallet", walletRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/email-subscriptions", emailSubscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/posts", postRoutes);
app.use('/api/flash-deals', flashDealRoutes);


// React frontend serving
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

// Error handling
app.use(notFound);
app.use(errorHandler);

app.get("/ping", (req, res) => {
  res.send("pong");
});

export default app;
