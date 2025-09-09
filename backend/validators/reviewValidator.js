import { validationErrorResponse } from "../utils/responseFormatter.js";
import mongoose from "mongoose";

export const validateStoreId = (req, res, next) => {
  const { storeId } = req.params;

  if (!storeId) {
    return res
      .status(400)
      .json(
        validationErrorResponse([
          { field: "storeId", message: "Store ID is required" },
        ])
      );
  }

  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    return res
      .status(400)
      .json(
        validationErrorResponse([
          { field: "storeId", message: "Invalid store ID format" },
        ])
      );
  }

  next();
};

export const validateProductId = (req, res, next) => {
  const { productId } = req.params;

  if (!productId) {
    return res
      .status(400)
      .json(
        validationErrorResponse([
          { field: "productId", message: "Product ID is required" },
        ])
      );
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res
      .status(400)
      .json(
        validationErrorResponse([
          { field: "productId", message: "Invalid product ID format" },
        ])
      );
  }

  next();
};

export const validateReviewId = (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json(
        validationErrorResponse([
          { field: "id", message: "Review ID is required" },
        ])
      );
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(
        validationErrorResponse([
          { field: "id", message: "Invalid review ID format" },
        ])
      );
  }

  next();
};

export const validateCreateReview = (req, res, next) => {
  const errors = [];
  const { storeId, orderId, rating, comment } = req.body;

  if (!storeId) {
    errors.push({ field: "storeId", message: "Store ID is required" });
  } else if (!mongoose.Types.ObjectId.isValid(storeId)) {
    errors.push({ field: "storeId", message: "Invalid store ID format" });
  }

  if (orderId && !mongoose.Types.ObjectId.isValid(orderId)) {
    errors.push({ field: "orderId", message: "Invalid order ID format" });
  }

  if (!rating) {
    errors.push({ field: "rating", message: "Rating is required" });
  } else if (typeof rating !== "number") {
    errors.push({ field: "rating", message: "Rating must be a number" });
  } else if (rating < 1 || rating > 5) {
    errors.push({ field: "rating", message: "Rating must be between 1 and 5" });
  }

  if (comment && typeof comment !== "string") {
    errors.push({ field: "comment", message: "Comment must be a string" });
  }

  if (comment && comment.length > 1000) {
    errors.push({
      field: "comment",
      message: "Comment must not exceed 1000 characters",
    });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateUpdateVisibility = (req, res, next) => {
  const errors = [];
  const { isVisible } = req.body;

  if (isVisible === undefined) {
    errors.push({
      field: "isVisible",
      message: "Visibility status is required",
    });
  } else if (typeof isVisible !== "boolean") {
    errors.push({
      field: "isVisible",
      message: "Visibility status must be a boolean",
    });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateReviewResponse = (req, res, next) => {
  const errors = [];
  const { message } = req.body;
  console.log("message  ", message);

  if (!message) {
    errors.push({ field: "message", message: "Response message is required" });
  } else if (typeof message !== "string") {
    errors.push({
      field: "message",
      message: "Response message must be a string",
    });
  } else if (message.trim().length === 0) {
    errors.push({
      field: "message",
      message: "Response message cannot be empty",
    });
  } else if (message.length > 500) {
    errors.push({
      field: "message",
      message: "Response message must not exceed 500 characters",
    });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};
