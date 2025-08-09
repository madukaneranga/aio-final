// models/EmailSubscription.js
import mongoose from 'mongoose';

const emailSubscriptionSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  preferences: {
    newsletter: { type: Boolean, default: true },
    promos: { type: Boolean, default: true },
    updates: { type: Boolean, default: true },
  },
});

const EmailSubscription = mongoose.model('EmailSubscription', emailSubscriptionSchema);
export default EmailSubscription;
