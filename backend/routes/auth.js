import express from "express";
import { authenticate } from "../middleware/auth.js";
import authController from "../controllers/authController.js";
import { 
  validateRegister, 
  validateLogin, 
  validateGoogleAuth 
} from "../validators/authValidator.js";

const router = express.Router();

// Routes
router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);
router.post("/google", validateGoogleAuth, authController.googleAuth);
router.get("/me", authenticate, authController.getCurrentUser);
router.put("/switch-role", authenticate, authController.switchRole);
router.post("/logout", authController.logout);
router.post("/refresh", authenticate, authController.refreshToken);

export default router;