import express from "express";
import crypto from "crypto";
import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import Store from "../models/Store.js";
import Commission from "../models/Commission.js";
import Notification from "../models/Notification.js";
import { authenticate } from "../middleware/auth.js";
import { emitNotification } from "../utils/socketUtils.js";
import { v4 as uuidv4 } from "uuid";
import WalletTransaction from "../models/WalletTransaction.js";

const router = express.Router();

const PAYHERE_MERCHANT_ID = "1231188";
const PAYHERE_SECRET = "MTIyNzk3NjY4MTc4NjQ0ODM3NTQxOTczNzI2NjMzOTQwNTgwNjcy";
const PAYHERE_REFUND_URL = "https://payhere.lk/merchant/v1/refund";
const PAYHERE_APP_ID =
  process.env.PAYHERE_APP_ID || "4OVxzVJAbSK4JFnJjJNzoH3TV";
const PAYHERE_APP_SECRET =
  process.env.PAYHERE_APP_SECRET ||
  "8cJlAdroxID8n0No30NAwT8m22kmMKNW98cJlqgSYpMa";
const PAYHERE_OAUTH_URL = "https://payhere.lk/merchant/v1/oauth/token";

//checkout
router.post("/create-combined-intent", authenticate, async (req, res) => {
  try {
    const {
      orderItems = [],
      bookingItems = [],
      shippingAddress = {},
      paymentMethod,
    } = req.body;

    if (!paymentMethod || paymentMethod !== "payhere") {
      return res.status(400).json({ error: "Unsupported payment method" });
    }

    const generateTransactionId = (prefix = "TX", userId = "") =>
      `${prefix}-${Date.now()}-${userId}-${uuidv4()}`;

    const combinedId = generateTransactionId("SALE", req.user._id);
    let totalAmount = 0;
    let totalTransactionAmount = 0;

    const createdEntities = {
      order: [],
      bookings: [],
    };

    // --- Handle Orders ---
    if (orderItems.length > 0) {
      // Group order items by storeId
      const storeOrderMap = new Map();

      for (const item of orderItems) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res
            .status(404)
            .json({ error: `Product ${item.productId} not found` });
        }

        if (product.stock < item.quantity) {
          return res
            .status(400)
            .json({ error: `Insufficient stock for ${product.title}` });
        }

        const storeId =
          typeof item.storeId === "object"
            ? item.storeId._id.toString()
            : item.storeId.toString();

        if (!storeOrderMap.has(storeId)) {
          storeOrderMap.set(storeId, {
            items: [],
            totalAmount: 0,
          });
        }

        const storeData = storeOrderMap.get(storeId);

        storeData.items.push({
          productId: product._id,
          quantity: item.quantity,
          price: product.price,
        });

        storeData.totalAmount += product.price * item.quantity;
      }

      // Create one Order per store group
      for (const [storeId, storeData] of storeOrderMap.entries()) {
        const commissionRate = 0.05;
        const commissionAmount = storeData.totalAmount * commissionRate;
        const storeAmount = storeData.totalAmount - commissionAmount;

        const order = new Order({
          customerId: req.user._id,
          storeId,
          items: storeData.items,
          totalAmount: storeData.totalAmount,
          platformFee: commissionAmount.toFixed(2),
          storeAmount,
          shippingAddress,
          status: "pending",
          combinedId,
        });

        await order.save();

        // Increment product orderCount
        for (const item of storeData.items) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { "stats.orderCount": item.quantity } } // increment by qty
          );
        }

        const store = await Store.findById(storeId);

        if (order) {
          // Create sales transaction
          const transaction = new WalletTransaction({
            userId: store.ownerId,
            transactionId: combinedId,
            type: "sale",
            amount: storeAmount.toFixed(2),
            status: "pending",
            description: `Product payment of ${combinedId}`,
            withdrawalDetails: {
              processedAt: new Date(),
            },
          });

          await transaction.save();

          // Notify store owner about the order creation
          const storeNotification = await Notification.create({
            userId: store.ownerId,
            title: `New order received`,
            userType: "store_owner",
            body: `You have a new order with ID #${order._id
              .toString()
              .slice(-8)}`,
            type: "order_update",
            link: `/orders`,
          });

          emitNotification(store.ownerId.toString(), storeNotification);
        }

        createdEntities.order.push(order);
        totalAmount += storeData.totalAmount;
      }
    }

    // --- Handle Bookings ---
    if (bookingItems.length > 0) {
      for (const item of bookingItems) {
        const service = await Service.findById(item.serviceId);
        if (!service) {
          return res
            .status(404)
            .json({ error: `Service ${item.serviceId} not found` });
        }

        const serviceAmount = service.price;
        const commissionRate = 0.07;
        const commissionAmount = serviceAmount * commissionRate;
        const storeAmount = serviceAmount - commissionAmount;

        const booking = new Booking({
          customerId: req.user._id,
          storeId: service.storeId,
          serviceId: service._id,
          bookingDetails: item.bookingDetails,
          totalAmount: serviceAmount.toFixed(2),
          platformFee: commissionAmount.toFixed(2),
          storeAmount,
          status: "pending",
          combinedId,
        });

        await booking.save();

        
        // Increment service bookingCount
        await Service.findByIdAndUpdate(service._id, {
          $inc: { "stats.bookingCount": 1 },
        });

        const store = await Store.findById(service.storeId);

        if (booking) {
          // Create sales transaction
          const transaction = new WalletTransaction({
            userId: store.ownerId,
            transactionId: combinedId,
            type: "sale",
            amount: storeAmount.toFixed(2),
            status: "pending",
            description: `Product payment of ${combinedId}`,
            withdrawalDetails: {
              processedAt: new Date(),
            },
          });

          await transaction.save();

          // Notify store owner about the order creation
          const storeNotification = await Notification.create({
            userId: store.ownerId,
            title: `New Booking received`,
            userType: "store_owner",
            body: `You have a new booking with ID #${booking._id
              .toString()
              .slice(-8)}`,
            type: "booking_update",
            link: `/bookings`,
          });

          emitNotification(store.ownerId.toString(), storeNotification);
        }

        createdEntities.bookings.push(booking);
        totalAmount += serviceAmount;
      }
    }

    if (totalAmount <= 0) {
      return res
        .status(400)
        .json({ error: "Total amount must be greater than zero" });
    }

    // --- Prepare PayHere Payment ---
    const combinedItemLabel = `OrderAndBooking_${combinedId}`;

    const hash = generatePayHereHash({
      merchantId: PAYHERE_MERCHANT_ID,
      orderId: combinedId,
      amount: totalAmount.toFixed(2),
      currency: "LKR",
      merchantSecret: PAYHERE_SECRET,
    });

    const paymentParams = {
      sandbox: true, // for testing
      merchant_id: PAYHERE_MERCHANT_ID,
      return_url: "https://aiocart.lk",
      cancel_url: "https://aiocart.lk/checkout",
      notify_url:
        "https://aio-backend-x770.onrender.com/api/payments/payhere/ipn",
      order_id: combinedId,
      items: combinedItemLabel,
      currency: "LKR",
      amount: totalAmount.toFixed(2),
      first_name: req.user.firstName || "Customer",
      last_name: req.user.lastName || "Name",
      email: req.user.email || "no-reply@aiocart.lk",
      phone: req.user.phone || "0771234567",
      address: shippingAddress.street || "Unknown Address",
      city: shippingAddress.city || "Unknown City",
      country: "Sri Lanka",
      hash,
    };

    console.log("Payment Params generated for PayHere:", paymentParams);

    res.json({ success: true, paymentParams, combinedId, createdEntities });
  } catch (error) {
    console.error("Combined payment intent error:", error);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

function generatePayHereIPNHash({
  merchantId,
  orderId,
  amount,
  currency,
  statusCode,
  merchantSecret,
}) {
  const hashedSecret = crypto
    .createHash("md5")
    .update(merchantSecret)
    .digest("hex")
    .toUpperCase();

  const hashString =
    merchantId + orderId + amount + currency + statusCode + hashedSecret;

  console.log("Expected hash string:", hashString); // 🔍 Debug output

  const finalHash = crypto
    .createHash("md5")
    .update(hashString)
    .digest("hex")
    .toUpperCase();

  return finalHash;
}

function generatePayHereHash({
  merchantId,
  orderId,
  amount,
  currency,
  merchantSecret,
}) {
  // Coerce merchantSecret to string
  const secretStr = String(merchantSecret);

  const hashedSecret = crypto
    .createHash("md5")
    .update(secretStr)
    .digest("hex")
    .toUpperCase();

  const amountFormatted = parseFloat(amount).toFixed(2);

  // Coerce all inputs to string to avoid type issues
  const hashString =
    String(merchantId) +
    String(orderId) +
    amountFormatted +
    String(currency) +
    hashedSecret;

  const hash = crypto
    .createHash("md5")
    .update(hashString)
    .digest("hex")
    .toUpperCase();

  return hash;
}

// Handle PayHere IPN (payment notifications)
router.post(
  "/payhere/ipn",
  express.urlencoded({ extended: true }),
  async (req, res) => {
    const data = req.body;
    console.log("Received PayHere IPN Data:", JSON.stringify(data, null, 2));

    // Validate required fields
    if (
      !data.merchant_id ||
      !data.order_id ||
      !data.payhere_amount ||
      !data.payhere_currency ||
      !data.md5sig ||
      !data.status_code
    ) {
      console.error("Missing required IPN fields:", data);
      return res.status(400).send("Invalid IPN: Missing required fields");
    }

    try {
      const localMd5sig = generatePayHereIPNHash({
        merchantId: data.merchant_id,
        orderId: data.order_id,
        amount: parseFloat(data.payhere_amount).toFixed(2),
        currency: data.payhere_currency,
        statusCode: data.status_code,
        merchantSecret: PAYHERE_SECRET,
      });

      if (localMd5sig !== data.md5sig) {
        console.error("Invalid MD5 signature on PayHere IPN");
        return res.status(400).send("Invalid IPN: Hash mismatch");
      }

      if (data.status_code === "2") {
        // Find unpaid orders for this combinedId
        const orders = await Order.find({
          combinedId: data.order_id,
          "paymentDetails.paymentStatus": { $ne: "paid" },
        });

        // Find unpaid bookings for this combinedId
        const bookings = await Booking.find({
          combinedId: data.order_id,
          "paymentDetails.paymentStatus": { $ne: "paid" },
        });

        const sales = await WalletTransaction.find({
          transactionId: data.order_id,
          type: "sale",
          status: "pending",
        }).populate("userId");

        if (sales.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Payment not found or already completed",
          });
        }

        // Bulk update for better performance
        const salesIds = sales.map((item) => item._id);
        await WalletTransaction.updateMany(
          { _id: { $in: salesIds } },
          {
            status: "completed",
          }
        );

        if (orders.length > 0) {
          // Process all orders
          for (const order of orders) {
            // Deduct stock for normal products only (skip preorder products)
            for (const item of order.items) {
              const product = await Product.findById(item.productId);
              if (product && !product.isPreorder) {
                await Product.findByIdAndUpdate(item.productId, {
                  $inc: { stock: -item.quantity },
                });
              }
            }

            // Update store total sales
            await Store.findByIdAndUpdate(order.storeId, {
              $inc: {
                totalSales: order.storeAmount,
                "stats.totalOrdersOrBookings": 1,
              },
            });

            // Save commission record
            const commission = new Commission({
              orderId: order._id,
              storeId: order.storeId,
              totalAmount: order.totalAmount,
              commissionRate: 0.05,
              commissionAmount: order.platformFee,
              storeAmount: order.storeAmount,
              currency: "LKR",
              type: "order",
              status: "paid",
              createdAt: Date.now(),
            });
            await commission.save();

            // Mark order as paid
            order.paymentDetails = {
              paymentStatus: "paid",
              paidAt: new Date(),
              paymentMethod: "payhere",
              transactionId: data.payment_id,
            };
            await order.save();
          }
        } else if (bookings.length > 0) {
          // Process all bookings
          for (const booking of bookings) {
            // Update store total sales
            await Store.findByIdAndUpdate(booking.storeId, {
              $inc: {
                totalSales: booking.storeAmount,
                "stats.totalOrdersOrBookings": 1,
              },
            });

            // Save commission record
            const commission = new Commission({
              bookingId: booking._id,
              storeId: booking.storeId,
              totalAmount: booking.totalAmount,
              commissionRate: 0.05,
              commissionAmount: booking.platformFee,
              storeAmount: booking.storeAmount,
              currency: "LKR",
              type: "booking",
              status: "paid",
              createdAt: Date.now(),
            });
            await commission.save();

            // Mark booking as paid
            booking.paymentDetails = {
              paymentStatus: "paid",
              paidAt: new Date(),
              paymentMethod: "payhere",
              transactionId: data.payment_id,
            };
            await booking.save();
          }
        } else {
          console.warn(
            "No unpaid orders or bookings found for combinedId:",
            data.order_id
          );
        }

        return res.status(200).send("OK");
      } else {
        console.warn(
          `PayHere IPN payment status: ${data.status_code} for ${data.order_id}`
        );
        return res.status(200).send("OK");
      }
    } catch (err) {
      console.error("Error processing PayHere IPN:", err);
      return res.status(500).send("Error");
    }
  }
);

// Helper: Get Base64 encoded auth code from AppID and AppSecret
function getAuthCode() {
  return Buffer.from(`${PAYHERE_APP_ID}:${PAYHERE_APP_SECRET}`).toString(
    "base64"
  );
}

// Helper: Get Access Token from PayHere
async function getAccessToken() {
  const response = await fetch(PAYHERE_OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: "Basic " + getAuthCode(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get access token");
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("No access token received");
  }
  console.log(data);
  return data.access_token;
}

// Get payment methods available in Sri Lanka
router.get("/payment-methods", (req, res) => {
  const paymentMethods = [
    {
      id: "payhere",
      name: "PayHere",
      description: "Pay using PayHere",
      icon: "smartphone",
      available: true,
    },
  ];

  res.json(paymentMethods);
});

// Main Cancel Route
router.put("/:id/cancel", authenticate, async (req, res) => {
  try {
    const id = req.params.id;

    // Try finding either an order or a booking
    let item = await Order.findById(id).populate("storeId");
    let itemType = "order";

    if (!item) {
      item = await Booking.findById(id).populate("storeId");
      itemType = "booking";
    }

    if (!item) {
      console.error("Item not found for ID:", id);
      return res.status(404).json({ error: "Item not found" });
    }

    // Check if the user is authorized
    const isStoreOwner =
      item.storeId.ownerId.toString() === req.user._id.toString();
    const isCustomer = item.customerId.toString() === req.user._id.toString();

    if (!isStoreOwner && !isCustomer) {
      console.error("Unauthorized user:", req.user._id);
      return res.status(403).json({ error: "Access denied" });
    }

    if (item.status !== "pending") {
      console.error("Status not pending:", item.status);
      return res.status(400).json({ error: "Item cannot be cancelled" });
    }

    // Prepare cancellation details
    let notes = isStoreOwner ? "Cancelled by seller" : "Cancelled by customer";
    let sellerNote = isStoreOwner
      ? `You have cancelled this ${itemType}`
      : `The customer has cancelled this ${itemType}`;

    let customerNote = isStoreOwner
      ? `The seller has cancelled your ${itemType}`
      : `You have cancelled this ${itemType}`;

    // Handle refund logic
    if (item.paymentDetails?.paymentMethod === "payhere") {
      const paymentId = item.paymentDetails.transactionId;

      if (!paymentId) {
        console.error("No PayHere transaction ID:", item.paymentDetails);
        return res
          .status(400)
          .json({ error: "No PayHere payment ID found for refund" });
      }

      try {
        const accessToken = await getAccessToken();
        const refundResponse = await fetch(PAYHERE_REFUND_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payment_id: paymentId,
            description: `${
              isStoreOwner ? "Seller" : "Customer"
            } cancelled ${itemType}`,
          }),
        });

        if (!refundResponse.ok) {
          const text = await refundResponse.text();
          console.error("Refund API error:", refundResponse.status, text);
          return res.status(500).json({ error: "Refund API call failed" });
        }

        const result = await refundResponse.json();
        if (result.status !== 1) {
          console.error("Refund failed:", result.msg);
          return res
            .status(500)
            .json({ error: "Refund failed: " + result.msg });
        }

        notes += " and refunded via PayHere";

        // Restore stock for orders (not bookings) and non-preorder products
        if (itemType === "order" && item.items) {
          for (const orderItem of item.items) {
            const product = await Product.findById(orderItem.productId);
            if (product && !product.isPreorder) {
              await Product.findByIdAndUpdate(orderItem.productId, {
                $inc: { stock: +orderItem.quantity },
              });
            }
          }
        }

        // Update store total sales
        await Store.findByIdAndUpdate(item.storeId, {
          $inc: { totalSales: -item.storeAmount },
        });

        // Create refund transaction
        const transaction = new WalletTransaction({
          userId: item.storeId.ownerId,
          transactionId: item.combinedId || item._id.toString(),
          type: "refund",
          amount: item.storeAmount,
          status: "completed",
          description: `Refund for ${itemType} #${item._id
            .toString()
            .slice(-8)}`,
        });

        await transaction.save();
      } catch (err) {
        console.error("Refund error:", err);
        return res.status(500).json({ error: "Refund process failed" });
      }
    }

    // Update item status to cancelled
    const updateData = {
      status: "cancelled",
      notes: notes,
    };

    let updatedItem;
    if (itemType === "order") {
      updatedItem = await Order.findByIdAndUpdate(id, updateData, {
        new: true,
      });
    } else {
      updatedItem = await Booking.findByIdAndUpdate(id, updateData, {
        new: true,
      });
    }

    // Create notifications
    const storeNotification = await Notification.create({
      userId: item.storeId.ownerId,
      title: `${itemType} cancellation`,
      userType: "store_owner",
      body: `#${item._id.toString().slice(-8)} ${sellerNote}`,
      type: `${itemType}_update`,
      link: `/${itemType}s`,
    });

    const customerNotification = await Notification.create({
      userId: item.customerId,
      title: `${itemType} cancellation`,
      userType: "customer",
      body: `#${item._id.toString().slice(-8)} ${customerNote}`,
      type: `${itemType}_update`,
      link: `/${itemType}s`,
    });

    // Emit notifications
    emitNotification(item.storeId.ownerId.toString(), storeNotification);
    emitNotification(item.customerId.toString(), customerNotification);

    // Send success response
    return res.status(200).json({
      success: true,
      message: `${itemType} cancelled successfully`,
      item: updatedItem,
      refunded: item.paymentDetails?.paymentMethod === "payhere",
    });
  } catch (error) {
    console.error("Cancel route error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
