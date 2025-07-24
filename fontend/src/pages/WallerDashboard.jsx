import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useSocket } from '../hooks/useSocket';
import WalletSummary from '../components/WalletSummary';
import TransactionHistory from '../components/TransactionHistory';
import WithdrawalRequest from '../components/WithdrawalRequest';
import BankDetailsForm from '../components/BankDetailsFrom';
import WalletNotifications from '../components/WalletNotifications';

const WalletDashboard = () => {
  const { summary, transactions, loading, error, fetchSummary, fetchTransactions } = useWallet();
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (socket) {
      // Join wallet room for real-time updates
      socket.emit('join-wallet-room', 'STORE_ID'); // Replace with actual store ID
      
      // Listen for wallet updates
      socket.on('wallet-update', (data) => {
        console.log('Wallet update received:', data);
        fetchSummary();
        if (data.type !== 'withdrawal_requested') {
          fetchTransactions();
        }
      });

      return () => {
        socket.emit('leave-wallet-room', 'STORE_ID');
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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'withdraw', label: 'Withdraw' },
    { id: 'bank-details', label: 'Bank Details' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-black">Wallet</h1>
              <p className="text-gray-600">Manage your earnings and withdrawals</p>
            </div>
            <WalletNotifications socket={socket} />
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <WalletSummary summary={summary} loading={loading} />
            <TransactionHistory 
              transactions={transactions} 
              loading={loading} 
              onFilterChange={handleFilterChange}
            />
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