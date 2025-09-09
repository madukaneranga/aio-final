import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import Package from "../models/Package.js";

export async function getUserPackage(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`getUserPackage: User not found: ${userId}`);
      throw new Error("User not found");
    }

    // If user doesn't have storeId, return basic package by default
    if (!user.storeId) {
      console.warn(`getUserPackage: User ${user.email} has no storeId, returning basic package`);
      const basicPackage = await Package.findOne({ name: 'basic' });
      if (basicPackage) {
        return basicPackage;
      }
      throw new Error("User has no storeId and basic package not found");
    }

    // Find subscription for the store
    let subscription = await Subscription.findOne({ 
      storeId: user.storeId, 
      status: { $in: ['active', 'pending_upgrade'] }
    });

    // If no active subscription found, return null (no fake subscriptions)
    if (!subscription) {
      console.warn(`getUserPackage: No active subscription found for store ${user.storeId}`);
      return null; // Return null instead of creating fake subscription
    }

    // Find package details
    const packageDetails = await Package.findOne({ name: subscription.package });
    if (!packageDetails) {
      console.error(`getUserPackage: Package not found: ${subscription.package}`);
      
      // Fallback to basic package
      const basicPackage = await Package.findOne({ name: 'basic' });
      if (basicPackage) {
        console.warn(`Falling back to basic package for user ${user.email}`);
        return basicPackage;
      }
      
      throw new Error("Package not found and no fallback available");
    }

    return packageDetails;
    
  } catch (error) {
    console.error('getUserPackage error:', error);
    
    // Last resort fallback - return null instead of fake data
    console.error('getUserPackage error - returning null:', error.message);
    return null;
  }
}
