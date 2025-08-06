import mongoose from "mongoose";

const marketingSchema = new mongoose.Schema({

  heroImages: [
    {
      type: String,
    },
  ],
  adverticements: [
      {
        addId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
});

export default mongoose.model("Marketing", marketingSchema);
