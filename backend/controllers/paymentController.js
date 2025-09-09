import crypto from "crypto";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import Wallet from "../models/Wallet.js";
import Notification from "../models/Notification.js";
import BankDetails from "../models/BankDetails.js";
import Transaction from "../models/Transaction.js";
import { emitNotification } from "../utils/socketUtils.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import logger from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import { createPurchaseNotification } from "../routes/notifications.js";

const PAYHERE_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://www.payhere.lk"
    : "https://sandbox.payhere.lk";
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || "1231188";
const PAYHERE_SECRET =
  process.env.PAYHERE_SECRET ||
  "MTIyNzk3NjY4MTc4NjQ0ODM3NTQxOTczNzI2NjMzOTQwNTgwNjcy";
const PAYHERE_REFUND_URL = `${PAYHERE_BASE_URL}/merchant/v1/refund`;
const PAYHERE_APP_ID =
  process.env.PAYHERE_APP_ID || "4OVxzVJAbSK4JFnJjJNzoH3TV";
const PAYHERE_APP_SECRET =
  process.env.PAYHERE_APP_SECRET ||
  "8cJlAdroxID8n0No30NAwT8m22kmMKNW98cJlqgSYpMa";
const PAYHERE_OAUTH_URL = `${PAYHERE_BASE_URL}/merchant/v1/oauth/token`;

class PaymentController {
  // Helper functions
  generateTransactionId = (prefix = "TX", userId = "") => {
    return `${prefix}-${Date.now()}-${userId}-${uuidv4()}`;
  };

  generatePayHereHash = ({
    merchantId,
    orderId,
    amount,
    currency,
    merchantSecret,
  }) => {
    const secretStr = String(merchantSecret);
    const hashedSecret = crypto
      .createHash("md5")
      .update(secretStr)
      .digest("hex")
      .toUpperCase();
    const amountFormatted = parseFloat(amount).toFixed(2);

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
  };

  generatePayHereIPNHash({
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

    logger.info("Expected hash string", { hashString });

    const finalHash = crypto
      .createHash("md5")
      .update(hashString)
      .digest("hex")
      .toUpperCase();
    return finalHash;
  }

  getAuthCode() {
    return Buffer.from(`${PAYHERE_APP_ID}:${PAYHERE_APP_SECRET}`).toString(
      "base64"
    );
  }

  async getAccessToken() {
    try {
      const response = await fetch(PAYHERE_OAUTH_URL, {
        method: "POST",
        headers: {
          Authorization: "Basic " + this.getAuthCode(),
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

      logger.info("PayHere access token received", { data });
      return data.access_token;
    } catch (error) {
      logger.error("Failed to get PayHere access token", error);
      throw error;
    }
  }

  // PayHere Payment Intent
   createPayhereIntent = async(req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const { orderItems = [], shippingAddress = {} } = req.body;

      const combinedId = this.generateTransactionId("SALE", req.user._id);
      let totalAmount = 0;
      const pendingOrdersData = [];

      // Validate and Process Orders
      if (orderItems.length > 0) {
        const storeOrderMap = new Map();

        for (const item of orderItems) {
          const product = await Product.findById(item.productId);
          if (!product) {
            return res
              .status(404)
              .json(errorResponse(`Product ${item.productId} not found`, 404));
          }

          if (!product.isPreorder && product.stock < item.quantity) {
            return res
              .status(400)
              .json(
                errorResponse(
                  `Insufficient stock for ${product.title}. Available: ${product.stock}`,
                  400
                )
              );
          }

          const storeId =
            typeof item.storeId === "object"
              ? item.storeId._id.toString()
              : item.storeId.toString();

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
            payhereFee,
            shippingAddress,
          });

          totalAmount += storeData.totalAmount;
        }
      }

      if (totalAmount <= 0) {
        return res
          .status(400)
          .json(errorResponse("Total amount must be greater than zero", 400));
      }

      // Create Pending Transaction Records
      const storeIds = [...pendingOrdersData.map((order) => order.storeId)];
      const storeOwnerIds = await Store.find({ _id: { $in: storeIds } })
        .select("ownerId")
        .distinct("ownerId");

      // Create one pending transaction per store owner
      for (const ownerId of storeOwnerIds) {
        const ownerStores = await Store.find({ ownerId }).select("_id");
        const ownerStoreIds = ownerStores.map((store) => store._id.toString());

        const ownerOrders = pendingOrdersData.filter((order) =>
          ownerStoreIds.includes(order.storeId)
        );
        const ownerAmount = [
          ...ownerOrders.map((order) => order.storeAmount),
        ].reduce((sum, amount) => sum + amount, 0);

        const ownerFees = [
          ...ownerOrders.map((order) => order.payhereFee),
        ].reduce((sum, fee) => sum + fee, 0);

        const transaction = new Transaction({
          userId: ownerId,
          transactionId: combinedId,
          type: "sale",
          amount: ownerAmount.toFixed(2),
          status: "pending",
          description: `PayHere payment pending: ${combinedId}`,
          orderData: ownerOrders,
          shippingAddress: shippingAddress,
          metadata: { 
            paymentMethod: "payhere",
            fees: ownerFees.toFixed(2),
            netAmount: ownerAmount.toFixed(2)
          },
        });

        await transaction.save();
      }

      // Prepare PayHere Payment
      const combinedItemLabel = `OrderAndBooking_${combinedId}`;
      const hash = this.generatePayHereHash({
        merchantId: PAYHERE_MERCHANT_ID,
        orderId: combinedId,
        amount: totalAmount.toFixed(2),
        currency: "LKR",
        merchantSecret: PAYHERE_SECRET,
      });

      const paymentParams = {
        sandbox: process.env.NODE_ENV !== "production",
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

      logger.info("Payment Params generated for PayHere", { paymentParams });

      res.json(
        successResponse(
          {
            paymentParams,
            combinedId,
            message:
              "Payment intent created. Orders will be created after successful payment.",
          },
          "Payment intent created successfully"
        )
      );
    } catch (error) {
      logger.error("PayHere payment intent error", error);
      res.status(500).json(errorResponse("Failed to create payment intent"));
    }
  };

  // Bank Transfer Preview
  async getBankTransferPreview(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { orderItems = [] } = req.body;

      if (!req.user || req.user.role !== "customer") {
        return res
          .status(403)
          .json(
            errorResponse(
              "Only customers can preview bank transfer details",
              403
            )
          );
      }

      let storeOwners = new Set();

      // Collect store owners from order items
      if (orderItems.length > 0) {
        for (const item of orderItems) {
          const product = await Product.findById(item.productId).populate(
            "storeId"
          );
          if (product && product.storeId) {
            storeOwners.add(product.storeId._id.toString());
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
            },
          });
        }
      }

      res.json(
        successResponse({
          bankDetails,
          message: "Bank transfer details retrieved successfully",
        })
      );
    } catch (error) {
      logger.error("Bank transfer preview error", error);
      res
        .status(500)
        .json(errorResponse("Failed to get bank transfer details"));
    }
  }

  // Bank Transfer Payment Intent
   createBankTransferIntent = async(req, res) =>{
    logger.route(req.method, req.originalUrl);

    try {
      const { orderItems = [], shippingAddress = {} } = req.body;

      if (!req.user || req.user.role !== "customer") {
        return res
          .status(403)
          .json(
            errorResponse(
              "Only customers can create bank transfer payments",
              403
            )
          );
      }

      const combinedId = this.generateTransactionId("BT", req.user._id);
      let totalAmount = 0;
      const createdEntities = { order: [] };
      let storeOwners = new Set();

      // Handle Orders
      if (orderItems.length > 0) {
        const storeOrderMap = new Map();

        for (const item of orderItems) {
          const product = await Product.findById(item.productId);
          if (!product) {
            return res
              .status(404)
              .json(errorResponse(`Product ${item.productId} not found`, 404));
          }

          if (!product.isPreorder && product.stock < item.quantity) {
            return res
              .status(400)
              .json(
                errorResponse(
                  `Insufficient stock for ${product.title}. Available: ${product.stock}`,
                  400
                )
              );
          }

          const storeId =
            typeof item.storeId === "object"
              ? item.storeId._id.toString()
              : item.storeId.toString();
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
          await createPurchaseNotification(req.user._id, "order", order);

          // Create wallet transaction (excluded from balance)
          const transaction = new Transaction({
            userId: (await Store.findById(storeId)).ownerId,
            transactionId: combinedId,
            type: "sale",
            amount: storeAmount.toFixed(2),
            status: "pending",
            description: `Bank transfer payment for order ${combinedId}`,
            excludeFromBalance: true,
          });
          await transaction.save();

          createdEntities.order.push(order);
          totalAmount += storeData.totalAmount;
        }
      }

      if (totalAmount <= 0) {
        return res
          .status(400)
          .json(errorResponse("Total amount must be greater than zero", 400));
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

      res.json(
        successResponse({
          combinedId,
          transactionId:
            createdEntities.order.length > 0
              ? createdEntities.order[0]._id
              : null,
          totalAmount,
          bankDetails,
          instructions:
            "Please transfer the amount to the bank account(s) above and contact the store via WhatsApp or email with your transfer receipt.",
          createdEntities,
        })
      );
    } catch (error) {
      logger.error("Bank transfer intent error", error);
      res
        .status(500)
        .json(errorResponse("Failed to create bank transfer payment"));
    }
  }

  // COD Payment Intent
   createCodIntent = async(req, res) =>{
    logger.route(req.method, req.originalUrl);

    try {
      const { orderItems = [], shippingAddress = {} } = req.body;

      if (!req.user || req.user.role !== "customer") {
        return res
          .status(403)
          .json(errorResponse("Only customers can create COD payments", 403));
      }

      if (req.user.verificationStatus !== "verified") {
        return res.status(403).json(
          errorResponse(
            "Document verification required for Cash on Delivery",
            403,
            {
              requiresVerification: true,
            }
          )
        );
      }

      const combinedId = this.generateTransactionId("COD", req.user._id);
      let totalAmount = 0;
      const createdEntities = { order: [] };

      // Handle Orders
      if (orderItems.length > 0) {
        const storeOrderMap = new Map();

        for (const item of orderItems) {
          const product = await Product.findById(item.productId);
          if (!product) {
            return res
              .status(404)
              .json(errorResponse(`Product ${item.productId} not found`, 404));
          }

          if (!product.isPreorder && product.stock < item.quantity) {
            return res
              .status(400)
              .json(
                errorResponse(
                  `Insufficient stock for ${product.title}. Available: ${product.stock}`,
                  400
                )
              );
          }

          const storeId =
            typeof item.storeId === "object"
              ? item.storeId._id.toString()
              : item.storeId.toString();

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
          await createPurchaseNotification(req.user._id, "order", order);

          // Create wallet transaction (excluded from balance)
          const transaction = new Transaction({
            userId: (await Store.findById(storeId)).ownerId,
            transactionId: combinedId,
            type: "sale",
            amount: storeAmount.toFixed(2),
            status: "pending",
            description: `COD payment for order ${combinedId}`,
            excludeFromBalance: true,
          });
          await transaction.save();

          createdEntities.order.push(order);
          totalAmount += storeData.totalAmount;
        }
      }

      if (totalAmount <= 0) {
        return res
          .status(400)
          .json(errorResponse("Total amount must be greater than zero", 400));
      }

      res.json(
        successResponse({
          combinedId,
          transactionId:
            createdEntities.order.length > 0
              ? createdEntities.order[0]._id
              : null,
          totalAmount,
          message:
            "COD order created successfully. You can mark it as delivered once you receive your order.",
          createdEntities,
        })
      );
    } catch (error) {
      logger.error("COD intent error", error);
      res.status(500).json(errorResponse("Failed to create COD payment"));
    }
  }

  // Handle PayHere IPN
  async handlePayhereIPN(req, res) {
    const data = req.body;
    logger.info("Received PayHere IPN Data", {
      data: JSON.stringify(data, null, 2),
    });

    // Validate required fields
    if (
      !data.merchant_id ||
      !data.order_id ||
      !data.payhere_amount ||
      !data.payhere_currency ||
      !data.md5sig ||
      !data.status_code
    ) {
      logger.error("Missing required IPN fields", { data });
      return res.status(400).send("Invalid IPN: Missing required fields");
    }

    try {
      const localMd5sig = this.generatePayHereIPNHash({
        merchantId: data.merchant_id,
        orderId: data.order_id,
        amount: parseFloat(data.payhere_amount).toFixed(2),
        currency: data.payhere_currency,
        statusCode: data.status_code,
        merchantSecret: PAYHERE_SECRET,
      });

      if (localMd5sig !== data.md5sig) {
        logger.error("Invalid MD5 signature on PayHere IPN");
        return res.status(400).send("Invalid IPN: Hash mismatch");
      }

      if (data.status_code === "2") {
        // Find pending PayHere transactions
        const pendingTransactions = await Transaction.find({
          transactionId: data.order_id,
          type: "sale",
          status: "pending",
          "metadata.paymentMethod": "payhere",
        }).populate("userId");

        if (pendingTransactions.length === 0) {
          return res
            .status(404)
            .json(errorResponse("Payment not found or already completed", 404));
        }

        const createdOrders = [];

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
                  payhereFee: orderInfo.payhereFee || 0,
                },
              });

              await order.save();
              createdOrders.push(order);

              await createPurchaseNotification(customerId, "order", order);

              // Validate stock availability and deduct stock
              for (const item of orderInfo.items) {
                const product = await Product.findById(item.productId);
                if (product) {
                  // Check stock availability for non-preorder items
                  if (!product.isPreorder && product.stock < item.quantity) {
                    logger.error(
                      `Insufficient stock for product ${item.productId}`,
                      {
                        requested: item.quantity,
                        available: product.stock,
                      }
                    );
                    // Skip this order but continue processing others
                    continue;
                  }

                  // Deduct stock only if sufficient
                  if (!product.isPreorder) {
                    await Product.findByIdAndUpdate(item.productId, {
                      $inc: { stock: -item.quantity },
                    });
                  }

                  // Update order stats
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

              // Update store owner's wallet pendingBalance for PayHere payment
              const store = await Store.findById(orderInfo.storeId);
              if (store && store.ownerId) {
                await Wallet.findOneAndUpdate(
                  { userId: store.ownerId },
                  { 
                    $inc: { 
                      'balance.pendingBalance': orderInfo.storeAmount
                    },
                    $set: {
                      'metadata.lastTransactionDate': new Date(),
                      'metadata.lastBalanceUpdate': new Date()
                    }
                  },
                  { upsert: true }
                );
              }

              // Notify store owner
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

          // Mark transaction as completed
          transaction.status = "completed";
          await transaction.save();
        }

        logger.info(
          `PayHere payment successful for transaction ${data.order_id}`,
          {
            createdOrdersCount: createdOrders.length,
          }
        );

        return res.status(200).send("OK");
      } else {
        logger.info(
          `PayHere IPN payment status: ${data.status_code} for ${data.order_id}`
        );
        return res.status(200).send("OK");
      }
    } catch (err) {
      logger.error("Error processing PayHere IPN", err);
      return res.status(500).send("Error");
    }
  }

  // Get Payment Methods
  async getPaymentMethods(req, res) {
    logger.route(req.method, req.originalUrl);

    const paymentMethods = [
      {
        id: "payhere",
        name: "PayHere",
        description: "Pay using PayHere (Cards, Mobile, Online Banking)",
        icon: "smartphone",
        available: true,
      },
      /*{
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
        available: true,
        requiresVerification: true,
      },*/
    ];

    res.json(successResponse(paymentMethods));
  }

  // Cancel Payment/Order
  async cancelPayment(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const id = req.params.id;

      // Try finding an order
      let item = await Order.findById(id).populate("storeId");
      let itemType = "order";

      if (!item) {
        logger.error("Item not found for ID", { id });
        return res.status(404).json(errorResponse("Item not found", 404));
      }

      // Check authorization
      const isStoreOwner =
        item.storeId.ownerId.toString() === req.user._id.toString();
      const isCustomer = item.customerId.toString() === req.user._id.toString();

      if (!isStoreOwner && !isCustomer) {
        logger.error("Unauthorized user", { userId: req.user._id });
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      // Customers cannot cancel anything - ever
      if (isCustomer) {
        logger.error("Customer attempting to cancel", {
          userId: req.user._id,
          itemId: id,
        });
        return res
          .status(403)
          .json(errorResponse("Customers cannot cancel orders", 403));
      }

      // Store owners can only cancel pending items
      if (isStoreOwner) {
        if (item.status !== "pending") {
          logger.error("Store owner trying to cancel non-pending item", {
            status: item.status,
          });
          return res
            .status(400)
            .json(errorResponse(`Cannot cancel ${item.status} order`, 400));
        }
      } else {
        logger.error("Unauthorized cancellation attempt", {
          userId: req.user._id,
        });
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      // Prepare cancellation details
      let notes = isStoreOwner
        ? "Cancelled by seller"
        : "Cancelled by customer";
      let sellerNote = isStoreOwner
        ? `You have cancelled this order`
        : `The customer has cancelled this order`;
      let customerNote = isStoreOwner
        ? `The seller has cancelled your order`
        : `You have cancelled this order`;

      // Handle refund logic
      if (item.paymentDetails?.paymentMethod === "payhere") {
        const paymentId = item.paymentDetails.transactionId;

        if (!paymentId) {
          logger.error("No PayHere transaction ID", {
            paymentDetails: item.paymentDetails,
          });
          return res
            .status(400)
            .json(errorResponse("No PayHere payment ID found for refund", 400));
        }

        try {
          const accessToken = await this.getAccessToken();
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
              } cancelled order`,
            }),
          });

          if (!refundResponse.ok) {
            const text = await refundResponse.text();
            logger.error("Refund API error", {
              status: refundResponse.status,
              response: text,
              paymentId,
              url: PAYHERE_REFUND_URL,
            });

            return res.status(500).json(
              errorResponse("Refund API call failed", 500, {
                details:
                  process.env.NODE_ENV === "development" ? text : undefined,
              })
            );
          }

          const result = await refundResponse.json();
          logger.info("PayHere refund response", { result });

          if (result.status !== 1) {
            logger.error("Refund failed", { result });
            return res
              .status(500)
              .json(
                errorResponse(
                  "Refund failed: " +
                    (result.msg || result.message || "Unknown error"),
                  500,
                  { refundStatus: result.status }
                )
              );
          }

          logger.info(`PayHere refund successful for order ${id}`, {
            refund_id: result.refund_id || result.id,
            amount: item.totalAmount,
            payment_id: paymentId,
          });

          notes += " and refunded via PayHere";

          // Restore stock for orders and non-preorder products
          if (item.items) {
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
          const transaction = new Transaction({
            userId: item.storeId.ownerId,
            transactionId: item.combinedId || item._id.toString(),
            type: "refund",
            amount: item.storeAmount,
            status: "completed",
            description: `Refund for order #${item._id.toString().slice(-8)}`,
          });

          await transaction.save();
        } catch (err) {
          logger.error("Refund error", err);
          return res.status(500).json(errorResponse("Refund process failed"));
        }
      }

      // Update item status to cancelled
      const updateData = {
        status: "cancelled",
        notes: notes,
      };

      let updatedItem = await Order.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      // Create notifications
      const storeNotification = await Notification.create({
        userId: item.storeId.ownerId,
        title: `order cancellation`,
        userType: "store_owner",
        body: `#${item._id.toString().slice(-8)} ${sellerNote}`,
        type: `order_update`,
        link: "/orders",
      });

      const customerNotification = await Notification.create({
        userId: item.customerId,
        title: `order cancellation`,
        userType: "customer",
        body: `#${item._id.toString().slice(-8)} ${customerNote}`,
        type: `order_update`,
        link: "/orders",
      });

      // Emit notifications
      emitNotification(item.storeId.ownerId.toString(), storeNotification);
      emitNotification(item.customerId.toString(), customerNotification);

      res.json(
        successResponse({
          message: `order cancelled successfully`,
          item: updatedItem,
          refunded: item.paymentDetails?.paymentMethod === "payhere",
        })
      );
    } catch (error) {
      logger.error("Cancel route error", error);
      res.status(500).json(errorResponse("Internal server error"));
    }
  }
}

export default new PaymentController();
