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
        platformFee: commissionAmount,
        storeAmount,
        shippingAddress,
        status: "pending",
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
        totalAmount: serviceAmount,
        platformFee: commissionAmount,
        storeAmount,
        status: "pending",
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
    const combinedId = `CMB_${Date.now()}_${req.user._id}`;
    const combinedItemLabel = `OrderAndBooking_${combinedId}`;

    // --- Prepare PayHere Payment Params ---
    const paymentParams = {
      merchant_id: PAYHERE_MERCHANT_ID, // Ensure this env var is set correctly
      return_url: "https://www.aiocart.lk",
      cancel_url: "https://www.aiocart.lk/checkout",
      notify_url: "https://api.aiocart.lk/api/payments/payhere/ipn",
      order_id: combinedId,
      items: combinedItemLabel,
      currency: "LKR",
      amount: totalAmount.toFixed(2),
      first_name: req.user.firstName || "",
      last_name: req.user.lastName || "",
      email: req.user.email || "",
      phone: req.user.phone || "",
      address: shippingAddress.street || "",
      city: shippingAddress.city || "",
    };

    // Log to backend console for debugging
    console.log("Payment Params generated for PayHere:", paymentParams);

    res.json({ success: true, paymentParams, combinedId, createdEntities });
  } catch (error) {
    console.error("Combined payment intent error:", error);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

// Handle PayHere IPN (payment notifications)
router.post(
  "/payhere/ipn",
  express.urlencoded({ extended: true }),
  async (req, res) => {
    const data = req.body;

    try {
      const md5secret = crypto
        .createHash("md5")
        .update(PAYHERE_SECRET)
        .digest("hex");

      const localMd5sig = crypto
        .createHash("md5")
        .update(
          data.merchant_id +
            data.order_id +
            data.payhere_amount +
            data.payhere_currency +
            data.status_code +
            md5secret
        )
        .digest("hex")
        .toUpperCase();

      if (localMd5sig !== data.md5sig) {
        console.error("Invalid MD5 signature on PayHere IPN");
        return res.status(400).send("Invalid IPN");
      }

      if (data.status_code === "2") {
        // Payment success: update order or booking
        let order = await Order.findById(data.order_id);
        if (order && order.status !== "paid") {
          order.status = "paid";

          // Update stock
          for (const item of order.items) {
            await Product.findByIdAndUpdate(item.productId, {
              $inc: { stock: -item.quantity },
            });
          }
          // Update store sales
          await Store.findByIdAndUpdate(order.storeId, {
            $inc: { totalSales: order.storeAmount },
          });
          // Create commission
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
            transactionId: data.payhere_transaction_id,
          };
          await order.save();
        } else {
          let booking = await Booking.findById(data.order_id);
          if (booking && booking.status !== "paid") {
            booking.status = "paid";

            // Update store sales
            await Store.findByIdAndUpdate(booking.storeId, {
              $inc: { totalSales: booking.storeAmount },
            });
            // Create commission
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
              transactionId: data.payhere_transaction_id,
            };
            await booking.save();
          } else {
            console.warn(
              "Order or Booking not found or already paid for IPN:",
              data.order_id
            );
          }
        }

        return res.status(200).send("ok");
      } else {
        console.warn(
          `PayHere IPN payment status: ${data.status_code} for ${data.order_id}`
        );
        return res.status(200).send("ok");
      }
    } catch (err) {
      console.error("Error processing PayHere IPN:", err);
      res.status(500).send("Error");
    }
  }
);

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
