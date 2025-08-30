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

    // If no active subscription found, create a basic one or return basic package
    if (!subscription) {
      console.warn(`getUserPackage: No active subscription found for store ${user.storeId}, returning basic package`);
      const basicPackage = await Package.findOne({ name: 'basic' });
      
      if (basicPackage) {
        // Optionally create a basic subscription
        try {
          const newSubscription = new Subscription({
            userId: user._id,
            storeId: user.storeId,
            package: 'basic',
            amount: 0,
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
          });
          await newSubscription.save();
          console.log(`Created basic subscription for user ${user.email}`);
        } catch (subError) {
          console.error('Error creating basic subscription:', subError);
          // Continue anyway - we can still return the basic package
        }
        
        return basicPackage;
      }
      
      throw new Error("No subscription found and basic package not available");
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
    
    // Last resort fallback - return a minimal package object
    const fallbackPackage = {
      name: 'basic',
      analyticsLevel: 1,
      analytics: true,
      amount: 0,
      features: ['Basic analytics'],
      items: 8
    };
    
    console.warn('Returning fallback package due to error:', error.message);
    return fallbackPackage;
  }
}
