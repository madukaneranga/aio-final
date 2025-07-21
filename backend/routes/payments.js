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
import { emitNotification } from "../index.js";

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

    const combinedId = `CMB_${Date.now()}_${req.user._id}`;
    let totalAmount = 0;

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
        const commissionRate = 0.07;
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

        // Notify store owner about the order creation
        const store = await Store.findById(storeId);

        if (order) {
          const storeNotification = await Notification.create({
            userId: store.ownerId,
            title: `New order received`,
            userType: "store_owner",
            body: `You have a new order with ID #${order._id.slice(-8)}`,
            type: "order_update",
            link: `/orders`,
          });

          const customerNotification = await Notification.create({
            userId: req.user._id,
            title: `⏳ Order Pending`,
            userType: "customer",
            body: `Your order has been received and is awaiting processing. We’ll update you soon! Order ID  #${order._id.slice(
              -8
            )}`,
            type: "order_update",
            link: `/orders`,
          });

          emitNotification(store.ownerId.toString(), storeNotification);
          emitNotification(req.user._id.toString(), customerNotification);
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
          bookingDate: item.bookingDate,
          startTime: item.startTime,
          endTime: item.endTime,
          notes: item.notes,
          totalAmount: serviceAmount.toFixed(2),
          platformFee: commissionAmount.toFixed(2),
          storeAmount,
          status: "pending",
          combinedId,
        });

        await booking.save();

        // Notify store owner about the order creation
        const store = await Store.findById(service.storeId);

        if (booking) {
          const storeNotification = await Notification.create({
            userId: store.ownerId,
            title: `New booking received`,
            userType: "store_owner",
            body: `You have a new booking with ID #${booking._id.slice(-8)}`,
            type: "booking_update",
            link: `/bookings`,
          });

          const customerNotification = await Notification.create({
            userId: req.user._id,
            title: `⏳ booking Pending`,
            userType: "customer",
            body: `Your booking is now pending. We’ll notify you once it gets confirmed! Booking ID  #${booking._id.slice(
              -8
            )}`,
            type: "booking_update",
            link: `/bookings`,
          });

          emitNotification(store.ownerId.toString(), storeNotification);
          emitNotification(req.user._id.toString(), customerNotification);
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
              $inc: { totalSales: order.storeAmount },
            });

            // Save commission record
            const commission = new Commission({
              orderId: order._id,
              storeId: order.storeId,
              totalAmount: order.totalAmount,
              commissionRate: 0.07,
              commissionAmount: order.platformFee,
              storeAmount: order.storeAmount,
              currency: "LKR",
              type: "order",
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
              $inc: { totalSales: booking.storeAmount },
            });

            // Save commission record
            const commission = new Commission({
              bookingId: booking._id,
              storeId: booking.storeId,
              totalAmount: booking.totalAmount,
              commissionRate: 0.07,
              commissionAmount: booking.platformFee,
              storeAmount: booking.storeAmount,
              currency: "LKR",
              type: "booking",
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

// Main Cancel Route
router.put("/:id/cancel", authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      console.error("Order not found for ID:", req.params.id);
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.customerId.toString() !== req.user._id.toString()) {
      console.error("User ID mismatch:", req.user._id, order.customerId);
      return res.status(403).json({ error: "Access denied" });
    }

    if (order.status !== "pending") {
      console.error("Order status not pending:", order.status);
      return res.status(400).json({ error: "Order cannot be cancelled" });
    }

    const orderTime = new Date(order.createdAt);
    const now = new Date();
    const timeDiff = (now - orderTime) / (1000 * 60);

    if (timeDiff > 5) {
      console.error("Cancellation window expired, timeDiff:", timeDiff);
      return res.status(400).json({ error: "Cancellation window has expired" });
    }

    let notes = "Cancelled by customer";

    if (order.paymentDetails?.paymentMethod === "payhere") {
      const paymentId = order.paymentDetails.transactionId;
      if (!paymentId) {
        console.error(
          "No PayHere payment ID found in order.paymentDetails:",
          order.paymentDetails
        );
        return res
          .status(400)
          .json({ error: "No PayHere payment ID found for refund" });
      }

      // Get Access Token
      const accessToken = await getAccessToken().catch((err) => {
        console.error("Failed to get PayHere access token:", err);
        throw err; // re-throw to be caught by outer catch
      });
      console.log(accessToken);

      // Prepare refund request body
      const refundBody = {
        payment_id: paymentId,
        description: "User cancelled order",
      };

      console.log(refundBody);

      // Call PayHere Refund API
      const refundResponse = await fetch(PAYHERE_REFUND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(refundBody),
      });

      if (!refundResponse.ok) {
        const text = await refundResponse.text();
        console.error(
          "PayHere refund API failed, status:",
          refundResponse.status,
          "body:",
          text
        );
        return res.status(500).json({ error: "Refund API call failed" });
      }

      const refundResult = await refundResponse.json();

      if (refundResult.status !== 1) {
        console.error("Refund failed with message:", refundResult.msg);
        return res
          .status(500)
          .json({ error: "Refund failed: " + refundResult.msg });
      }

      notes += " and refunded via PayHere";
    }

    // Update order status
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      { status: "cancelled", notes },
      { new: true }
    );

    res.json(updatedOrder);
  } catch (error) {
    console.error("Cancel error:", error);
    res.status(500).json({ error: error.message });
  }
});

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

export default router;
