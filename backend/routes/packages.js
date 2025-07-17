// routes/packageRoutes.js (or similar)
import express from "express";
import Package from "../models/Package.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// ✅ Main route to get all packages
router.get("/", authenticate, async (req, res) => {
  try {
    const packages = await Package.find().sort({ amount: 1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch packages" });
  }
});

export default router;
