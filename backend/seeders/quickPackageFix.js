import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Package from '../models/Package.js';

dotenv.config();

const quickFix = async () => {
  console.log('Starting quick package fix...');
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');

    // Quick package updates
    const updates = [
      { name: 'basic', analyticsLevel: 1, analytics: true },
      { name: 'standard', analyticsLevel: 2, analytics: true },
      { name: 'pro', analyticsLevel: 2, analytics: true },
      { name: 'premium', analyticsLevel: 3, analytics: true }
    ];

    for (const update of updates) {
      await Package.updateOne(
        { name: update.name },
        { $set: update },
        { upsert: true }
      );
      console.log(`✅ Updated ${update.name} with analytics level ${update.analyticsLevel}`);
    }

    // Check current packages
    const packages = await Package.find().select('name analyticsLevel analytics');
    console.log('\nCurrent packages:');
    packages.forEach(pkg => {
      console.log(`- ${pkg.name}: Level ${pkg.analyticsLevel}, Analytics: ${pkg.analytics}`);
    });

    console.log('\n✅ Package fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

quickFix();