import React from 'react';
import { formatCurrency } from '../utils/formatters';
import { Wallet, TrendingUp, Clock, AlertCircle, Activity, DollarSign } from 'lucide-react';

const WalletSummary = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      title: 'Available Balance',
      value: formatCurrency(summary.availableBalance),
      icon: Wallet,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: summary.canWithdraw ? 'Ready to withdraw' : 'Below minimum threshold'
    },
    {
      title: 'Total Earnings',
      value: formatCurrency(summary.totalEarnings),
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: summary.monthlyGrowth !== undefined 
        ? `${summary.monthlyGrowth >= 0 ? '+' : ''}${summary.monthlyGrowth.toFixed(1)}% this month`
        : 'All time total'
    },
    {
      title: 'Pending Withdrawals',
      value: formatCurrency(summary.pendingWithdrawals),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      subtitle: summary.pendingWithdrawals > 0 ? 'Processing' : 'No pending requests'
    },
    {
      title: 'Monthly Withdrawals',
      value: `${summary.monthlyWithdrawals}/${summary.monthlyLimit}`,
      icon: AlertCircle,
      color: summary.monthlyWithdrawals >= summary.monthlyLimit ? 'text-red-600' : 'text-gray-600',
      bgColor: summary.monthlyWithdrawals >= summary.monthlyLimit ? 'bg-red-50' : 'bg-gray-50',
      subtitle: summary.monthlyWithdrawals >= summary.monthlyLimit 
        ? 'Monthly limit reached' 
        : `${summary.monthlyLimit - summary.monthlyWithdrawals} withdrawals left`
    },
    {
      title: 'Credits Balance',
      value: `${summary.credits?.balance || 0} Credits`,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: `Total purchased: ${summary.credits?.totalPurchased || 0}`
    },
    {
      title: 'Transaction Count',
      value: summary.statistics?.totalTransactions || 0,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      subtitle: `Avg: ${formatCurrency(summary.statistics?.averageTransactionAmount || 0)}`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <IconComponent className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-black">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs text-gray-500">
                  {card.subtitle}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WalletSummary;