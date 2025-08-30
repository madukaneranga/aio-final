import express from "express";
import Wishlist from "../models/Wishlist.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get user's wishlist
router.get("/", authenticate, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ userId: req.user._id })
      .populate("items.storeId", "name profileImage");

    if (!wishlist) {
      wishlist = new Wishlist({ userId: req.user._id });
      await wishlist.save();
      
      // Update user reference
      await User.findByIdAndUpdate(req.user._id, { wishlistId: wishlist._id });
    }

    // Manually populate itemId based on itemType
    const formattedItems = await Promise.all(
      wishlist.items.map(async (item) => {
        let populatedItem = null;
        try {
          if (item.itemType === 'product') {
            populatedItem = await Product.findById(item.itemId).select("title price images category storeId description");
          } else if (item.itemType === 'service') {
            populatedItem = await Service.findById(item.itemId).select("title price images category storeId description");
          }
        } catch (error) {
          console.warn(`Failed to populate wishlist item ${item.itemId}:`, error.message);
        }

        return {
          _id: item._id,
          itemType: item.itemType,
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

    res.json({
      success: true,
      wishlist: {
        _id: wishlist._id,
        items: formattedItems,
        totalItems: wishlist.totalItems,
        categories: wishlist.categories,
        isPublic: wishlist.isPublic,
        shareToken: wishlist.shareToken,
      },
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
      error: error.message,
    });
  }
});

// Add item to wishlist
router.post("/add", authenticate, async (req, res) => {
  try {
    const {
      itemType,
      itemId,
      priority = "medium",
      notes = "",
    } = req.body;

    // Validate item exists
    const Model = itemType === "product" ? Product : Service;
    const item = await Model.findById(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} not found`,
      });
    }

    // Get or create wishlist
    let wishlist = await Wishlist.findOne({ userId: req.user._id });
    if (!wishlist) {
      wishlist = new Wishlist({ userId: req.user._id });
      await User.findByIdAndUpdate(req.user._id, { wishlistId: wishlist._id });
    }

    // Check if item already exists
    const existingItem = wishlist.items.find(
      wItem => 
        wItem.itemId.toString() === itemId.toString() &&
        wItem.itemType === itemType
    );

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: "Item already in wishlist",
      });
    }

    // Add item to wishlist
    const itemData = {
      itemType,
      itemId,
      price: item.price,
      storeId: item.storeId,
      priority,
      notes,
    };

    await wishlist.addItem(itemData);

    // Populate and return updated wishlist
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

    const formattedItems = wishlist.items.map(item => ({
      _id: item._id,
      itemType: item.itemType,
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

    res.json({
      success: true,
      message: "Item added to wishlist successfully",
      wishlist: {
        _id: wishlist._id,
        items: formattedItems,
        totalItems: wishlist.totalItems,
        categories: wishlist.categories,
        isPublic: wishlist.isPublic,
        shareToken: wishlist.shareToken,
      },
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add item to wishlist",
      error: error.message,
    });
  }
});

// Remove item from wishlist
router.delete("/remove/:itemId", authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;

    const wishlist = await Wishlist.findOne({ userId: req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    await wishlist.removeItem(itemId);

    // Populate and return updated wishlist
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

    const formattedItems = wishlist.items.map(item => ({
      _id: item._id,
      itemType: item.itemType,
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

    res.json({
      success: true,
      message: "Item removed from wishlist successfully",
      wishlist: {
        _id: wishlist._id,
        items: formattedItems,
        totalItems: wishlist.totalItems,
        categories: wishlist.categories,
        isPublic: wishlist.isPublic,
        shareToken: wishlist.shareToken,
      },
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove item from wishlist",
      error: error.message,
    });
  }
});

// Update item priority
router.put("/priority/:itemId", authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { priority } = req.body;

    if (!["low", "medium", "high"].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority. Must be low, medium, or high",
      });
    }

    const wishlist = await Wishlist.findOne({ userId: req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    await wishlist.updateItemPriority(itemId, priority);

    res.json({
      success: true,
      message: "Item priority updated successfully",
    });
  } catch (error) {
    console.error("Error updating priority:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update item priority",
      error: error.message,
    });
  }
});

// Update item notes
router.put("/notes/:itemId", authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { notes } = req.body;

    const wishlist = await Wishlist.findOne({ userId: req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    await wishlist.addItemNotes(itemId, notes);

    res.json({
      success: true,
      message: "Item notes updated successfully",
    });
  } catch (error) {
    console.error("Error updating notes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update item notes",
      error: error.message,
    });
  }
});

// Move item from wishlist to cart
router.post("/move-to-cart/:itemId", authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity = 1, bookingDetails } = req.body;

    const wishlist = await Wishlist.findOne({ userId: req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = new Cart({ userId: req.user._id });
      await User.findByIdAndUpdate(req.user._id, { cartId: cart._id });
    }

    await wishlist.moveToCart(itemId, cart, quantity, bookingDetails);

    res.json({
      success: true,
      message: "Item moved to cart successfully",
    });
  } catch (error) {
    console.error("Error moving to cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to move item to cart",
      error: error.message,
    });
  }
});

// Get wishlist by filters
router.get("/filter", authenticate, async (req, res) => {
  try {
    const { itemType, priority, storeId } = req.query;

    const wishlist = await Wishlist.findOne({ userId: req.user._id })
      .populate({
        path: "items.itemId",
        select: "title price images category description",
      })
      .populate("items.storeId", "name profileImage");

    if (!wishlist) {
      return res.json({
        success: true,
        items: [],
      });
    }

    let filteredItems = wishlist.items;

    if (itemType) {
      filteredItems = filteredItems.filter(item => item.itemType === itemType);
    }

    if (priority) {
      filteredItems = filteredItems.filter(item => item.priority === priority);
    }

    if (storeId) {
      filteredItems = filteredItems.filter(item => 
        item.storeId._id.toString() === storeId
      );
    }

    const formattedItems = filteredItems.map(item => ({
      _id: item._id,
      itemType: item.itemType,
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

    res.json({
      success: true,
      items: formattedItems,
      total: formattedItems.length,
    });
  } catch (error) {
    console.error("Error filtering wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to filter wishlist",
      error: error.message,
    });
  }
});

// Share wishlist
router.post("/share", authenticate, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    await wishlist.generateShareToken();

    res.json({
      success: true,
      message: "Wishlist sharing enabled",
      shareToken: wishlist.shareToken,
      shareUrl: `${process.env.FRONTEND_URL}/wishlist/shared/${wishlist.shareToken}`,
    });
  } catch (error) {
    console.error("Error sharing wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to share wishlist",
      error: error.message,
    });
  }
});

// Remove sharing
router.delete("/share", authenticate, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    await wishlist.removeShareToken();

    res.json({
      success: true,
      message: "Wishlist sharing disabled",
    });
  } catch (error) {
    console.error("Error removing share:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disable sharing",
      error: error.message,
    });
  }
});

// View shared wishlist (public)
router.get("/shared/:shareToken", async (req, res) => {
  try {
    const { shareToken } = req.params;

    const wishlist = await Wishlist.findOne({ 
      shareToken, 
      isPublic: true 
    })
      .populate({
        path: "items.itemId",
        select: "title price images category description",
      })
      .populate("items.storeId", "name profileImage")
      .populate("userId", "name profileImage");

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Shared wishlist not found or no longer public",
      });
    }

    const formattedItems = wishlist.items.map(item => ({
      _id: item._id,
      itemType: item.itemType,
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

    res.json({
      success: true,
      wishlist: {
        _id: wishlist._id,
        items: formattedItems,
        totalItems: wishlist.totalItems,
        owner: {
          name: wishlist.userId?.name,
          profileImage: wishlist.userId?.profileImage,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching shared wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shared wishlist",
      error: error.message,
    });
  }
});

export default router;