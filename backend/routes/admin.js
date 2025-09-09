import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import adminController from "../controllers/adminController.js";
import {
  validateProcessWithdrawal,
  validateBulkOperation,
  validatePagination,
  validateCollection,
  validateAnalyticsQuery,
  requireAdmin,
  validateOrderUpdate,
  validateUserUpdate,
  validateStoreUpdate,
  validateSubscriptionUpdate,
  validateFlashDealUpdate,
  validateSystemSettings,
  validateSecurityQuery
} from "../validators/adminValidator.js";

const router = express.Router();

// Withdrawal management routes
router.get("/withdrawals", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getWithdrawals
);

router.get("/withdrawals/pending", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getPendingWithdrawals
);

router.put("/withdrawals/:id/process", 
  authenticate, 
  authorize("admin"), 
  validateProcessWithdrawal, 
  adminController.processWithdrawal
);

// User Management routes
router.get("/users", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getUsers
);

router.get("/users/stats", 
  authenticate, 
  authorize("admin"), 
  adminController.getUserStats
);

router.put("/users/:id", 
  authenticate, 
  authorize("admin"), 
  validateUserUpdate, 
  adminController.updateUser
);

router.delete("/users/:id", 
  authenticate, 
  authorize("admin"), 
  adminController.deleteUser
);

router.post("/users/bulk", 
  authenticate, 
  authorize("admin"), 
  validateBulkOperation, 
  adminController.bulkUserOperation
);

// Store Management routes
router.get("/stores", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getStores
);

router.get("/stores/stats", 
  authenticate, 
  authorize("admin"), 
  adminController.getStoreStats
);

router.put("/stores/:id", 
  authenticate, 
  authorize("admin"), 
  validateStoreUpdate, 
  adminController.updateStore
);

router.put("/stores/:id/status", 
  authenticate, 
  authorize("admin"), 
  adminController.updateStoreStatus
);

router.delete("/stores/:id", 
  authenticate, 
  authorize("admin"), 
  adminController.deleteStore
);

router.post("/stores/bulk", 
  authenticate, 
  authorize("admin"), 
  validateBulkOperation, 
  adminController.bulkStoreOperation
);

// Order Management routes
router.get("/orders", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getOrders
);

router.get("/orders/stats", 
  authenticate, 
  authorize("admin"), 
  adminController.getOrderStats
);

router.get("/orders/:id", 
  authenticate, 
  authorize("admin"), 
  adminController.getOrderDetails
);

router.put("/orders/:id", 
  authenticate, 
  authorize("admin"), 
  validateOrderUpdate, 
  adminController.updateOrder
);

router.put("/orders/:id/status", 
  authenticate, 
  authorize("admin"), 
  adminController.updateOrderStatus
);

router.post("/orders/bulk", 
  authenticate, 
  authorize("admin"), 
  validateBulkOperation, 
  adminController.bulkOrderOperation
);

router.get("/orders/:id/timeline", 
  authenticate, 
  authorize("admin"), 
  adminController.getOrderTimeline
);

// Subscription Management routes
router.get("/subscriptions", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getSubscriptions
);

router.get("/subscriptions/stats", 
  authenticate, 
  authorize("admin"), 
  adminController.getSubscriptionStats
);

router.put("/subscriptions/:id", 
  authenticate, 
  authorize("admin"), 
  validateSubscriptionUpdate, 
  adminController.updateSubscription
);

router.delete("/subscriptions/:id", 
  authenticate, 
  authorize("admin"), 
  adminController.deleteSubscription
);

router.post("/subscriptions/bulk", 
  authenticate, 
  authorize("admin"), 
  validateBulkOperation, 
  adminController.bulkSubscriptionOperation
);

// Flash Deal Management routes
router.get("/flash-deals", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getFlashDeals
);

router.get("/flash-deals/stats", 
  authenticate, 
  authorize("admin"), 
  adminController.getFlashDealStats
);

router.post("/flash-deals", 
  authenticate, 
  authorize("admin"), 
  validateFlashDealUpdate, 
  adminController.createFlashDeal
);

router.put("/flash-deals/:id", 
  authenticate, 
  authorize("admin"), 
  validateFlashDealUpdate, 
  adminController.updateFlashDeal
);

router.delete("/flash-deals/:id", 
  authenticate, 
  authorize("admin"), 
  adminController.deleteFlashDeal
);

router.post("/flash-deals/bulk", 
  authenticate, 
  authorize("admin"), 
  validateBulkOperation, 
  adminController.bulkFlashDealOperation
);

// Financial Management routes
router.get("/financial/revenue", 
  authenticate, 
  authorize("admin"), 
  validateAnalyticsQuery, 
  adminController.getRevenueData
);

router.get("/financial/commissions", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getCommissions
);

router.get("/financial/payouts", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getPayouts
);

router.post("/financial/payouts/:id/process", 
  authenticate, 
  authorize("admin"), 
  adminController.processPayout
);

router.get("/financial/stats", 
  authenticate, 
  authorize("admin"), 
  adminController.getFinancialStats
);

// Security & Audit routes
router.get("/security/activities", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  validateSecurityQuery, 
  adminController.getAdminActivities
);

router.get("/security/alerts", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getSecurityAlerts
);

router.get("/security/login-attempts", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getLoginAttempts
);

router.get("/security/overview", 
  authenticate, 
  authorize("admin"), 
  adminController.getSecurityOverview
);

router.post("/security/alerts/:id/resolve", 
  authenticate, 
  authorize("admin"), 
  adminController.resolveSecurityAlert
);

// System Settings routes
router.get("/settings", 
  authenticate, 
  authorize("admin"), 
  adminController.getSystemSettings
);

router.put("/settings", 
  authenticate, 
  authorize("admin"), 
  validateSystemSettings, 
  adminController.updateSystemSettings
);

router.post("/settings/backup", 
  authenticate, 
  authorize("admin"), 
  adminController.createBackup
);

router.get("/settings/backups", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getBackups
);

router.post("/settings/restore/:id", 
  authenticate, 
  authorize("admin"), 
  adminController.restoreBackup
);

router.get("/settings/logs", 
  authenticate, 
  authorize("admin"), 
  validatePagination, 
  adminController.getSystemLogs
);

// Analytics routes
router.get("/analytics", 
  authenticate, 
  authorize("admin"), 
  validateAnalyticsQuery, 
  adminController.getAnalytics
);

router.get("/analytics/dashboard", 
  authenticate, 
  authorize("admin"), 
  adminController.getDashboardAnalytics
);

router.get("/analytics/export", 
  authenticate, 
  authorize("admin"), 
  validateAnalyticsQuery, 
  adminController.exportAnalytics
);

router.get("/system/stats", 
  authenticate, 
  authorize("admin"), 
  adminController.getSystemStats
);

// Generic collection management routes
router.get("/:collection", 
  authenticate, 
  authorize("admin"), 
  validateCollection, 
  validatePagination, 
  adminController.getCollectionData
);

router.post("/:collection", 
  authenticate, 
  authorize("admin"), 
  validateCollection, 
  adminController.createCollectionItem
);

router.put("/:collection/:id", 
  authenticate, 
  authorize("admin"), 
  validateCollection, 
  adminController.updateCollectionItem
);

router.delete("/:collection/:id", 
  authenticate, 
  authorize("admin"), 
  validateCollection, 
  adminController.deleteCollectionItem
);

router.post("/:collection/bulk", 
  authenticate, 
  authorize("admin"), 
  validateCollection, 
  validateBulkOperation, 
  adminController.bulkOperation
);

export default router;