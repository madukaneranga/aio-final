import express from "express";
import { authenticate } from "../middleware/auth.js";
import paymentController from "../controllers/paymentController.js";
import {
  validatePaymentIntent,
  validateBankTransferPreview,
  validatePayhereIPN,
  validateCancelPayment,
  validateCustomerRole,
  validateCustomerVerification,
} from "../validators/paymentValidator.js";

const router = express.Router();

// PayHere payment intent
router.post("/payhere-intent", authenticate, validatePaymentIntent, paymentController.createPayhereIntent);

// Bank transfer operations
router.post("/bank-transfer-preview", authenticate, validateCustomerRole, validateBankTransferPreview, paymentController.getBankTransferPreview);
router.post("/bank-transfer-intent", authenticate, validateCustomerRole, validatePaymentIntent, paymentController.createBankTransferIntent);

// COD payment intent
router.post("/cod-intent", authenticate, validateCustomerRole, validateCustomerVerification, validatePaymentIntent, paymentController.createCodIntent);

// PayHere IPN handler
router.post("/payhere/ipn", express.urlencoded({ extended: true }), paymentController.handlePayhereIPN);

// Payment methods
router.get("/payment-methods", authenticate, paymentController.getPaymentMethods);

// Cancel payment/order
router.put("/:id/cancel", authenticate, validateCancelPayment, paymentController.cancelPayment);

export default router;
