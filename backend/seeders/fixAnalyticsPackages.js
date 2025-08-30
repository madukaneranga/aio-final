import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Package from '../models/Package.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Store from '../models/Store.js';

dotenv.config();

const fixAnalyticsPackages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Define the proper package configurations with analytics levels
    const packageConfigs = [
      {
        name: 'basic',
        amount: 0,
        analyticsLevel: 1,
        analytics: true,
        analyticsFeatures: [
          '30-day sales snapshot',
          'Basic revenue metrics', 
          'Customer count and mix',
          'Top 3 products/services'
        ],
        features: ['Basic store features', 'Up to 8 products/services'],
        items: 8,
        themeColor: false,
        businessCard: false,
        invoices: false,
        socialButtons: false
      },
      {
        name: 'standard',
        amount: 2500,
        analyticsLevel: 2,
        analytics: true,
        analyticsFeatures: [
          'Everything in Basic',
          '6-month historical trends',
          'Advanced customer analytics',
          'PDF/Excel exports',
          'Operational metrics',
          'AI insights preview'
        ],
        features: ['Standard store features', 'Up to 25 products/services', 'Custom themes'],
        items: 25,
        themeColor: true,
        businessCard: true,
        invoices: true,
        socialButtons: true
      },
      {
        name: 'pro',
        amount: 3500,
        analyticsLevel: 2,
        analytics: true,
        analyticsFeatures: [
          'Everything in Standard',
          'Extended analytics features',
          'Priority support'
        ],
        features: ['Pro store features', 'Up to 50 products/services', 'Advanced customization'],
        items: 50,
        themeColor: true,
        businessCard: true,
        invoices: true,
        socialButtons: true
      },
      {
        name: 'premium',
        amount: 4999,
        analyticsLevel: 3,
        analytics: true,
        analyticsFeatures: [
          'Everything in Pro',
          '12+ month history & forecasting',
          'Global market insights',
          'Competitive analysis',
          'Customer lifetime value',
          'Automated weekly reports',
          'Full AI recommendations'
        ],
        features: ['Premium store features', 'Unlimited products/services', 'White-label options'],
        items: -1, // Unlimited
        themeColor: true,
        businessCard: true,
        invoices: true,
        socialButtons: true
      }
    ];

    // Update or create each package
    for (const config of packageConfigs) {
      const existing = await Package.findOne({ name: config.name });
      
      if (existing) {
        // Update existing package with new analytics configuration
        await Package.findOneAndUpdate(
          { name: config.name },
          { $set: config },
          { upsert: true }
        );
        console.log(`✓ Updated ${config.name} package with analytics level ${config.analyticsLevel}`);
      } else {
        // Create new package
        const newPackage = new Package(config);
        await newPackage.save();
        console.log(`✓ Created ${config.name} package with analytics level ${config.analyticsLevel}`);
      }
    }

    // Create default subscriptions for stores without them
    console.log('\nChecking for stores without subscriptions...');
    
    const storesWithoutSubscriptions = await Store.aggregate([
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'storeId',
          as: 'subscription'
        }
      },
      {
        $match: {
          subscription: { $size: 0 }
        }
      }
    ]);

    console.log(`Found ${storesWithoutSubscriptions.length} stores without subscriptions`);

    // Create basic subscriptions for stores without them
    for (const store of storesWithoutSubscriptions) {
      const newSubscription = new Subscription({
        storeId: store._id,
        package: 'basic',
        status: 'active',
        startDate: new Date(),
        endDate: null, // Basic is free, so no end date
        autoRenew: true
      });
      
      await newSubscription.save();
      console.log(`✓ Created basic subscription for store: ${store.name || store._id}`);
    }

    // Verify user-store relationships
    console.log('\nVerifying user-store relationships...');
    
    const usersWithoutStores = await User.find({
      role: 'store_owner',
      $or: [
        { storeId: { $exists: false } },
        { storeId: null }
      ]
    });

    console.log(`Found ${usersWithoutStores.length} store owners without storeId`);

    // Try to match users to stores by ownerId
    for (const user of usersWithoutStores) {
      const userStore = await Store.findOne({ ownerId: user._id });
      if (userStore) {
        await User.findByIdAndUpdate(user._id, { storeId: userStore._id });
        console.log(`✓ Linked user ${user.email} to store ${userStore.name || userStore._id}`);
      } else {
        console.log(`! User ${user.email} has no matching store`);
      }
    }

    // Summary report
    console.log('\n=== ANALYTICS FIX SUMMARY ===');
    const packages = await Package.find().select('name analyticsLevel analytics');
    packages.forEach(pkg => {
      console.log(`${pkg.name}: Level ${pkg.analyticsLevel}, Analytics: ${pkg.analytics}`);
    });

    const totalSubscriptions = await Subscription.countDocuments();
    const totalStores = await Store.countDocuments();
    const storeOwnersWithStores = await User.countDocuments({ role: 'store_owner', storeId: { $exists: true, $ne: null } });
    
    console.log(`\nTotal Packages: ${packages.length}`);
    console.log(`Total Stores: ${totalStores}`);
    console.log(`Total Subscriptions: ${totalSubscriptions}`);
    console.log(`Store Owners with Stores: ${storeOwnersWithStores}`);

    console.log('\n✅ Analytics packages and relationships fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing analytics packages:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  fixAnalyticsPackages();
}

export default fixAnalyticsPackages;