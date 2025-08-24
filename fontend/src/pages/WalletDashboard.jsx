import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  History,
  Eye,
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { useSocket } from '../hooks/useSocket';
import WalletSummary from '../components/WalletSummary';
import TransactionHistory from '../components/TransactionHistory';
import WithdrawalRequest from '../components/WithdrawalRequest';
import BankDetailsForm from '../components/BankDetailsFrom';
import WalletNotifications from '../components/WalletNotifications';
import CreditPurchase from '../components/CreditPurchase';
import LoadingSpinner from '../components/LoadingSpinner';

const WalletDashboard = () => {
  const { user } = useAuth(); // assuming user contains _id or storeId
  const { summary, transactions, loading, error, fetchSummary, fetchTransactions, getMyReveals } = useWallet();
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState('overview');
  const [revealHistory, setRevealHistory] = useState([]);
  const [loadingReveals, setLoadingReveals] = useState(false);

  useEffect(() => {
  if (socket && user?._id) {
    const userId = user._id;

    socket.emit('join-wallet-room', userId);

    socket.on('wallet-update', (data) => {
      console.log('Wallet update received:', data);
      fetchSummary();
      if (data.type !== 'withdrawal_requested') {
        fetchTransactions();
      }
    });

    return () => {
      socket.emit('leave-wallet-room', userId);
      socket.off('wallet-update');
    };
  }
}, [socket, fetchSummary, fetchTransactions]);


  const handleFilterChange = (filters) => {
    fetchTransactions(filters);
  };

  const handleWithdrawalSuccess = () => {
    fetchSummary();
    fetchTransactions();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-red-600 mb-4">Error loading wallet data: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const loadRevealHistory = async () => {
    if (user?.role !== 'customer') return;
    
    setLoadingReveals(true);
    try {
      const data = await getMyReveals();
      setRevealHistory(data.reveals || []);
    } catch (err) {
      console.error('Failed to load reveal history:', err);
    } finally {
      setLoadingReveals(false);
    }
  };

  // Load reveal history when switching to reveals tab
  useEffect(() => {
    if (activeTab === 'reveals') {
      loadRevealHistory();
    }
  }, [activeTab]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'purchase', label: 'Buy Credits', icon: ShoppingCart },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'reveals', label: 'Contact Reveals', icon: Eye },
    { id: 'withdraw', label: 'Withdraw', icon: CreditCard },
    { id: 'bank-details', label: 'Bank Details', icon: Wallet }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center text-gray-600 hover:text-black transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
              </Link>
              <div className="border-l pl-4">
                <h1 className="text-3xl font-bold text-black flex items-center">
                  <Wallet className="w-8 h-8 mr-3 text-green-600" />
                  Wallet & Credits
                </h1>
                <p className="text-gray-600">Manage your earnings, withdrawals, and credits</p>
              </div>
            </div>
            <WalletNotifications socket={socket} />
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              // Hide reveals tab for store owners
              if (tab.id === 'reveals' && user?.role !== 'customer') {
                return null;
              }
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <WalletSummary summary={summary} loading={loading} />
            
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('purchase')}
                  className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Buy Credits</div>
                    <div className="text-sm text-gray-500">Purchase with wallet balance</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <History className="w-5 h-5 text-gray-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">View Transactions</div>
                    <div className="text-sm text-gray-500">See all wallet activity</div>
                  </div>
                </button>

                {user?.role === 'customer' && (
                  <button
                    onClick={() => setActiveTab('reveals')}
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="w-5 h-5 text-purple-600" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Contact Reveals</div>
                      <div className="text-sm text-gray-500">View reveal history</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div className="space-y-8">
            <WalletSummary summary={summary} loading={loading} />
            <WithdrawalRequest 
              summary={summary} 
              onWithdrawalSuccess={handleWithdrawalSuccess} 
            />
          </div>
        )}

        {activeTab === 'purchase' && (
          <div className="max-w-4xl">
            <CreditPurchase />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
              <p className="text-sm text-gray-600">All wallet and credit transactions</p>
            </div>
            <div className="p-6">
              <TransactionHistory 
                transactions={transactions} 
                loading={loading} 
                onFilterChange={handleFilterChange}
              />
            </div>
          </div>
        )}

        {activeTab === 'reveals' && user?.role === 'customer' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Contact Reveals</h3>
              <p className="text-sm text-gray-600">Stores whose contacts you've revealed</p>
            </div>
            <div className="p-6">
              {loadingReveals ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : revealHistory.length > 0 ? (
                <div className="space-y-4">
                  {revealHistory.map((reveal) => (
                    <div
                      key={reveal._id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          {reveal.storeId?.profileImage ? (
                            <img
                              src={reveal.storeId.profileImage}
                              alt={reveal.storeId.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <Eye className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {reveal.storeId?.name || 'Unknown Store'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(reveal.revealedAt).toLocaleDateString()} • 
                            {reveal.storeId?.type || 'Store'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-purple-600">
                          {reveal.unitCredits} credit used
                        </div>
                        <div className="text-xs text-gray-500">
                          {reveal.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No reveals yet
                  </h3>
                  <p className="text-gray-600">
                    Contact reveals will appear here after you reveal store contacts
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div className="space-y-8">
            <WalletSummary summary={summary} loading={loading} />
            <WithdrawalRequest 
              summary={summary} 
              onWithdrawalSuccess={handleWithdrawalSuccess} 
            />
          </div>
        )}

        {activeTab === 'bank-details' && (
          <BankDetailsForm />
        )}
      </div>
    </div>
  );
};

export default WalletDashboard;