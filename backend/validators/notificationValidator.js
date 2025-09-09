import { validationErrorResponse } from "../utils/responseFormatter.js";
import mongoose from "mongoose";

export const validateNotificationId = (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json(validationErrorResponse([
      { field: 'id', message: 'Notification ID is required' }
    ]));
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(validationErrorResponse([
      { field: 'id', message: 'Invalid notification ID format' }
    ]));
  }

  next();
};