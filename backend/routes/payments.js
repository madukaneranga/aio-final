import express from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import Store from "../models/Store.js";
import Notification from "../models/Notification.js";
import BankDetails from "../models/BankDetails.js";
import { authenticate } from "../middleware/auth.js";
import { emitNotification } from "../utils/socketUtils.js";
import { v4 as uuidv4 } from "uuid";
import WalletTransaction from "../models/WalletTransaction.js";
import { createPurchaseNotification } from "./notifications.js";

const router = express.Router();

const PAYHERE_BASE_URL = process.env.NODE_ENV === 'production' 
  ? "https://www.payhere.lk" 
  : "https://sandbox.payhere.lk";
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || "1231188";
const PAYHERE_SECRET = process.env.PAYHERE_SECRET || "MTIyNzk3NjY4MTc4NjQ0ODM3NTQxOTczNzI2NjMzOTQwNTgwNjcy";
const PAYHERE_REFUND_URL = `${PAYHERE_BASE_URL}/merchant/v1/refund`;

const PAYHERE_APP_ID =
  process.env.PAYHERE_APP_ID || "4OVxzVJAbSK4JFnJjJNzoH3TV";
const PAYHERE_APP_SECRET =
  process.env.PAYHERE_APP_SECRET ||
  "8cJlAdroxID8n0No30NAwT8m22kmMKNW98cJlqgSYpMa";
const PAYHERE_OAUTH_URL = `${PAYHERE_BASE_URL}/merchant/v1/oauth/token`;

//PayHere Payment Intent
router.post("/payhere-intent", authenticate, async (req, res) => {
  try {
    const {
      orderItems = [],
      bookingItems = [],
      shippingAddress = {},
    } = req.body;

    const generateTransactionId = (prefix = "TX", userId = "") =>
      `${prefix}-${Date.now()}-${userId}-${uuidv4()}`;

    const combinedId = generateTransactionId("SALE", req.user._id);
    let totalAmount = 0;

    const pendingOrdersData = [];
    const pendingBookingsData = [];

    // --- Validate and Process Orders ---
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

      // Store order data for each store
      for (const [storeId, storeData] of storeOrderMap.entries()) {
        const payhereRate = 0.03; // 3% PayHere processing fee
        const payhereFee = storeData.totalAmount * payhereRate;
        const storeAmount = storeData.totalAmount - payhereFee; // 97% goes to seller

        pendingOrdersData.push({
          storeId,
          items: storeData.items,
          totalAmount: storeData.totalAmount,
          storeAmount,
          shippingAddress,
        });

        totalAmount += storeData.totalAmount;
      }
    }

    // --- Validate and Process Bookings ---
    if (bookingItems.length > 0) {
      for (const item of bookingItems) {
        const service = await Service.findById(item.serviceId);
        if (!service) {
          return res
            .status(404)
            .json({ error: `Service ${item.serviceId} not found` });
        }

        const serviceAmount = service.price;
        const payhereRate = 0.03; // 3% PayHere processing fee
        const payhereFee = serviceAmount * payhereRate;
        const storeAmount = serviceAmount - payhereFee; // 97% goes to seller

        pendingBookingsData.push({
          storeId: service.storeId,
          serviceId: service._id,
          bookingDetails: item.bookingDetails,
          totalAmount: serviceAmount,
          storeAmount,
        });

        totalAmount += serviceAmount;
      }
    }

    if (totalAmount <= 0) {
      return res
        .status(400)
        .json({ error: "Total amount must be greater than zero" });
    }

    // --- Create Pending WalletTransaction Records ---
    const storeIds = [
      ...pendingOrdersData.map(order => order.storeId),
      ...pendingBookingsData.map(booking => booking.storeId)
    ];

    // Get unique store owner IDs
    const storeOwnerIds = await Store.find({ _id: { $in: storeIds } })
      .select('ownerId')
      .distinct('ownerId');

    // Create one pending transaction per store owner
    for (const ownerId of storeOwnerIds) {
      const ownerStores = await Store.find({ ownerId }).select('_id');
      const ownerStoreIds = ownerStores.map(store => store._id.toString());

      const ownerOrders = pendingOrdersData.filter(order => 
        ownerStoreIds.includes(order.storeId)
      );
      const ownerBookings = pendingBookingsData.filter(booking => 
        ownerStoreIds.includes(booking.storeId.toString())
      );

      const ownerAmount = [
        ...ownerOrders.map(order => order.storeAmount),
        ...ownerBookings.map(booking => booking.storeAmount)
      ].reduce((sum, amount) => sum + amount, 0);

      const transaction = new WalletTransaction({
        userId: ownerId,
        transactionId: combinedId,
        type: "sale",
        amount: ownerAmount.toFixed(2),
        status: "pending",
        description: `PayHere payment pending: ${combinedId}`,
        orderData: ownerOrders,
        bookingData: ownerBookings,
        shippingAddress: shippingAddress,
        metadata: {
          paymentMethod: "payhere",
        },
      });

      await transaction.save();
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
      sandbox: process.env.NODE_ENV !== 'production', // true for development/testing
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

    res.json({ 
      success: true, 
      paymentParams, 
      combinedId,
      transactionId: transaction._id, // Add transaction ID for thank you page
      message: "Payment intent created. Orders and bookings will be created after successful payment." 
    });
  } catch (error) {
    console.error("PayHere payment intent error:", error);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

// Bank Transfer Preview - Get bank details without creating orders
router.post("/bank-transfer-preview", authenticate, async (req, res) => {
  try {
    const {
      orderItems = [],
      bookingItems = [],
    } = req.body;

    if (!req.user || req.user.role !== "customer") {
      return res.status(403).json({ error: "Only customers can preview bank transfer details" });
    }

    let storeOwners = new Set();

    // Collect store owners from order items
    if (orderItems.length > 0) {
      for (const item of orderItems) {
        const product = await Product.findById(item.productId).populate("storeId");
        if (product && product.storeId) {
          storeOwners.add(product.storeId._id.toString());
        }
      }
    }

    // Collect store owners from booking items
    if (bookingItems.length > 0) {
      for (const item of bookingItems) {
        const service = await Service.findById(item.serviceId).populate("storeId");
        if (service && service.storeId) {
          storeOwners.add(service.storeId._id.toString());
        }
      }
    }

    // Get bank details for all store owners
    const bankDetails = [];
    for (const storeId of storeOwners) {
      const store = await Store.findById(storeId);
      if (!store) continue;
      
      const bankDetail = await BankDetails.findOne({ userId: store.ownerId });
      if (bankDetail) {
        bankDetails.push({
          storeId,
          storeName: store.name,
          bankDetails: {
            bankName: bankDetail.bankName,
            accountHolderName: bankDetail.accountHolderName,
            accountNumber: bankDetail.accountNumber,
            branchName: bankDetail.branchName,
            routingNumber: bankDetail.routingNumber,
          },
          contactInfo: {
            whatsapp: store.contactInfo?.whatsapp || null,
            email: store.contactInfo?.email || null,
          }
        });
      }
    }

    res.json({
      success: true,
      bankDetails,
      message: "Bank transfer details retrieved successfully"
    });

  } catch (error) {
    console.error("Bank transfer preview error:", error);
    res.status(500).json({ error: "Failed to get bank transfer details" });
  }
});

// Bank Transfer Payment Intent
router.post("/bank-transfer-intent", authenticate, async (req, res) => {
  try {
    const {
      orderItems = [],
      bookingItems = [],
      shippingAddress = {},
    } = req.body;

    if (!req.user || req.user.role !== "customer") {
      return res.status(403).json({ error: "Only customers can create bank transfer payments" });
    }

    const generateTransactionId = (prefix = "BT", userId = "") =>
      `${prefix}-${Date.now()}-${userId}-${uuidv4()}`;

    const combinedId = generateTransactionId("BT", req.user._id);
    let totalAmount = 0;
    const createdEntities = { order: [], bookings: [] };
    let storeOwners = new Set();

    // --- Handle Orders ---
    if (orderItems.length > 0) {
      const storeOrderMap = new Map();

      for (const item of orderItems) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ error: `Product ${item.productId} not found` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${product.title}` });
        }

        const storeId = typeof item.storeId === "object" ? item.storeId._id.toString() : item.storeId.toString();
        storeOwners.add(storeId);

        if (!storeOrderMap.has(storeId)) {
          storeOrderMap.set(storeId, { items: [], totalAmount: 0 });
        }

        const storeData = storeOrderMap.get(storeId);
        storeData.items.push({
          productId: product._id,
          quantity: item.quantity,
          price: product.price,
        });
        storeData.totalAmount += product.price * item.quantity;
      }

      // Create orders
      for (const [storeId, storeData] of storeOrderMap.entries()) {
        const storeAmount = storeData.totalAmount; // 100% goes to seller

        const order = new Order({
          customerId: req.user._id,
          storeId,
          items: storeData.items,
          totalAmount: storeData.totalAmount,
          storeAmount,
          shippingAddress,
          status: "pending",
          combinedId,
          paymentDetails: {
            paymentMethod: "bank_transfer",
            paymentStatus: "pending_bank_transfer",
          },
          canCustomerUpdateStatus: false,
        });

        await order.save();

        // Create purchase confirmation notification
        await createPurchaseNotification(req.user._id, 'order', order);

        // Create wallet transaction (excluded from balance - bank transfer money never comes to platform)
        const transaction = new WalletTransaction({
          userId: (await Store.findById(storeId)).ownerId,
          transactionId: combinedId,
          type: "sale",
          amount: storeAmount.toFixed(2),
          status: "pending",
          description: `Bank transfer payment for order ${combinedId}`,
          excludeFromBalance: true, // This money never comes to the platform
        });
        await transaction.save();

        createdEntities.order.push(order);
        totalAmount += storeData.totalAmount;
      }
    }

    // --- Handle Bookings ---
    if (bookingItems.length > 0) {
      for (const item of bookingItems) {
        const service = await Service.findById(item.serviceId);
        if (!service) {
          return res.status(404).json({ error: `Service ${item.serviceId} not found` });
        }

        const serviceAmount = service.price;
        const storeAmount = serviceAmount; // 100% goes to seller

        storeOwners.add(service.storeId.toString());

        const booking = new Booking({
          customerId: req.user._id,
          storeId: service.storeId,
          serviceId: service._id,
          bookingDetails: item.bookingDetails,
          totalAmount: serviceAmount.toFixed(2),
          storeAmount,
          status: "pending",
          combinedId,
          paymentDetails: {
            paymentMethod: "bank_transfer",
            paymentStatus: "pending_bank_transfer",
          },
          canCustomerUpdateStatus: false,
        });

        await booking.save();

        // Create purchase confirmation notification
        await createPurchaseNotification(req.user._id, 'booking', booking);

        // Create wallet transaction (excluded from balance - bank transfer money never comes to platform)
        const transaction = new WalletTransaction({
          userId: (await Store.findById(service.storeId)).ownerId,
          transactionId: combinedId,
          type: "sale",
          amount: storeAmount.toFixed(2),
          status: "pending",
          description: `Bank transfer payment for booking ${combinedId}`,
          excludeFromBalance: true, // This money never comes to the platform
        });
        await transaction.save();

        createdEntities.bookings.push(booking);
        totalAmount += serviceAmount;
      }
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ error: "Total amount must be greater than zero" });
    }

    // Get bank details for all store owners
    const bankDetails = [];
    for (const storeId of storeOwners) {
      const store = await Store.findById(storeId);
      const bankDetail = await BankDetails.findOne({ userId: store.ownerId });
      if (bankDetail) {
        bankDetails.push({
          storeId,
          storeName: store.name,
          bankDetails: {
            bankName: bankDetail.bankName,
            accountHolderName: bankDetail.accountHolderName,
            accountNumber: bankDetail.accountNumber,
            branchName: bankDetail.branchName,
            routingNumber: bankDetail.routingNumber,
          },
          contactInfo: store.contactInfo,
        });
      }
    }

    // Bank Transfer orders created - receipts will be generated on-demand

    res.json({
      success: true,
      combinedId,
      transactionId: createdEntities.order.length > 0 ? createdEntities.order[0]._id : createdEntities.bookings[0]._id, // Add transaction ID for thank you page
      totalAmount,
      bankDetails,
      instructions: "Please transfer the amount to the bank account(s) above and contact the store via WhatsApp or email with your transfer receipt.",
      createdEntities,
    });

  } catch (error) {
    console.error("Bank transfer intent error:", error);
    res.status(500).json({ error: "Failed to create bank transfer payment" });
  }
});

// COD Payment Intent
router.post("/cod-intent", authenticate, async (req, res) => {
  try {
    const {
      orderItems = [],
      bookingItems = [],
      shippingAddress = {},
    } = req.body;

    if (!req.user || req.user.role !== "customer") {
      return res.status(403).json({ error: "Only customers can create COD payments" });
    }

    if (req.user.verificationStatus !== "verified") {
      return res.status(403).json({ 
        error: "Document verification required for Cash on Delivery",
        requiresVerification: true 
      });
    }

    const generateTransactionId = (prefix = "COD", userId = "") =>
      `${prefix}-${Date.now()}-${userId}-${uuidv4()}`;

    const combinedId = generateTransactionId("COD", req.user._id);
    let totalAmount = 0;
    const createdEntities = { order: [], bookings: [] };

    // --- Handle Orders ---
    if (orderItems.length > 0) {
      const storeOrderMap = new Map();

      for (const item of orderItems) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ error: `Product ${item.productId} not found` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${product.title}` });
        }

        const storeId = typeof item.storeId === "object" ? item.storeId._id.toString() : item.storeId.toString();

        if (!storeOrderMap.has(storeId)) {
          storeOrderMap.set(storeId, { items: [], totalAmount: 0 });
        }

        const storeData = storeOrderMap.get(storeId);
        storeData.items.push({
          productId: product._id,
          quantity: item.quantity,
          price: product.price,
        });
        storeData.totalAmount += product.price * item.quantity;
      }

      // Create orders
      for (const [storeId, storeData] of storeOrderMap.entries()) {
        const storeAmount = storeData.totalAmount; // 100% goes to seller

        const order = new Order({
          customerId: req.user._id,
          storeId,
          items: storeData.items,
          totalAmount: storeData.totalAmount,
          storeAmount,
          shippingAddress,
          status: "pending",
          combinedId,
          paymentDetails: {
            paymentMethod: "cod",
            paymentStatus: "cod_pending",
          },
          canCustomerUpdateStatus: true,
        });

        await order.save();

        // Create purchase confirmation notification
        await createPurchaseNotification(req.user._id, 'order', order);

        // Create wallet transaction (excluded from balance - COD money never comes to platform)
        const transaction = new WalletTransaction({
          userId: (await Store.findById(storeId)).ownerId,
          transactionId: combinedId,
          type: "sale",
          amount: storeAmount.toFixed(2),
          status: "pending",
          description: `COD payment for order ${combinedId}`,
          excludeFromBalance: true, // This money never comes to the platform
        });
        await transaction.save();

        createdEntities.order.push(order);
        totalAmount += storeData.totalAmount;
      }
    }

    // --- Handle Bookings ---
    if (bookingItems.length > 0) {
      for (const item of bookingItems) {
        const service = await Service.findById(item.serviceId);
        if (!service) {
          return res.status(404).json({ error: `Service ${item.serviceId} not found` });
        }

        const serviceAmount = service.price;
        const storeAmount = serviceAmount; // 100% goes to seller

        const booking = new Booking({
          customerId: req.user._id,
          storeId: service.storeId,
          serviceId: service._id,
          bookingDetails: item.bookingDetails,
          totalAmount: serviceAmount.toFixed(2),
          storeAmount,
          status: "pending",
          combinedId,
          paymentDetails: {
            paymentMethod: "cod",
            paymentStatus: "cod_pending",
          },
          canCustomerUpdateStatus: true,
        });

        await booking.save();

        // Create purchase confirmation notification
        await createPurchaseNotification(req.user._id, 'booking', booking);

        // Create wallet transaction (excluded from balance - COD money never comes to platform)
        const transaction = new WalletTransaction({
          userId: (await Store.findById(service.storeId)).ownerId,
          transactionId: combinedId,
          type: "sale",
          amount: storeAmount.toFixed(2),
          status: "pending",
          description: `COD payment for booking ${combinedId}`,
          excludeFromBalance: true, // This money never comes to the platform
        });
        await transaction.save();

        createdEntities.bookings.push(booking);
        totalAmount += serviceAmount;
      }
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ error: "Total amount must be greater than zero" });
    }

    // COD orders created - receipts will be generated on-demand

    res.json({
      success: true,
      combinedId,
      transactionId: createdEntities.order.length > 0 ? createdEntities.order[0]._id : createdEntities.bookings[0]._id, // Add transaction ID for thank you page
      totalAmount,
      message: "COD order created successfully. You can mark it as delivered once you receive your order/service.",
      createdEntities,
    });

  } catch (error) {
    console.error("COD intent error:", error);
    res.status(500).json({ error: "Failed to create COD payment" });
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
        // Find pending PayHere transactions for this transactionId
        const pendingTransactions = await WalletTransaction.find({
          transactionId: data.order_id,
          type: "sale",
          status: "pending",
          "metadata.paymentMethod": "payhere",
        }).populate("userId");

        if (pendingTransactions.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Payment not found or already completed",
          });
        }

        const createdOrders = [];
        const createdBookings = [];

        // Process each pending transaction
        for (const transaction of pendingTransactions) {
          const customerId = transaction.userId._id;

          // Create Orders from orderData
          if (transaction.orderData && transaction.orderData.length > 0) {
            for (const orderInfo of transaction.orderData) {
              const order = new Order({
                customerId: customerId,
                storeId: orderInfo.storeId,
                items: orderInfo.items,
                totalAmount: orderInfo.totalAmount,
                storeAmount: orderInfo.storeAmount,
                shippingAddress: transaction.shippingAddress,
                status: "pending",
                combinedId: data.order_id,
                paymentDetails: {
                  paymentMethod: "payhere",
                  paymentStatus: "paid",
                  paidAt: new Date(),
                  transactionId: data.payment_id,
                },
              });

              await order.save();
              createdOrders.push(order);

              // Create purchase confirmation notification
              await createPurchaseNotification(customerId, 'order', order);

              // Deduct stock and increment orderCount
              for (const item of orderInfo.items) {
                const product = await Product.findById(item.productId);
                if (product) {
                  // Deduct stock only for non-preorder products
                  if (!product.isPreorder) {
                    await Product.findByIdAndUpdate(item.productId, {
                      $inc: { stock: -item.quantity },
                    });
                  }
                  // Always increment orderCount
                  await Product.findByIdAndUpdate(item.productId, {
                    $inc: { "stats.orderCount": item.quantity },
                  });
                }
              }

              // Update store total sales
              await Store.findByIdAndUpdate(orderInfo.storeId, {
                $inc: {
                  totalSales: orderInfo.storeAmount,
                  "stats.totalOrdersOrBookings": 1,
                },
              });

              // Notify store owner
              const store = await Store.findById(orderInfo.storeId);
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
          }

          // Create Bookings from bookingData
          if (transaction.bookingData && transaction.bookingData.length > 0) {
            for (const bookingInfo of transaction.bookingData) {
              const booking = new Booking({
                customerId: customerId,
                storeId: bookingInfo.storeId,
                serviceId: bookingInfo.serviceId,
                bookingDetails: bookingInfo.bookingDetails,
                totalAmount: bookingInfo.totalAmount,
                storeAmount: bookingInfo.storeAmount,
                status: "pending",
                combinedId: data.order_id,
                paymentDetails: {
                  paymentMethod: "payhere",
                  paymentStatus: "paid",
                  paidAt: new Date(),
                  transactionId: data.payment_id,
                },
              });

              await booking.save();
              createdBookings.push(booking);

              // Create purchase confirmation notification
              await createPurchaseNotification(customerId, 'booking', booking);

              // Increment service bookingCount
              await Service.findByIdAndUpdate(bookingInfo.serviceId, {
                $inc: { "stats.bookingCount": 1 },
              });

              // Update store total sales
              await Store.findByIdAndUpdate(bookingInfo.storeId, {
                $inc: {
                  totalSales: bookingInfo.storeAmount,
                  "stats.totalOrdersOrBookings": 1,
                },
              });

              // Notify store owner
              const store = await Store.findById(bookingInfo.storeId);
              const storeNotification = await Notification.create({
                userId: store.ownerId,
                title: `New booking received`,
                userType: "store_owner",
                body: `You have a new booking with ID #${booking._id
                  .toString()
                  .slice(-8)}`,
                type: "booking_update",
                link: `/bookings`,
              });
              emitNotification(store.ownerId.toString(), storeNotification);
            }
          }

          // Mark transaction as completed
          transaction.status = "completed";
          await transaction.save();
        }

        console.log(`PayHere payment successful for transaction ${data.order_id}:`);
        console.log(`- Created ${createdOrders.length} orders`);
        console.log(`- Created ${createdBookings.length} bookings`);

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
      description: "Pay using PayHere (Cards, Mobile, Online Banking)",
      icon: "smartphone",
      available: true,
    },
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      description: "Transfer directly to store's bank account",
      icon: "building-2",
      available: true,
    },
    {
      id: "cod",
      name: "Cash on Delivery",
      description: "Pay when you receive your order/service",
      icon: "banknote",
      available: true, // Will be checked during checkout
      requiresVerification: true,
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

    // Customers cannot cancel anything - ever
    if (isCustomer) {
      console.error("Customer attempting to cancel:", req.user._id, itemType, id);
      return res.status(403).json({ 
        error: "Customers cannot cancel orders or bookings" 
      });
    }
    
    // Store owners can only cancel pending items
    if (isStoreOwner) {
      if (item.status !== "pending") {
        console.error("Store owner trying to cancel non-pending item:", item.status);
        return res.status(400).json({ 
          error: `Cannot cancel ${item.status} ${itemType}` 
        });
      }
    } else {
      // Fallback - only authorized users can cancel
      console.error("Unauthorized cancellation attempt:", req.user._id);
      return res.status(403).json({ error: "Access denied" });
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
          
          // Log detailed error for debugging
          console.error("PayHere Refund Request Details:", {
            payment_id: paymentId,
            url: PAYHERE_REFUND_URL,
            status: refundResponse.status,
            response: text
          });
          
          return res.status(500).json({ 
            error: "Refund API call failed",
            details: process.env.NODE_ENV === 'development' ? text : undefined
          });
        }

        const result = await refundResponse.json();
        console.log("PayHere refund response:", result);
        
        if (result.status !== 1) {
          console.error("Refund failed:", result.msg || result.message);
          return res
            .status(500)
            .json({ 
              error: "Refund failed: " + (result.msg || result.message || 'Unknown error'),
              refundStatus: result.status
            });
        }

        console.log(`PayHere refund successful for ${itemType} ${id}:`, {
          refund_id: result.refund_id || result.id,
          amount: item.totalAmount,
          payment_id: paymentId
        });
        
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
