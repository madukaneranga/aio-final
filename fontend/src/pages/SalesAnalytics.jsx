import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Users,
  BarChart3,
  Download,
  Filter,
  Eye,
} from "lucide-react";
import { formatLKR, formatLKRCompact } from "../utils/currency";
import LoadingSpinner from "../components/LoadingSpinner";
import { use } from "react";

const SalesAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalCount: 0,
    avgValue: 0,
    topProducts: [],
    topServices: [],
    topItems: [],
    revenueByMonth: [],
    revenueByMonthAllTime: [],
    ordersByStatus: {},
    bookingsByStatus: {},
    totalUniqueCustomers: 0,
    returningCustomers: 0,
    retentionRate: 0,
    revenueChangePct: 0,
    countChangePct: 0,
    avgValueChangePct: 0,
    currency: "LKR",
  });

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [monthRange, setMonthRange] = useState("0");
  const [viewType, setViewType] = useState("overview");

  useEffect(() => {
    if (user?.role === "store_owner" && user?.storeId) {
      fetchAnalytics();
    }
  }, [user, monthRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const storeId = user.storeId;

      // Fetch Analytics Summary
      const analyricsResponse = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/analytics/${storeId}?months=${monthRange}`,
        {
          credentials: "include",
        }
      );

      if (analyricsResponse.ok) {
        const analyticsData = await analyricsResponse.json();
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const ChangePercent = ({ value, label = "from last period" }) => {
  const formatted =
    value > 0 ? `+${value}%` : `${value}%`;
  const colorClass =
    value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-600";

  return (
    <p className={`text-sm mt-1 ${colorClass}`}>
      {formatted} {label}
    </p>
  );
};


  const exportToExcel = (analytics, monthRange, storeId) => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Format monthRange display string
      const formattedMonthRange =
        monthRange === 0
          ? "All Time"
          : typeof monthRange === "number"
          ? `Last ${monthRange} month${monthRange > 1 ? "s" : ""}`
          : String(monthRange);

      // Prepare summary data
      const summaryData = [
        ["Store ID", storeId || "unknown"],
        ["Export Date", new Date().toISOString()],
        ["Month Range", formattedMonthRange],
        ["Currency", analytics.currency || "LKR"],
        [],
        ["Total Revenue", analytics.totalRevenue],
        ["Total Orders/Bookings", analytics.totalCount],
        ["Average Value", analytics.avgValue],
        ["Total Unique Customers", analytics.totalUniqueCustomers],
        ["Returning Customers", analytics.returningCustomers],
        ["Retention Rate (%)", analytics.retentionRate || "0"],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

      // Revenue By Month
      if (analytics.revenueByMonth?.length > 0) {
        const revenueByMonthData = [
          ["Year", "Month", "Revenue"],
          ...analytics.revenueByMonth.map(({ year, month, revenue }) => [
            year,
            month,
            revenue,
          ]),
        ];
        const revenueSheet = XLSX.utils.aoa_to_sheet(revenueByMonthData);
        XLSX.utils.book_append_sheet(wb, revenueSheet, "RevenueByMonth");
      }

      // Top Items
      if (analytics.topItems?.length > 0) {
        const topItemsHeaders = Object.keys(analytics.topItems[0]);
        const topItemsData = [
          topItemsHeaders,
          ...analytics.topItems.map((item) =>
            topItemsHeaders.map((h) => item[h])
          ),
        ];
        const topItemsSheet = XLSX.utils.aoa_to_sheet(topItemsData);
        XLSX.utils.book_append_sheet(wb, topItemsSheet, "TopItems");
      }

      // Orders By Status
      if (analytics.ordersByStatus) {
        const ordersByStatusData = [["Status", "Count"]];
        for (const [status, count] of Object.entries(
          analytics.ordersByStatus
        )) {
          ordersByStatusData.push([status, count]);
        }
        const ordersSheet = XLSX.utils.aoa_to_sheet(ordersByStatusData);
        XLSX.utils.book_append_sheet(wb, ordersSheet, "OrdersByStatus");
      }

      // Bookings By Status
      if (analytics.bookingsByStatus) {
        const bookingsByStatusData = [["Status", "Count"]];
        for (const [status, count] of Object.entries(
          analytics.bookingsByStatus
        )) {
          bookingsByStatusData.push([status, count]);
        }
        const bookingsSheet = XLSX.utils.aoa_to_sheet(bookingsByStatusData);
        XLSX.utils.book_append_sheet(wb, bookingsSheet, "BookingsByStatus");
      }

      // Generate Excel and save
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(
        blob,
        `sales-analytics-${new Date().toISOString().split("T")[0]}.xlsx`
      );
    } catch (error) {
      console.error("Failed to export Excel:", error);
    }
  };

  if (!user || user.role !== "store_owner") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Only store owners can access sales analytics
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Sales Analytics
              </h1>
              <p className="text-gray-600 mt-2">
                Track your store's performance and growth
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={monthRange}
                onChange={(e) => setMonthRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="1">Last month</option>
                <option value="3">Last 3 months</option>
                <option value="6">Last 6 months</option>
                <option value="12">Last year</option>
                <option value="0">All Time</option>
              </select>
              <button
                onClick={exportToExcel}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Type Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "overview", name: "Overview", icon: BarChart3 },
                { id: "customers", name: "Customers", icon: Users },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setViewType(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      viewType === tab.id
                        ? "border-black text-black"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {viewType === "overview" && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatLKRCompact(analytics.totalRevenue)}
                    </p>
                    <ChangePercent value={analytics.revenueChangePct} />
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {analytics.totalCount}
                    </p>
                    <ChangePercent value={analytics.countChangePct} />
                  </div>
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Bookings</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {analytics.totalCount}
                    </p>
                    <ChangePercent value={analytics.countChangePct} />
                  </div>
                  <Calendar className="w-8 h-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg. Order Value</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatLKRCompact(analytics.avgValue)}
                    </p>
                    <ChangePercent value={analytics.avgValueChangePct} />
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Revenue Trend
              </h3>
              <div className="h-64 flex items-end space-x-2">
                {analytics.revenueByMonthAllTime.map((data, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className="bg-black rounded-t w-full"
                      style={{
                        height: `${Math.max(
                          (data.revenue /
                            Math.max(
                              ...analytics.revenueByMonthAllTime.map(
                                (d) => d.revenue
                              )
                            )) *
                            200,
                          10
                        )}px`,
                      }}
                    ></div>
                    <p className="text-xs text-gray-500 mt-2">{data.month}</p>
                    <p className="text-xs font-medium">
                      {formatLKRCompact(data.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Status Distribution */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Status Distribution
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analytics.ordersByStatus).map(
                  ([status, count]) => (
                    <div key={status} className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {count}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {status}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Booking Status Distribution */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Booking Status Distribution
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analytics.bookingsByStatus).map(
                  ([status, count]) => (
                    <div key={status} className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {count}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {status}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {viewType === "customers" && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Customer Analytics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Total Customers</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {analytics.totalUniqueCustomers || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Returning Customers</p>
                  <p className="text-2xl font-bold text-green-900">
                    {analytics.returningCustomers || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600">Retention Rate</p>
                  <p className="text-2xl font-bold text-purple-900">
                    <span
                      className={`${
                        analytics.retentionRate >= 50
                          ? "text-green-600"
                          : analytics.retentionRate > 0
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {(analytics.retentionRate || 0)}%
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesAnalytics;
