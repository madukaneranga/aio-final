import express from "express";
import { authenticate, authorize, optionalAuth } from "../middleware/auth.js";
import storeController from "../controllers/storeController.js";
import {
  validateCreateStore,
  validateStoreId,
  validateUpdateStore,
  validateProfileImage,
  validateVerificationDocs,
  validateSearchQuery,
  validateSearchBody,
} from "../validators/storeValidator.js";

const router = express.Router();



// Store routes
router.get("/", validateSearchQuery, storeController.getAllStores);
router.post("/listing", validateSearchBody, storeController.searchStores);
router.get("/featured/list", storeController.getFeaturedStores);
router.post("/", authenticate, authorize("store_owner"), validateCreateStore, storeController.createStore);
router.get("/:id", validateStoreId, storeController.getStoreById);
router.get("/:id/follow-check", optionalAuth, validateStoreId, storeController.checkFollowStatus);

router.put("/:id", authenticate, authorize("store_owner"), validateStoreId, validateUpdateStore, storeController.updateStore);
router.patch("/:id/views", validateStoreId, storeController.incrementViews);
router.put("/:id/profile-image", authenticate, authorize("store_owner"), validateStoreId, validateProfileImage, storeController.updateProfileImage);
router.get("/:storeId/item-count", validateStoreId, storeController.getItemCount);
router.put("/:id/verification-docs", authenticate, authorize("store_owner"), validateStoreId, validateVerificationDocs, storeController.updateVerificationDocs);
router.post("/:storeId/follow", authenticate, validateStoreId, storeController.toggleFollow);
export default router;
