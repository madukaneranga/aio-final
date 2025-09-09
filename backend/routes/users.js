import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import userController from "../controllers/userController.js";
import {
  validateUserSearch,
  validateUpdateProfile,
  validateVerificationUpload,
} from "../validators/userValidator.js";


const router = express.Router();



// User routes
router.get("/", authenticate, authorize("admin"), validateUserSearch, userController.getAllUsers);
router.get("/profile", authenticate, userController.getUserProfile);
router.put("/profile", authenticate, validateUpdateProfile, userController.updateUserProfile);
router.get("/usage-summary", authenticate, userController.getUsageSummary);
router.post("/upload-verification", authenticate, validateVerificationUpload, userController.uploadVerification);
router.get("/verification-status", authenticate, userController.getVerificationStatus);

export default router;
