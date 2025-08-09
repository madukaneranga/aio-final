import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    childCategories: {
      type: [String],
      required: true,
      validate: [
        (arr) => arr.length > 0,
        "At least one child category required",
      ],
    },
  },
  {
    _id: false,
  }
);

const categorySchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      auto: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["physical", "digital", "service"],
      required: true,
    },
    subcategories: {
      type: [subcategorySchema],
      required: true,
      validate: [(arr) => arr.length > 0, "At least one subcategory required"],
    },
  },
  {
    timestamps: true,
  }
);

// Export the model
export default mongoose.model("Category", categorySchema);
