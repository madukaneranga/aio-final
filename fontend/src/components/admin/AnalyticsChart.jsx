import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatLKR } from '../../utils/currency';

const AnalyticsChart = ({ title, data, type = 'bar', trend = null }) => {
  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const renderBarChart = () => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data.map(item => item.value));

    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-16 text-sm text-gray-600 truncate">{item.label}</div>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-black h-2 rounded-full transition-all duration-300"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <div className="w-20 text-sm font-medium text-right">
              {typeof item.value === 'number' && item.value > 1000 
                ? formatLKR(item.value) 
                : item.value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLineChart = () => {
    if (!data || data.length === 0) return null;

    return (
      <div className="grid grid-cols-7 gap-2 h-20 items-end">
        {data.slice(0, 7).map((item, index) => {
          const maxValue = Math.max(...data.map(d => d.value));
          const height = (item.value / maxValue) * 100;
          
          return (
            <div key={index} className="flex flex-col items-center space-y-1">
              <div 
                className="bg-black rounded-t-sm w-full transition-all duration-300"
                style={{ height: `${height}%` }}
                title={`${item.label}: ${item.value}`}
              />
              <div className="text-xs text-gray-500 truncate w-full text-center">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMetricGrid = () => {
    if (!data || data.length === 0) return null;

    return (
      <div className="grid grid-cols-2 gap-4">
        {data.map((item, index) => (
          <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {typeof item.value === 'number' && item.value > 1000 
                ? formatLKR(item.value) 
                : item.value}
            </div>
            <div className="text-sm text-gray-600">{item.label}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {trend !== null && (
          <div className={`flex items-center space-x-1 ${getTrendColor(trend)}`}>
            {getTrendIcon(trend)}
            <span className="text-sm font-medium">
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {type === 'bar' && renderBarChart()}
        {type === 'line' && renderLineChart()}
        {type === 'grid' && renderMetricGrid()}
        
        {(!data || data.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsChart;