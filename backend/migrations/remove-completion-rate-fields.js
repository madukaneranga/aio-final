#!/usr/bin/env node

/**
 * Migration Script: Remove completionRate fields from Store documents
 * 
 * This script removes the stored completionRate fields from all Store documents
 * since we now calculate completion rate in real-time using aggregation.
 * 
 * Usage: node backend/migrations/remove-completion-rate-fields.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Store from "../models/Store.js";

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/aio-store";

async function migrateCompletionRateFields() {
  try {
    console.log("🚀 Starting completion rate fields migration...");
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Count stores before migration
    const totalStores = await Store.countDocuments({});
    console.log(`📊 Found ${totalStores} stores in database`);

    if (totalStores === 0) {
      console.log("⚠️  No stores found. Nothing to migrate.");
      return;
    }

    // Remove completionRate field from all stores
    console.log("🔄 Removing completionRate fields...");
    
    const result1 = await Store.updateMany(
      { completionRate: { $exists: true } },
      { $unset: { completionRate: "" } }
    );
    
    console.log(`✅ Removed completionRate field from ${result1.modifiedCount} stores`);

    // Remove stats.completionRate field from all stores
    const result2 = await Store.updateMany(
      { "stats.completionRate": { $exists: true } },
      { $unset: { "stats.completionRate": "" } }
    );
    
    console.log(`✅ Removed stats.completionRate field from ${result2.modifiedCount} stores`);

    // Verify migration
    const storesWithCompletionRate = await Store.countDocuments({
      $or: [
        { completionRate: { $exists: true } },
        { "stats.completionRate": { $exists: true } }
      ]
    });

    if (storesWithCompletionRate === 0) {
      console.log("🎉 Migration completed successfully! All completion rate fields removed.");
    } else {
      console.log(`⚠️  Warning: ${storesWithCompletionRate} stores still have completion rate fields.`);
    }

    // Sample a few stores to show they no longer have completion rate fields
    const sampleStores = await Store.find({}).limit(3).lean();
    console.log("📝 Sample stores after migration:");
    sampleStores.forEach((store, index) => {
      console.log(`   Store ${index + 1}: ${store.name}`);
      console.log(`     - Has completionRate: ${store.completionRate !== undefined}`);
      console.log(`     - Has stats.completionRate: ${store.stats?.completionRate !== undefined}`);
    });

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateCompletionRateFields()
    .then(() => {
      console.log("🏁 Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration script failed:", error);
      process.exit(1);
    });
}

export default migrateCompletionRateFields;