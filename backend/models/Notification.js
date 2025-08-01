import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "User",
  },
  userType: {
    type: String,
    enum: ["customer", "store_owner"],
    required: true,
  },
  title: String,
  body: String,
  link: String, // optional navigation link
  type: {
    type: String,
    enum: ["order_update", "booking_update", "review_update", "announcement","withdrawal_update"],
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});



export default mongoose.model("Notification", notificationSchema);
