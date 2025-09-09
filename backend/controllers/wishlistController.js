import Wishlist from "../models/Wishlist.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

class WishlistController {
  async formatWishlistItems(items) {
    return items.map((item) => ({
      _id: item._id,
      itemId: item.itemId,
      title: item.itemId?.title || "Item not found",
      description: item.itemId?.description || "",
      price: item.price,
      image: item.itemId?.images?.[0] || null,
      storeId: item.storeId,
      storeName: item.storeId?.name,
      storeImage: item.storeId?.profileImage,
      notes: item.notes,
      priority: item.priority,
      isAvailable: item.isAvailable,
      addedAt: item.addedAt,
      lastChecked: item.lastChecked,
    }));
  }

  async getWishlist(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      let wishlist = await Wishlist.findOne({ userId: req.user._id }).populate(
        "items.storeId",
        "name profileImage"
      );

      if (!wishlist) {
        wishlist = new Wishlist({ userId: req.user._id });
        await wishlist.save();
        await User.findByIdAndUpdate(req.user._id, { wishlistId: wishlist._id });
      }

      const formattedItems = await Promise.all(
        wishlist.items.map(async (item) => {
          let populatedItem = null;
          try {
            populatedItem = await Product.findById(item.itemId).select(
              "title price images category storeId description"
            );
          } catch (error) {
            logger.error(`Failed to populate wishlist item ${item.itemId}`, error);
          }

          return {
            _id: item._id,
            itemId: item.itemId,
            title: populatedItem?.title || item.title || "Item not available",
            description: populatedItem?.description || "",
            price: item.price,
            image: populatedItem?.images?.[0] || null,
            storeId: item.storeId,
            storeName: item.storeId?.name,
            storeImage: item.storeId?.profileImage,
            notes: item.notes,
            priority: item.priority,
            isAvailable: item.isAvailable,
            addedAt: item.addedAt,
            lastChecked: item.lastChecked,
          };
        })
      );

      res.json(successResponse({
        wishlist: {
          _id: wishlist._id,
          items: formattedItems,
          totalItems: wishlist.totalItems,
          categories: wishlist.categories,
          isPublic: wishlist.isPublic,
          shareToken: wishlist.shareToken,
        },
      }));
    } catch (error) {
      logger.error("Error fetching wishlist", error);
      res.status(500).json(errorResponse("Failed to fetch wishlist", 500, error.message));
    }
  }

  addToWishlist = async (req, res) => {
    logger.route(req.method, req.originalUrl);
    try {
      const { itemId, priority = "medium", notes = "" } = req.body;

      const item = await Product.findById(itemId);

      if (!item) {
        return res.status(404).json(errorResponse("Not found", 404));
      }

      let wishlist = await Wishlist.findOne({ userId: req.user._id });
      if (!wishlist) {
        wishlist = new Wishlist({ userId: req.user._id });
        await User.findByIdAndUpdate(req.user._id, { wishlistId: wishlist._id });
      }

      const existingItem = wishlist.items.find(
        (wItem) => wItem.itemId.toString() === itemId.toString()
      );

      if (existingItem) {
        return res.status(400).json(errorResponse("Item already in wishlist", 400));
      }

      const itemData = {
        itemId,
        price: item.price,
        storeId: item.storeId,
        priority,
        notes,
      };

      await wishlist.addItem(itemData);

      await wishlist.populate([
        {
          path: "items.itemId",
          select: "title price images category description",
        },
        {
          path: "items.storeId",
          select: "name profileImage",
        },
      ]);

      const formattedItems = this.formatWishlistItems(wishlist.items);

      res.json(successResponse({
        wishlist: {
          _id: wishlist._id,
          items: formattedItems,
          totalItems: wishlist.totalItems,
          categories: wishlist.categories,
          isPublic: wishlist.isPublic,
          shareToken: wishlist.shareToken,
        },
      }, "Item added to wishlist successfully"));
    } catch (error) {
      logger.error("Error adding to wishlist", error);
      res.status(500).json(errorResponse("Failed to add item to wishlist", 500, error.message));
    }
  }

  removeFromWishlist = async (req, res) => {
    logger.route(req.method, req.originalUrl);
    try {
      const { itemId } = req.params;

      const wishlist = await Wishlist.findOne({ userId: req.user._id });
      if (!wishlist) {
        return res.status(404).json(errorResponse("Wishlist not found", 404));
      }

      await wishlist.removeItem(itemId);

      await wishlist.populate([
        {
          path: "items.itemId",
          select: "title price images category description",
        },
        {
          path: "items.storeId",
          select: "name profileImage",
        },
      ]);

      const formattedItems = this.formatWishlistItems(wishlist.items);

      res.json(successResponse({
        wishlist: {
          _id: wishlist._id,
          items: formattedItems,
          totalItems: wishlist.totalItems,
          categories: wishlist.categories,
          isPublic: wishlist.isPublic,
          shareToken: wishlist.shareToken,
        },
      }, "Item removed from wishlist successfully"));
    } catch (error) {
      logger.error("Error removing from wishlist", error);
      res.status(500).json(errorResponse("Failed to remove item from wishlist", 500, error.message));
    }
  }

  async updateItemPriority(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { itemId } = req.params;
      const { priority } = req.body;

      const wishlist = await Wishlist.findOne({ userId: req.user._id });
      if (!wishlist) {
        return res.status(404).json(errorResponse("Wishlist not found", 404));
      }

      await wishlist.updateItemPriority(itemId, priority);

      res.json(successResponse(null, "Item priority updated successfully"));
    } catch (error) {
      logger.error("Error updating priority", error);
      res.status(500).json(errorResponse("Failed to update item priority", 500, error.message));
    }
  }

  async updateItemNotes(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { itemId } = req.params;
      const { notes } = req.body;

      const wishlist = await Wishlist.findOne({ userId: req.user._id });
      if (!wishlist) {
        return res.status(404).json(errorResponse("Wishlist not found", 404));
      }

      await wishlist.addItemNotes(itemId, notes);

      res.json(successResponse(null, "Item notes updated successfully"));
    } catch (error) {
      logger.error("Error updating notes", error);
      res.status(500).json(errorResponse("Failed to update item notes", 500, error.message));
    }
  }

  async moveToCart(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { itemId } = req.params;
      const { quantity = 1 } = req.body;

      const wishlist = await Wishlist.findOne({ userId: req.user._id });
      if (!wishlist) {
        return res.status(404).json(errorResponse("Wishlist not found", 404));
      }

      let cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        cart = new Cart({ userId: req.user._id });
        await User.findByIdAndUpdate(req.user._id, { cartId: cart._id });
      }

      await wishlist.moveToCart(itemId, cart, quantity);

      res.json(successResponse(null, "Item moved to cart successfully"));
    } catch (error) {
      logger.error("Error moving to cart", error);
      res.status(500).json(errorResponse("Failed to move item to cart", 500, error.message));
    }
  }

  filterWishlist = async (req, res) => {
    logger.route(req.method, req.originalUrl);
    try {
      const { priority, storeId } = req.query;

      const wishlist = await Wishlist.findOne({ userId: req.user._id })
        .populate({
          path: "items.itemId",
          select: "title price images category description",
        })
        .populate("items.storeId", "name profileImage");

      if (!wishlist) {
        return res.json(successResponse({
          items: [],
        }));
      }

      let filteredItems = wishlist.items;

      if (priority) {
        filteredItems = filteredItems.filter(
          (item) => item.priority === priority
        );
      }

      if (storeId) {
        filteredItems = filteredItems.filter(
          (item) => item.storeId._id.toString() === storeId
        );
      }

      const formattedItems = this.formatWishlistItems(filteredItems);

      res.json(successResponse({
        items: formattedItems,
        total: formattedItems.length,
      }));
    } catch (error) {
      logger.error("Error filtering wishlist", error);
      res.status(500).json(errorResponse("Failed to filter wishlist", 500, error.message));
    }
  }

  async shareWishlist(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const wishlist = await Wishlist.findOne({ userId: req.user._id });
      if (!wishlist) {
        return res.status(404).json(errorResponse("Wishlist not found", 404));
      }

      await wishlist.generateShareToken();

      res.json(successResponse({
        shareToken: wishlist.shareToken,
        shareUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/wishlist/shared/${wishlist.shareToken}`,
      }, "Wishlist sharing enabled"));
    } catch (error) {
      logger.error("Error sharing wishlist", error);
      res.status(500).json(errorResponse("Failed to share wishlist", 500, error.message));
    }
  }

  async removeSharing(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const wishlist = await Wishlist.findOne({ userId: req.user._id });
      if (!wishlist) {
        return res.status(404).json(errorResponse("Wishlist not found", 404));
      }

      await wishlist.removeShareToken();

      res.json(successResponse(null, "Wishlist sharing disabled"));
    } catch (error) {
      logger.error("Error removing share", error);
      res.status(500).json(errorResponse("Failed to disable sharing", 500, error.message));
    }
  }

  async getSharedWishlist(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { shareToken } = req.params;

      const wishlist = await Wishlist.findOne({
        shareToken,
        isPublic: true,
      })
        .populate({
          path: "items.itemId",
          select: "title price images category description",
        })
        .populate("items.storeId", "name profileImage")
        .populate("userId", "name profileImage");

      if (!wishlist) {
        return res.status(404).json(errorResponse("Shared wishlist not found or no longer public", 404));
      }

      const formattedItems = wishlist.items.map((item) => ({
        _id: item._id,
        itemId: item.itemId,
        title: item.itemId?.title || "Item not found",
        description: item.itemId?.description || "",
        price: item.price,
        image: item.itemId?.images?.[0] || null,
        storeId: item.storeId,
        storeName: item.storeId?.name,
        storeImage: item.storeId?.profileImage,
        priority: item.priority,
        addedAt: item.addedAt,
      }));

      res.json(successResponse({
        wishlist: {
          _id: wishlist._id,
          items: formattedItems,
          totalItems: wishlist.totalItems,
          owner: {
            name: wishlist.userId?.name,
            profileImage: wishlist.userId?.profileImage,
          },
        },
      }));
    } catch (error) {
      logger.error("Error fetching shared wishlist", error);
      res.status(500).json(errorResponse("Failed to fetch shared wishlist", 500, error.message));
    }
  }
}

export default new WishlistController();