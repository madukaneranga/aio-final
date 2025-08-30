import React from "react";
import {
  DollarSign,
  Package,
  Users,
  TrendingUp,
  Star,
  ArrowRight,
  Lock,
  BarChart3,
} from "lucide-react";
import { formatLKR, formatLKRCompact } from "../../utils/currency";
import MetricTooltip from "./MetricTooltip";

const Level1Analytics = ({ data, handleUpgradeClick }) => {
  console.log("📊 Level1Analytics received data:", {
    hasData: !!data,
    analyticsLevel: data?.analyticsLevel,
    packageName: data?.packageName,
    totalRevenue: data?.totalRevenue,
    error: data?.error,
  });

  if (!data) {
    console.warn("⚠️ Level1Analytics: No data provided");
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  // Provide safe defaults for all data fields
  const safeData = {
    totalRevenue: data.totalRevenue || 0,
    totalCount: data.totalCount || 0,
    avgValue: data.avgValue || 0,
    totalUniqueCustomers: data.totalUniqueCustomers || 0,
    returningCustomers: data.returningCustomers || 0,
    customerMixNewVsReturning: {
      new: data.customerMixNewVsReturning?.new || 0,
      returning: data.customerMixNewVsReturning?.returning || 0,
      percentage: data.customerMixNewVsReturning?.percentage || 0,
    },
    bestSellingItem: data.bestSellingItem || null,
    currency: data.currency || "LKR",
    error: data.error || null,
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {safeData.error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">⚠️ {safeData.error}</p>
              <p className="text-xs text-yellow-600 mt-1">
                Showing available data with fallback values where needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatLKRCompact(safeData.totalRevenue)}
          icon={DollarSign}
          subtitle="Last 30 days"
          iconBg="bg-green-500"
          tooltip={{
            title: "Total Revenue",
            description:
              "Your total earnings from completed orders/bookings in the selected period. This includes all successful transactions.",
            businessImpact:
              "Track your business growth and identify revenue trends to make informed decisions about pricing and promotions.",
          }}
        />

        <MetricCard
          title="Total Orders"
          value={safeData.totalCount}
          icon={Package}
          subtitle="This month"
          iconBg="bg-blue-500"
          tooltip={{
            title: "Total Orders",
            description:
              "Number of completed transactions (orders for products, bookings for services) in your selected time period.",
            businessImpact:
              "Monitor transaction volume to understand customer demand and plan inventory or service capacity.",
          }}
        />

        <MetricCard
          title="Customers"
          value={safeData.totalUniqueCustomers}
          icon={Users}
          subtitle="Active buyers"
          iconBg="bg-purple-500"
          tooltip={{
            title: "Unique Customers",
            description:
              "Number of different customers who made purchases during this period. Each customer is counted only once.",
            businessImpact:
              "Growing customer base indicates successful marketing and customer satisfaction. Focus on retention to maximize value.",
          }}
        />

        <MetricCard
          title="Avg. Order"
          value={formatLKRCompact(safeData.avgValue)}
          icon={TrendingUp}
          subtitle="Per transaction"
          iconBg="bg-orange-500"
          tooltip={{
            title: "Average Order Value (AOV)",
            description:
              "Average amount spent per transaction, calculated as Total Revenue ÷ Total Orders.",
            businessImpact:
              "Higher AOV means more revenue per customer. Use upselling, bundles, and premium options to increase this metric.",
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Mix */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Customer Mix
            <MetricTooltip
              title="Customer Mix"
              description="The ratio between new customers (first-time buyers) and returning customers (repeat buyers) in your selected period."
              businessImpact="A healthy mix shows both customer acquisition and retention. Too many new customers may indicate retention issues, while too few suggests limited growth."
              className="ml-2"
            />
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">New Customers</span>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-900">
                  {safeData.customerMixNewVsReturning.new}
                </span>
                <span className="text-sm text-gray-500">
                  ({100 - safeData.customerMixNewVsReturning.percentage}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Repeat Buyers</span>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-900">
                  {safeData.customerMixNewVsReturning.returning}
                </span>
                <span className="text-sm text-gray-500">
                  ({safeData.customerMixNewVsReturning.percentage}%)
                </span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
              <div
                className="bg-black h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, safeData.customerMixNewVsReturning.percentage)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Best Selling Product/Service */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2" />
            Top Performer
            <MetricTooltip
              title="Top Performer"
              description="Your best-selling product or most booked service based on total revenue generated in the selected period."
              businessImpact="Identify your most profitable offerings to optimize inventory, promote similar items, or create bundles around successful products."
              className="ml-2"
            />
          </h3>

          {safeData.bestSellingItem ? (
            <div className="space-y-3">
              <div className="font-medium text-gray-900 truncate">
                {safeData.bestSellingItem.name || "Unknown Product"}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {safeData.bestSellingItem.totalSold ? "Sold" : "Bookings"}
                </span>
                <span className="font-semibold">
                  {safeData.bestSellingItem.totalSold ||
                    safeData.bestSellingItem.totalBookings ||
                    0}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Revenue</span>
                <span className="font-semibold text-green-600">
                  {formatLKRCompact(safeData.bestSellingItem.revenue || 0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sales data yet</p>
            </div>
          )}
        </div>

        {/* Upgrade Teaser */}
        <UpgradeTeaser handleUpgradeClick={handleUpgradeClick} />
      </div>

      {/* Limited Features Notice */}
      <LimitedFeaturesNotice />
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  tooltip,
}) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center mb-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {tooltip && (
            <MetricTooltip
              title={tooltip.title}
              description={tooltip.description}
              businessImpact={tooltip.businessImpact}
              className="ml-2"
            />
          )}
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
          {value}
        </p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div
        className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center ml-4`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const UpgradeTeaser = (handleUpgradeClick) => (
  <div className="bg-gradient-to-br from-black to-gray-800 text-white rounded-lg p-6 relative overflow-hidden">
    <div className="relative z-10">
      <div className="flex items-center mb-3">
        <BarChart3 className="w-5 h-5 mr-2" />
        <h3 className="text-lg font-semibold">Want More Insights?</h3>
      </div>

      <p className="text-gray-300 text-sm mb-4">
        Upgrade to see trends, exports, and historical data
      </p>

      <ul className="space-y-2 mb-4">
        <li className="flex items-center text-sm text-gray-300">
          <Lock className="w-3 h-3 mr-2 opacity-60" />
          6-month historical trends
        </li>
        <li className="flex items-center text-sm text-gray-300">
          <Lock className="w-3 h-3 mr-2 opacity-60" />
          Advanced analytics & insights
        </li>
        <li className="flex items-center text-sm text-gray-300">
          <Lock className="w-3 h-3 mr-2 opacity-60" />
          PDF/Excel reports
        </li>
      </ul>

      <button
        onClick={handleUpgradeClick}
        className="w-full bg-white text-black font-medium py-2 px-4 rounded-lg text-sm hover:bg-gray-100 transition-colors flex items-center justify-center"
      >
        Upgrade to Standard
        <ArrowRight className="w-4 h-4 ml-2" />
      </button>
    </div>

    {/* Decorative background */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16" />
  </div>
);

const LimitedFeaturesNotice = () => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div className="mb-4 sm:mb-0">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          📊 Basic Analytics Plan
        </h3>
        <p className="text-gray-600 text-sm">
          You're seeing a 30-day snapshot. Upgrade for deeper insights, trends,
          and competitive analysis.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Learn More
        </button>
        <button className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center">
          Upgrade Now
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  </div>
);

export default Level1Analytics;
