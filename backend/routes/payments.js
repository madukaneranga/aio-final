import express from "express";
import crypto from "crypto";
import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import Store from "../models/Store.js";
import Commission from "../models/Commission.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

const PAYHERE_MERCHANT_ID = "1231188"; // sandbox merchant id
const PAYHERE_SECRET = "MTIyNzk3NjY4MTc4NjQ0ODM3NTQxOTczNzI2NjMzOTQwNTgwNjcy"; // replace with your sandbox secret
const PAYHERE_REFUND_URL = "https://sandbox.payhere.lk/merchant/v1/refund";
// PayHere Credentials - store in env vars for production
const PAYHERE_APP_ID =
  process.env.PAYHERE_APP_ID || "4OVxzQlbccS4JFnJjJNzoH3TV";
const PAYHERE_APP_SECRET =
  process.env.PAYHERE_APP_SECRET ||
  "4jw2K5bCgkR4ZGTyfLLD4n4eVJrJ7wtZF4uUvOg9J9Jy";
const PAYHERE_OAUTH_URL = "https://sandbox.payhere.lk/merchant/v1/oauth/token";

//checkout
router.post("/create-combined-intent", authenticate, async (req, res) => {
  try {
    const {
      cartItems = [],
      bookingItems = [],
      shippingAddress = {},
      paymentMethod,
    } = req.body;

    if (!paymentMethod || paymentMethod !== "payhere") {
      return res.status(400).json({ error: "Unsupported payment method" });
    }
    const combinedId = `CMB_${Date.now()}_${req.user._id}`;
    let totalAmount = 0;
    const orderItems = [];
    const createdEntities = {
      order: null,
      bookings: [],
    };

    // --- Handle Order Creation ---
    if (cartItems.length > 0) {
      let orderStoreId = null;

      for (const item of cartItems) {
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

        if (!orderStoreId) {
          orderStoreId =
            typeof item.storeId === "object" ? item.storeId._id : item.storeId;
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          productId: product._id,
          quantity: item.quantity,
          price: product.price,
        });
      }

      const commissionRate = 0.07;
      const commissionAmount = totalAmount * commissionRate;
      const storeAmount = totalAmount - commissionAmount;

      const order = new Order({
        customerId: req.user._id,
        storeId: orderStoreId,
        items: orderItems,
        totalAmount,
        platformFee: commissionAmount.toFixed(2),
        storeAmount,
        shippingAddress,
        status: "pending",
        combinedId,
      });

      await order.save();
      createdEntities.order = order;
    }

    // --- Handle Booking Creation ---
    for (const item of bookingItems) {
      const service = await Service.findById(item.serviceId);
      if (!service) {
        return res
          .status(404)
          .json({ error: `Service ${item.serviceId} not found` });
      }

      const serviceAmount = service.price;
      totalAmount += serviceAmount;

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
      createdEntities.bookings.push(booking);
    }

    if (totalAmount <= 0) {
      return res
        .status(400)
        .json({ error: "Total amount must be greater than zero" });
    }

    // --- Combine Order ID and Booking IDs for unified payment reference ---

    const combinedItemLabel = `OrderAndBooking_${combinedId}`;

    const hash = generatePayHereHash({
      merchantId: PAYHERE_MERCHANT_ID,
      orderId: combinedId,
      amount: totalAmount.toFixed(2),
      currency: "LKR",
      merchantSecret: PAYHERE_SECRET,
    });

    // --- Prepare PayHere Payment Params ---
    const paymentParams = {
      sandbox: true, // Important for testing!
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
      hash: hash,
    };

    // Log to backend console for debugging
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

      console.log("Generated Local MD5 Hash:", localMd5sig);
      console.log("Received MD5 Hash:", data.md5sig);
      console.log("Hash Input Values:", {
        merchantId: data.merchant_id,
        orderId: data.order_id,
        amount: data.payhere_amount,
        currency: data.payhere_currency,
      });

      if (localMd5sig !== data.md5sig) {
        console.error("Invalid MD5 signature on PayHere IPN");
        return res.status(400).send("Invalid IPN: Hash mismatch");
      }

      // Rest of the IPN handling logic (as in your original code)
      if (data.status_code === "2") {
        let order = await Order.findOne({ combinedId: data.order_id });
        if (order && order.paymentDetails?.paymentStatus !== "paid") {
          for (const item of order.items) {
            await Product.findByIdAndUpdate(item.productId, {
              $inc: { stock: -item.quantity },
            });
          }
          await Store.findByIdAndUpdate(order.storeId, {
            $inc: { totalSales: order.storeAmount },
          });
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
          order.paymentDetails = {
            paymentStatus: "paid",
            paidAt: new Date(),
            paymentMethod: "payhere",
            transactionId: data.payment_id, // Use payment_id
          };
          await order.save();
        } else {
          let booking = await Booking.findOne({ combinedId: data.order_id });
          if (booking && booking.paymentDetails?.paymentStatus !== "paid") {
            await Store.findByIdAndUpdate(booking.storeId, {
              $inc: { totalSales: booking.storeAmount },
            });
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
            booking.paymentDetails = {
              paymentStatus: "paid",
              paidAt: new Date(),
              paymentMethod: "payhere",
              transactionId: data.payment_id, // Use payment_id
            };
            await booking.save();
          } else {
            console.warn(
              "Order or Booking not found or already paid for IPN:",
              data.order_id
            );
          }
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
      res.status(500).send("Error");
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
        console.error("No PayHere payment ID found in order.paymentDetails:", order.paymentDetails);
        return res.status(400).json({ error: "No PayHere payment ID found for refund" });
      }

      // Get Access Token
      const accessToken = await getAccessToken().catch(err => {
        console.error("Failed to get PayHere access token:", err);
        throw err; // re-throw to be caught by outer catch
      });
      console.log(accessToken);

      // Prepare refund request body
      const refundBody = {
        payment_id: paymentId,
        description: "User cancelled order",
      };

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
        console.error("PayHere refund API failed, status:", refundResponse.status, "body:", text);
        return res.status(500).json({ error: "Refund API call failed" });
      }

      const refundResult = await refundResponse.json();

      if (refundResult.status !== 1) {
        console.error("Refund failed with message:", refundResult.msg);
        return res.status(500).json({ error: "Refund failed: " + refundResult.msg });
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


function generateRefundHash({
  merchantId,
  paymentId,
  amount,
  reason,
  merchantSecret,
}) {
  const hashedSecret = crypto
    .createHash("md5")
    .update(String(merchantSecret))
    .digest("hex")
    .toUpperCase();

  const hashString = merchantId + paymentId + amount + reason + hashedSecret;

  return crypto
    .createHash("md5")
    .update(hashString)
    .digest("hex")
    .toUpperCase();
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

export default router;
