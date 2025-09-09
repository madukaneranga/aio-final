import express from "express";
import { authenticate } from "../middleware/auth.js";
import wishlistController from "../controllers/wishlistController.js";
import {
  validateAddToWishlist,
  validateWishlistItemId,
  validateUpdatePriority,
  validateUpdateNotes,
  validateMoveToCart,
  validateWishlistFilter,
  validateShareToken,
} from "../validators/wishlistValidator.js";

const router = express.Router();

// Wishlist routes
router.get("/", authenticate, wishlistController.getWishlist);
router.post("/add", authenticate, validateAddToWishlist, wishlistController.addToWishlist);
router.delete("/remove/:itemId", authenticate, validateWishlistItemId, wishlistController.removeFromWishlist);
router.put("/priority/:itemId", authenticate, validateWishlistItemId, validateUpdatePriority, wishlistController.updateItemPriority);
router.put("/notes/:itemId", authenticate, validateWishlistItemId, validateUpdateNotes, wishlistController.updateItemNotes);
router.post("/move-to-cart/:itemId", authenticate, validateWishlistItemId, validateMoveToCart, wishlistController.moveToCart);
router.get("/filter", authenticate, validateWishlistFilter, wishlistController.filterWishlist);
router.post("/share", authenticate, wishlistController.shareWishlist);
router.delete("/share", authenticate, wishlistController.removeSharing);
router.get("/shared/:shareToken", validateShareToken, wishlistController.getSharedWishlist);

export default router;