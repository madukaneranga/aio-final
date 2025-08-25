import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { generateReceipt } from './utils/receiptGenerator.js';

dotenv.config();

// Simple test data
const testOrderData = {
  _id: '68abc963cc91352a268080aa',
  customerId: {
    name: 'Test Customer',
    email: 'test@example.com'
  },
  storeId: {
    name: 'Test Store',
    contactInfo: {
      email: 'store@example.com',
      phone: '+94123456789'
    }
  },
  items: [
    {
      productId: {
        title: 'Test Product'
      },
      quantity: 2,
      price: 100.00
    }
  ],
  totalAmount: 200.00,
  platformFee: 10.00,
  paymentDetails: {
    paymentMethod: 'bank_transfer',
    paymentStatus: 'pending_bank_transfer'
  },
  shippingAddress: {
    street: '123 Test Street',
    city: 'Colombo',
    country: 'Sri Lanka'
  }
};

try {
  console.log('Testing standalone receipt generation...');
  const receiptUrl = await generateReceipt(testOrderData, 'order');
  console.log('Receipt generated successfully at:', receiptUrl);
} catch (error) {
  console.error('Receipt generation failed:', error);
  console.error('Error stack:', error.stack);
}