import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Store from '../models/Store.js';
import Subscription from '../models/Subscription.js';

dotenv.config();

const fixUserStoreChain = async () => {
  console.log('🔧 Fixing user-store-subscription chain...');
  
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');

    // Step 1: Fix users without storeId but have stores
    console.log('\n1. Fixing store owners without storeId...');
    const usersWithoutStoreId = await User.find({
      role: 'store_owner',
      $or: [
        { storeId: { $exists: false } },
        { storeId: null }
      ]
    });

    console.log(`Found ${usersWithoutStoreId.length} store owners without storeId`);

    for (const user of usersWithoutStoreId) {
      const userStore = await Store.findOne({ ownerId: user._id });
      if (userStore) {
        await User.findByIdAndUpdate(user._id, { storeId: userStore._id });
        console.log(`✅ Linked user ${user.email} to store ${userStore.name || userStore._id}`);
      } else {
        console.log(`⚠️  User ${user.email} has no matching store - may need manual review`);
      }
    }

    // Step 2: Create default subscriptions for stores without them
    console.log('\n2. Creating default subscriptions...');
    
    const storesWithoutSubs = await Store.aggregate([
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

    console.log(`Found ${storesWithoutSubs.length} stores without subscriptions`);

    for (const store of storesWithoutSubs) {
      // Find the store owner
      const storeOwner = await User.findOne({ storeId: store._id, role: 'store_owner' });
      if (!storeOwner) {
        console.log(`⚠️  No store owner found for store: ${store.name || store._id}`);
        continue;
      }

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 10); // Basic plan - 10 years (essentially permanent)

      const newSubscription = new Subscription({
        userId: storeOwner._id,
        storeId: store._id,
        package: 'basic',
        amount: 0, // Basic is free
        status: 'active',
        startDate: startDate,
        endDate: endDate,
        plan: 'monthly'
      });
      
      await newSubscription.save();
      console.log(`✅ Created basic subscription for store: ${store.name || store._id} (Owner: ${storeOwner.email})`);
    }

    // Step 3: Validation and summary
    console.log('\n3. Validation summary...');
    
    const stats = {
      totalStores: await Store.countDocuments(),
      totalSubscriptions: await Subscription.countDocuments(),
      storeOwnersTotal: await User.countDocuments({ role: 'store_owner' }),
      storeOwnersWithStores: await User.countDocuments({ 
        role: 'store_owner', 
        storeId: { $exists: true, $ne: null } 
      }),
      activeSubscriptions: await Subscription.countDocuments({ status: 'active' })
    };

    console.log(`📊 Stats:
- Total Stores: ${stats.totalStores}
- Total Subscriptions: ${stats.totalSubscriptions} 
- Store Owners Total: ${stats.storeOwnersTotal}
- Store Owners with Stores: ${stats.storeOwnersWithStores}
- Active Subscriptions: ${stats.activeSubscriptions}`);

    // Check for potential issues
    const potentialIssues = [];
    
    if (stats.totalStores > stats.totalSubscriptions) {
      potentialIssues.push(`${stats.totalStores - stats.totalSubscriptions} stores without subscriptions`);
    }
    
    if (stats.storeOwnersTotal > stats.storeOwnersWithStores) {
      potentialIssues.push(`${stats.storeOwnersTotal - stats.storeOwnersWithStores} store owners without stores`);
    }

    if (potentialIssues.length > 0) {
      console.log('\n⚠️  Potential issues found:');
      potentialIssues.forEach(issue => console.log(`- ${issue}`));
    } else {
      console.log('\n✅ No issues found - all relationships are properly linked!');
    }

    console.log('\n🎉 User-Store-Subscription chain fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

fixUserStoreChain();