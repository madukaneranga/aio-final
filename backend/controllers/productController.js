import productService from "../services/productService.js";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "../utils/responseFormatter.js";
import logger from "../utils/logger.js";

class ProductController {
  /**
   * Get all active products
   */
  async getAllProducts(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { category, search, minPrice, maxPrice, storeId } = req.query;
      const filters = { category, search, minPrice, maxPrice, storeId };

      const products = await productService.getAllProducts(filters, req.user);
      res.json(successResponse(products));
    } catch (error) {
      logger.error("Failed to get products", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Search/filter products with pagination
   */
  async searchProducts(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const searchParams = { ...req.body, user: req.user };
      const result = await productService.searchProducts(searchParams);

      res.json(
        successResponse({
          products: result.products,
          total: result.pagination.totalProducts,
          pagination: result.pagination,
        })
      );
    } catch (error) {
      logger.error("Product search failed", error);
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            500,
            "An error occurred while fetching products"
          )
        );
    }
  }

  /**
   * Search products for sale (with discount sorting)
   */
  async saleProducts(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const searchParams = { ...req.body, user: req.user, sortBy: "discount" };
      const result = await productService.searchProducts(searchParams);

      res.json(paginatedResponse(result.products, result.pagination));
    } catch (error) {
      logger.error("Sale products search failed", error);
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            500,
            "An error occurred while fetching products"
          )
        );
    }
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const result = await productService.getTrendingProducts(15);
      res.json(successResponse(result));
    } catch (error) {
      logger.error("Failed to fetch trending products", error);
      res.status(500).json(errorResponse("Failed to fetch trending products"));
    }
  }

  /**
   * Get product recommendations
   */
  async getRecommendations(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const {
        categories,
        category,
        exclude,
        storeId,
        limit = 8,
        sort = "recent",
      } = req.query;
      const params = { categories, category, exclude, storeId, limit, sort };

      const recommendations = await productService.getRecommendations(params);
      res.json(successResponse(recommendations));
    } catch (error) {
      logger.error("Failed to fetch product recommendations", error);
      res
        .status(500)
        .json(errorResponse("Failed to fetch product recommendations"));
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);
      res.json(successResponse(product));
    } catch (error) {
      if (error.message === "Product not found") {
        logger.error("Product not found", { id: req.params.id });
        return res.status(404).json(errorResponse("Product not found", 404));
      }

      logger.error("Failed to get product", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Create product
   */
  async createProduct(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const product = await productService.createProduct(
        req.body,
        req.user._id
      );
      res
        .status(201)
        .json(successResponse(product, "Product created successfully", 201));
    } catch (error) {
      if (error.message.includes("Product store not found")) {
        logger.error("Store not found for product creation", {
          userId: req.user._id,
        });
        return res.status(403).json(errorResponse(error.message, 403));
      }

      logger.error("Failed to create product", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Update product
   */
  async updateProduct(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const updatedProduct = await productService.updateProduct(
        id,
        req.body,
        req.user._id
      );
      res.json(successResponse(updatedProduct, "Product updated successfully"));
    } catch (error) {
      if (error.message === "Product not found") {
        logger.error("Product not found for update", { id: req.params.id });
        return res.status(404).json(errorResponse("Product not found", 404));
      }

      if (error.message === "Access denied") {
        logger.error("Access denied for product update", {
          id: req.params.id,
          userId: req.user._id,
        });
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      logger.error("Failed to update product", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const result = await productService.deleteProduct(id, req.user._id);
      res.json(successResponse(null, result.message));
    } catch (error) {
      if (error.message === "Product not found") {
        logger.error("Product not found for deletion", { id: req.params.id });
        return res.status(404).json(errorResponse("Product not found", 404));
      }

      if (error.message === "Access denied") {
        logger.error("Access denied for product deletion", {
          id: req.params.id,
          userId: req.user._id,
        });
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      logger.error("Failed to delete product", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Increment product impression count
   */
  async incrementImpression(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json(errorResponse("Product ID required", 400));
      }

      const result = await productService.incrementImpression(productId);
      res.json(successResponse(result));
    } catch (error) {
      logger.error("Failed to increment impression", error);
      res.status(500).json(errorResponse(error.message));
    }
  }
}

export default new ProductController();
