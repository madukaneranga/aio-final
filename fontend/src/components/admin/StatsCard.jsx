import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatLKR } from '../../utils/currency';

const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend = null, 
  trendValue = null,
  color = 'blue',
  subtitle = null,
  onClick = null
}) => {
  const getColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      yellow: 'text-yellow-600 bg-yellow-50',
      red: 'text-red-600 bg-red-50',
      purple: 'text-purple-600 bg-purple-50',
      gray: 'text-gray-600 bg-gray-50'
    };
    return colors[color] || colors.blue;
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp className="w-3 h-3" />;
    if (trend < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (val > 1000000) {
        return formatLKR(val);
      }
      return val.toLocaleString();
    }
    return val;
  };

  const cardClasses = `bg-white rounded-lg shadow-sm border p-6 ${
    onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''
  }`;

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {formatValue(value)}
          </p>
          
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          
          {(trend !== null || trendValue !== null) && (
            <div className="flex items-center mt-2 space-x-2">
              {trend !== null && (
                <div className={`flex items-center space-x-1 ${getTrendColor(trend)}`}>
                  {getTrendIcon(trend)}
                  <span className="text-xs font-medium">
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                  </span>
                </div>
              )}
              {trendValue && (
                <span className="text-xs text-gray-500">
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={`p-3 rounded-full ${getColorClasses(color)}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;