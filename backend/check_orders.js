import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const { default: Order } = await import('./models/Order.js');
    
    // Find all orders and check their receipt status
    const orders = await Order.find()
      .select('_id customerId paymentDetails receiptGenerated receiptUrl createdAt')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`\nFound ${orders.length} orders:`);
    orders.forEach((order, i) => {
      console.log(`${i + 1}. Order ID: ${order._id}`);
      console.log(`   Payment Method: ${order.paymentDetails?.paymentMethod || 'N/A'}`);
      console.log(`   Receipt Generated: ${order.receiptGenerated || false}`);
      console.log(`   Receipt URL: ${order.receiptUrl || 'N/A'}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log('');
    });
    
    // Check bookings too
    const { default: Booking } = await import('./models/Booking.js');
    const bookings = await Booking.find()
      .select('_id customerId paymentDetails receiptGenerated receiptUrl createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
      
    console.log(`Found ${bookings.length} bookings:`);
    bookings.forEach((booking, i) => {
      console.log(`${i + 1}. Booking ID: ${booking._id}`);
      console.log(`   Payment Method: ${booking.paymentDetails?.paymentMethod || 'N/A'}`);
      console.log(`   Receipt Generated: ${booking.receiptGenerated || false}`);
      console.log(`   Receipt URL: ${booking.receiptUrl || 'N/A'}`);
      console.log(`   Created: ${booking.createdAt}`);
      console.log('');
    });
    
    process.exit(0);
  })
  .catch(console.error);