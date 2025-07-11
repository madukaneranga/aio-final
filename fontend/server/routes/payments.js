import express from 'express';
import Order from '../models/Order.js';
import Booking from '../models/Booking.js';
import Product from '../models/Product.js';
import Service from '../models/Service.js';
import Store from '../models/Store.js';
import Commission from '../models/Commission.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Create payment intent for order (Local Payment System)
router.post('/create-order-intent', authenticate, async (req, res) => {
  try {
    const { items, shippingAddress, storeId } = req.body;
    
    let totalAmount = 0;
    const orderItems = [];
    let orderStoreId = storeId;
    
    // Ensure storeId is a string
    if (typeof storeId === 'object' && storeId._id) {
      orderStoreId = storeId._id;
    } else if (typeof storeId === 'object') {
      return res.status(400).json({ error: 'Invalid store ID format' });
    }

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.title}` });
      }

      // Use the product's store ID if not provided
      if (!orderStoreId) {
        orderStoreId = product.storeId;
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }

    const commissionRate = 0.07; // 7% commission
    const commissionAmount = totalAmount * commissionRate;
    const storeAmount = totalAmount - commissionAmount;

    // Create order
    const order = new Order({
      customerId: req.user._id,
      storeId: orderStoreId,
      items: orderItems,
      totalAmount,
      platformFee: commissionAmount,
      storeAmount,
      shippingAddress,
      status: 'processing', // Set to processing immediately for local payment
      paymentDetails: {
        paymentStatus: 'paid',
        paidAt: new Date(),
        paymentMethod: 'local_payment',
        localPaymentId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });

    await order.save();

    // Update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

    // Update store total sales
    await Store.findByIdAndUpdate(orderStoreId, {
      $inc: { totalSales: storeAmount }
    });

    // Create commission record
    const commission = new Commission({
      orderId: order._id,
      storeId: orderStoreId,
      totalAmount: order.totalAmount,
      commissionRate: 0.07,
      commissionAmount: order.platformFee,
      storeAmount: order.storeAmount,
      currency: 'LKR',
      type: 'order'
    });
    await commission.save();

    res.json({
      success: true,
      orderId: order._id,
      message: 'Order placed successfully'
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create payment intent for booking (Local Payment System)
router.post('/create-booking-intent', authenticate, async (req, res) => {
  try {
    const { serviceId, bookingDate, startTime, endTime, notes } = req.body;
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const totalAmount = service.price;
    const commissionRate = 0.07; // 7% commission
    const commissionAmount = totalAmount * commissionRate;
    const storeAmount = totalAmount - commissionAmount;

    // Create booking
    const booking = new Booking({
      customerId: req.user._id,
      storeId: service.storeId,
      serviceId: service._id,
      bookingDate,
      startTime,
      endTime,
      totalAmount,
      platformFee: commissionAmount,
      storeAmount,
      notes,
      status: 'confirmed', // Set to confirmed immediately for local payment
      paymentDetails: {
        paymentStatus: 'paid',
        paidAt: new Date(),
        paymentMethod: 'local_payment',
        localPaymentId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });

    await booking.save();

    // Update store total sales
    const storeIdToUpdate = service.storeId;
    await Store.findByIdAndUpdate(storeIdToUpdate, {
      $inc: { totalSales: storeAmount }
    });

    // Create commission record
    const commission = new Commission({
      bookingId: booking._id,
      storeId: storeIdToUpdate,
      totalAmount: booking.totalAmount,
      commissionRate: 0.07,
      commissionAmount: booking.platformFee,
      storeAmount: booking.storeAmount,
      currency: 'LKR',
      type: 'booking'
    });
    await commission.save();

    res.json({
      success: true,
      bookingId: booking._id,
      message: 'Booking confirmed successfully'
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process local payment (simulates payment gateway)
router.post('/process-local-payment', authenticate, async (req, res) => {
  try {
    const { amount, currency = 'LKR', paymentMethod = 'bank_transfer' } = req.body;

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate payment success (in real implementation, this would integrate with local payment gateway)
    const paymentResult = {
      success: true,
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      currency,
      paymentMethod,
      processedAt: new Date(),
      status: 'completed'
    };

    res.json(paymentResult);
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// Get payment methods available in Sri Lanka
router.get('/payment-methods', (req, res) => {
  const paymentMethods = [
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Direct bank transfer to merchant account',
      icon: 'building-2',
      available: true
    },
    {
      id: 'mobile_payment',
      name: 'Mobile Payment',
      description: 'Pay using mobile wallet (Dialog eZ Cash, Mobitel mCash)',
      icon: 'smartphone',
      available: true
    },
    {
      id: 'cash_on_delivery',
      name: 'Cash on Delivery',
      description: 'Pay when you receive your order',
      icon: 'banknote',
      available: true
    },
    {
      id: 'card_payment',
      name: 'Debit/Credit Card',
      description: 'Local bank cards accepted',
      icon: 'credit-card',
      available: true
    }
  ];

  res.json(paymentMethods);
});

export default router;