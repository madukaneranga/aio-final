// models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "userType", // dynamic reference
  },
  userType: {
  type: String,
  enum: ["customer", "store_owner"],
  required: true,
},
  title: String,
  body: String,
  type: {
    type: String,
    enum: ["order", "promotion", "warning", "announcement"],
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
