// routes/categoryRoutes.js
import express from "express";
import Category from "../models/Category.js";

const router = express.Router();

// GET /api/categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.status(200).json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

export default router;
