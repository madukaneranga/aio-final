import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // e.g. "09:00"
  endTime: { type: String, required: true },   // e.g. "10:00"
}, { _id: false });

export default mongoose.model("TimeSlot", serviceSchema);