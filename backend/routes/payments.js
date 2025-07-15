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
        if (order && order.status !== "paid") {
          order.status = "paid";
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
          if (booking && booking.status !== "paid") {
            booking.status = "paid";
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

router.put("/:id/cancel", authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ error: "Order cannot be cancelled" });
    }

    const orderTime = new Date(order.createdAt);
    const now = new Date();
    const timeDiff = (now - orderTime) / (1000 * 60);

    if (timeDiff > 5) {
      return res.status(400).json({ error: "Cancellation window has expired" });
    }

    let notes = "Cancelled by customer";
    // --- Refund if paid with PayHere ---
    if (order.paid && order.paymentMethod === "payhere") {
      const reason = "User cancelled order";
      const amount = parseFloat(order.totalAmount).toFixed(2);

      const hashString =
        PAYHERE_MERCHANT_ID +
        order.orderId +
        amount +
        reason +
        PAYHERE_MERCHANT_SECRET;
      const hash = crypto
        .createHash("md5")
        .update(hashString)
        .digest("hex")
        .toUpperCase();

      const refundBody = {
        merchant_id: PAYHERE_MERCHANT_ID,
        order_id: order.orderId,
        amount: amount,
        reason: reason,
        hash: hash,
      };

      const refundResponse = await fetch(PAYHERE_REFUND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(refundBody),
      });

      const refundResult = await refundResponse.json();
      console.log("Refund result:", refundResult);

      if (refundResult.status !== 1) {
        return res
          .status(500)
          .json({ error: "Refund failed: " + refundResult.message });
      }
      notes += " and refunded via PayHere";
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: "cancelled",
        notes: notes,
      },
      { new: true }
    );

    res.json(updatedOrder);
  } catch (error) {
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
