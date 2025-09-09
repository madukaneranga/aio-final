import Product from "../models/Product.js";
import Store from "../models/Store.js";
import SearchHistory from "../models/SearchHistory.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

class ProductService {
  /**
   * Get all active products with optional filters
   */
  async getAllProducts(filters = {}, user = null) {
    try {
      const { category, search, minPrice, maxPrice, storeId } = filters;
      let query = { isActive: true };

      if (category) query.category = category;
      if (storeId) query.storeId = storeId;
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];

        // Save search to history
        await this.saveSearchToHistory(user, search.trim());
      }

      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      const products = await Product.find(query)
        .populate("storeId", "name")
        .sort({ createdAt: -1 });

      return products;
    } catch (error) {
      logger.error("Error getting products", error);
      throw error;
    }
  }

  /**
   * Search/filter products with pagination
   */
  async searchProducts(searchParams) {
    try {
      const {
        search,
        category,
        subcategory,
        childCategory,
        stock,
        rating,
        shipping,
        condition,
        warrantyMonths,
        minPrice,
        maxPrice,
        page = 1,
        limit = 20,
        sortBy = "recent",
        user = null
      } = searchParams;

      // Build the base query
      const query = { isActive: true };

      // Category filters (hierarchical)
      if (childCategory) query.childCategory = childCategory;
      else if (subcategory) query.subcategory = subcategory;
      else if (category) query.category = category;

      // Stock filter
      if (stock) {
        if (stock === "in") {
          query.stock = { $gt: 0 };
        }
        if (stock === "out") {
          query.stock = { $eq: 0 };
        }
      }

      // Other filters
      if (rating) query.rating = { $gte: rating };
      if (shipping) query.shipping = shipping;
      if (condition) query.condition = condition;
      if (warrantyMonths) query.warrentyMonths = { $gte: warrantyMonths };

      // Search filter (title and description)
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];

        await this.saveSearchToHistory(user, search.trim());
      }

      // Price range filter
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      // Calculate pagination
      const pageNumber = parseInt(page);
      const pageSize = parseInt(limit);
      const skip = (pageNumber - 1) * pageSize;

      // Determine sort options
      let sortOptions = { createdAt: -1 }; // Default: newest first
      if (sortBy === "discount") {
        sortOptions = { discount: -1, createdAt: -1 };
      }

      // Execute queries in parallel for better performance
      const [products, totalCount] = await Promise.all([
        Product.find(query)
          .populate("storeId", "name")
          .sort(sortOptions)
          .skip(skip)
          .limit(pageSize)
          .lean(),
        Product.countDocuments(query),
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / pageSize);
      const hasMore = pageNumber < totalPages;
      const hasPrevious = pageNumber > 1;

      return {
        products,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalProducts: totalCount,
          productsPerPage: pageSize,
          hasMore,
          hasPrevious,
          startIndex: skip + 1,
          endIndex: Math.min(skip + pageSize, totalCount),
        },
        total: totalCount,
        hasMore
      };
    } catch (error) {
      logger.error("Error searching products", error);
      throw error;
    }
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(limit = 15) {
    try {
      const products = await Product.find({ isActive: true })
        .populate("storeId", "name")
        .limit(limit)
        .lean();

      return { products };
    } catch (error) {
      logger.error("Error getting trending products", error);
      throw error;
    }
  }

  /**
   * Get product recommendations
   */
  async getRecommendations(params) {
    try {
      const { categories, category, exclude, storeId, limit = 8, sort = "recent" } = params;
      let query = { isActive: true };

      // Handle categories (comma-separated)
      if (categories) {
        const categoryList = categories.split(",").map(cat => cat.trim()).filter(Boolean);
        if (categoryList.length > 0) {
          query.category = { $in: categoryList };
        }
      } else if (category) {
        query.category = category;
      }

      // Handle store filter
      if (storeId) {
        query.storeId = storeId;
      }

      // Handle exclusions (comma-separated IDs)
      if (exclude) {
        const excludeIds = exclude.split(",").map(id => id.trim()).filter(Boolean);
        if (excludeIds.length > 0) {
          query._id = { $nin: excludeIds };
        }
      }

      // Build sort options
      let sortOptions = { createdAt: -1 };
      if (sort === "popular") {
        sortOptions = { orderCount: -1, rating: -1, createdAt: -1 };
      } else if (sort === "rating") {
        sortOptions = { rating: -1, createdAt: -1 };
      } else if (sort === "price_low") {
        sortOptions = { price: 1 };
      } else if (sort === "price_high") {
        sortOptions = { price: -1 };
      }

      const recommendations = await Product.find(query)
        .populate("storeId", "name")
        .sort(sortOptions)
        .limit(parseInt(limit))
        .lean();

      return recommendations;
    } catch (error) {
      logger.error("Error getting product recommendations", error);
      throw error;
    }
  }

  /**
   * Get product by ID and increment view count
   */
  async getProductById(id) {
    try {
      const product = await Product.findByIdAndUpdate(
        id,
        { $inc: { "stats.views": 1 } },
        { new: true }
      );

      if (!product) {
        throw new Error("Product not found");
      }

      return product;
    } catch (error) {
      logger.error("Error getting product by ID", error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async createProduct(productData, userId) {
    try {
      const {
        title,
        description,
        price,
        oldPrice,
        category,
        subcategory,
        childCategory,
        stock,
        images,
        variants,
        isPreorder = false,
        shipping,
        condition,
        warrentyMonths = 0,
        discount = 0,
        tags = [],
      } = productData;

      // Verify store ownership
      const store = await Store.findOne({
        ownerId: userId,
        isActive: true,
      });

      if (!store) {
        throw new Error("Product store not found. You need a product store to create products.");
      }

      // Calculate total stock
      let totalStock = 0;
      if (variants && variants.length > 0) {
        totalStock = variants.reduce(
          (acc, variant) => acc + (parseInt(variant.stock) || 0),
          0
        );
      } else {
        totalStock = parseInt(stock) || 0;
      }

      const product = new Product({
        title,
        description,
        price: parseFloat(price),
        oldPrice: oldPrice ? parseFloat(oldPrice) : undefined,
        category: category || "",
        subcategory: subcategory || "",
        childCategory: childCategory || "",
        stock: totalStock,
        images,
        isPreorder,
        shipping: shipping || "",
        condition: condition || "",
        warrentyMonths: parseInt(warrentyMonths) || 0,
        orderCount: 0,
        storeId: store._id,
        ownerId: userId,
        variants: variants && variants.length > 0 ? variants : [],
        discount: discount || 0,
        tags: tags || [],
      });

      await product.save();
      return product;
    } catch (error) {
      logger.error("Error creating product", error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId, updates, userId) {
    try {
      const product = await Product.findById(productId).populate("storeId");

      if (!product) {
        throw new Error("Product not found");
      }

      if (product.storeId.ownerId.toString() !== userId.toString()) {
        throw new Error("Access denied");
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        updates,
        { new: true, runValidators: true }
      );

      return updatedProduct;
    } catch (error) {
      logger.error("Error updating product", error);
      throw error;
    }
  }

  /**
   * Delete (deactivate) product
   */
  async deleteProduct(productId, userId) {
    try {
      const product = await Product.findById(productId).populate("storeId");

      if (!product) {
        throw new Error("Product not found");
      }

      if (product.storeId.ownerId.toString() !== userId.toString()) {
        throw new Error("Access denied");
      }

      await Product.findByIdAndUpdate(productId, { isActive: false });
      return { message: "Product deleted successfully" };
    } catch (error) {
      logger.error("Error deleting product", error);
      throw error;
    }
  }

  /**
   * Increment product impression count
   */
  async incrementImpression(productId) {
    try {
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { "stats.impressions": 1 } }
      );

      return { success: true };
    } catch (error) {
      logger.error("Error incrementing impression", error);
      throw error;
    }
  }

  /**
   * Save search query to history
   */
  async saveSearchToHistory(user, query) {
    try {
      // Don't save empty or very short queries
      if (!query || query.length < 3) return;

      let searchHistory;

      if (user && user.isGuest) {
        // Check if this exact query already exists for this guest recently (last 24 hours)
        const existingSearch = await SearchHistory.findOne({
          guestId: user.guestId,
          query: query,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        if (!existingSearch) {
          searchHistory = await SearchHistory.create({
            guestId: user.guestId,
            query: query,
          });
        }
      } else if (user && user._id) {
        // Check if this exact query already exists for this user recently (last 24 hours)
        const existingSearch = await SearchHistory.findOne({
          userId: user._id,
          query: query,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        if (!existingSearch) {
          searchHistory = await SearchHistory.create({
            userId: user._id,
            query: query,
          });

          // Add to user's searchHistory array
          await User.findByIdAndUpdate(user._id, {
            $push: { searchHistory: searchHistory._id },
          });
        }
      }
    } catch (error) {
      // Don't let search history errors break the search functionality
      logger.error("Error saving search history", error);
    }
  }
}

export default new ProductService();