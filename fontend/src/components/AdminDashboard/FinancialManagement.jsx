import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const FinancialManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommissions: 0,
    pendingPayouts: 0,
    processedPayouts: 0
  });

  const [filters, setFilters] = useState({
    dateRange: '30',
    status: '',
    search: ''
  });

  useEffect(() => {
    fetchFinancialData();
  }, [filters]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Fetch financial statistics
      const statsResponse = await fetch('/api/admin/financial/stats', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // Fetch revenue data
      const revenueResponse = await fetch(`/api/admin/financial/revenue?period=${filters.dateRange}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json();
        setRevenueData(revenueData.data);
      }

      // Fetch commissions if on commissions tab
      if (activeTab === 'commissions') {
        const commissionsResponse = await fetch(`/api/admin/financial/commissions?status=${filters.status}&search=${filters.search}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (commissionsResponse.ok) {
          const commissionsData = await commissionsResponse.json();
          setCommissions(commissionsData.data);
        }
      }

      // Fetch payouts if on payouts tab
      if (activeTab === 'payouts') {
        const payoutsResponse = await fetch(`/api/admin/financial/payouts?status=${filters.status}&search=${filters.search}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (payoutsResponse.ok) {
          const payoutsData = await payoutsResponse.json();
          setPayouts(payoutsData.data);
        }
      }

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPayout = async (payoutId, status, adminNotes = '') => {
    try {
      const response = await fetch(`/api/admin/financial/payouts/${payoutId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, adminNotes })
      });

      if (response.ok) {
        fetchFinancialData();
      }
    } catch (error) {
      console.error('Error processing payout:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  const StatCard = ({ title, value, icon, change, color = "blue" }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change && (
            <p className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}% vs last month
            </p>
          )}
        </div>
        <div className={`p-3 bg-${color}-100 dark:bg-${color}-900/30 rounded-full`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon="💰"
          change={12.5}
          color="green"
        />
        <StatCard
          title="Total Commissions"
          value={formatCurrency(stats.totalCommissions)}
          icon="💵"
          change={8.3}
          color="blue"
        />
        <StatCard
          title="Pending Payouts"
          value={stats.pendingPayouts}
          icon="⏳"
          color="yellow"
        />
        <StatCard
          title="Processed Payouts"
          value={stats.processedPayouts}
          icon="✅"
          color="green"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Revenue Overview
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>Revenue chart would be displayed here with a charting library like Chart.js or Recharts</p>
        </div>
      </div>
    </div>
  );

  const renderCommissions = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Commission Transactions
        </h3>
        
        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          />
        </div>

        {/* Commissions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 text-gray-900 dark:text-white">User</th>
                <th className="py-3 text-gray-900 dark:text-white">Order</th>
                <th className="py-3 text-gray-900 dark:text-white">Amount</th>
                <th className="py-3 text-gray-900 dark:text-white">Status</th>
                <th className="py-3 text-gray-900 dark:text-white">Date</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((commission) => (
                <tr key={commission._id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {commission.userId?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">{commission.userId?.email || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="py-4 text-gray-900 dark:text-white">
                    {commission.relatedOrder?.orderNumber || 'N/A'}
                  </td>
                  <td className="py-4 text-gray-900 dark:text-white">
                    {formatCurrency(commission.amount)}
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      commission.status === 'completed' ? 'bg-green-100 text-green-800' :
                      commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {commission.status}
                    </span>
                  </td>
                  <td className="py-4 text-gray-900 dark:text-white">
                    {new Date(commission.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPayouts = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Payout Requests
        </h3>
        
        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Payouts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 text-gray-900 dark:text-white">User</th>
                <th className="py-3 text-gray-900 dark:text-white">Amount</th>
                <th className="py-3 text-gray-900 dark:text-white">Status</th>
                <th className="py-3 text-gray-900 dark:text-white">Date</th>
                <th className="py-3 text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout._id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {payout.userId?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">{payout.userId?.email || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="py-4 text-gray-900 dark:text-white">
                    {formatCurrency(payout.amount)}
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                      payout.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="py-4 text-gray-900 dark:text-white">
                    {new Date(payout.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4">
                    {payout.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => processPayout(payout._id, 'approved')}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => processPayout(payout._id, 'rejected', 'Rejected by admin')}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {payout.status === 'approved' && (
                      <button
                        onClick={() => processPayout(payout._id, 'completed')}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Mark Completed
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'commissions', label: 'Commissions' },
    { id: 'payouts', label: 'Payouts' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'commissions':
        return renderCommissions();
      case 'payouts':
        return renderPayouts();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Financial Management
        </h1>
        
        <div className="flex gap-2">
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
};

export default FinancialManagement;