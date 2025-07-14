import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import storeRoutes from './routes/stores.js';
import productRoutes from './routes/products.js';
import serviceRoutes from './routes/services.js';
import orderRoutes from './routes/orders.js';
import bookingRoutes from './routes/bookings.js';
import paymentRoutes from './routes/payments.js';
import reviewRoutes from './routes/reviews.js';
import subscriptionRoutes from './routes/subscriptions.js';
import commissionRoutes from './routes/commissions.js';
import platformSettingsRoutes from './routes/platformSettings.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware

app.use(cors({
  origin: 'https://www.aiocart.lk',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  credentials: true 
}));

app.get('/api/test', (req, res) => {
  res.json({ message: 'CORS works!' });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/platform-settings', platformSettingsRoutes);

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../dist')));
// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.get("/", (req,res) => {
  res.json("Hello");
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});


// Error handling middleware
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});