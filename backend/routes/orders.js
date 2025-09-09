import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import orderController from "../controllers/orderController.js";
import {
  validateOrderId,
  validateOrderStatusUpdate,
  validatePaymentStatusUpdate,
  validateCustomerAccess,
  validateStoreOwnerAccess,
} from "../validators/orderValidator.js";

const router = express.Router();

// Customer order routes
router.get("/", authenticate, orderController.getCustomerOrders);

// Store owner order routes
router.get("/store", authenticate, authorize("store_owner"), orderController.getStoreOrders);

// Get order by ID
router.get("/:id", authenticate, validateOrderId, orderController.getOrderById);

// Update order status (store owners only)
router.put("/:id/status", authenticate, authorize("store_owner"), validateOrderId, validateOrderStatusUpdate, orderController.updateOrderStatus);

// Customer order actions
router.put("/:id/mark-delivered", authenticate, validateOrderId, orderController.markOrderDelivered);
router.put("/:id/mark-payment-sent", authenticate, validateOrderId, orderController.markPaymentSent);
router.put("/:id/confirm-delivery", authenticate, validateOrderId, orderController.confirmDelivery);

// Store owner payment status updates
router.put("/:id/update-payment-status", authenticate, authorize("store_owner"), validateOrderId, validatePaymentStatusUpdate, orderController.updatePaymentStatus);

export default router;
