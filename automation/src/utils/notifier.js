const nodemailer = require('nodemailer');
const twilio = require('twilio');
const admin = require('firebase-admin');
const logger = require('./logger');

class Notifier {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.firebaseApp = null;
    
    this.initializeServices();
  }

  initializeServices() {
    try {
      // Initialize Email Service
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        this.emailTransporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        logger.info('Email service initialized');
      }

      // Initialize SMS Service (Twilio)
      if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(
          process.env.TWILIO_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        logger.info('SMS service initialized');
      }

      // Initialize Push Notification Service (Firebase)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
        logger.info('Push notification service initialized');
      }

    } catch (error) {
      logger.error('Error initializing notification services:', error);
    }
  }

  async sendEmail(to, subject, content, isHTML = false) {
    try {
      if (!this.emailTransporter) {
        throw new Error('Email service not configured');
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        [isHTML ? 'html' : 'text']: content
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}`, { messageId: result.messageId });
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendSMS(to, message) {
    try {
      if (!this.twilioClient) {
        throw new Error('SMS service not configured');
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
      });

      logger.info(`SMS sent successfully to ${to}`, { sid: result.sid });
      
      return { success: true, sid: result.sid };
    } catch (error) {
      logger.error('Error sending SMS:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPushNotification(tokens, notification, data = {}) {
    try {
      if (!this.firebaseApp) {
        throw new Error('Push notification service not configured');
      }

      const messaging = admin.messaging();
      const tokensArray = Array.isArray(tokens) ? tokens : [tokens];

      const message = {
        notification,
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        tokens: tokensArray
      };

      const result = await messaging.sendMulticast(message);
      
      logger.info(`Push notifications sent: ${result.successCount}/${tokensArray.length}`);
      
      if (result.failureCount > 0) {
        logger.warn(`Push notification failures:`, result.responses
          .filter(response => !response.success)
          .map(response => response.error?.message)
        );
      }

      return {
        success: result.successCount > 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
        responses: result.responses
      };
    } catch (error) {
      logger.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods for common notification scenarios
  async sendOrderReminder(user, order) {
    const subject = `Order Payment Reminder - Order #${order.orderNumber}`;
    const emailContent = `
      <h2>Payment Reminder</h2>
      <p>Dear ${user.name},</p>
      <p>This is a reminder that your order #${order.orderNumber} is still pending payment.</p>
      <p>Order Total: $${order.totalAmount}</p>
      <p>Please complete your payment to avoid order cancellation.</p>
      <p>Thank you!</p>
    `;

    const results = await Promise.allSettled([
      this.sendEmail(user.email, subject, emailContent, true),
      user.phone ? this.sendSMS(user.phone, `Payment reminder: Order #${order.orderNumber} ($${order.totalAmount}) is pending payment.`) : Promise.resolve(),
      user.fcmTokens?.length ? this.sendPushNotification(
        user.fcmTokens,
        { title: 'Payment Reminder', body: `Order #${order.orderNumber} payment pending` },
        { type: 'payment_reminder', orderId: order._id.toString() }
      ) : Promise.resolve()
    ]);

    return results;
  }

  async sendOrderCancellation(user, order) {
    const subject = `Order Cancelled - Order #${order.orderNumber}`;
    const emailContent = `
      <h2>Order Cancelled</h2>
      <p>Dear ${user.name},</p>
      <p>Your order #${order.orderNumber} has been cancelled due to non-payment.</p>
      <p>If you believe this is an error, please contact our support team.</p>
      <p>Thank you!</p>
    `;

    const results = await Promise.allSettled([
      this.sendEmail(user.email, subject, emailContent, true),
      user.phone ? this.sendSMS(user.phone, `Order #${order.orderNumber} has been cancelled due to non-payment.`) : Promise.resolve(),
      user.fcmTokens?.length ? this.sendPushNotification(
        user.fcmTokens,
        { title: 'Order Cancelled', body: `Order #${order.orderNumber} has been cancelled` },
        { type: 'order_cancelled', orderId: order._id.toString() }
      ) : Promise.resolve()
    ]);

    return results;
  }

  async sendSubscriptionExpiry(seller, subscription) {
    const subject = `Subscription Expiry Notice`;
    const emailContent = `
      <h2>Subscription Expiry Notice</h2>
      <p>Dear ${seller.businessName || seller.name},</p>
      <p>Your ${subscription.plan} subscription has expired or will expire soon.</p>
      <p>Please renew to continue enjoying premium features.</p>
      <p>Thank you!</p>
    `;

    const results = await Promise.allSettled([
      this.sendEmail(seller.email, subject, emailContent, true),
      seller.phone ? this.sendSMS(seller.phone, `Your ${subscription.plan} subscription has expired. Please renew to continue.`) : Promise.resolve(),
      seller.fcmTokens?.length ? this.sendPushNotification(
        seller.fcmTokens,
        { title: 'Subscription Expired', body: `Your ${subscription.plan} subscription has expired` },
        { type: 'subscription_expired', subscriptionId: subscription._id.toString() }
      ) : Promise.resolve()
    ]);

    return results;
  }
}

module.exports = new Notifier();