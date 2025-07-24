import React from 'react';
import { formatCurrency } from '../utils/formatters';
import { Wallet, TrendingUp, Clock, AlertCircle } from 'lucide-react';

const WalletSummary = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
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
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Earnings',
      value: formatCurrency(summary.totalEarnings),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pending Withdrawals',
      value: formatCurrency(summary.pendingWithdrawals),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Monthly Withdrawals',
      value: `${summary.monthlyWithdrawals}/${summary.monthlyLimit}`,
      icon: AlertCircle,
      color: summary.monthlyWithdrawals >= summary.monthlyLimit ? 'text-red-600' : 'text-gray-600',
      bgColor: summary.monthlyWithdrawals >= summary.monthlyLimit ? 'bg-red-50' : 'bg-gray-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              {card.title === 'Monthly Withdrawals' && (
                <p className="text-xs text-gray-500">
                  {summary.monthlyWithdrawals >= summary.monthlyLimit 
                    ? 'Monthly limit reached' 
                    : `${summary.monthlyLimit - summary.monthlyWithdrawals} withdrawals left`}
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