import React, { useState } from "react";
import ReportDownloader from "./ReportDownloader";
import { useNavigate } from "react-router-dom";

import {
  DollarSign,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  Brain,
  Calendar,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  FileText,
  Crown,
  Zap,
} from "lucide-react";
import { formatLKR, formatLKRCompact } from "../../utils/currency";

const Level2Analytics = ({
  data,
  viewMode = "overview",
  handleUpgradeClick,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState("6months");

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Enhanced Metrics with Trends */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <EnhancedMetricCard
          title="Total Revenue"
          value={formatLKRCompact(data.totalRevenue || 0)}
          change={data.revenueChangePct || 0}
          icon={DollarSign}
          iconBg="bg-green-500"
        />

        <EnhancedMetricCard
          title="Orders"
          value={data.totalCount || 0}
          change={data.countChangePct || 0}
          icon={Package}
          iconBg="bg-blue-500"
        />

        <EnhancedMetricCard
          title="Avg Order Value"
          value={formatLKRCompact(data.avgValue || 0)}
          change={data.avgValueChangePct || 0}
          icon={TrendingUp}
          iconBg="bg-purple-500"
        />

        <EnhancedMetricCard
          title="Retention Rate"
          value={`${Math.round(data.retentionRate || 0)}%`}
          change={0} // Would need historical data for real change
          icon={Users}
          iconBg="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trends Chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">
              Revenue Trends
            </h3>
            <div className="flex items-center space-x-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="3months">Last 3 months</option>
                <option value="6months">Last 6 months</option>
              </select>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <RevenueChart data={data.revenueByMonth || []} />
        </div>

        {/* AI Insights Preview */}
        <AIInsightsPreview />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operational Metrics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Operational Metrics
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Fulfillment Rate</span>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-900">
                  {data.operationalMetrics?.fulfillmentRate || 0}%
                </span>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        data.operationalMetrics?.fulfillmentRate || 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Repeat Purchase Rate</span>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-900">
                  {Math.round(data.operationalMetrics?.repeatPurchaseRate || 0)}
                  %
                </span>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        data.operationalMetrics?.repeatPurchaseRate || 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-gray-600">Avg Order Value</span>
              <span className="font-semibold text-gray-900">
                {formatLKRCompact(data.operationalMetrics?.avgOrderValue || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Order Status
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {Object.entries(data.ordersByStatus || {}).map(
              ([status, count]) => (
                <div
                  key={status}
                  className="text-center p-4 bg-gray-50 rounded-lg"
                >
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {count}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    {status.replace("_", " ")}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Export and Premium Teaser */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportDownloader analyticsLevel={2} storeId={data.storeId} />
        <PremiumTeaser handleUpgradeClick={handleUpgradeClick} />
      </div>
    </div>
  );
};

const EnhancedMetricCard = ({ title, value, change, icon: Icon, iconBg }) => {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {value}
          </p>
          <div className="flex items-center">
            {!isNeutral && (
              <>
                {isPositive ? (
                  <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                )}
              </>
            )}
            <span
              className={`text-xs font-medium ${
                isNeutral
                  ? "text-gray-500"
                  : isPositive
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {isNeutral ? "No change" : `${Math.abs(change)}%`}
            </span>
          </div>
        </div>
        <div
          className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center ml-4`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
};

const RevenueChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No trend data available yet</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <div className="h-64">
      <div className="flex items-end justify-between h-full space-x-2 px-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className="bg-black rounded-t w-full min-h-[4px] transition-all duration-500 hover:bg-gray-800"
              style={{
                height: `${Math.max((item.revenue / maxRevenue) * 200, 4)}px`,
              }}
              title={`${item.month}/${item.year}: ${formatLKRCompact(
                item.revenue
              )}`}
            />
            <p className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
              {item.month}/{String(item.year).slice(-2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const AIInsightsPreview = () => (
  <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 relative overflow-hidden">
    <div className="relative z-10">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
          <Brain className="w-4 h-4 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
        <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
          Coming Soon
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="h-3 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-3 bg-gray-200 rounded-full w-4/5 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded-full w-3/5 animate-pulse" />
      </div>

      <p className="text-sm text-gray-600 mb-4">
        🤖 Our AI will analyze your data and provide personalized
        recommendations to grow your business.
      </p>

      <button className="text-purple-600 font-medium text-sm hover:underline">
        Learn about AI features →
      </button>
    </div>

    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 opacity-20 rounded-full transform translate-x-16 -translate-y-16" />
  </div>
);

const ExportSection = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-6">
    <div className="flex items-center mb-4">
      <FileText className="w-5 h-5 mr-2 text-gray-700" />
      <h3 className="text-lg font-semibold text-gray-900">Export Reports</h3>
    </div>

    <p className="text-gray-600 text-sm mb-6">
      Download comprehensive analytics reports in your preferred format.
    </p>

    <div className="grid grid-cols-2 gap-3">
      <button className="flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
        <Download className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">PDF</span>
      </button>
      <button className="flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
        <Download className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">Excel</span>
      </button>
    </div>

    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
      <p className="text-xs text-blue-800">
        💡 Reports include historical trends, customer analytics, and
        operational metrics.
      </p>
    </div>
  </div>
);

const PremiumTeaser = ({ handleUpgradeClick }) => (
  <div className="bg-gradient-to-br from-black to-gray-800 text-white rounded-lg p-6 relative overflow-hidden">
    <div className="relative z-10">
      <div className="flex items-center mb-3">
        <Crown className="w-5 h-5 mr-2 text-yellow-400" />
        <h3 className="text-lg font-semibold">Unlock Premium Analytics</h3>
      </div>

      <p className="text-gray-300 text-sm mb-4">
        Get global market insights and competitive analysis
      </p>

      <ul className="space-y-2 mb-4">
        <li className="flex items-center text-sm text-gray-300">
          <Zap className="w-3 h-3 mr-2 text-yellow-400" />
          12+ months historical data
        </li>
        <li className="flex items-center text-sm text-gray-300">
          <Zap className="w-3 h-3 mr-2 text-yellow-400" />
          Industry benchmarks
        </li>
        <li className="flex items-center text-sm text-gray-300">
          <Zap className="w-3 h-3 mr-2 text-yellow-400" />
          AI-powered recommendations
        </li>
      </ul>

      <button
        onClick={handleUpgradeClick}
        className="w-full bg-white text-black font-medium py-2 px-4 rounded-lg text-sm hover:bg-gray-100 transition-colors"
      >
        Upgrade to Premium
      </button>
    </div>

    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-10 rounded-full transform translate-x-16 -translate-y-16" />
  </div>
);

export default Level2Analytics;
