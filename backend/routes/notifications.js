import express from 'express';
import { authenticate } from '../middleware/auth.js';
import notificationController from '../controllers/notificationController.js';
import { validateNotificationId } from '../validators/notificationValidator.js';

const router = express.Router();

// Notification routes
router.get('/', authenticate, notificationController.getNotifications);
router.patch('/:id/read', authenticate, validateNotificationId, notificationController.markAsRead);
router.patch('/:id/delete', authenticate, validateNotificationId, notificationController.deleteNotification);
router.patch('/mark-all-read', authenticate, notificationController.markAllAsRead);

export {
  createPurchaseNotification,
  createPaymentSuccessNotification,
  createDeliveryNotification
} from '../controllers/notificationController.js';

export default router;
