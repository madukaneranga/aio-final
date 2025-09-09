// routes/packageRoutes.js (or similar)
import express from "express";
import Package from "../models/Package.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { getUserPackage } from "../utils/getUserPackage.js";

const router = express.Router();

// ✅ Main route to get all packages
router.get("/", authenticate, async (req, res) => {
  try {
    const packages = await Package.find().sort({ amount: 1 });
    res.json({
      data: packages,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch packages" });
  }
});

router.get(
  "/user-package",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const pkg = await getUserPackage(userId);
      res.json({ data: pkg, success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
