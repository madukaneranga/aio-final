import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import reviewController from "../controllers/reviewController.js";
import {
  validateStoreId,
  validateProductId,
  validateReviewId,
  validateCreateReview,
  validateUpdateVisibility,
  validateReviewResponse,
} from "../validators/reviewValidator.js";

const router = express.Router();

// Review routes
router.get("/store/:storeId", validateStoreId, reviewController.getStoreReviews);
router.get("/product/:productId", validateProductId, reviewController.getProductReviews);
router.get("/manage", authenticate, authorize("store_owner"), reviewController.getManageReviews);
router.post("/", authenticate, authorize("customer"), validateCreateReview, reviewController.createReview);
router.put("/:id/visibility", authenticate, authorize("store_owner"), validateReviewId, validateUpdateVisibility, reviewController.updateReviewVisibility);
router.put("/:id/respond", authenticate, authorize("store_owner"), validateReviewId, validateReviewResponse, reviewController.respondToReview);

export default router;