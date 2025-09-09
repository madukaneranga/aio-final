import Category from "../models/Category.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

class CategoryController {
  async getCategories(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const categories = await Category.find().lean();
      res.json(successResponse(categories));
    } catch (err) {
      logger.error("Error fetching categories", err);
      res.status(500).json(errorResponse("Failed to fetch categories"));
    }
  }
}

export default new CategoryController();