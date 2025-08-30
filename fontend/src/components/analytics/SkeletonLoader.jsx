import React from 'react';

const SkeletonLoader = ({ variant = 'card', className = '', count = 1 }) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div key={index}>
      {variant === 'card' && <SkeletonCard className={className} />}
      {variant === 'chart' && <SkeletonChart className={className} />}
      {variant === 'text' && <SkeletonText className={className} />}
      {variant === 'metric' && <SkeletonMetric className={className} />}
      {variant === 'table' && <SkeletonTable className={className} />}
    </div>
  ));

  return count === 1 ? skeletons[0] : <>{skeletons}</>;
};

const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-6 animate-pulse ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

const SkeletonChart = ({ className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-6 animate-pulse ${className}`}>
    <div className="flex items-center justify-between mb-6">
      <div className="h-5 bg-gray-200 rounded w-32"></div>
      <div className="h-8 bg-gray-200 rounded w-24"></div>
    </div>
    
    <div className="h-64 flex items-end justify-between space-x-2 px-2">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="bg-gray-200 rounded-t w-full"
          style={{
            height: `${Math.random() * 150 + 50}px`
          }}
        ></div>
      ))}
    </div>
    
    <div className="flex justify-between mt-4 space-x-2">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-3 bg-gray-200 rounded w-8"></div>
      ))}
    </div>
  </div>
);

const SkeletonText = ({ className = '', lines = 3 }) => (
  <div className={`animate-pulse ${className}`}>
    {Array.from({ length: lines }, (_, i) => (
      <div
        key={i}
        className="h-4 bg-gray-200 rounded mb-2"
        style={{
          width: `${Math.random() * 40 + 60}%`
        }}
      ></div>
    ))}
  </div>
);

const SkeletonMetric = ({ className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-4 sm:p-6 animate-pulse ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

const SkeletonTable = ({ className = '', rows = 5 }) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-6 animate-pulse ${className}`}>
    <div className="h-5 bg-gray-200 rounded w-32 mb-6"></div>
    
    <div className="space-y-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      ))}
    </div>
  </div>
);

// Skeleton for the entire analytics dashboard
const AnalyticsDashboardSkeleton = () => (
  <div className="min-h-screen bg-white">
    {/* Header Skeleton */}
    <div className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-200 rounded-lg mr-4 animate-pulse"></div>
            <div className="animate-pulse">
              <div className="h-7 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex space-x-8 mt-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>

    {/* Content Skeleton */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <SkeletonLoader variant="metric" count={4} />
        </div>

        {/* Chart and Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonLoader variant="chart" className="lg:col-span-2" />
          <SkeletonLoader variant="card" />
        </div>

        {/* Additional Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonLoader variant="table" />
          <SkeletonLoader variant="card" />
        </div>
      </div>
    </div>
  </div>
);

export default SkeletonLoader;
export { AnalyticsDashboardSkeleton, SkeletonCard, SkeletonChart, SkeletonText, SkeletonMetric, SkeletonTable };