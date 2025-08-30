import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get user's cart
router.get("/", authenticate, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id })
      .populate("items.storeId", "name");

    if (!cart) {
      cart = new Cart({ userId: req.user._id });
      await cart.save();
      
      // Update user reference
      await User.findByIdAndUpdate(req.user._id, { cartId: cart._id });
    }

    // Manually populate itemId based on itemType
    const activeItems = cart.getActiveItems();
    const populatedItems = await Promise.all(
      activeItems.map(async (item) => {
        let populatedItem = null;
        try {
          if (item.itemType === 'product') {
            populatedItem = await Product.findById(item.itemId).select("title price images category storeId");
          } else if (item.itemType === 'service') {
            populatedItem = await Service.findById(item.itemId).select("title price images category storeId");
          }
        } catch (error) {
          console.warn(`Failed to populate item ${item.itemId}:`, error.message);
        }

        return {
          _id: item._id,
          itemType: item.itemType,
          itemId: item.itemId,
          title: populatedItem?.title || item.title || "Item not available",
          price: item.price,
          quantity: item.quantity,
          image: populatedItem?.images?.[0] || null,
          bookingDetails: item.bookingDetails,
          variants: item.variants,
          storeId: item.storeId,
          storeName: item.storeId?.name,
          addedAt: item.addedAt,
        };
      })
    );

    res.json({
      success: true,
      cart: {
        _id: cart._id,
        items: populatedItems,
        totalItems: cart.totalItems,
        totalValue: cart.totalValue,
        lastActivity: cart.lastActivity,
      },
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
      error: error.message,
    });
  }
});

// Add item to cart
router.post("/add", authenticate, async (req, res) => {
  try {
    const {
      itemType,
      itemId,
      quantity = 1,
      bookingDetails,
      variants,
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

    // Get or create cart
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = new Cart({ userId: req.user._id });
      await User.findByIdAndUpdate(req.user._id, { cartId: cart._id });
    }

    // Validate the addition before proceeding
    const validation = cart.validateItemAddition(itemType);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message || "Cannot add item to cart",
      });
    }

    // Add item to cart with exclusive logic
    const itemData = {
      itemType,
      itemId,
      quantity: itemType === "service" ? 1 : quantity, // Force services to quantity 1
      price: item.price,
      title: item.title, // Include title for cleared items tracking
      storeId: item.storeId,
      bookingDetails: itemType === "service" ? bookingDetails : undefined,
      variants: itemType === "product" ? variants : undefined,
    };

    const result = await cart.addItem(itemData);
    const { cart: updatedCart, clearedItems, wasTypeSwitch } = result;

    // Populate storeId and manually populate itemId
    await cart.populate("items.storeId", "name");

    const activeItems = cart.getActiveItems();
    const formattedItems = await Promise.all(
      activeItems.map(async (item) => {
        let populatedItem = null;
        try {
          if (item.itemType === 'product') {
            populatedItem = await Product.findById(item.itemId).select("title price images category storeId");
          } else if (item.itemType === 'service') {
            populatedItem = await Service.findById(item.itemId).select("title price images category storeId");
          }
        } catch (error) {
          console.warn(`Failed to populate item ${item.itemId}:`, error.message);
        }

        return {
          _id: item._id,
          itemType: item.itemType,
          itemId: item.itemId,
          title: populatedItem?.title || item.title || "Item not available",
          price: item.price,
          quantity: item.quantity,
          image: populatedItem?.images?.[0] || null,
          bookingDetails: item.bookingDetails,
          variants: item.variants,
          storeId: item.storeId,
          storeName: item.storeId?.name,
          addedAt: item.addedAt,
        };
      })
    );

    // Generate appropriate message based on what happened
    let message = "Item added to cart successfully";
    let warnings = [];
    
    if (wasTypeSwitch && clearedItems.length > 0) {
      const currentItemType = itemType === 'product' ? 'products' : 'services';
      const clearedType = clearedItems[0].itemType === 'product' ? 'products' : 'services';
      const clearedCount = clearedItems.reduce((sum, item) => sum + item.quantity, 0);
      
      warnings.push(`${clearedCount} ${clearedType} were removed to add ${currentItemType}`);
      message = `Item added to cart. Previous ${clearedType} were cleared.`;
    }
    
    if (itemType === 'service' && clearedItems.some(item => item.itemType === 'service')) {
      warnings.push("Previous service booking was replaced");
      message = "Service booked. Previous service booking was replaced.";
    }

    res.json({
      success: true,
      message,
      warnings,
      clearedItems,
      wasTypeSwitch,
      cart: {
        _id: cart._id,
        items: formattedItems,
        totalItems: cart.totalItems,
        totalValue: cart.totalValue,
        lastActivity: cart.lastActivity,
        cartType: cart.getCartType(),
      },
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add item to cart",
      error: error.message,
    });
  }
});

// Update item quantity
router.put("/update/:itemId", authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity cannot be negative",
      });
    }

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Find the item to validate constraints
    const item = cart.items.find(
      item => item._id.toString() === itemId.toString() && item.isActive
    );
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Prevent quantity changes on services (they should always be 1)
    if (item.itemType === 'service' && quantity !== 1 && quantity !== 0) {
      return res.status(400).json({
        success: false,
        message: "Service bookings cannot have quantity changed. Remove and add again if needed.",
      });
    }

    await cart.updateItemQuantity(itemId, quantity);

    // Populate storeId and manually populate itemId
    await cart.populate("items.storeId", "name");

    const activeItems = cart.getActiveItems();
    const formattedItems = await Promise.all(
      activeItems.map(async (item) => {
        let populatedItem = null;
        try {
          if (item.itemType === 'product') {
            populatedItem = await Product.findById(item.itemId).select("title price images category storeId");
          } else if (item.itemType === 'service') {
            populatedItem = await Service.findById(item.itemId).select("title price images category storeId");
          }
        } catch (error) {
          console.warn(`Failed to populate item ${item.itemId}:`, error.message);
        }

        return {
          _id: item._id,
          itemType: item.itemType,
          itemId: item.itemId,
          title: populatedItem?.title || item.title || "Item not available",
          price: item.price,
          quantity: item.quantity,
          image: populatedItem?.images?.[0] || null,
          bookingDetails: item.bookingDetails,
          variants: item.variants,
          storeId: item.storeId,
          storeName: item.storeId?.name,
          addedAt: item.addedAt,
        };
      })
    );

    res.json({
      success: true,
      message: "Cart updated successfully",
      cart: {
        _id: cart._id,
        items: formattedItems,
        totalItems: cart.totalItems,
        totalValue: cart.totalValue,
        lastActivity: cart.lastActivity,
      },
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update cart",
      error: error.message,
    });
  }
});

// Remove item from cart
router.delete("/remove/:itemId", authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { permanent = false } = req.query;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    await cart.removeItem(itemId, !permanent);

    // Populate storeId and manually populate itemId
    await cart.populate("items.storeId", "name");

    const activeItems = cart.getActiveItems();
    const formattedItems = await Promise.all(
      activeItems.map(async (item) => {
        let populatedItem = null;
        try {
          if (item.itemType === 'product') {
            populatedItem = await Product.findById(item.itemId).select("title price images category storeId");
          } else if (item.itemType === 'service') {
            populatedItem = await Service.findById(item.itemId).select("title price images category storeId");
          }
        } catch (error) {
          console.warn(`Failed to populate item ${item.itemId}:`, error.message);
        }

        return {
          _id: item._id,
          itemType: item.itemType,
          itemId: item.itemId,
          title: populatedItem?.title || item.title || "Item not available",
          price: item.price,
          quantity: item.quantity,
          image: populatedItem?.images?.[0] || null,
          bookingDetails: item.bookingDetails,
          variants: item.variants,
          storeId: item.storeId,
          storeName: item.storeId?.name,
          addedAt: item.addedAt,
        };
      })
    );

    res.json({
      success: true,
      message: "Item removed from cart successfully",
      cart: {
        _id: cart._id,
        items: formattedItems,
        totalItems: cart.totalItems,
        totalValue: cart.totalValue,
        lastActivity: cart.lastActivity,
      },
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove item from cart",
      error: error.message,
    });
  }
});

// Clear entire cart
router.delete("/clear", authenticate, async (req, res) => {
  try {
    const { permanent = false } = req.query;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    await cart.clearCart(permanent !== "true");

    res.json({
      success: true,
      message: "Cart cleared successfully",
      cart: {
        _id: cart._id,
        items: [],
        totalItems: 0,
        totalValue: 0,
        lastActivity: cart.lastActivity,
      },
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
});

// Get cart state and validation info
router.get("/state", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      return res.json({
        success: true,
        state: {
          isEmpty: true,
          cartType: null,
          canAddProduct: true,
          canAddService: true,
          totalItems: 0,
          hasConflicts: false,
        },
      });
    }

    const cartType = cart.getCartType();
    const activeItems = cart.getActiveItems();

    res.json({
      success: true,
      state: {
        isEmpty: activeItems.length === 0,
        cartType,
        canAddProduct: cart.canAddItem('product'),
        canAddService: cart.canAddItem('service'),
        totalItems: cart.totalItems,
        hasConflicts: false,
        itemCount: {
          products: activeItems.filter(item => item.itemType === 'product').length,
          services: activeItems.filter(item => item.itemType === 'service').length,
        },
      },
    });
  } catch (error) {
    console.error("Error getting cart state:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get cart state",
      error: error.message,
    });
  }
});

// Get cart analytics (removed items)
router.get("/analytics", authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const cart = await Cart.findOne({ userId: req.user._id })
      .populate({
        path: "items.itemId",
        select: "title price category",
      });

    if (!cart) {
      return res.json({
        success: true,
        analytics: {
          removedItems: [],
          totalRemoved: 0,
          totalValueLost: 0,
        },
      });
    }

    const removedItems = cart.getRemovedItems(parseInt(days));
    const totalValueLost = removedItems.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    res.json({
      success: true,
      analytics: {
        removedItems: removedItems.map(item => ({
          _id: item._id,
          itemType: item.itemType,
          title: item.itemId?.title || "Item not found",
          price: item.price,
          quantity: item.quantity,
          removedAt: item.removedAt,
          totalValue: item.price * item.quantity,
        })),
        totalRemoved: removedItems.length,
        totalValueLost,
      },
    });
  } catch (error) {
    console.error("Error fetching cart analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart analytics",
      error: error.message,
    });
  }
});

export default router;