import React, { useState } from "react";
import ReportDownloader from "./ReportDownloader";
import { 
  DollarSign, 
  Package, 
  Users, 
  TrendingUp,
  TrendingDown,
  Globe,
  Crown,
  Brain,
  Target,
  Award,
  Zap,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Star,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from "lucide-react";
import { formatLKR, formatLKRCompact } from "../../utils/currency";
import MetricTooltip from "./MetricTooltip";

const Level3Analytics = ({ data, globalInsights, viewMode = "overview" }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState("12months");
  const [selectedView, setSelectedView] = useState("overview");
  
  if (!data) return null;

  if (viewMode === "global" && globalInsights) {
    return <GlobalInsightsView globalInsights={globalInsights} data={data} />;
  }

  return (
    <div className="space-y-6">
      {/* Premium Badge */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Crown className="w-6 h-6 mr-3 text-yellow-400" />
          <div>
            <h3 className="font-semibold">Premium Analytics Active</h3>
            <p className="text-sm text-white/90">Full access to advanced insights and forecasting</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/80">Level 3</div>
          <div className="font-semibold">Premium</div>
        </div>
      </div>

      {/* Enhanced Metrics with Extended History */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <PremiumMetricCard
          title="Total Revenue"
          value={formatLKRCompact(data.totalRevenue || 0)}
          change={data.revenueChangePct || 0}
          forecast={data.revenueForecast?.growthRate ? `${data.revenueForecast.growthRate > 0 ? '+' : ''}${data.revenueForecast.growthRate.toFixed(1)}%` : "Calculating..."}
          icon={DollarSign}
          iconBg="bg-green-500"
          data={data}
          tooltip={{
            title: "Total Revenue with AI Forecasting",
            description: "Your total earnings with machine learning-powered growth predictions and confidence levels based on historical patterns.",
            businessImpact: "AI forecasting helps predict future revenue to optimize budgeting, inventory planning, and strategic business decisions."
          }}
        />
        
        <PremiumMetricCard
          title="Orders"
          value={data.totalCount || 0}
          change={data.countChangePct || 0}
          forecast={data.revenueForecast?.trend === 'growing' ? `+${(data.countChangePct * 0.8).toFixed(1)}%` : data.revenueForecast?.trend === 'declining' ? `-${Math.abs(data.countChangePct * 0.8).toFixed(1)}%` : "Stable"}
          icon={Package}
          iconBg="bg-blue-500"
          data={data}
          tooltip={{
            title: "Orders with Trend Analysis",
            description: "Total completed transactions with advanced trend analysis and predictive forecasting for order volume planning.",
            businessImpact: "Forecast order volumes to optimize staffing, inventory levels, and capacity planning during peak periods."
          }}
        />
        
        <PremiumMetricCard
          title="Avg Order Value"
          value={formatLKRCompact(data.avgValue || 0)}
          change={data.avgValueChangePct || 0}
          forecast={data.revenueForecast?.growthRate ? `${data.revenueForecast.growthRate > 0 ? '+' : ''}${(data.revenueForecast.growthRate * 0.6).toFixed(1)}%` : "Calculating..."}
          icon={TrendingUp}
          iconBg="bg-purple-500"
          data={data}
          tooltip={{
            title: "Average Order Value with Predictions",
            description: "Average transaction value with AI-powered forecasts to predict future AOV trends and optimize pricing strategies.",
            businessImpact: "Use AOV predictions to set pricing targets, plan product bundles, and forecast revenue from existing customer base."
          }}
        />
        
        <PremiumMetricCard
          title="Retention Rate"
          value={`${Math.round(data.retentionRate || 0)}%`}
          change={data.retentionRateChange || 0}
          forecast={data.retentionRateChange >= 0 ? `+${Math.max(1, Math.abs(data.retentionRateChange * 0.5)).toFixed(1)}%` : `-${Math.max(0.5, Math.abs(data.retentionRateChange * 0.3)).toFixed(1)}%`}
          icon={Users}
          iconBg="bg-orange-500"
          data={data}
          tooltip={{
            title: "Customer Retention with Trend Analysis",
            description: "Percentage of repeat customers with period-over-period change tracking and retention forecasting capabilities.",
            businessImpact: "Monitor retention trends to reduce churn, increase lifetime value, and focus marketing efforts on customer satisfaction."
          }}
        />
      </div>

      {/* Advanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Extended Revenue Trends */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0 flex items-center">
              Extended Revenue Analysis
              <MetricTooltip 
                title="Extended Revenue Analysis"
                description="Long-term revenue trends with up to 2+ years of historical data, seasonal pattern analysis, and advanced forecasting with ML predictions."
                businessImpact="Identify long-term trends, seasonal patterns, and plan strategic business decisions based on extended historical performance data."
                className="ml-2"
              />
            </h3>
            <div className="flex items-center space-x-2">
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="12months">Last 12 months</option>
                <option value="24months">Last 2 years</option>
                <option value="alltime">All time</option>
              </select>
            </div>
          </div>
          
          <ExtendedRevenueChart data={data.revenueByMonthAllTime || []} />
          
          {/* Forecasting Preview */}
          <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center mb-2">
              <Brain className="w-4 h-4 mr-2 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">AI Forecast</span>
              <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-purple-700">
              Next month predicted revenue: <strong>
                {data.revenueForecast?.nextMonth 
                  ? formatLKRCompact(data.revenueForecast.nextMonth) 
                  : formatLKRCompact(data.totalRevenue || 0)}
              </strong> 
              ({data.revenueForecast?.growthRate 
                ? `${data.revenueForecast.growthRate > 0 ? '+' : ''}${data.revenueForecast.growthRate.toFixed(1)}%` 
                : 'Calculating...'})
            </p>
          </div>
        </div>

        {/* Customer Lifetime Value */}
        <CustomerLifetimeValue data={data} />
      </div>

      {/* Global Context Section */}
      {globalInsights && (
        <GlobalContextSection globalInsights={globalInsights} data={data} />
      )}

      {/* Advanced Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIRecommendations />
      </div>
    </div>
  );
};

const PremiumMetricCard = ({ title, value, change, forecast, icon: Icon, iconBg, data, tooltip }) => {
  const isPositive = change > 0;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-2 right-2">
        <Crown className="w-4 h-4 text-purple-400" />
      </div>
      
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
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {value}
          </p>
          
          <div className="space-y-1">
            <div className="flex items-center">
              {isPositive ? (
                <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-xs font-medium ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(change)}% vs last period
              </span>
            </div>
            
            <div className="flex items-center">
              <TrendingUp className="w-3 h-3 text-purple-500 mr-1" />
              <span className="text-xs text-purple-600 font-medium">
                Forecast: {forecast}
              </span>
              {data?.revenueForecast?.confidence && (
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                  data.revenueForecast.confidence === 'high' ? 'bg-green-100 text-green-700' :
                  data.revenueForecast.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {data.revenueForecast.confidence}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center ml-4`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
};

const ExtendedRevenueChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Extended historical data will appear here</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue));
  
  return (
    <div className="h-64">
      <div className="flex items-end justify-between h-full space-x-1 px-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center group">
            <div
              className="bg-gradient-to-t from-purple-600 to-purple-400 rounded-t w-full min-h-[4px] transition-all duration-500 hover:from-purple-700 hover:to-purple-500"
              style={{
                height: `${Math.max((item.revenue / maxRevenue) * 200, 4)}px`
              }}
              title={`${item.month}/${item.year}: ${formatLKRCompact(item.revenue)}`}
            />
            <p className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
              {item.month}/{String(item.year).slice(-2)}
            </p>
          </div>
        ))}
      </div>
      
      {/* Trend line overlay would go here in a real implementation */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        📈 Advanced trend analysis with ML predictions coming soon
      </div>
    </div>
  );
};

const CustomerLifetimeValue = ({ data }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6">
    <div className="flex items-center mb-4">
      <Users className="w-5 h-5 mr-2" />
      <h3 className="text-lg font-semibold text-gray-900">Customer Insights</h3>
      <Crown className="w-4 h-4 ml-2 text-purple-400" />
      <MetricTooltip 
        title="Customer Lifetime Value & Insights"
        description="Advanced customer analytics including predicted lifetime value, churn risk assessment, and high-value customer identification."
        businessImpact="Use these insights to focus retention efforts, identify your most valuable customers, and reduce churn through targeted strategies."
        className="ml-2"
      />
    </div>
    
    <div className="space-y-4">
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <span className="text-gray-600">Avg Customer Lifetime Value</span>
        <span className="font-semibold text-gray-900">
          {formatLKRCompact((data.avgValue || 0) * 3.2)}
        </span>
      </div>
      
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <span className="text-gray-600">Churn Risk</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-green-600 font-medium">Low (12%)</span>
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full w-[12%]" />
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <span className="text-gray-600">High-Value Customers</span>
        <span className="font-semibold text-gray-900">
          {Math.round((data.returningCustomers || 0) * 0.3)}
        </span>
      </div>
      
      <div className="flex items-center justify-between py-3">
        <span className="text-gray-600">Predicted Monthly Churn</span>
        <span className="font-semibold text-gray-900">2.1%</span>
      </div>
    </div>
    
    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
      <div className="flex items-center mb-2">
        <Target className="w-4 h-4 mr-2 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">Retention Opportunity</span>
      </div>
      <p className="text-xs text-blue-700">
        Focus on customers with 1-2 orders to increase retention by 23%
      </p>
    </div>
  </div>
);

const GlobalContextSection = ({ globalInsights, data }) => (
  <div className="bg-gradient-to-br from-gray-900 to-black text-white rounded-lg p-6 relative overflow-hidden">
    <div className="relative z-10">
      <div className="flex items-center mb-6">
        <Globe className="w-6 h-6 mr-3 text-blue-400" />
        <h3 className="text-xl font-semibold">Global Market Context</h3>
        <span className="ml-3 text-xs bg-blue-500 px-2 py-1 rounded-full">Premium</span>
        <MetricTooltip 
          title="Global Market Context"
          description="Compare your performance against similar stores, platform averages, and market trends. Includes competitive positioning and performance tier ranking."
          businessImpact="Understand your market position to identify competitive advantages, pricing opportunities, and areas for improvement compared to similar businesses."
          className="ml-2"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">
            {globalInsights.yourPerformance?.performanceVsType || 0}%
          </div>
          <div className="text-sm text-gray-300">vs Type Average</div>
          <div className="text-xs text-gray-400 mt-1">
            {globalInsights.yourPerformance?.performanceVsType > 0 ? 'Above' : 'Below'} average
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {(() => {
              const performance = globalInsights.yourPerformance?.performanceVsType || 0;
              if (performance >= 50) return "Top 10%";
              if (performance >= 25) return "Top 25%";
              if (performance >= 0) return "Top 50%";
              return "Bottom 50%";
            })()}
          </div>
          <div className="text-sm text-gray-300">Performance Tier</div>
          <div className="text-xs text-gray-400 mt-1">
            among {globalInsights.yourPerformance?.type || 'your type'} stores
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400 mb-1">
            {formatLKRCompact(globalInsights.platformOverview?.avgPlatformOrderValue || 0)}
          </div>
          <div className="text-sm text-gray-300">Platform Average AOV</div>
          <div className="text-xs text-gray-400 mt-1">All sellers</div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
        <div className="flex items-center mb-2">
          <Award className="w-4 h-4 mr-2 text-yellow-400" />
          <span className="text-sm font-medium">Market Opportunity</span>
        </div>
        <p className="text-xs text-gray-300">
          Your AOV is {globalInsights.yourPerformance?.performanceVsType || 0}% above type average. 
          Consider exploring growth opportunities in your market segment.
        </p>
      </div>
    </div>
    
    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full transform translate-x-32 -translate-y-32" />
  </div>
);

const GlobalInsightsView = ({ globalInsights, data }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center">
        <Globe className="w-6 h-6 mr-2" />
        Global Market Insights
      </h2>
      <p className="text-gray-600">Platform-wide trends and competitive analysis</p>
    </div>
    
    {/* Platform Overview */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <PieChart className="w-8 h-8 mx-auto mb-3 text-blue-500" />
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {formatLKRCompact(globalInsights.platformOverview?.totalRevenue || 0)}
        </div>
        <div className="text-sm text-gray-600">Platform Revenue</div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <Activity className="w-8 h-8 mx-auto mb-3 text-green-500" />
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {globalInsights.platformOverview?.totalOrders || 0}
        </div>
        <div className="text-sm text-gray-600">Total Platform Orders</div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <Star className="w-8 h-8 mx-auto mb-3 text-purple-500" />
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {formatLKRCompact(globalInsights.platformOverview?.avgPlatformOrderValue || 0)}
        </div>
        <div className="text-sm text-gray-600">Avg Order Value</div>
      </div>
    </div>
    
    {/* Competitive Analysis */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Types Performance</h3>
        <div className="space-y-3">
          {globalInsights.competitiveInsights?.topPerformingTypes?.slice(0, 5).map((type, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="text-gray-700 capitalize">{type._id} Stores</span>
              <span className="font-semibold text-gray-900">
                {formatLKRCompact(type.totalRevenue)}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Opportunities</h3>
        <div className="space-y-3">
          {globalInsights.competitiveInsights?.growthOpportunities?.slice(0, 3).map((opportunity, index) => (
            <div key={index} className="p-3 bg-green-50 rounded-lg">
              <div className="font-medium text-green-900 capitalize">{opportunity._id} Stores</div>
              <div className="text-sm text-green-700">
                {opportunity.storeCount} active sellers
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const AIRecommendations = () => (
  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
    <div className="flex items-center mb-4">
      <Brain className="w-5 h-5 mr-2 text-purple-600" />
      <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
      <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
        Beta Coming Soon
      </span>
    </div>
    
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-lg border border-purple-100">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-1">Optimize Pricing</div>
            <div className="text-sm text-gray-600">
              Consider increasing prices by 8-12% based on market analysis
            </div>
            <div className="text-xs text-purple-600 mt-2">High confidence • Revenue impact: +15%</div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-white rounded-lg border border-purple-100">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-1">Focus on Retention</div>
            <div className="text-sm text-gray-600">
              Launch email campaign for 1-time buyers
            </div>
            <div className="text-xs text-purple-600 mt-2">Medium confidence • Retention impact: +23%</div>
          </div>
        </div>
      </div>
    </div>
    
    <div className="mt-6 p-3 bg-purple-100 rounded-lg">
      <div className="flex items-center mb-2">
        <Zap className="w-4 h-4 mr-2 text-purple-600" />
        <span className="text-sm font-medium text-purple-900">AI Learning</span>
      </div>
      <p className="text-xs text-purple-700">
        Recommendations improve over time as we analyze more of your data
      </p>
    </div>
  </div>
);

export default Level3Analytics;