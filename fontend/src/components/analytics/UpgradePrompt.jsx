import React from "react";
import useAnalyticsTracking from "../../hooks/useAnalyticsTracking";
import { 
  ArrowRight, 
  BarChart3, 
  TrendingUp, 
  Globe, 
  FileText,
  Brain,
  Zap,
  Crown,
  Check,
  Lock
} from "lucide-react";

const UpgradePrompt = ({ 
  currentLevel = 1, 
  targetLevel = 2, 
  feature, 
  compact = false 
}) => {
  const { trackUpgradeClick } = useAnalyticsTracking();
  if (compact) {
    return <CompactUpgradePrompt currentLevel={currentLevel} />;
  }

  const upgradeOptions = {
    2: {
      title: "Upgrade to Standard",
      subtitle: "Unlock Advanced Analytics",
      price: "LKR 2,500/month",
      color: "from-blue-600 to-blue-700",
      features: [
        "6-month historical trends",
        "Advanced charts & insights", 
        "PDF/Excel export",
        "Customer analytics",
        "Operational metrics",
        "AI insights preview"
      ]
    },
    3: {
      title: "Upgrade to Premium",
      subtitle: "Get Global Market Insights",
      price: "LKR 4,999/month",
      color: "from-purple-600 to-purple-700",
      features: [
        "12+ month history & forecasting",
        "Global market insights",
        "Competitive analysis",
        "Customer lifetime value",
        "Automated weekly reports",
        "Full AI recommendations"
      ]
    }
  };

  const option = upgradeOptions[targetLevel];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Feature Preview */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {feature || `Level ${targetLevel} Analytics Required`}
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Unlock powerful insights and data-driven decisions with advanced analytics features.
        </p>
      </div>

      {/* Upgrade Option Card */}
      <div className={`bg-gradient-to-br ${option.color} text-white rounded-xl p-8 mb-8 relative overflow-hidden`}>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center mb-2">
                <Crown className="w-6 h-6 mr-2" />
                <h3 className="text-2xl font-bold">{option.title}</h3>
              </div>
              <p className="text-white/90 mb-4">{option.subtitle}</p>
              <div className="text-3xl font-bold">{option.price}</div>
            </div>
            
            <div className="flex-shrink-0">
              <button 
                onClick={() => trackUpgradeClick(currentLevel, targetLevel, 'upgrade_prompt_main')}
                className="bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center"
              >
                Upgrade Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full transform translate-x-32 -translate-y-32" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full transform -translate-x-16 translate-y-16" />
      </div>

      {/* Feature Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <CurrentPlanFeatures currentLevel={currentLevel} />
        <TargetPlanFeatures features={option.features} targetLevel={targetLevel} />
      </div>

      {/* Preview of Locked Features */}
      <LockedFeaturePreview targetLevel={targetLevel} />
    </div>
  );
};

const CompactUpgradePrompt = ({ currentLevel }) => {
  const { trackUpgradeClick } = useAnalyticsTracking();
  const nextLevel = currentLevel + 1;
  const plans = {
    2: { name: "Standard", color: "bg-blue-600", price: "2,500" },
    3: { name: "Premium", color: "bg-purple-600", price: "4,999" }
  };
  
  const plan = plans[nextLevel];
  if (!plan) return null;

  return (
    <div className={`${plan.color} text-white px-4 py-3 rounded-lg flex items-center justify-between`}>
      <div className="flex items-center">
        <Zap className="w-5 h-5 mr-2" />
        <div>
          <div className="font-medium text-sm">Upgrade to {plan.name}</div>
          <div className="text-xs text-white/80">LKR {plan.price}/month</div>
        </div>
      </div>
      <button 
        onClick={() => trackUpgradeClick(currentLevel, nextLevel, 'compact_upgrade_prompt')}
        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-medium transition-colors"
      >
        Upgrade
      </button>
    </div>
  );
};

const CurrentPlanFeatures = ({ currentLevel }) => {
  const levelFeatures = {
    1: [
      "30-day sales snapshot",
      "Basic revenue metrics",
      "Customer count",
      "Top 3 products/services",
      "New vs returning customers"
    ],
    2: [
      "6-month historical data",
      "Revenue trend analysis",
      "Advanced customer insights",
      "PDF/Excel exports",
      "Operational metrics"
    ]
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-gray-400" />
        Your Current Plan (Level {currentLevel})
      </h3>
      
      <ul className="space-y-3">
        {levelFeatures[currentLevel]?.map((feature, index) => (
          <li key={index} className="flex items-center text-gray-600">
            <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};

const TargetPlanFeatures = ({ features, targetLevel }) => (
  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
      <Crown className="w-5 h-5 mr-2 text-purple-600" />
      Level {targetLevel} Features (Locked)
    </h3>
    
    <ul className="space-y-3">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center text-gray-500">
          <Lock className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
          {feature}
        </li>
      ))}
    </ul>
    
    <div className="mt-6 pt-6 border-t border-gray-300">
      <button className="w-full bg-black text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center">
        <Lock className="w-4 h-4 mr-2" />
        Unlock These Features
      </button>
    </div>
  </div>
);

const LockedFeaturePreview = ({ targetLevel }) => {
  const previews = {
    2: {
      title: "📈 Advanced Trend Analysis",
      description: "See how your business performs over time with detailed charts and growth metrics.",
      visual: (
        <div className="bg-gray-100 rounded-lg p-4 relative overflow-hidden">
          <div className="flex items-end justify-between h-20 space-x-2">
            {[30, 45, 25, 60, 40, 75].map((height, i) => (
              <div
                key={i}
                className="bg-black rounded-t opacity-30"
                style={{ height: `${height}%`, width: '16.666%' }}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      )
    },
    3: {
      title: "🌍 Global Market Insights",
      description: "Compare your performance with industry benchmarks and discover growth opportunities.",
      visual: (
        <div className="bg-gray-100 rounded-lg p-4 relative overflow-hidden">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({length: 9}).map((_, i) => (
              <div key={i} className="bg-black h-4 rounded opacity-30" />
            ))}
          </div>
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <Globe className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      )
    }
  };

  const preview = previews[targetLevel];
  if (!preview) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {preview.title}
          </h3>
          <p className="text-gray-600 mb-4">
            {preview.description}
          </p>
          <button className="text-black font-medium hover:underline flex items-center">
            See what you'll get
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        
        <div className="w-full lg:w-64">
          {preview.visual}
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;