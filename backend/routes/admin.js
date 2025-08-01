import { Router } from "express";
const router = Router();
import WalletTransaction from "../models/WalletTransaction.js";
import BankDetails from "../models/BankDetails.js";
import Store from "../models/Store.js";
import { authenticate, authorize } from "../middleware/auth.js"

// Custom validation for admin actions - UPDATED
const validateAdminAction = (data) => {
  const errors = [];

  // Updated to include all workflow statuses
  if (
    !data.action ||
    !["approved", "rejected", "processing", "completed"].includes(data.action)
  ) {
    errors.push(
      "Action must be one of: approve, reject, processing, completed"
    );
  }

  if (
    data.adminNotes &&
    (typeof data.adminNotes !== "string" || data.adminNotes.length > 500)
  ) {
    errors.push("Admin notes must be a string with maximum 500 characters");
  }

  return errors;
};

// Workflow validation function - NEW
const validateStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = {
    pending: ["processing", "approved", "rejected"],
    processing: ["approved", "rejected"],
    approved: ["completed"],
    rejected: [], // Final state
    completed: [], // Final state
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin required.",
    });
  }
  next();
};

// Get all withdrawal requests - UPDATED
router.get(
  "/withdrawals",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        userId,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const query = { type: "withdrawal" };
      if (status) query.status = status;
      if (userId) query.userId = userId;

      // Add search functionality - NEW
      let populateQuery = {};
      if (search) {
        const stores = await Store.find({
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }).select("_id");

        if (stores.length > 0) {
          query.userId = { $in: stores.map((s) => s._id) };
        } else {
          // Avoid 500 error
          query.userId = { $in: [] };
        }
      }

      // Build sort object - NEW
      const sortObj = {};
      if (sortBy === "storeName") {
        // Will sort after population
      } else if (sortBy === "amount") {
        sortObj.amount = sortOrder === "desc" ? -1 : 1;
      } else {
        sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;
      }

      const withdrawals = await WalletTransaction.find(query)
        .populate("userId", "name email")
        .populate("withdrawalDetails.bankAccountId")
        .populate("withdrawalDetails.processedBy", "name email")
        .populate("withdrawalDetails.completedBy", "name email") // NEW
        .sort(sortObj)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      // Sort by store name if requested - NEW
      if (sortBy === "storeName") {
        withdrawals.sort((a, b) => {
          const nameA = a.userId?.name || "";
          const nameB = b.userId?.name || "";
          return sortOrder === "desc"
            ? nameB.localeCompare(nameA)
            : nameA.localeCompare(nameB);
        });
      }

      const total = await WalletTransaction.countDocuments(query);

      res.json({
        success: true,
        data: {
          withdrawals,
          pagination: {
            current: parseInt(page), // Changed from 'page' to 'current'
            pages: Math.ceil(total / parseInt(limit)),
            total,
            limit: parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("Get all withdrawals error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch withdrawals",
      });
    }
  }
);

// Process withdrawal request - UPDATED
router.put("/withdrawals/:id/process", authenticate,
  authorize("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const validationErrors = validateAdminAction(req.body);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors[0],
      });
    }

    const { action, adminNotes } = req.body;

    const withdrawal = await WalletTransaction.findOne({
      _id: id,
      type: "withdrawal",
    }).populate("userId");

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal request not found",
      });
    }

    // Validate status transition - NEW
    if (!validateStatusTransition(withdrawal.status, action)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${withdrawal.status} to ${action}`,
      });
    }

    // Update based on action - UPDATED
    const updateData = {
      status: action,
      "withdrawalDetails.adminNotes": adminNotes,
    };

    // Set appropriate timestamps and admin references
    if (action === "processing") {
      updateData["withdrawalDetails.processedAt"] = new Date();
      updateData["withdrawalDetails.processedBy"] = req.user.id;
    } else if (action === "approved" || action === "rejected") {
      if (!withdrawal.withdrawalDetails.processedAt) {
        updateData["withdrawalDetails.processedAt"] = new Date();
        updateData["withdrawalDetails.processedBy"] = req.user.id;
      }
    } else if (action === "completed") {
      updateData["withdrawalDetails.completedAt"] = new Date();
      updateData["withdrawalDetails.completedBy"] = req.user.id;
    }

    await WalletTransaction.findByIdAndUpdate(id, updateData);

    // Emit real-time notification to store owner
    req.io?.emit(`wallet-update-${withdrawal.userId._id}`, {
      type: "withdrawal_processed",
      action,
      transaction: withdrawal,
      adminNotes,
    });

    // Create audit log
    console.log(
      `Admin ${req.user.id} changed withdrawal ${id} status to ${action} for store ${withdrawal.userId._id}`
    );

    res.json({
      success: true,
      message: `Withdrawal request ${action} successfully`,
    });
  } catch (error) {
    console.error("Process withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process withdrawal request",
    });
  }
});

// Bulk process withdrawals - NEW
router.put("/withdrawals/bulk-process", authenticate,
  authorize("admin"), async (req, res) => {
  try {
    const { ids, action, adminNotes } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IDs array is required",
      });
    }

    if (!["approve", "reject", "processing", "completed"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action",
      });
    }

    const withdrawals = await WalletTransaction.find({
      _id: { $in: ids },
      type: "withdrawal",
    });

    // Validate all transitions
    const invalidTransitions = withdrawals.filter(
      (w) => !validateStatusTransition(w.status, action)
    );

    if (invalidTransitions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Some withdrawals cannot transition to ${action}`,
      });
    }

    // Update all valid withdrawals
    const updateData = {
      status: action,
      "withdrawalDetails.adminNotes": adminNotes,
    };

    if (action === "processing") {
      updateData["withdrawalDetails.processedAt"] = new Date();
      updateData["withdrawalDetails.processedBy"] = req.user.id;
    } else if (action === "approved" || action === "rejected") {
      updateData["withdrawalDetails.processedAt"] = new Date();
      updateData["withdrawalDetails.processedBy"] = req.user.id;
    } else if (action === "completed") {
      updateData["withdrawalDetails.completedAt"] = new Date();
      updateData["withdrawalDetails.completedBy"] = req.user.id;
    }

    await WalletTransaction.updateMany({ _id: { $in: ids } }, updateData);

    res.json({
      success: true,
      message: `${ids.length} withdrawals processed successfully`,
    });
  } catch (error) {
    console.error("Bulk process error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process bulk action",
    });
  }
});

// Remove the separate complete endpoint since it's handled in process now
// The /withdrawals/:id/complete route is no longer needed

// Get wallet analytics for admin dashboard - UPDATED
router.get("/analytics", authenticate,
  authorize("admin"), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = { type: "withdrawal" }; // Focus on withdrawals
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const analytics = await WalletTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const summary = {
      pending: { count: 0, amount: 0 },
      processing: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      completed: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      totalAmount: 0,
    };

    analytics.forEach((item) => {
      if (summary[item._id]) {
        summary[item._id].count = item.count;
        summary[item._id].amount = item.totalAmount;
        summary.totalAmount += item.totalAmount;
      }
    });

    res.json({
      success: true,
      data: {
        summary,
        analytics,
      },
    });
  } catch (error) {
    console.error("Get wallet analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet analytics",
    });
  }
});

export default router;
