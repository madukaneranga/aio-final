import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { generateReceipt } from './utils/receiptGenerator.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const { default: Order } = await import('./models/Order.js');
    const { default: Booking } = await import('./models/Booking.js');
    
    // Find orders without receipts
    const ordersWithoutReceipts = await Order.find({
      $or: [
        { receiptGenerated: { $ne: true } },
        { receiptGenerated: null }
      ]
    })
    .populate('customerId', 'name email')
    .populate('storeId', 'name contactInfo')
    .populate('items.productId', 'title')
    .limit(5); // Process first 5 for testing
    
    console.log(`Found ${ordersWithoutReceipts.length} orders without receipts`);
    
    for (const order of ordersWithoutReceipts) {
      try {
        console.log(`Generating receipt for order ${order._id}...`);
        const receiptUrl = await generateReceipt(order, 'order');
        
        await Order.findByIdAndUpdate(order._id, {
          receiptUrl,
          receiptGenerated: true,
          receiptGeneratedAt: new Date(),
        });
        
        console.log(`✓ Receipt generated for order ${order._id}: ${receiptUrl}`);
      } catch (error) {
        console.error(`✗ Failed to generate receipt for order ${order._id}:`, error.message);
      }
    }
    
    // Find bookings without receipts
    const bookingsWithoutReceipts = await Booking.find({
      $or: [
        { receiptGenerated: { $ne: true } },
        { receiptGenerated: null }
      ]
    })
    .populate('customerId', 'name email')
    .populate('storeId', 'name contactInfo')
    .populate('serviceId', 'title')
    .limit(3); // Process first 3 for testing
    
    console.log(`Found ${bookingsWithoutReceipts.length} bookings without receipts`);
    
    for (const booking of bookingsWithoutReceipts) {
      try {
        console.log(`Generating receipt for booking ${booking._id}...`);
        const receiptUrl = await generateReceipt(booking, 'booking');
        
        await Booking.findByIdAndUpdate(booking._id, {
          receiptUrl,
          receiptGenerated: true,
          receiptGeneratedAt: new Date(),
        });
        
        console.log(`✓ Receipt generated for booking ${booking._id}: ${receiptUrl}`);
      } catch (error) {
        console.error(`✗ Failed to generate receipt for booking ${booking._id}:`, error.message);
      }
    }
    
    console.log('\n📊 Receipt generation completed!');
    process.exit(0);
  })
  .catch(console.error);