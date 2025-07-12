import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['product', 'service'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  themeColor: {
    type: String,
    default: '#000000'
  },
  heroImages: [{
    type: String
  }],
  profileImage: {
    type: String,
    default: ''
  },
  timeSlots: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: String,
    endTime: String
  }],
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contactInfo: {
    email: String,
    phone: String,
    address: String
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalSales: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Store', storeSchema);