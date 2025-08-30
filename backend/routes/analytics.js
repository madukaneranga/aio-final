import express from "express";
const router = express.Router();
import mongoose from "mongoose";
import { authenticate, authorize } from "../middleware/auth.js";
import { getUserPackage } from "../utils/getUserPackage.js";
import * as XLSX from "xlsx";

import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Store from "../models/Store.js";
import User from "../models/User.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

// Import enhanced analytics utilities
import {
  analyticsCache,
  validateAnalyticsRequest,
  sanitizeAnalyticsData,
  createFallbackAnalyticsData,
  calculateCustomerSegmentation,
  calculateRevenueForecast,
  calculateOperationalMetrics,
  calculateABTestingMetrics,
  calculateImpressionAnalytics,
  calculateProductServicePerformance,
  calculateChatAnalytics,
  calculateRealTimeUpdate,
  trackAnalyticsEvent,
  createAnalyticsStream,
} from "../utils/analyticsProcessor.js";

// Extract analytics data generation logic for reuse in exports
const getAnalyticsData = async (storeId, months = 1, packageDetails) => {
  const now = new Date();
  let periodStart = null;

  if (months > 0) {
    periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - months);
  }

  const store = await Store.findById(storeId);
  if (!store) {
    throw new Error("Store not found");
  }

  const Model = store.type === "product" ? Order : Booking;
  const storeObjectId = new mongoose.Types.ObjectId(storeId);

  // ===== REVENUE BY MONTH (ALL TIME) =====
  const revenueByMonthAllTime = await Model.aggregate([
    { $match: { storeId: storeObjectId, status: "completed" } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: "$totalAmount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]).then((data) =>
    data.map((item) => ({
      month: item._id.month,
      year: item._id.year,
      revenue: item.revenue,
    }))
  );

  // ===== REVENUE BY MONTH (PERIOD OR ALL TIME) =====
  let revenueByMonth;
  if (months === 0) {
    revenueByMonth = [...revenueByMonthAllTime];
  } else {
    revenueByMonth = await Model.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          status: "completed",
          createdAt: { $gte: periodStart, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]).then((data) =>
      data.map((item) => ({
        month: item._id.month,
        year: item._id.year,
        revenue: item.revenue,
      }))
    );
  }

  // ===== MATCH CONDITION (PERIOD OR ALL TIME) =====
  const dateFilter =
    months > 0 ? { createdAt: { $gte: periodStart, $lte: now } } : {};

  // ===== TOP PRODUCTS OR SERVICES =====
  let topProducts = [];
  let topServices = [];
  let topItems = [];

  if (store.type === "product") {
    topProducts = await Order.aggregate([
      {
        $match: { storeId: storeObjectId, status: "completed", ...dateFilter },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          revenue: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] },
          },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 0,
          productId: "$product._id",
          name: "$product.name",
          totalSold: 1,
          revenue: 1,
        },
      },
    ]);
    topItems = topProducts;
  } else {
    topServices = await Booking.aggregate([
      {
        $match: { storeId: storeObjectId, status: "completed", ...dateFilter },
      },
      {
        $group: {
          _id: "$serviceId",
          totalBookings: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: "$service" },
      {
        $project: {
          _id: 0,
          serviceId: "$service._id",
          name: "$service.name",
          totalBookings: 1,
          revenue: 1,
        },
      },
    ]);
    topItems = topServices;
  }

  // ===== CUSTOMER STATS =====
  const customers = await Model.aggregate([
    { $match: { storeId: storeObjectId, status: "completed", ...dateFilter } },
    { $group: { _id: "$customerId", orderCount: { $sum: 1 } } },
  ]);
  const totalUniqueCustomers = customers.length;
  const returningCustomers = customers.filter((c) => c.orderCount > 1).length;
  const retentionRate =
    totalUniqueCustomers > 0
      ? (returningCustomers / totalUniqueCustomers) * 100
      : 0;

  // Calculate retention rate change (compare with previous period)
  let retentionRateChange = 0;
  if (months > 0) {
    const prevPeriodCustomers = await Model.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          status: "completed",
          createdAt: { $gte: prevPeriodStart, $lt: prevPeriodEnd },
        },
      },
      { $group: { _id: "$customerId", orderCount: { $sum: 1 } } },
    ]);
    const prevTotalUniqueCustomers = prevPeriodCustomers.length;
    const prevReturningCustomers = prevPeriodCustomers.filter((c) => c.orderCount > 1).length;
    const prevRetentionRate = prevTotalUniqueCustomers > 0 
      ? (prevReturningCustomers / prevTotalUniqueCustomers) * 100 
      : 0;
    
    retentionRateChange = prevRetentionRate > 0 
      ? Number(((retentionRate - prevRetentionRate) / prevRetentionRate * 100).toFixed(2))
      : 0;
  }

  // ===== TOTALS & AVERAGES (CURRENT PERIOD OR ALL TIME) =====
  const totals = await Model.aggregate([
    { $match: { storeId: storeObjectId, status: "completed", ...dateFilter } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
        totalCount: { $sum: 1 },
      },
    },
  ]);
  const curr = totals[0] || { totalRevenue: 0, totalCount: 0 };
  const avgValue =
    curr.totalCount > 0 ? curr.totalRevenue / curr.totalCount : 0;

  // ===== CHANGE % CALCULATION =====
  let revenueChangePct = 0;
  let countChangePct = 0;
  let avgValueChangePct = 0;

  if (months > 0) {
    const prevPeriodEnd = new Date(periodStart);
    const prevPeriodStart = new Date();
    prevPeriodStart.setMonth(prevPeriodStart.getMonth() - months * 2);

    const prevTotals = await Model.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          status: "completed",
          createdAt: { $gte: prevPeriodStart, $lt: prevPeriodEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalCount: { $sum: 1 },
        },
      },
    ]);
    const prev = prevTotals[0] || { totalRevenue: 0, totalCount: 0 };
    const prevAvgValue =
      prev.totalCount > 0 ? prev.totalRevenue / prev.totalCount : 0;

    revenueChangePct =
      prev.totalRevenue > 0
        ? ((curr.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100
        : 0;
    countChangePct =
      prev.totalCount > 0
        ? ((curr.totalCount - prev.totalCount) / prev.totalCount) * 100
        : 0;
    avgValueChangePct =
      prevAvgValue > 0 ? ((avgValue - prevAvgValue) / prevAvgValue) * 100 : 0;

    revenueChangePct = Number(revenueChangePct.toFixed(2));
    countChangePct = Number(countChangePct.toFixed(2));
    avgValueChangePct = Number(avgValueChangePct.toFixed(2));
  }

  // ===== ORDERS BY STATUS (ALL TIME) =====
  const ordersByStatusAgg = await Order.aggregate([
    { $match: { storeId: storeObjectId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const ordersByStatus = {};
  ordersByStatusAgg.forEach((s) => {
    ordersByStatus[s._id] = s.count;
  });

  // ===== BOOKINGS BY STATUS (ALL TIME) =====
  const bookingsByStatusAgg = await Booking.aggregate([
    { $match: { storeId: storeObjectId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const bookingsByStatus = {};
  bookingsByStatusAgg.forEach((s) => {
    bookingsByStatus[s._id] = s.count;
  });

  const analyticsLevel = packageDetails.analyticsLevel || 1;

  // Build response data based on analytics level
  let responseData = {
    analyticsLevel,
    packageName: packageDetails.name,
    storeId,
    totalRevenue: curr.totalRevenue,
    totalCount: curr.totalCount,
    avgValue,
    retentionRate: Math.round(retentionRate),
    retentionRateChange: retentionRateChange,
    topProducts: topProducts.slice(0, 3),
    topServices: topServices.slice(0, 3),
    totalUniqueCustomers,
    returningCustomers,
    customerMixNewVsReturning: {
      new: totalUniqueCustomers - returningCustomers,
      returning: returningCustomers,
      percentage:
        totalUniqueCustomers > 0
          ? Math.round((returningCustomers / totalUniqueCustomers) * 100)
          : 0,
    },
    bestSellingItem: topItems[0] || null,
    currency: "LKR",
    revenueChangePct: analyticsLevel >= 2 ? revenueChangePct : 0,
    countChangePct: analyticsLevel >= 2 ? countChangePct : 0,
    avgValueChangePct: analyticsLevel >= 2 ? avgValueChangePct : 0,
    ordersByStatus: ordersByStatus,
    bookingsByStatus: bookingsByStatus,
  };

  // Level 2: Advanced Analytics (Standard Plan)
  if (analyticsLevel >= 2) {
    const enhancedOperationalMetrics = await calculateOperationalMetrics(
      storeId,
      dateFilter
    );
    const revenueForecast = calculateRevenueForecast(revenueByMonth);
    const impressionAnalytics = await calculateImpressionAnalytics(
      storeId,
      dateFilter
    );
    const performanceAnalytics = await calculateProductServicePerformance(
      storeId,
      dateFilter
    );

    responseData = {
      ...responseData,
      revenueByMonth,
      operationalMetrics: {
        ...enhancedOperationalMetrics,
        fulfillmentRate: enhancedOperationalMetrics.fulfillmentRate || 0,
        avgOrderValue: enhancedOperationalMetrics.avgOrderValue || avgValue,
        repeatPurchaseRate:
          enhancedOperationalMetrics.repeatPurchaseRate || retentionRate,
      },
      revenueForecast,
      impressionAnalytics,
      performanceAnalytics,
      exportAvailable: true,
    };
  }

  // Level 3: Premium Analytics with Global Insights (Premium Plan)
  if (analyticsLevel >= 3) {
    const customerSegmentation = await calculateCustomerSegmentation(
      storeId,
      dateFilter
    );
    const abTestingMetrics = await calculateABTestingMetrics(storeId);
    const chatAnalytics = await calculateChatAnalytics(
      storeId,
      "daily",
      new Date()
    );

    responseData = {
      ...responseData,
      revenueByMonthAllTime,
      extendedHistory: true,
      globalInsightsAvailable: true,
      automatedReports: true,
      customerSegmentation,
      abTestingMetrics,
      chatAnalytics,
      predictiveAnalytics: {
        churnRisk: customerSegmentation.churnRisk?.highRiskPercentage || 0,
        lifetimeValuePrediction:
          customerSegmentation.customerLifetimeValue || 0,
        nextBestAction:
          customerSegmentation.recommendations?.[0] ||
          "Focus on customer retention campaigns for at-risk segments",
        growthOpportunities: customerSegmentation.growthOpportunities || [],
      },
      advancedInsights: {
        customerValueDistribution: customerSegmentation.valueDistribution || {},
        behavioralInsights: customerSegmentation.behavioralInsights || {},
        topCustomers: customerSegmentation.topCustomers || {},
        recommendations: customerSegmentation.recommendations || [],
      },
    };
  }

  return sanitizeAnalyticsData(responseData);
};

// Import enhanced security and rate limiting
import {
  analyticsRateLimiter,
  analyticsAccessControl,
  analyticsSecurityMonitor,
  getAnalyticsAccessLogs,
} from "../middleware/analyticsLimiter.js";

// 🔒 Main Analytics Route with Enhanced Security
router.get(
  "/:storeId",
  authenticate,
  analyticsSecurityMonitor(),
  analyticsAccessControl({ requireLevel: 1, requireStoreOwnership: true }),
  analyticsRateLimiter({ type: "general" }),
  async (req, res) => {
    const startTime = Date.now();
    let analyticsLevel = 1;
    let packageDetails = null;

    try {
      const { storeId } = req.params;
      const months = Number(req.query.months) || 1;

      // Enhanced request validation
      const validationErrors = validateAnalyticsRequest(
        storeId,
        months,
        req.user
      );
      if (validationErrors.length > 0) {
        console.warn("Analytics validation failed:", validationErrors);
        return res.status(400).json({
          error: validationErrors[0],
          code: "VALIDATION_ERROR",
        });
      }

      // Debug logging
      console.log("📊 Analytics request debug:", {
        requestedStoreId: storeId,
        userRole: req.user?.role,
        userStoreId: req.user?.storeId,
        userId: req.user?._id,
        months,
        timestamp: new Date().toISOString(),
      });

      const store = await Store.findById(storeId);
      if (!store) {
        console.warn("Store not found:", storeId);
        return res.status(404).json({ error: "Store not found" });
      }

      // Enhanced access control with better logging
      if (!req.user) {
        console.warn("Analytics access attempted without authentication");
        return res.status(401).json({ error: "Authentication required" });
      }

      // Allow if user is store_owner with matching storeId OR if user owns the store in question OR if user is admin
      const userStoreId = req.user.storeId?.toString();
      const requestedStoreId = storeId.toString();
      const storeOwnerId = store.ownerId?.toString();
      const userId = req.user._id.toString();

      const hasAccess =
        req.user.role === "admin" ||
        (req.user.role === "store_owner" && userStoreId === requestedStoreId) ||
        (storeOwnerId && storeOwnerId === userId);

      if (!hasAccess) {
        console.warn("Analytics access denied:", {
          userRole: req.user.role,
          userEmail: req.user.email,
          userStoreId,
          requestedStoreId,
          storeOwnerId,
          userId,
          reason:
            req.user.role !== "admin" && req.user.role !== "store_owner"
              ? "invalid_role"
              : req.user.role === "store_owner" &&
                userStoreId !== requestedStoreId
              ? "store_mismatch"
              : "owner_mismatch",
        });
        return res.status(403).json({
          error: "Access denied - insufficient permissions",
          details: "You can only view analytics for stores you own",
        });
      }

      // Get package details with improved error handling
      let packageDetails;
      try {
        packageDetails = await getUserPackage(req.user._id);
        console.log("Package details retrieved:", {
          packageName: packageDetails.name,
          analyticsLevel: packageDetails.analyticsLevel,
          analytics: packageDetails.analytics,
        });
      } catch (packageError) {
        console.error("Error getting package details:", packageError);
        // Use fallback package to ensure analytics still work
        packageDetails = {
          name: "basic",
          analyticsLevel: 1,
          analytics: true,
        };
        console.warn("Using fallback package for analytics");
      }

      analyticsLevel = packageDetails.analyticsLevel || 1;

      // 🚀 Check cache first for better performance
      const cachedData = analyticsCache.get(storeId, months, analyticsLevel);
      if (cachedData) {
        console.log("📋 Returning cached analytics data");
        return res.json(sanitizeAnalyticsData(cachedData));
      }

      console.log("🔄 Computing fresh analytics data...");
      const now = new Date();
      let periodStart = null;

      if (months > 0) {
        periodStart = new Date();
        periodStart.setMonth(periodStart.getMonth() - months);
      }

      const Model = store.type === "product" ? Order : Booking;

      // Convert storeId to ObjectId for proper MongoDB queries
      const storeObjectId = new mongoose.Types.ObjectId(storeId);

      // ===== REVENUE BY MONTH (ALL TIME) =====
      const revenueByMonthAllTime = await Model.aggregate([
        { $match: { storeId: storeObjectId, status: "completed" } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]).then((data) =>
        data.map((item) => ({
          month: item._id.month,
          year: item._id.year,
          revenue: item.revenue,
        }))
      );

      // ===== REVENUE BY MONTH (PERIOD OR ALL TIME) =====
      let revenueByMonth;
      if (months === 0) {
        revenueByMonth = [...revenueByMonthAllTime];
      } else {
        revenueByMonth = await Model.aggregate([
          {
            $match: {
              storeId: storeObjectId,
              status: "completed",
              createdAt: { $gte: periodStart, $lte: now },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              revenue: { $sum: "$totalAmount" },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]).then((data) =>
          data.map((item) => ({
            month: item._id.month,
            year: item._id.year,
            revenue: item.revenue,
          }))
        );
      }

      // ===== MATCH CONDITION (PERIOD OR ALL TIME) =====
      const dateFilter =
        months > 0 ? { createdAt: { $gte: periodStart, $lte: now } } : {};

      // ===== TOP PRODUCTS OR SERVICES =====
      let topProducts = [];
      let topServices = [];
      let topItems = [];

      if (store.type === "product") {
        topProducts = await Order.aggregate([
          {
            $match: {
              storeId: storeObjectId,
              status: "completed",
              ...dateFilter,
            },
          },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.productId",
              totalSold: { $sum: "$items.quantity" },
              revenue: {
                $sum: { $multiply: ["$items.quantity", "$items.price"] },
              },
            },
          },
          { $sort: { totalSold: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: "$product" },
          {
            $project: {
              _id: 0,
              productId: "$product._id",
              name: "$product.name",
              totalSold: 1,
              revenue: 1,
            },
          },
        ]);
        topItems = topProducts;
      } else {
        topServices = await Booking.aggregate([
          {
            $match: {
              storeId: storeObjectId,
              status: "completed",
              ...dateFilter,
            },
          },
          {
            $group: {
              _id: "$serviceId",
              totalBookings: { $sum: 1 },
              revenue: { $sum: "$totalAmount" },
            },
          },
          { $sort: { totalBookings: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "services",
              localField: "_id",
              foreignField: "_id",
              as: "service",
            },
          },
          { $unwind: "$service" },
          {
            $project: {
              _id: 0,
              serviceId: "$service._id",
              name: "$service.name",
              totalBookings: 1,
              revenue: 1,
            },
          },
        ]);
        topItems = topServices;
      }

      // ===== CUSTOMER STATS =====
      const customers = await Model.aggregate([
        {
          $match: {
            storeId: storeObjectId,
            status: "completed",
            ...dateFilter,
          },
        },
        { $group: { _id: "$customerId", orderCount: { $sum: 1 } } },
      ]);
      const totalUniqueCustomers = customers.length;
      const returningCustomers = customers.filter(
        (c) => c.orderCount > 1
      ).length;
      const retentionRate =
        totalUniqueCustomers > 0
          ? (returningCustomers / totalUniqueCustomers) * 100
          : 0;

      // ===== TOTALS & AVERAGES (CURRENT PERIOD OR ALL TIME) =====
      const totals = await Model.aggregate([
        {
          $match: {
            storeId: storeObjectId,
            status: "completed",
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalCount: { $sum: 1 },
          },
        },
      ]);
      const curr = totals[0] || { totalRevenue: 0, totalCount: 0 };
      const avgValue =
        curr.totalCount > 0 ? curr.totalRevenue / curr.totalCount : 0;

      // ===== CHANGE % CALCULATION =====
      let revenueChangePct = 0;
      let countChangePct = 0;
      let avgValueChangePct = 0;

      if (months > 0) {
        const prevPeriodEnd = new Date(periodStart);
        const prevPeriodStart = new Date();
        prevPeriodStart.setMonth(prevPeriodStart.getMonth() - months * 2);

        const prevTotals = await Model.aggregate([
          {
            $match: {
              storeId: storeObjectId,
              status: "completed",
              createdAt: { $gte: prevPeriodStart, $lt: prevPeriodEnd },
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalAmount" },
              totalCount: { $sum: 1 },
            },
          },
        ]);
        const prev = prevTotals[0] || { totalRevenue: 0, totalCount: 0 };
        const prevAvgValue =
          prev.totalCount > 0 ? prev.totalRevenue / prev.totalCount : 0;

        revenueChangePct =
          prev.totalRevenue > 0
            ? ((curr.totalRevenue - prev.totalRevenue) / prev.totalRevenue) *
              100
            : 0;
        countChangePct =
          prev.totalCount > 0
            ? ((curr.totalCount - prev.totalCount) / prev.totalCount) * 100
            : 0;
        avgValueChangePct =
          prevAvgValue > 0
            ? ((avgValue - prevAvgValue) / prevAvgValue) * 100
            : 0;

        revenueChangePct = Number(revenueChangePct.toFixed(2));
        countChangePct = Number(countChangePct.toFixed(2));
        avgValueChangePct = Number(avgValueChangePct.toFixed(2));
      }

      // ===== ORDERS BY STATUS (ALL TIME) =====
      const ordersByStatusAgg = await Order.aggregate([
        { $match: { storeId: storeObjectId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);
      const ordersByStatus = {};
      ordersByStatusAgg.forEach((s) => {
        ordersByStatus[s._id] = s.count;
      });

      // ===== BOOKINGS BY STATUS (ALL TIME) =====
      const bookingsByStatusAgg = await Booking.aggregate([
        { $match: { storeId: storeObjectId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);
      const bookingsByStatus = {};
      bookingsByStatusAgg.forEach((s) => {
        bookingsByStatus[s._id] = s.count;
      });

      // Filter response based on analytics level
      let responseData = {
        analyticsLevel,
        packageName: packageDetails.name,
      };

      // Level 1: Basic Analytics (Basic Plan)
      if (analyticsLevel >= 1) {
        responseData = {
          ...responseData,
          totalRevenue: curr.totalRevenue,
          totalCount: curr.totalCount,
          avgValue,
          retentionRate: Math.round(retentionRate), // Add retention rate for all levels
          topProducts: topProducts.slice(0, 3),
          topServices: topServices.slice(0, 3),
          totalUniqueCustomers,
          returningCustomers,
          customerMixNewVsReturning: {
            new: totalUniqueCustomers - returningCustomers,
            returning: returningCustomers,
            percentage:
              totalUniqueCustomers > 0
                ? Math.round((returningCustomers / totalUniqueCustomers) * 100)
                : 0,
          },
          bestSellingItem: topItems[0] || null,
          currency: "LKR",
          // Add additional basic metrics that frontend might expect
          revenueChangePct: 0, // Basic level doesn't calculate changes, but provide default
          countChangePct: 0,
          avgValueChangePct: 0,
          ordersByStatus: ordersByStatus,
          bookingsByStatus: bookingsByStatus,
        };
      }

      // Level 2: Advanced Analytics (Standard Plan)
      if (analyticsLevel >= 2) {
        // 📊 Calculate enhanced operational metrics
        const enhancedOperationalMetrics = await calculateOperationalMetrics(
          storeId,
          dateFilter
        );

        // 📈 Calculate revenue forecast
        const revenueForecast = calculateRevenueForecast(revenueByMonth);

        // 📱 Calculate impression analytics
        const impressionAnalytics = await calculateImpressionAnalytics(
          storeId,
          dateFilter
        );

        // 📊 Calculate product/service performance
        const performanceAnalytics = await calculateProductServicePerformance(
          storeId,
          dateFilter
        );

        responseData = {
          ...responseData,
          // Override Level 1 defaults with actual calculations for Level 2+
          revenueChangePct,
          countChangePct,
          avgValueChangePct,
          revenueByMonth,
          operationalMetrics: {
            ...enhancedOperationalMetrics,
            // Keep backward compatibility
            fulfillmentRate: enhancedOperationalMetrics.fulfillmentRate || 0,
            avgOrderValue: enhancedOperationalMetrics.avgOrderValue || avgValue,
            repeatPurchaseRate:
              enhancedOperationalMetrics.repeatPurchaseRate || retentionRate,
          },
          revenueForecast,
          impressionAnalytics,
          performanceAnalytics,
          exportAvailable: true,
        };
      }

      // Level 3: Premium Analytics with Global Insights (Premium Plan)
      if (analyticsLevel >= 3) {
        // 👥 Calculate enhanced customer segmentation
        const customerSegmentation = await calculateCustomerSegmentation(
          storeId,
          dateFilter
        );

        // 🧪 Calculate A/B testing metrics
        const abTestingMetrics = await calculateABTestingMetrics(storeId);

        // 💬 Calculate chat analytics
        const chatAnalytics = await calculateChatAnalytics(
          storeId,
          "daily",
          new Date()
        );

        responseData = {
          ...responseData,
          revenueByMonthAllTime,
          extendedHistory: true,
          globalInsightsAvailable: true,
          automatedReports: true,
          customerSegmentation,
          abTestingMetrics,
          chatAnalytics,
          predictiveAnalytics: {
            churnRisk: customerSegmentation.churnRisk?.highRiskPercentage || 0,
            lifetimeValuePrediction:
              customerSegmentation.customerLifetimeValue || 0,
            nextBestAction:
              customerSegmentation.recommendations?.[0] ||
              "Focus on customer retention campaigns for at-risk segments",
            growthOpportunities: customerSegmentation.growthOpportunities || [],
          },
          advancedInsights: {
            customerValueDistribution:
              customerSegmentation.valueDistribution || {},
            behavioralInsights: customerSegmentation.behavioralInsights || {},
            topCustomers: customerSegmentation.topCustomers || {},
            recommendations: customerSegmentation.recommendations || [],
          },
        };
      }

      // ===== REAL-TIME PROCESSING =====
      // Check if real-time updates are requested
      const enableRealTime =
        req.query.realtime === "true" && analyticsLevel >= 2;
      if (enableRealTime) {
        // Add real-time processing metadata
        responseData.realTimeEnabled = true;
        responseData.lastUpdated = new Date().toISOString();
        responseData.refreshInterval = analyticsLevel === 3 ? 30000 : 60000; // Premium: 30s, Standard: 60s

        // Set up server-sent events headers if requested
        if (req.headers.accept === "text/event-stream") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
          });

          // Send initial data
          res.write(
            `data: ${JSON.stringify(sanitizeAnalyticsData(responseData))}\n\n`
          );

          // Set up periodic updates
          const updateInterval = responseData.refreshInterval;
          const intervalId = setInterval(async () => {
            try {
              // Recalculate analytics with fresh data
              const updatedData = await calculateRealTimeUpdate(
                storeId,
                analyticsLevel,
                packageDetails
              );
              res.write(
                `data: ${JSON.stringify(
                  sanitizeAnalyticsData(updatedData)
                )}\n\n`
              );
            } catch (error) {
              console.error("Real-time update error:", error);
              res.write(
                `data: ${JSON.stringify({ error: "Update failed" })}\n\n`
              );
            }
          }, updateInterval);

          // Clean up on client disconnect
          req.on("close", () => {
            clearInterval(intervalId);
          });

          return; // Don't send regular JSON response
        }
      }

      // ===== RESPONSE =====
      const processingTime = Date.now() - startTime;

      // 🧹 Sanitize response data
      const sanitizedData = sanitizeAnalyticsData({
        ...responseData,
        processingTime,
        timestamp: new Date().toISOString(),
      });

      // 💾 Cache the result for better performance
      analyticsCache.set(storeId, months, analyticsLevel, sanitizedData);

      console.log("✅ Analytics response data:", {
        analyticsLevel,
        hasData: !!sanitizedData,
        dataKeys: Object.keys(sanitizedData),
        processingTime: `${processingTime}ms`,
        cached: false,
        timestamp: new Date().toISOString(),
      });

      console.log("data", sanitizedData);
      res.json(sanitizedData);
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error("❌ Analytics route error:", {
        error: error.message,
        stack: error.stack,
        storeId: req.params.storeId,
        userId: req.user?._id,
        userRole: req.user?.role,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      });

      // 🔄 Create enhanced fallback response
      const fallbackData = createFallbackAnalyticsData(
        error,
        analyticsLevel,
        packageDetails?.name || "basic"
      );

      // Add processing metadata
      fallbackData.processingTime = processingTime;
      fallbackData.timestamp = new Date().toISOString();

      // Provide helpful error details in development
      if (process.env.NODE_ENV === "development") {
        fallbackData.errorDetails = {
          message: error.message,
          code: error.code,
          stack: error.stack?.split("\n").slice(0, 5).join("\n"),
        };
      }

      res.status(500).json(sanitizeAnalyticsData(fallbackData));
    }
  }
);

// 🌍 Global Analytics for Level 3 Premium Users with Enhanced Security
router.get(
  "/global/insights",
  authenticate,
  analyticsSecurityMonitor(),
  analyticsAccessControl({ requireLevel: 3, requireStoreOwnership: false }),
  analyticsRateLimiter({ type: "general" }),
  async (req, res) => {
    try {
      const packageDetails = await getUserPackage(req.user._id);

      if (packageDetails.analyticsLevel < 3) {
        return res.status(403).json({ error: "Premium subscription required" });
      }

      // Platform-wide aggregations
      const platformStats = await Promise.all([
        // Total platform revenue
        Order.aggregate([
          { $match: { status: "completed" } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalAmount" },
              totalOrders: { $sum: 1 },
            },
          },
        ]),

        // Store type performance
        Store.aggregate([
          { $group: { _id: "$type", storeCount: { $sum: 1 } } },
          { $sort: { storeCount: -1 } },
          { $limit: 10 },
        ]),

        // Average pricing by store type
        Order.aggregate([
          { $match: { status: "completed" } },
          {
            $lookup: {
              from: "stores",
              localField: "storeId",
              foreignField: "_id",
              as: "store",
            },
          },
          { $unwind: "$store" },
          {
            $group: {
              _id: "$store.type",
              avgOrderValue: { $avg: "$totalAmount" },
              totalRevenue: { $sum: "$totalAmount" },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { totalRevenue: -1 } },
        ]),

        // Monthly platform growth
        Order.aggregate([
          { $match: { status: "completed" } },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              revenue: { $sum: "$totalAmount" },
              orders: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
          { $limit: 12 },
        ]),
      ]);

      const [platformRevenue, typePerformance, typePricing, platformGrowth] =
        platformStats;

      // User's store performance vs platform average
      const userStore = await Store.findById(req.user.storeId);
      const userStoreStats = await Order.aggregate([
        { $match: { storeId: req.user.storeId, status: "completed" } },
        { $group: { _id: null, avgOrderValue: { $avg: "$totalAmount" } } },
      ]);

      const typeAvg = typePricing.find((type) => type._id === userStore?.type);

      const result = {
        platformOverview: {
          totalRevenue: platformRevenue[0]?.totalRevenue || 0,
          totalOrders: platformRevenue[0]?.totalOrders || 0,
          avgPlatformOrderValue:
            platformRevenue[0]?.totalOrders > 0
              ? platformRevenue[0].totalRevenue / platformRevenue[0].totalOrders
              : 0,
        },
        typeTrends: typePerformance,
        typePricing: typePricing,
        platformGrowth: platformGrowth.map((item) => ({
          month: item._id.month,
          year: item._id.year,
          revenue: item.revenue,
          orders: item.orders,
        })),
        yourPerformance: {
          type: userStore?.type || "Unknown",
          yourAvgOrderValue: userStoreStats[0]?.avgOrderValue || 0,
          typeAvgOrderValue: typeAvg?.avgOrderValue || 0,
          performanceVsType:
            userStoreStats[0]?.avgOrderValue && typeAvg?.avgOrderValue
              ? Math.round(
                  ((userStoreStats[0].avgOrderValue - typeAvg.avgOrderValue) /
                    typeAvg.avgOrderValue) *
                    100
                )
              : 0,
        },
        competitiveInsights: {
          topPerformingTypes: typePricing.slice(0, 5),
          growthOpportunities: typePerformance
            .filter((type) => type._id !== userStore?.type)
            .slice(0, 3),
        },
      };

      console.log("result", result);

      res.json({
        globalInsights: result,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

// 📤 Enhanced Excel Export Reports Endpoint with Security
router.get(
  "/export/:storeId",
  authenticate,
  analyticsSecurityMonitor(),
  analyticsAccessControl({ requireLevel: 2, requireStoreOwnership: true }),
  analyticsRateLimiter({ type: "export" }),
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const { period = "30", detailed = "true" } = req.query;

      console.log("📤 Excel Export request:", {
        storeId,
        period,
        detailed,
        userId: req.user._id,
        analyticsLevel: req.user.analyticsLevel,
      });

      // Enhanced access control
      const packageDetails = await getUserPackage(req.user._id);

      if (
        req.user.role !== "store_owner" ||
        req.user.storeId.toString() !== storeId
      ) {
        return res.status(403).json({
          success: false,
          error: "Access denied - you can only export data for your own store",
        });
      }

      if (packageDetails.analyticsLevel < 2) {
        return res.status(403).json({
          success: false,
          error: "Standard subscription or higher required for exports",
          upgradeRequired: true,
          currentLevel: packageDetails.analyticsLevel,
        });
      }

      // Get comprehensive analytics data directly (avoid circular fetch)
      const analyticsData = await getAnalyticsData(
        storeId,
        period,
        packageDetails
      );

      // Get store information
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }

      // Generate comprehensive Excel report
      const wb = XLSX.utils.book_new();
      const reportDate = new Date().toLocaleDateString();
      const filename = `analytics-comprehensive-${
        store.name
      }-${reportDate.replace(/\//g, "-")}.xlsx`;

      // 📊 Enhanced Executive Summary Sheet
      const summaryData = [
        ["🏪 COMPREHENSIVE STORE ANALYTICS REPORT", "", "", "", ""],
        [""],
        ["📋 STORE INFORMATION", "", "", "", ""],
        ["Store Name:", store.name || "N/A"],
        ["Store Type:", store.type || "N/A"],
        ["Owner ID:", store.ownerId || "N/A"],
        ["Store Status:", store.status || "Active"],
        ["Generated:", new Date().toLocaleString()],
        ["Report Period:", `Last ${period} days`],
        [
          "Analytics Package:",
          `${packageDetails.name} (Level ${packageDetails.analyticsLevel})`,
        ],
        [""],
        ["📈 KEY PERFORMANCE METRICS", "", "", "", ""],
        [
          "Total Revenue (LKR)",
          analyticsData.totalRevenue || 0,
          "",
          "💰",
          "Primary revenue metric",
        ],
        [
          "Total Orders/Bookings",
          analyticsData.totalCount || 0,
          "",
          "📦",
          "Transaction volume",
        ],
        [
          "Average Order Value (LKR)",
          Math.round(analyticsData.avgValue || 0),
          "",
          "💳",
          "Revenue per transaction",
        ],
        [
          "Customer Retention Rate (%)",
          Math.round(analyticsData.retentionRate || 0),
          "",
          "🔄",
          "Customer loyalty indicator",
        ],
        [
          "Total Unique Customers",
          analyticsData.totalUniqueCustomers || 0,
          "",
          "👥",
          "Customer base size",
        ],
        [
          "Returning Customers",
          analyticsData.returningCustomers || 0,
          "",
          "🔁",
          "Repeat customer count",
        ],
        [""],
        ["📊 PERFORMANCE CHANGES (vs Previous Period)", "", "", "", ""],
        [
          "Revenue Change (%)",
          analyticsData.revenueChangePct || 0,
          "",
          analyticsData.revenueChangePct > 0 ? "📈" : "📉",
          "Growth indicator",
        ],
        [
          "Order Count Change (%)",
          analyticsData.countChangePct || 0,
          "",
          analyticsData.countChangePct > 0 ? "📈" : "📉",
          "Volume growth",
        ],
        [
          "Avg Order Value Change (%)",
          analyticsData.avgValueChangePct || 0,
          "",
          analyticsData.avgValueChangePct > 0 ? "📈" : "📉",
          "Value optimization",
        ],
      ];

      // Add operational metrics if available (Level 2+)
      if (
        analyticsData.operationalMetrics &&
        packageDetails.analyticsLevel >= 2
      ) {
        summaryData.push([""]);
        summaryData.push(["⚙️ OPERATIONAL EXCELLENCE METRICS", "", "", "", ""]);
        summaryData.push([
          "Fulfillment Rate (%)",
          analyticsData.operationalMetrics.fulfillmentRate || 0,
          "",
          "✅",
          "Order completion efficiency",
        ]);
        summaryData.push([
          "Repeat Purchase Rate (%)",
          analyticsData.operationalMetrics.repeatPurchaseRate || 0,
          "",
          "🔄",
          "Customer retention metric",
        ]);
        summaryData.push([
          "Order Processing Time (hrs)",
          analyticsData.operationalMetrics.orderProcessingTime || 0,
          "",
          "⏰",
          "Operational efficiency",
        ]);
        summaryData.push([
          "Customer Satisfaction Score (%)",
          analyticsData.operationalMetrics.customerSatisfactionScore || 0,
          "",
          "😊",
          "Service quality indicator",
        ]);
      }

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet["!cols"] = [
        { width: 35 },
        { width: 20 },
        { width: 15 },
        { width: 8 },
        { width: 30 },
      ];
      XLSX.utils.book_append_sheet(wb, summarySheet, "📊 Executive Summary");

      // 📈 Enhanced Revenue Trends Sheet
      if (
        analyticsData.revenueByMonth &&
        analyticsData.revenueByMonth.length > 0
      ) {
        const revenueData = [
          ["📈 REVENUE TRENDS ANALYSIS", "", "", "", "", ""],
          [""],
          [
            "Month/Year",
            "Revenue (LKR)",
            "Growth Rate",
            "Cumulative (LKR)",
            "Trend",
            "Performance",
          ],
        ];

        let prevRevenue = 0;
        let cumulativeRevenue = 0;
        analyticsData.revenueByMonth.forEach((item, index) => {
          const monthYear = `${item.month}/${item.year}`;
          const revenue = item.revenue || 0;
          cumulativeRevenue += revenue;
          const growthRate =
            prevRevenue > 0
              ? (((revenue - prevRevenue) / prevRevenue) * 100).toFixed(2)
              : "N/A";
          const trendIcon =
            growthRate === "N/A"
              ? "🆕"
              : parseFloat(growthRate) > 0
              ? "📈"
              : "📉";
          const performance =
            growthRate === "N/A"
              ? "New Period"
              : parseFloat(growthRate) > 20
              ? "Excellent"
              : parseFloat(growthRate) > 5
              ? "Good"
              : parseFloat(growthRate) > 0
              ? "Stable"
              : parseFloat(growthRate) > -10
              ? "Declining"
              : "Critical";

          revenueData.push([
            monthYear,
            revenue,
            growthRate + "%",
            cumulativeRevenue,
            trendIcon,
            performance,
          ]);
          prevRevenue = revenue;
        });

        const revenueSheet = XLSX.utils.aoa_to_sheet(revenueData);
        revenueSheet["!cols"] = [
          { width: 15 },
          { width: 20 },
          { width: 15 },
          { width: 20 },
          { width: 10 },
          { width: 15 },
        ];
        XLSX.utils.book_append_sheet(wb, revenueSheet, "📈 Revenue Trends");
      }

      // 🛍️ Enhanced Products/Services Performance Sheet
      const topItems =
        analyticsData.topProducts || analyticsData.topServices || [];
      if (topItems.length > 0) {
        const itemsData = [
          [
            `🛍️ ${store.type?.toUpperCase() || "ITEMS"} PERFORMANCE ANALYSIS`,
            "",
            "",
            "",
            "",
            "",
            "",
          ],
          [""],
          [
            "Rank",
            "Name",
            "Total Sold/Bookings",
            "Revenue (LKR)",
            "Avg Price (LKR)",
            "Market Share (%)",
            "Performance Rating",
          ],
        ];

        const totalRevenue = topItems.reduce(
          (sum, item) => sum + (item.revenue || 0),
          0
        );
        topItems.forEach((item, index) => {
          const avgPrice = Math.round(
            (item.revenue || 0) /
              Math.max(1, item.totalSold || item.totalBookings || 1)
          );
          const marketShare =
            totalRevenue > 0
              ? (((item.revenue || 0) / totalRevenue) * 100).toFixed(2)
              : 0;
          const rating =
            marketShare > 30
              ? "⭐⭐⭐⭐⭐"
              : marketShare > 20
              ? "⭐⭐⭐⭐"
              : marketShare > 10
              ? "⭐⭐⭐"
              : marketShare > 5
              ? "⭐⭐"
              : "⭐";

          itemsData.push([
            index + 1,
            item.name || "Unknown",
            item.totalSold || item.totalBookings || 0,
            item.revenue || 0,
            avgPrice,
            marketShare + "%",
            rating,
          ]);
        });

        const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
        itemsSheet["!cols"] = [
          { width: 8 },
          { width: 30 },
          { width: 18 },
          { width: 18 },
          { width: 15 },
          { width: 15 },
          { width: 18 },
        ];
        XLSX.utils.book_append_sheet(
          wb,
          itemsSheet,
          `🛍️ ${store.type || "Items"} Performance`
        );
      }

      // 📊 Order Status Analysis Sheet
      const statusData = [
        ["📊 ORDER STATUS ANALYSIS", "", "", ""],
        [""],
        ["Status", "Count", "Percentage", "Trend Indicator"],
      ];

      const allStatuses = {
        ...analyticsData.ordersByStatus,
        ...analyticsData.bookingsByStatus,
      };
      const totalOrders = Object.values(allStatuses).reduce(
        (sum, count) => sum + count,
        0
      );

      Object.entries(allStatuses).forEach(([status, count]) => {
        const percentage =
          totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(2) : 0;
        const statusIcon =
          {
            completed: "✅",
            pending: "⏳",
            cancelled: "❌",
            processing: "🔄",
            shipped: "🚚",
            delivered: "📦",
          }[status] || "📋";

        statusData.push([
          status.charAt(0).toUpperCase() + status.slice(1),
          count,
          percentage + "%",
          statusIcon,
        ]);
      });

      const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
      statusSheet["!cols"] = [
        { width: 20 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, statusSheet, "📊 Order Status");

      // 👥 Customer Analytics Sheet (All Levels)
      const customerData = [
        ["👥 CUSTOMER ANALYTICS", "", "", ""],
        [""],
        ["Metric", "Value", "Benchmark", "Status"],
        [
          "Total Unique Customers",
          analyticsData.totalUniqueCustomers || 0,
          "Growing",
          "📈",
        ],
        [
          "Returning Customers",
          analyticsData.returningCustomers || 0,
          "40%+ ideal",
          analyticsData.retentionRate > 40 ? "✅" : "⚠️",
        ],
        [
          "Customer Retention Rate",
          Math.round(analyticsData.retentionRate || 0) + "%",
          "30%+ good",
          analyticsData.retentionRate > 30 ? "✅" : "🔄",
        ],
        [
          "New vs Returning Ratio",
          `${analyticsData.customerMixNewVsReturning?.new || 0}:${
            analyticsData.customerMixNewVsReturning?.returning || 0
          }`,
          "60:40 healthy",
          "📊",
        ],
        [
          "Average Order Value",
          `LKR ${Math.round(analyticsData.avgValue || 0)}`,
          "Increasing",
          "💰",
        ],
      ];

      const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
      customerSheet["!cols"] = [
        { width: 25 },
        { width: 20 },
        { width: 20 },
        { width: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, customerSheet, "👥 Customer Analytics");

      // 👥 Advanced Customer Segmentation Sheet (Level 3 Premium)
      if (
        packageDetails.analyticsLevel >= 3 &&
        analyticsData.customerSegmentation
      ) {
        const segmentData = [
          ["👥 ADVANCED CUSTOMER SEGMENTATION", "", "", ""],
          [""],
          ["Segment", "Count", "Percentage", "Avg Value (LKR)"],
        ];

        const segments = analyticsData.customerSegmentation.segments || {};
        Object.entries(segments).forEach(([segment, count]) => {
          const percentage =
            analyticsData.customerSegmentation.segmentPercentages?.[segment] ||
            0;
          segmentData.push([
            segment
              .replace(/([A-Z])/g, " $1")
              .toLowerCase()
              .replace(/^./, (str) => str.toUpperCase()),
            count,
            percentage + "%",
            Math.round(
              analyticsData.customerSegmentation.avgTransactionValue || 0
            ),
          ]);
        });

        segmentData.push([""]);
        segmentData.push(["📊 CUSTOMER VALUE INSIGHTS", "", "", ""]);
        segmentData.push([
          "Customer Lifetime Value (LKR)",
          analyticsData.customerSegmentation.customerLifetimeValue || 0,
          "",
          "💎",
        ]);
        segmentData.push([
          "Avg Transaction Value (LKR)",
          Math.round(
            analyticsData.customerSegmentation.avgTransactionValue || 0
          ),
          "",
          "💳",
        ]);
        segmentData.push([
          "High Value Customers (%)",
          analyticsData.customerSegmentation.highValuePercentage || 0,
          "",
          "⭐",
        ]);
        segmentData.push([
          "Churn Risk (%)",
          analyticsData.customerSegmentation.churnRisk?.highRiskPercentage || 0,
          "",
          "⚠️",
        ]);

        const segmentSheet = XLSX.utils.aoa_to_sheet(segmentData);
        segmentSheet["!cols"] = [
          { width: 30 },
          { width: 15 },
          { width: 15 },
          { width: 20 },
        ];
        XLSX.utils.book_append_sheet(
          wb,
          segmentSheet,
          "👥 Customer Segmentation"
        );
      }

      // Generate and send Excel file
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.send(buffer);

      console.log("✅ Excel Export completed successfully:", {
        storeId,
        period,
        filename,
      });
    } catch (error) {
      console.error("❌ Export error:", {
        error: error.message,
        stack: error.stack,
        storeId: req.params.storeId,
        userId: req.user?._id,
      });

      res.status(500).json({
        success: false,
        error: "Export failed. Please try again later.",
        code: "EXPORT_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// 📊 Enhanced Analytics Event Tracking with Security
router.post(
  "/track-event",
  authenticate,
  analyticsRateLimiter({ type: "event-tracking", skipSuccessfulHits: true }),
  async (req, res) => {
    try {
      const {
        event,
        properties = {},
        category,
        sessionId,
        timestamp,
      } = req.body;

      // 🔍 Validate event data
      if (!event || typeof event !== "string") {
        return res.status(400).json({
          success: false,
          error: "Event name is required and must be a string",
        });
      }

      // 🧹 Sanitize event properties
      const sanitizedProperties = {};
      if (properties && typeof properties === "object") {
        Object.keys(properties).forEach((key) => {
          if (typeof properties[key] !== "function" && key.length < 50) {
            sanitizedProperties[key] = properties[key];
          }
        });
      }

      // 📊 Enhanced analytics event with metadata
      const analyticsEvent = new AnalyticsEvent({
        event: event
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
        userId: req.user._id,
        storeId: req.user.storeId,
        properties: {
          ...sanitizedProperties,
          userAgent: req.get("User-Agent"),
          ip: req.ip || req.connection?.remoteAddress,
          referrer: req.get("Referer"),
          timestamp: timestamp || new Date(),
        },
        category: category || "engagement",
        sessionId:
          sessionId || req.sessionID || `${req.user._id}_${Date.now()}`,
        timestamp: new Date(),
      });

      // 💾 Save event
      await analyticsEvent.save();

      // 🚀 Real-time processing for specific events
      await processRealTimeAnalytics(analyticsEvent);

      // 🔄 Invalidate relevant cache entries
      if (req.user.storeId) {
        analyticsCache.clear(req.user.storeId.toString());
      }

      res.json({
        success: true,
        eventId: analyticsEvent._id,
        timestamp: analyticsEvent.timestamp,
      });
    } catch (error) {
      console.error("❌ Analytics tracking error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to track event",
        code: "TRACKING_ERROR",
      });
    }
  }
);

// 🚀 Real-time Analytics Processing
const processRealTimeAnalytics = async (analyticsEvent) => {
  try {
    const { event, userId, storeId, properties } = analyticsEvent;

    // Process high-priority events immediately
    switch (event) {
      case "purchase_completed":
        // Update real-time revenue metrics
        await updateRealTimeRevenue(storeId, properties.amount);
        break;

      case "user_signup":
        // Update user acquisition metrics
        await updateUserAcquisition(storeId);
        break;

      case "product_view":
        // Update product popularity metrics
        await updateProductPopularity(storeId, properties.productId);
        break;

      case "cart_abandoned":
        // Trigger abandoned cart recovery
        await triggerAbandonedCartRecovery(userId, storeId, properties);
        break;

      case "high_value_action":
        // Alert for high-value customer actions
        await alertHighValueAction(userId, storeId, properties);
        break;
    }
  } catch (error) {
    console.error("Real-time analytics processing error:", error);
    // Don't throw error to avoid affecting main event tracking
  }
};

// Real-time metric update functions (placeholders for actual implementation)
const updateRealTimeRevenue = async (storeId, amount) => {
  // Implementation would update a real-time dashboard or cache
  console.log(`💰 Real-time revenue update: Store ${storeId} +${amount}`);
};

const updateUserAcquisition = async (storeId) => {
  console.log(`👥 User acquisition update: Store ${storeId}`);
};

const updateProductPopularity = async (storeId, productId) => {
  console.log(
    `🔥 Product popularity update: Store ${storeId}, Product ${productId}`
  );
};

const triggerAbandonedCartRecovery = async (userId, storeId, properties) => {
  console.log(
    `🛒 Abandoned cart recovery triggered: User ${userId}, Store ${storeId}`
  );
  // Could trigger email campaigns, push notifications, etc.
};

const alertHighValueAction = async (userId, storeId, properties) => {
  console.log(
    `⭐ High-value action alert: User ${userId}, Store ${storeId}`,
    properties
  );
  // Could trigger personalization, VIP treatment, etc.
};

// Get Analytics Insights (for business intelligence)
router.get(
  "/insights/conversion-funnel",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { timeframe = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframe);

      const funnelData = await AnalyticsEvent.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            category: "conversion",
          },
        },
        {
          $group: {
            _id: "$event",
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            event: "$_id",
            count: 1,
            uniqueUsers: { $size: "$uniqueUsers" },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // Calculate conversion rates
      const totalViews = await AnalyticsEvent.countDocuments({
        event: "analytics_view",
        timestamp: { $gte: startDate },
      });

      const upgradeClicks = await AnalyticsEvent.countDocuments({
        event: "upgrade_click",
        timestamp: { $gte: startDate },
      });

      const conversionRate =
        totalViews > 0 ? ((upgradeClicks / totalViews) * 100).toFixed(2) : 0;

      res.json({
        funnelData,
        summary: {
          totalViews,
          upgradeClicks,
          conversionRate: parseFloat(conversionRate),
        },
      });
    } catch (error) {
      console.error("Insights error:", error);
      res.status(500).json({ error: "Failed to get insights" });
    }
  }
);

// Get User Engagement Analytics
router.get(
  "/insights/engagement",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { timeframe = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframe);

      const engagementData = await AnalyticsEvent.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            category: "engagement",
          },
        },
        {
          $group: {
            _id: {
              event: "$event",
              currentLevel: "$properties.currentLevel",
            },
            count: { $sum: 1 },
            avgTimeSpent: { $avg: "$properties.duration" },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // Get most popular features by tier
      const featureUsageByTier = await AnalyticsEvent.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            event: "feature_attempt",
          },
        },
        {
          $group: {
            _id: {
              feature: "$properties.feature",
              currentLevel: "$properties.currentLevel",
            },
            attempts: { $sum: 1 },
            uniqueUsers: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            feature: "$_id.feature",
            currentLevel: "$_id.currentLevel",
            attempts: 1,
            uniqueUsers: { $size: "$uniqueUsers" },
          },
        },
        {
          $sort: { attempts: -1 },
        },
      ]);

      res.json({
        engagementData,
        featureUsageByTier,
      });
    } catch (error) {
      console.error("Engagement insights error:", error);
      res.status(500).json({ error: "Failed to get engagement insights" });
    }
  }
);

// 🔍 Admin Analytics Access Logs
router.get(
  "/admin/access-logs",
  authenticate,
  authorize(["admin"]),
  getAnalyticsAccessLogs
);

// 🧹 Clear Analytics Cache (Admin only)
router.post("/clear-cache", authenticate, authorize(["admin"]), (req, res) => {
  try {
    const { storeId } = req.body;

    if (storeId) {
      analyticsCache.clear(storeId);
      console.log(`📋 Cleared analytics cache for store: ${storeId}`);
      res.json({
        success: true,
        message: `Cache cleared for store ${storeId}`,
        timestamp: new Date().toISOString(),
      });
    } else {
      analyticsCache.clear();
      console.log("📋 Cleared all analytics cache");
      res.json({
        success: true,
        message: "All analytics cache cleared",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Cache clear error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear cache",
    });
  }
});

// 📈 Analytics Health Check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    features: {
      caching: true,
      rateLimiting: true,
      securityMonitoring: true,
      advancedAnalytics: true,
      realTimeProcessing: true,
      comprehensiveExports: true,
    },
    rateLimits: {
      basic: { requests: 10, exports: 2 },
      standard: { requests: 50, exports: 10 },
      premium: { requests: 200, exports: 50 },
    },
  });
});

export default router;
