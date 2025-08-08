import express from "express";
const router = express.Router();
import { authenticate, authorize } from "../middleware/auth.js";

import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Store from "../models/Store.js";

router.get("/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const months = Number(req.query.months) || 1;

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ error: "Store not found" });

    const now = new Date();
    let periodStart = null;

    if (months > 0) {
      periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - months);
    }

    const Model = store.type === "product" ? Order : Booking;

    // ===== REVENUE BY MONTH (ALL TIME) =====
    const revenueByMonthAllTime = await Model.aggregate([
      { $match: { storeId, status: "completed" } },
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
            storeId,
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
        { $match: { storeId, status: "completed", ...dateFilter } },
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
        { $match: { storeId, status: "completed", ...dateFilter } },
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
      { $match: { storeId, status: "completed", ...dateFilter } },
      { $group: { _id: "$customerId", orderCount: { $sum: 1 } } },
    ]);
    const totalUniqueCustomers = customers.length;
    const returningCustomers = customers.filter((c) => c.orderCount > 1).length;
    const retentionRate =
      totalUniqueCustomers > 0
        ? (returningCustomers / totalUniqueCustomers) * 100
        : 0;

    // ===== TOTALS & AVERAGES (CURRENT PERIOD OR ALL TIME) =====
    const totals = await Model.aggregate([
      { $match: { storeId, status: "completed", ...dateFilter } },
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
            storeId,
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
      { $match: { storeId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const ordersByStatus = {};
    ordersByStatusAgg.forEach((s) => {
      ordersByStatus[s._id] = s.count;
    });

    // ===== BOOKINGS BY STATUS (ALL TIME) =====
    const bookingsByStatusAgg = await Booking.aggregate([
      { $match: { storeId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const bookingsByStatus = {};
    bookingsByStatusAgg.forEach((s) => {
      bookingsByStatus[s._id] = s.count;
    });

    // ===== RESPONSE =====
    res.json({
      totalRevenue: curr.totalRevenue,
      totalCount: curr.totalCount,
      avgValue,
      revenueChangePct,
      countChangePct,
      avgValueChangePct,
      revenueByMonth, // filtered or all time
      revenueByMonthAllTime, // always all time
      topProducts,
      topServices,
      totalUniqueCustomers,
      returningCustomers,
      retentionRate,
      ordersByStatus,
      bookingsByStatus,
      currency: "LKR",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
export default router;
