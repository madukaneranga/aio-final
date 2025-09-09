#!/usr/bin/env node

/**
 * Subscription API Integration Tests
 * Run: npm test -- test/subscription-api.test.js
 * Or: node test/subscription-api.test.js
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Store from '../models/Store.js';
import Subscription from '../models/Subscription.js';
import Package from '../models/Package.js';

describe('Subscription API Endpoints', () => {
  let storeOwnerToken;
  let adminToken;
  let storeOwnerId;
  let storeId;
  let subscriptionId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/aio_test');
    }

    // Clean test data
    await User.deleteMany({ email: { $in: ['testowner@test.com', 'testadmin@test.com'] } });
    await Store.deleteMany({ name: 'Test Store' });
    await Subscription.deleteMany({});

    // Ensure packages exist
    await Package.deleteMany({});
    await Package.insertMany([
      { name: 'basic', amount: 1000, features: ['Basic features'] },
      { name: 'standard', amount: 1500, features: ['Standard features'] },
      { name: 'pro', amount: 2000, features: ['Pro features'] },
      { name: 'premium', amount: 2500, features: ['Premium features'] }
    ]);

    // Create test store owner
    const storeOwner = await User.create({
      name: 'Test Store Owner',
      email: 'testowner@test.com',
      password: 'password123',
      role: 'store_owner'
    });
    storeOwnerId = storeOwner._id;

    // Create test store
    const store = await Store.create({
      name: 'Test Store',
      description: 'Test store for API testing',
      ownerId: storeOwnerId,
      contactInfo: {
        email: 'testowner@test.com',
        phone: '0771234567',
        address: '123 Test St'
      }
    });
    storeId = store._id;

    // Update user with storeId
    await User.findByIdAndUpdate(storeOwnerId, { storeId });

    // Create test admin
    const admin = await User.create({
      name: 'Test Admin',
      email: 'testadmin@test.com',
      password: 'password123',
      role: 'admin'
    });

    // Generate tokens
    const storeOwnerResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testowner@test.com',
        password: 'password123'
      });

    const adminResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testadmin@test.com',
        password: 'password123'
      });

    storeOwnerToken = storeOwnerResponse.headers['set-cookie'][0].split(';')[0].split('=')[1];
    adminToken = adminResponse.headers['set-cookie'][0].split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $in: ['testowner@test.com', 'testadmin@test.com'] } });
    await Store.deleteMany({ name: 'Test Store' });
    await Subscription.deleteMany({});
    await Package.deleteMany({});
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  });

  describe('GET /api/subscriptions/subscription', () => {
    it('should return 404 when no subscription exists', async () => {
      const response = await request(app)
        .get('/api/subscriptions/subscription')
        .set('Cookie', [`token=${storeOwnerToken}`]);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        message: 'No active subscription found',
        status: 404,
        errorCode: 'NO_SUBSCRIPTION'
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/subscriptions/subscription');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'No token provided'
      });
    });
  });

  describe('POST /api/subscriptions/', () => {
    it('should create subscription successfully', async () => {
      const response = await request(app)
        .post('/api/subscriptions/')
        .set('Cookie', [`token=${storeOwnerToken}`])
        .send({
          packageName: 'premium'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Subscription created successfully',
        status: 201
      });

      expect(response.body.data.savedSubscription).toMatchObject({
        userId: storeOwnerId.toString(),
        storeId: storeId.toString(),
        package: 'premium',
        amount: 2500,
        currency: 'LKR',
        status: 'pending',
        plan: 'monthly'
      });

      expect(response.body.data.paymentParams).toHaveProperty('hash');
      expect(response.body.data.paymentParams).toHaveProperty('order_id');
      expect(response.body.data.paymentParams.amount).toBe('2500.00');

      subscriptionId = response.body.data.savedSubscription._id;
    });

    it('should prevent duplicate subscriptions', async () => {
      // First create a subscription (if not already created)
      await Subscription.create({
        userId: storeOwnerId,
        storeId: storeId,
        package: 'basic',
        amount: 1000,
        currency: 'LKR',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/subscriptions/')
        .set('Cookie', [`token=${storeOwnerToken}`])
        .send({
          packageName: 'premium'
        });

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        success: false,
        message: 'User already has active subscription',
        status: 409,
        errorCode: 'SUBSCRIPTION_EXISTS'
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/subscriptions/')
        .set('Cookie', [`token=${storeOwnerToken}`])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual({
        field: 'packageName',
        message: 'Package name is required'
      });
    });

    it('should validate invalid package', async () => {
      // Clean existing subscriptions
      await Subscription.deleteMany({ userId: storeOwnerId });

      const response = await request(app)
        .post('/api/subscriptions/')
        .set('Cookie', [`token=${storeOwnerToken}`])
        .send({
          packageName: 'invalid_package'
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        message: "Package 'invalid_package' not found",
        status: 400,
        errorCode: 'NOT_FOUND'
      });
    });
  });

  describe('PUT /api/subscriptions/upgrade', () => {
    beforeEach(async () => {
      // Ensure we have an active subscription to upgrade
      await Subscription.deleteMany({ userId: storeOwnerId });
      await Subscription.create({
        userId: storeOwnerId,
        storeId: storeId,
        package: 'basic',
        amount: 1000,
        currency: 'LKR',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    });

    it('should initiate upgrade successfully', async () => {
      const response = await request(app)
        .put('/api/subscriptions/upgrade')
        .set('Cookie', [`token=${storeOwnerToken}`])
        .send({
          packageName: 'premium'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Subscription updated successfully'
      });

      expect(response.body.data).toHaveProperty('paymentParams');
      expect(response.body.data).toHaveProperty('upgradeAttemptId');
      expect(response.body.data.safeUpgrade).toBe(true);
    });

    it('should prevent same package upgrade', async () => {
      const response = await request(app)
        .put('/api/subscriptions/upgrade')
        .set('Cookie', [`token=${storeOwnerToken}`])
        .send({
          packageName: 'basic'
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        message: 'You are already on this package',
        status: 400,
        errorCode: 'SAME_PACKAGE'
      });
    });
  });

  describe('POST /api/subscriptions/cancel', () => {
    beforeEach(async () => {
      // Ensure we have an active subscription to cancel
      await Subscription.deleteMany({ userId: storeOwnerId });
      await Subscription.create({
        userId: storeOwnerId,
        storeId: storeId,
        package: 'premium',
        amount: 2500,
        currency: 'LKR',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        recurrenceId: 'TEST_RECURRENCE_ID'
      });
    });

    it('should cancel subscription successfully', async () => {
      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .set('Cookie', [`token=${storeOwnerToken}`])
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Subscription cancelled successfully'
      });

      expect(response.body.data).toHaveProperty('status', 'cancelled');
      expect(response.body.data).toHaveProperty('validUntil');
    });
  });

  describe('POST /api/subscriptions/rollback', () => {
    it('should return error when no pending upgrade', async () => {
      const response = await request(app)
        .post('/api/subscriptions/rollback')
        .set('Cookie', [`token=${storeOwnerToken}`])
        .send({
          upgradeAttemptId: 'TEST_UPGRADE_ID'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No pending upgrade found');
    });
  });

  describe('POST /api/subscriptions/ipn', () => {
    it('should reject invalid signature', async () => {
      const response = await request(app)
        .post('/api/subscriptions/ipn')
        .send({
          merchant_id: '1234567',
          order_id: 'SUB_TEST_123',
          payment_id: 'PH_PAY_123',
          subscription_id: 'PH_SUB_123',
          payhere_amount: '2500.00',
          payhere_currency: 'LKR',
          status_code: '2',
          md5sig: 'INVALID_SIGNATURE'
        });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid signature');
    });

    it('should validate required IPN fields', async () => {
      const response = await request(app)
        .post('/api/subscriptions/ipn')
        .send({
          merchant_id: '1234567'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Admin Endpoints', () => {
    describe('GET /api/subscriptions/admin/all', () => {
      it('should get all subscriptions for admin', async () => {
        const response = await request(app)
          .get('/api/subscriptions/admin/all')
          .set('Cookie', [`token=${adminToken}`]);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true
        });

        expect(response.body.data).toHaveProperty('subscriptions');
        expect(response.body.data).toHaveProperty('count');
        expect(Array.isArray(response.body.data.subscriptions)).toBe(true);
      });

      it('should deny access to non-admin users', async () => {
        const response = await request(app)
          .get('/api/subscriptions/admin/all')
          .set('Cookie', [`token=${storeOwnerToken}`]);

        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({
          error: 'Access denied'
        });
      });
    });

    describe('GET /api/subscriptions/admin/stats', () => {
      it('should get subscription statistics for admin', async () => {
        const response = await request(app)
          .get('/api/subscriptions/admin/stats')
          .set('Cookie', [`token=${adminToken}`]);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true
        });

        expect(response.body.data).toHaveProperty('byStatus');
        expect(response.body.data).toHaveProperty('byPackage');
        expect(response.body.data).toHaveProperty('totalActive');
      });
    });
  });
});

// Manual test runner (if not using Jest)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Running Subscription API Tests...');
  console.log('Note: This requires proper Jest setup. Use: npm test');
}