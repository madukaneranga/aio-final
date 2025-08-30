import React from "react";
import { 
  ArrowRight, 
  Clock, 
  Users, 
  Star,
  Zap,
  Crown,
  TrendingUp,
  CheckCircle
} from "lucide-react";
import useABTest from "../../hooks/useABTest";
import useAnalyticsTracking from "../../hooks/useAnalyticsTracking";

const ABTestUpgradePrompt = ({ currentLevel = 1, targetLevel = 2, feature, compact = false }) => {
  const { variant, config, trackConversion } = useABTest('upgrade_prompt_style');
  const { trackUpgradeClick } = useAnalyticsTracking();

  if (!variant) {
    // Fallback to standard prompt while loading
    return <StandardUpgradePrompt currentLevel={currentLevel} targetLevel={targetLevel} feature={feature} compact={compact} />;
  }

  const handleUpgradeClick = (source) => {
    trackUpgradeClick(currentLevel, targetLevel, `ab_test_${variant.id}_${source}`);
    trackConversion('upgrade_click');
  };

  if (compact) {
    return <CompactABTestPrompt config={config} currentLevel={currentLevel} onUpgrade={handleUpgradeClick} />;
  }

  switch (variant.id) {
    case 'urgency':
      return <UrgencyUpgradePrompt config={config} currentLevel={currentLevel} targetLevel={targetLevel} feature={feature} onUpgrade={handleUpgradeClick} />;
    case 'social_proof':
      return <SocialProofUpgradePrompt config={config} currentLevel={currentLevel} targetLevel={targetLevel} feature={feature} onUpgrade={handleUpgradeClick} />;
    default:
      return <StandardUpgradePrompt currentLevel={currentLevel} targetLevel={targetLevel} feature={feature} onUpgrade={handleUpgradeClick} />;
  }
};

const StandardUpgradePrompt = ({ currentLevel, targetLevel, feature, onUpgrade }) => (
  <div className="bg-gradient-to-br from-black to-gray-800 text-white rounded-lg p-6 relative overflow-hidden">
    <div className="relative z-10">
      <div className="flex items-center mb-3">
        <Crown className="w-5 h-5 mr-2 text-yellow-400" />
        <h3 className="text-lg font-semibold">Unlock Premium Analytics</h3>
      </div>
      
      <p className="text-gray-300 text-sm mb-4">
        {feature || 'Get advanced insights to grow your business faster'}
      </p>
      
      <button 
        onClick={() => onUpgrade && onUpgrade('standard_prompt')}
        className="w-full bg-white text-black font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
      >
        Upgrade Now
      </button>
    </div>
  </div>
);

const UrgencyUpgradePrompt = ({ config, currentLevel, targetLevel, feature, onUpgrade }) => {
  const [timeLeft, setTimeLeft] = React.useState('23:59:47');

  React.useEffect(() => {
    if (config.countdown) {
      const interval = setInterval(() => {
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const diff = endOfDay - now;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [config.countdown]);

  return (
    <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-lg p-6 relative overflow-hidden border-2 border-red-400 animate-pulse">
      <div className="relative z-10">
        {config.discount && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
            {config.discount}
          </div>
        )}
        
        <div className="flex items-center mb-3">
          <Zap className="w-5 h-5 mr-2 text-yellow-400" />
          <h3 className="text-lg font-semibold">Limited Time Offer!</h3>
        </div>
        
        <p className="text-red-100 text-sm mb-4">
          {feature || 'Upgrade now and save! This exclusive deal expires soon.'}
        </p>
        
        {config.countdown && (
          <div className="flex items-center mb-4 bg-black/20 rounded-lg p-3">
            <Clock className="w-4 h-4 mr-2 text-yellow-400" />
            <span className="text-sm">Offer expires in: </span>
            <span className="font-mono font-bold ml-2 text-yellow-400">{timeLeft}</span>
          </div>
        )}
        
        {config.social_proof && (
          <div className="flex items-center mb-4 text-sm text-red-100">
            <Users className="w-4 h-4 mr-2" />
            247 sellers upgraded in the last 24 hours
          </div>
        )}
        
        <button 
          onClick={() => onUpgrade && onUpgrade('urgency_prompt')}
          className="w-full bg-yellow-400 text-black font-bold py-3 px-4 rounded-lg hover:bg-yellow-300 transition-colors flex items-center justify-center"
        >
          Claim This Deal Now
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
        
        <p className="text-xs text-red-200 mt-2 text-center">
          ⚡ Don't miss out - upgrade before this offer disappears!
        </p>
      </div>
    </div>
  );
};

const SocialProofUpgradePrompt = ({ config, currentLevel, targetLevel, feature, onUpgrade }) => (
  <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg p-6 relative overflow-hidden">
    <div className="relative z-10">
      <div className="flex items-center mb-3">
        <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
        <h3 className="text-lg font-semibold">Join Successful Sellers</h3>
      </div>
      
      <p className="text-blue-100 text-sm mb-4">
        {feature || 'See what 10,000+ sellers already know - premium analytics drive growth'}
      </p>
      
      {config.stats && (
        <div className="bg-white/10 rounded-lg p-3 mb-4">
          <div className="flex items-center mb-2">
            <Users className="w-4 h-4 mr-2 text-green-400" />
            <span className="text-sm font-medium">{config.stats}</span>
          </div>
          <div className="text-xs text-blue-200">
            Average revenue increase: +47% within 30 days
          </div>
        </div>
      )}
      
      {config.testimonial && (
        <div className="bg-white/10 rounded-lg p-3 mb-4">
          <div className="flex items-center mb-2">
            <Star className="w-4 h-4 text-yellow-400 mr-1" />
            <Star className="w-4 h-4 text-yellow-400 mr-1" />
            <Star className="w-4 h-4 text-yellow-400 mr-1" />
            <Star className="w-4 h-4 text-yellow-400 mr-1" />
            <Star className="w-4 h-4 text-yellow-400 mr-2" />
            <span className="text-xs">Sarah K., Premium User</span>
          </div>
          <p className="text-xs text-blue-200">
            "The global insights helped me identify new market opportunities. Revenue up 65%!"
          </p>
        </div>
      )}
      
      <button 
        onClick={() => onUpgrade && onUpgrade('social_proof_prompt')}
        className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-colors flex items-center justify-center"
      >
        <CheckCircle className="w-5 h-5 mr-2" />
        Join Them Now
      </button>
      
      <p className="text-xs text-blue-200 mt-2 text-center">
        🚀 Trusted by successful sellers worldwide
      </p>
    </div>
  </div>
);

const CompactABTestPrompt = ({ config, currentLevel, onUpgrade }) => {
  const nextLevel = currentLevel + 1;
  
  if (config.style === 'urgent') {
    return (
      <div className="bg-red-600 text-white px-4 py-3 rounded-lg flex items-center justify-between border-2 border-red-400">
        <div className="flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-400" />
          <div>
            <div className="font-medium text-sm">Limited Time: 20% Off</div>
            <div className="text-xs text-red-200">Upgrade before it's gone!</div>
          </div>
        </div>
        <button 
          onClick={() => onUpgrade && onUpgrade('compact_urgency')}
          className="bg-yellow-400 text-black hover:bg-yellow-300 px-3 py-1 rounded text-xs font-bold transition-colors"
        >
          Claim
        </button>
      </div>
    );
  }
  
  if (config.style === 'social') {
    return (
      <div className="bg-blue-600 text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center">
          <Users className="w-5 h-5 mr-2 text-green-400" />
          <div>
            <div className="font-medium text-sm">10K+ Upgraded</div>
            <div className="text-xs text-blue-200">Join successful sellers</div>
          </div>
        </div>
        <button 
          onClick={() => onUpgrade && onUpgrade('compact_social')}
          className="bg-green-500 hover:bg-green-400 px-3 py-1 rounded text-xs font-medium transition-colors"
        >
          Join
        </button>
      </div>
    );
  }
  
  // Default standard style
  return (
    <div className="bg-black text-white px-4 py-3 rounded-lg flex items-center justify-between">
      <div className="flex items-center">
        <Crown className="w-5 h-5 mr-2 text-purple-400" />
        <div>
          <div className="font-medium text-sm">Upgrade Available</div>
          <div className="text-xs text-gray-300">Unlock premium features</div>
        </div>
      </div>
      <button 
        onClick={() => onUpgrade && onUpgrade('compact_standard')}
        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-medium transition-colors"
      >
        Upgrade
      </button>
    </div>
  );
};

export default ABTestUpgradePrompt;