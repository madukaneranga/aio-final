import WalletTransaction from "../models/Transaction.js";
import BankDetails from "../models/BankDetails.js";
import Store from "../models/Store.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Subscription from "../models/Subscription.js";
import PendingSubscription from "../models/PendingSubscription.js";
import Package from "../models/Package.js";
import FlashDeal from "../models/FlashDeal.js";
import Review from "../models/Review.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import { successResponse, errorResponse, paginatedResponse } from "../utils/responseFormatter.js";
import logger from "../utils/logger.js";

class AdminDashboardController {
  /**
   * Get comprehensive dashboard overview with real-time KPIs
   */
  async getDashboardOverview(req, res) {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Parallel execution for performance
      const [
        // Total counts
        totalUsers,
        totalStores,
        totalProducts,
        totalOrders,
        totalSubscriptions,
        totalFlashDeals,
        totalReviews,
        totalPosts,

        // Today's metrics
        todayUsers,
        todayStores,
        todayOrders,
        todayRevenue,

        // This week's metrics
        weekUsers,
        weekStores,
        weekOrders,
        weekRevenue,

        // This month's metrics
        monthUsers,
        monthOrders,
        monthRevenue,

        // Revenue data
        totalRevenue,
        pendingWithdrawals,
        completedWithdrawals,

        // Subscription data
        activeSubscriptions,
        pendingSubscriptions,
        subscriptionRevenue,

        // System health
        lowStockProducts,
        recentOrders,
        topStores,
        popularProducts,
        
        // Flash deals
        activeFlashDeals,
        upcomingFlashDeals
      ] = await Promise.all([
        // Total counts
        User.countDocuments(),
        Store.countDocuments(),
        Product.countDocuments(),
        Order.countDocuments(),
        Subscription.countDocuments({ status: "active" }),
        FlashDeal.countDocuments({ isActive: true }),
        Review.countDocuments(),
        Post.countDocuments(),

        // Today's metrics
        User.countDocuments({ createdAt: { $gte: startOfDay } }),
        Store.countDocuments({ createdAt: { $gte: startOfDay } }),
        Order.countDocuments({ createdAt: { $gte: startOfDay } }),
        Order.aggregate([
          { $match: { createdAt: { $gte: startOfDay } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),

        // This week's metrics
        User.countDocuments({ createdAt: { $gte: startOfWeek } }),
        Store.countDocuments({ createdAt: { $gte: startOfWeek } }),
        Order.countDocuments({ createdAt: { $gte: startOfWeek } }),
        Order.aggregate([
          { $match: { createdAt: { $gte: startOfWeek } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),

        // This month's metrics
        User.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Order.aggregate([
          { $match: { createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),

        // Revenue data
        Order.aggregate([
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),
        WalletTransaction.aggregate([
          { $match: { type: "withdrawal", status: "pending" } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        WalletTransaction.aggregate([
          { $match: { type: "withdrawal", status: "completed" } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),

        // Subscription data
        Subscription.countDocuments({ status: "active" }),
        PendingSubscription.countDocuments({ isActive: true }),
        Subscription.aggregate([
          { $match: { status: "active" } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),

        // System alerts
        Product.find({ stock: { $lt: 10 } }).select('title stock').limit(10),
        Order.find().populate('customerId', 'name').sort({ createdAt: -1 }).limit(5),
        Store.find().select('name totalSales').sort({ totalSales: -1 }).limit(5),
        Product.find().select('title views').sort({ views: -1 }).limit(5),

        // Flash deals
        FlashDeal.countDocuments({ 
          isActive: true, 
          isPublished: true,
          saleStartTime: { $lte: now },
          saleEndTime: { $gte: now }
        }),
        FlashDeal.countDocuments({ 
          isActive: true, 
          isPublished: true,
          saleStartTime: { $gt: now }
        })
      ]);

      const dashboardData = {
        overview: {
          totalUsers,
          totalStores,
          totalProducts,
          totalOrders,
          totalSubscriptions,
          totalFlashDeals,
          totalReviews,
          totalPosts,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        
        todayMetrics: {
          newUsers: todayUsers,
          newStores: todayStores,
          newOrders: todayOrders,
          todayRevenue: todayRevenue[0]?.total || 0
        },

        weeklyMetrics: {
          newUsers: weekUsers,
          newStores: weekStores,
          newOrders: weekOrders,
          weeklyRevenue: weekRevenue[0]?.total || 0
        },

        monthlyMetrics: {
          newUsers: monthUsers,
          newOrders: monthOrders,
          monthlyRevenue: monthRevenue[0]?.total || 0
        },

        financial: {
          pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
          completedWithdrawals: completedWithdrawals[0]?.total || 0,
          platformRevenue: (totalRevenue[0]?.total || 0) - (completedWithdrawals[0]?.total || 0)
        },

        subscriptions: {
          active: activeSubscriptions,
          pending: pendingSubscriptions,
          monthlyRevenue: subscriptionRevenue[0]?.total || 0
        },

        alerts: {
          lowStockProducts: lowStockProducts.length,
          lowStockItems: lowStockProducts
        },

        recentActivity: {
          recentOrders,
          topStores,
          popularProducts
        },

        flashDeals: {
          active: activeFlashDeals,
          upcoming: upcomingFlashDeals
        },

        systemHealth: {
          serverStatus: "online",
          databaseStatus: "connected",
          lastUpdated: new Date(),
          uptime: process.uptime()
        }
      };

      res.json(successResponse(dashboardData, "Dashboard data retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get dashboard overview", error);
      res.status(500).json(errorResponse("Failed to retrieve dashboard data"));
    }
  }

  /**
   * Get detailed analytics with time series data
   */
  async getAnalytics(req, res) {
    try {
      const { period = "30", metric = "revenue", startDate, endDate } = req.query;

      let dateFilter = {};
      let groupBy = {};
      
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        };
      } else {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        dateFilter = { createdAt: { $gte: daysAgo } };
      }

      // Dynamic grouping based on period
      if (parseInt(period) <= 7) {
        // Daily grouping for week or less
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" }
        };
      } else if (parseInt(period) <= 90) {
        // Weekly grouping for 3 months or less
        groupBy = {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" }
        };
      } else {
        // Monthly grouping for longer periods
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        };
      }

      let aggregationPipeline = [];
      let Model, valueField;

      switch (metric) {
        case 'revenue':
          Model = Order;
          valueField = '$totalAmount';
          break;
        case 'orders':
          Model = Order;
          valueField = 1;
          break;
        case 'users':
          Model = User;
          valueField = 1;
          break;
        case 'stores':
          Model = Store;
          valueField = 1;
          break;
        default:
          Model = Order;
          valueField = '$totalAmount';
      }

      aggregationPipeline = [
        { $match: dateFilter },
        {
          $group: {
            _id: groupBy,
            value: { $sum: valueField },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
      ];

      const analyticsData = await Model.aggregate(aggregationPipeline);

      // Format data for frontend charts
      const formattedData = analyticsData.map(item => ({
        date: item._id,
        value: item.value,
        count: item.count,
        label: formatDateLabel(item._id)
      }));

      res.json(successResponse({
        data: formattedData,
        metric,
        period,
        total: analyticsData.reduce((sum, item) => sum + item.value, 0),
        count: analyticsData.reduce((sum, item) => sum + item.count, 0)
      }, "Analytics data retrieved successfully"));

    } catch (error) {
      logger.error("Failed to get analytics", error);
      res.status(500).json(errorResponse("Failed to retrieve analytics"));
    }
  }

  /**
   * Get user management data with advanced filtering
   */
  async getUserManagement(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        dateFrom,
        dateTo
      } = req.query;

      let query = {};

      // Build search query
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ];
      }

      // Filter by role
      if (role && role !== 'all') {
        query.role = role;
      }

      // Filter by date range
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [users, totalCount, roleStats] = await Promise.all([
        User.find(query)
          .select('-password')
          .populate('storeId', 'name isActive')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(query),
        User.aggregate([
          { $group: { _id: "$role", count: { $sum: 1 } } }
        ])
      ]);

      // Enhance user data with additional info
      const enhancedUsers = await Promise.all(
        users.map(async (user) => {
          const [orderCount, totalSpent, lastLogin] = await Promise.all([
            Order.countDocuments({ customerId: user._id }),
            Order.aggregate([
              { $match: { customerId: user._id } },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]),
            // Assuming you have a lastLogin field or login tracking
            Promise.resolve(null)
          ]);

          return {
            ...user,
            stats: {
              orderCount,
              totalSpent: totalSpent[0]?.total || 0,
              lastLogin
            }
          };
        })
      );

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(enhancedUsers, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        roleStats
      }, "Users retrieved successfully"));

    } catch (error) {
      logger.error("Failed to get user management data", error);
      res.status(500).json(errorResponse("Failed to retrieve user data"));
    }
  }

  /**
   * Get store management data with performance metrics
   */
  async getStoreManagement(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        subscriptionStatus,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      let query = {};

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { description: searchRegex }
        ];
      }

      if (status && status !== 'all') {
        query.isActive = status === 'active';
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [stores, totalCount] = await Promise.all([
        Store.find(query)
          .populate('ownerId', 'name email')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Store.countDocuments(query)
      ]);

      // Enhance store data with metrics
      const enhancedStores = await Promise.all(
        stores.map(async (store) => {
          const [
            productCount,
            orderCount,
            reviewCount,
            averageRating,
            subscription,
            monthlyRevenue
          ] = await Promise.all([
            Product.countDocuments({ storeId: store._id }),
            Order.countDocuments({ storeId: store._id }),
            Review.countDocuments({ storeId: store._id }),
            Review.aggregate([
              { $match: { storeId: store._id } },
              { $group: { _id: null, avg: { $avg: "$rating" } } }
            ]),
            Subscription.findOne({ storeId: store._id, status: "active" }),
            Order.aggregate([
              {
                $match: {
                  storeId: store._id,
                  createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) }
                }
              },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ])
          ]);

          return {
            ...store,
            metrics: {
              productCount,
              orderCount,
              reviewCount,
              averageRating: averageRating[0]?.avg || 0,
              monthlyRevenue: monthlyRevenue[0]?.total || 0
            },
            subscription: subscription ? {
              package: subscription.package,
              status: subscription.status,
              endDate: subscription.endDate
            } : null
          };
        })
      );

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(enhancedStores, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }, "Stores retrieved successfully"));

    } catch (error) {
      logger.error("Failed to get store management data", error);
      res.status(500).json(errorResponse("Failed to retrieve store data"));
    }
  }

  /**
   * Get financial dashboard data
   */
  async getFinancialDashboard(req, res) {
    try {
      const { period = "30" } = req.query;
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));

      const [
        totalRevenue,
        periodRevenue,
        pendingWithdrawals,
        completedWithdrawals,
        subscriptionRevenue,
        revenueByDay,
        topStoresByRevenue,
        withdrawalsByStatus,
        commissionEarned
      ] = await Promise.all([
        Order.aggregate([
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),
        Order.aggregate([
          { $match: { createdAt: { $gte: daysAgo } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),
        WalletTransaction.aggregate([
          { $match: { type: "withdrawal", status: "pending" } },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]),
        WalletTransaction.aggregate([
          { $match: { type: "withdrawal", status: "completed" } },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]),
        Subscription.aggregate([
          { $match: { status: "active" } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        Order.aggregate([
          { $match: { createdAt: { $gte: daysAgo } } },
          {
            $group: {
              _id: {
                day: { $dayOfMonth: "$createdAt" },
                month: { $month: "$createdAt" },
                year: { $year: "$createdAt" }
              },
              revenue: { $sum: "$totalAmount" },
              orders: { $sum: 1 }
            }
          },
          { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]),
        Order.aggregate([
          {
            $group: {
              _id: "$storeId",
              revenue: { $sum: "$totalAmount" },
              orders: { $sum: 1 }
            }
          },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "stores",
              localField: "_id",
              foreignField: "_id",
              as: "store"
            }
          }
        ]),
        WalletTransaction.aggregate([
          { $match: { type: "withdrawal" } },
          { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } }
        ]),
        Order.aggregate([
          {
            $project: {
              commission: { $multiply: ["$totalAmount", 0.05] } // Assuming 5% commission
            }
          },
          { $group: { _id: null, total: { $sum: "$commission" } } }
        ])
      ]);

      const financialData = {
        overview: {
          totalRevenue: totalRevenue[0]?.total || 0,
          periodRevenue: periodRevenue[0]?.total || 0,
          pendingWithdrawals: {
            amount: pendingWithdrawals[0]?.total || 0,
            count: pendingWithdrawals[0]?.count || 0
          },
          completedWithdrawals: {
            amount: completedWithdrawals[0]?.total || 0,
            count: completedWithdrawals[0]?.count || 0
          },
          subscriptionRevenue: subscriptionRevenue[0]?.total || 0,
          commissionEarned: commissionEarned[0]?.total || 0
        },
        charts: {
          revenueByDay: revenueByDay.map(item => ({
            date: `${item._id.day}/${item._id.month}`,
            revenue: item.revenue,
            orders: item.orders
          })),
          topStores: topStoresByRevenue.map(item => ({
            storeName: item.store[0]?.name || 'Unknown Store',
            revenue: item.revenue,
            orders: item.orders
          })),
          withdrawalsByStatus: withdrawalsByStatus
        }
      };

      res.json(successResponse(financialData, "Financial dashboard data retrieved successfully"));

    } catch (error) {
      logger.error("Failed to get financial dashboard", error);
      res.status(500).json(errorResponse("Failed to retrieve financial data"));
    }
  }

  /**
   * Export data to CSV
   */
  async exportData(req, res) {
    try {
      const { type, format = 'csv' } = req.query;

      let data, headers;

      switch (type) {
        case 'users':
          data = await User.find().select('-password').lean();
          headers = ['Name', 'Email', 'Role', 'Created At', 'Last Login'];
          break;
        case 'stores':
          data = await Store.find().populate('ownerId', 'name email').lean();
          headers = ['Store Name', 'Owner', 'Status', 'Created At', 'Total Sales'];
          break;
        case 'orders':
          data = await Order.find()
            .populate('customerId', 'name')
            .populate('storeId', 'name')
            .lean();
          headers = ['Order ID', 'Customer', 'Store', 'Amount', 'Status', 'Created At'];
          break;
        case 'subscriptions':
          data = await Subscription.find()
            .populate('userId', 'name email')
            .populate('storeId', 'name')
            .lean();
          headers = ['User', 'Store', 'Package', 'Amount', 'Status', 'Created At'];
          break;
        default:
          return res.status(400).json(errorResponse("Invalid export type"));
      }

      // Convert to CSV format
      const csvData = convertToCSV(data, headers, type);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`);
      res.send(csvData);

    } catch (error) {
      logger.error("Failed to export data", error);
      res.status(500).json(errorResponse("Failed to export data"));
    }
  }
}

// Helper functions
function formatDateLabel(dateObj) {
  if (dateObj.day) {
    return `${dateObj.day}/${dateObj.month}`;
  } else if (dateObj.week) {
    return `Week ${dateObj.week}`;
  } else {
    return `${dateObj.month}/${dateObj.year}`;
  }
}

function convertToCSV(data, headers, type) {
  let csv = headers.join(',') + '\n';

  data.forEach(item => {
    let row = [];
    switch (type) {
      case 'users':
        row = [
          item.name || '',
          item.email || '',
          item.role || '',
          item.createdAt || '',
          item.lastLogin || 'Never'
        ];
        break;
      case 'stores':
        row = [
          item.name || '',
          item.ownerId?.name || '',
          item.isActive ? 'Active' : 'Inactive',
          item.createdAt || '',
          item.totalSales || 0
        ];
        break;
      case 'orders':
        row = [
          item._id || '',
          item.customerId?.name || '',
          item.storeId?.name || '',
          item.totalAmount || 0,
          item.status || '',
          item.createdAt || ''
        ];
        break;
      case 'subscriptions':
        row = [
          item.userId?.name || '',
          item.storeId?.name || '',
          item.package || '',
          item.amount || 0,
          item.status || '',
          item.createdAt || ''
        ];
        break;
    }
    csv += row.map(field => `"${field}"`).join(',') + '\n';
  });

  return csv;
}

export default new AdminDashboardController();