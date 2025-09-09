import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import SubscriptionController from "../controllers/subscriptionController.js";
import {
  validateCreateSubscription,
  validateUpgradeSubscription,
  validateCancelSubscription,
  validatePayHereIPN,
  validateRollbackUpgrade
} from "../validators/subscriptionValidator.js";

const router = express.Router();
const subscriptionController = new SubscriptionController();


router.get(
  "/subscription", 
  authenticate, 
  authorize("store_owner"), 
  subscriptionController.getSubscription
);

router.get(
  "/my-subscription", 
  authenticate, 
  authorize("store_owner"), 
  subscriptionController.getSubscription
);

router.post(
  "/", 
  authenticate, 
  authorize("store_owner"),
  validateCreateSubscription,
  subscriptionController.createSubscription
);

router.post(
  "/ipn",
  validatePayHereIPN,
  subscriptionController.handleIpnEvent
);

router.post(
  "/cancel", 
  authenticate, 
  authorize("store_owner"),
  validateCancelSubscription,
  subscriptionController.cancelSubscription
);

router.put(
  "/upgrade", 
  authenticate, 
  authorize("store_owner"),
  validateUpgradeSubscription,
  subscriptionController.upgradeSubscription
);

router.post(
  "/rollback", 
  authenticate, 
  authorize("store_owner"),
  validateRollbackUpgrade,
  subscriptionController.rollbackUpgrade
);

// ============ ADMIN ROUTES ============

router.get(
  "/admin/all",
  authenticate,
  authorize("admin"),
  subscriptionController.getAllSubscriptions
);

router.get(
  "/admin/stats",
  authenticate,
  authorize("admin"),
  subscriptionController.getSubscriptionStats
);

export default router;