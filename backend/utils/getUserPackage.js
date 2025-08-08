import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import Package from "../models/Package.js";

export async function getUserPackage(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (!user.storeId) throw new Error("User has no storeID");

  const subscription = await Subscription.findOne({ storeId: user.storeId });
  if (!subscription) throw new Error("Subscription not found for this store");

  const packageDetails = await Package.findOne({ name: subscription.package });
  if (!packageDetails) throw new Error("Package not found");

  return packageDetails;
}
