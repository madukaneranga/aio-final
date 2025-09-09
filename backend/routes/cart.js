import express from "express";
import { authenticate } from "../middleware/auth.js";
import cartController from "../controllers/cartController.js";
import {
  validateAddToCart,
  validateUpdateQuantity,
  validateCartItemId,
  validateAnalyticsDays,
} from "../validators/cartValidator.js";

const router = express.Router();

// Cart routes
router.get("/", authenticate, cartController.getCart);
router.post("/add", authenticate, validateAddToCart, cartController.addToCart);
router.put("/update/:itemId", authenticate, validateCartItemId, validateUpdateQuantity, cartController.updateCartItem);
router.delete("/remove/:itemId", authenticate, validateCartItemId, cartController.removeFromCart);
router.delete("/clear", authenticate, cartController.clearCart);
router.get("/state", authenticate, cartController.getCartState);
router.get("/analytics", authenticate, validateAnalyticsDays, cartController.getCartAnalytics);

export default router;