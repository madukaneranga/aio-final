// middleware/withPackage.js
import Subscription from "../models/Subscription.js";
import Package from "../models/Package.js";

export const withPackage = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user._id });
    if (!subscription) return res.status(403).json({ message: "No active subscription" });

    const pkg = await Package.findOne({ name: subscription.package });
    if (!pkg) return res.status(400).json({ message: "Invalid package" });

    req.package = pkg; // attach package temporarily to this request
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
