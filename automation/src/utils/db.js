const mongoose = require('mongoose');
const logger = require('./logger');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      if (this.connection && this.connection.readyState === 1) {
        return this.connection;
      }

      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
      
      this.connection = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info('MongoDB connected successfully');
      
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      return this.connection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.connection = null;
        logger.info('MongoDB disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  isConnected() {
    return this.connection && this.connection.readyState === 1;
  }
}

module.exports = new Database();