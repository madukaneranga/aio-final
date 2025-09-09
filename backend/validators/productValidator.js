import { validationErrorResponse } from "../utils/responseFormatter.js";
import mongoose from "mongoose";

/**
 * Validate create product request
 */
export const validateCreateProduct = (req, res, next) => {
  

  next();
};

/**
 * Validate update product request
 */
export const validateUpdateProduct = (req, res, next) => {
  

  next();
};

/**
 * Validate search products request
 */
export const validateSearchProducts = (req, res, next) => {
  

  next();
};

/**
 * Validate product ID parameter
 */
export const validateProductId = (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(validationErrorResponse([
      { field: "id", message: "Valid product ID is required" }
    ]));
  }

  next();
};
