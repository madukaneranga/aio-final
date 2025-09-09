import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

class CartController {
  async formatCartItems(activeItems) {
    return await Promise.all(
      activeItems.map(async (item) => {
        let populatedItem = null;
        try {
          populatedItem = await Product.findById(item.itemId).select("title price images category storeId");
        } catch (error) {
          logger.error(`Failed to populate product ${item.itemId}`, error);
        }

        return {
          _id: item._id,
          itemId: item.itemId,
          title: populatedItem?.title || item.title || "Product not available",
          price: item.price,
          quantity: item.quantity,
          image: populatedItem?.images?.[0] || null,
          variants: item.variants,
          storeId: item.storeId,
          storeName: item.storeId?.name,
          addedAt: item.addedAt,
        };
      })
    );
  }

  async getCart(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      let cart = await Cart.findOne({ userId: req.user._id })
        .populate("items.storeId", "name");

      if (!cart) {
        cart = new Cart({ userId: req.user._id });
        await cart.save();
        
        await User.findByIdAndUpdate(req.user._id, { cartId: cart._id });
      }

      const activeItems = cart.getActiveItems();
      const populatedItems = await this.formatCartItems(activeItems);

      res.json(successResponse({
        cart: {
          _id: cart._id,
          items: populatedItems,
          totalItems: cart.totalItems,
          totalValue: cart.totalValue,
          lastActivity: cart.lastActivity,
        },
      }));
    } catch (error) {
      logger.error("Error fetching cart", error);
      res.status(500).json(errorResponse("Failed to fetch cart", 500, error.message));
    }
  }

  async addToCart(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const {
        itemId,
        quantity = 1,
        variants,
      } = req.body;

      const product = await Product.findById(itemId);
      
      if (!product) {
        return res.status(404).json(errorResponse("Product not found", 404));
      }

      let cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        cart = new Cart({ userId: req.user._id });
        await User.findByIdAndUpdate(req.user._id, { cartId: cart._id });
      }

      const itemData = {
        itemId,
        quantity,
        price: product.price,
        title: product.title,
        storeId: product.storeId,
        variants,
      };

      await cart.addItem(itemData);

      await cart.populate("items.storeId", "name");

      const activeItems = cart.getActiveItems();
      const formattedItems = await this.formatCartItems(activeItems);

      res.json(successResponse({
        cart: {
          _id: cart._id,
          items: formattedItems,
          totalItems: cart.totalItems,
          totalValue: cart.totalValue,
          lastActivity: cart.lastActivity,
        },
      }, "Product added to cart successfully"));
    } catch (error) {
      logger.error("Error adding to cart", error);
      res.status(500).json(errorResponse("Failed to add product to cart", 500, error.message));
    }
  }

  async updateCartItem(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (quantity < 0) {
        return res.status(400).json(errorResponse("Quantity cannot be negative", 400));
      }

      const cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        return res.status(404).json(errorResponse("Cart not found", 404));
      }

      const item = cart.items.find(
        item => item._id.toString() === itemId.toString() && item.isActive
      );
      
      if (!item) {
        return res.status(404).json(errorResponse("Product not found in cart", 404));
      }

      await cart.updateItemQuantity(itemId, quantity);

      await cart.populate("items.storeId", "name");

      const activeItems = cart.getActiveItems();
      const formattedItems = await this.formatCartItems(activeItems);

      res.json(successResponse({
        cart: {
          _id: cart._id,
          items: formattedItems,
          totalItems: cart.totalItems,
          totalValue: cart.totalValue,
          lastActivity: cart.lastActivity,
        },
      }, "Cart updated successfully"));
    } catch (error) {
      logger.error("Error updating cart", error);
      res.status(500).json(errorResponse("Failed to update cart", 500, error.message));
    }
  }

  async removeFromCart(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { itemId } = req.params;
      const { permanent = false } = req.query;

      const cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        return res.status(404).json(errorResponse("Cart not found", 404));
      }

      await cart.removeItem(itemId, !permanent);

      await cart.populate("items.storeId", "name");

      const activeItems = cart.getActiveItems();
      const formattedItems = await this.formatCartItems(activeItems);

      res.json(successResponse({
        cart: {
          _id: cart._id,
          items: formattedItems,
          totalItems: cart.totalItems,
          totalValue: cart.totalValue,
          lastActivity: cart.lastActivity,
        },
      }, "Product removed from cart successfully"));
    } catch (error) {
      logger.error("Error removing from cart", error);
      res.status(500).json(errorResponse("Failed to remove product from cart", 500, error.message));
    }
  }

  async clearCart(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { permanent = false } = req.query;

      const cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        return res.status(404).json(errorResponse("Cart not found", 404));
      }

      await cart.clearCart(permanent !== "true");

      res.json(successResponse({
        cart: {
          _id: cart._id,
          items: [],
          totalItems: 0,
          totalValue: 0,
          lastActivity: cart.lastActivity,
        },
      }, "Cart cleared successfully"));
    } catch (error) {
      logger.error("Error clearing cart", error);
      res.status(500).json(errorResponse(
        "Failed to clear cart",
        500,
        process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      ));
    }
  }

  async getCartState(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const cart = await Cart.findOne({ userId: req.user._id });
      
      if (!cart) {
        return res.json(successResponse({
          state: {
            isEmpty: true,
            totalItems: 0,
          },
        }));
      }

      const activeItems = cart.getActiveItems();

      res.json(successResponse({
        state: {
          isEmpty: activeItems.length === 0,
          totalItems: cart.totalItems,
          productCount: activeItems.length,
        },
      }));
    } catch (error) {
      logger.error("Error getting cart state", error);
      res.status(500).json(errorResponse("Failed to get cart state", 500, error.message));
    }
  }

  async getCartAnalytics(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { days = 30 } = req.query;

      const cart = await Cart.findOne({ userId: req.user._id })
        .populate({
          path: "items.itemId",
          select: "title price category",
        });

      if (!cart) {
        return res.json(successResponse({
          analytics: {
            removedItems: [],
            totalRemoved: 0,
            totalValueLost: 0,
          },
        }));
      }

      const removedItems = cart.getRemovedItems(parseInt(days));
      const totalValueLost = removedItems.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      res.json(successResponse({
        analytics: {
          removedItems: removedItems.map(item => ({
            _id: item._id,
            title: item.itemId?.title || "Item not found",
            price: item.price,
            quantity: item.quantity,
            removedAt: item.removedAt,
            totalValue: item.price * item.quantity,
          })),
          totalRemoved: removedItems.length,
          totalValueLost,
        },
      }));
    } catch (error) {
      logger.error("Error fetching cart analytics", error);
      res.status(500).json(errorResponse("Failed to fetch cart analytics", 500, error.message));
    }
  }
}

const cartController = new CartController();

// Bind methods to preserve 'this' context
cartController.getCart = cartController.getCart.bind(cartController);
cartController.addToCart = cartController.addToCart.bind(cartController);
cartController.updateCartItem = cartController.updateCartItem.bind(cartController);
cartController.removeFromCart = cartController.removeFromCart.bind(cartController);
cartController.clearCart = cartController.clearCart.bind(cartController);
cartController.getCartState = cartController.getCartState.bind(cartController);
cartController.getCartAnalytics = cartController.getCartAnalytics.bind(cartController);

export default cartController;