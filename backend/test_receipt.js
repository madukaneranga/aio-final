import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { generateReceipt } from './utils/receiptGenerator.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const { default: User } = await import('./models/User.js');
    const { default: Order } = await import('./models/Order.js');
    
    // Find a recent order to test receipt generation
    const order = await Order.findOne()
      .populate('customerId', 'name email')
      .populate('storeId', 'name contactInfo')
      .populate('items.productId', 'title')
      .sort({ createdAt: -1 });
    
    if (!order) {
      console.log('No orders found for testing');
      process.exit(1);
    }
    
    console.log('Found order for testing:');
    console.log('Order ID:', order._id);
    console.log('Customer:', order.customerId?.name);
    console.log('Store:', order.storeId?.name);
    console.log('Payment Method:', order.paymentDetails?.paymentMethod);
    console.log('Receipt Generated:', order.receiptGenerated);
    
    // Test receipt generation
    try {
      console.log('\nTesting receipt generation...');
      const receiptUrl = await generateReceipt(order, 'order');
      console.log('Receipt generated successfully:', receiptUrl);
      
      // Update order with receipt info
      await Order.findByIdAndUpdate(order._id, {
        receiptUrl,
        receiptGenerated: true,
        receiptGeneratedAt: new Date(),
      });
      console.log('Order updated with receipt info');
      
    } catch (error) {
      console.error('Receipt generation failed:', error);
    }
    
    process.exit(0);
  })
  .catch(console.error);