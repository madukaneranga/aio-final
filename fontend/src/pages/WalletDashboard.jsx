import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useWallet } from "../hooks/useWallet";
import { formatLKR } from "../utils/currency";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Settings,
  Plus,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  Eye,
  Save,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import RequestWithdrawalModal from "../components/RequestWithdrawalModal";
import BankDetailsModal from "../components/BankDetailsModal";

const WalletDashboard = () => {
  const {
    // State
    wallet,
    walletLoading,
    walletError,
    transactions,
    transactionsLoading,
    transactionsError,
    bankDetails,
    bankDetailsLoading,
    bankDetailsError,
    settings,
    settingsLoading,
    settingsError,
    
    // Operation states
    withdrawalLoading,
    bankDetailsSubmitting,
    settingsUpdating,
    
    // Methods
    fetchTransactions,
    fetchBankDetails,
    requestWithdrawal,
    addBankDetails,
    updateWalletSettings,
    refreshWallet,
    
    // Utilities
    formatCurrency,
    getTransactionStatusColor,
    canWithdraw,
    primaryBankAccount,
    formattedBalances
  } = useWallet();

  const [transactionFilter, setTransactionFilter] = useState("All");
  const [autoWithdrawal, setAutoWithdrawal] = useState(false);
  const [autoThreshold, setAutoThreshold] = useState(10000); // Default to 10,000 LKR
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [originalThreshold, setOriginalThreshold] = useState(10000);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [autoWithdrawalMessage, setAutoWithdrawalMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize auto withdrawal settings from settings state
  useEffect(() => {
    if (settings?.autoWithdrawal) {
      const enabled = settings.autoWithdrawal.enabled || false;
      const threshold = settings.autoWithdrawal.threshold || 10000; // Use 10,000 as default
      setAutoWithdrawal(enabled);
      setAutoThreshold(threshold);
      setOriginalThreshold(threshold);
    } else if (wallet?.settings?.autoWithdrawal) {
      // Fallback to wallet settings if settings state is not yet loaded
      const enabled = wallet.settings.autoWithdrawal.enabled || false;
      const threshold = wallet.settings.autoWithdrawal.threshold || 10000;
      setAutoWithdrawal(enabled);
      setAutoThreshold(threshold);
      setOriginalThreshold(threshold);
    }
  }, [settings, wallet]);

  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
      case "processing":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactionFilter === "All"
      ? transactions
      : transactions.filter((t) => t.type.toLowerCase() === transactionFilter.toLowerCase());
  }, [transactions, transactionFilter]);

  const isWithdrawalDisabled = useMemo(() => {
    return !canWithdraw || withdrawalLoading;
  }, [canWithdraw, withdrawalLoading]);

  const handleWithdrawalRequest = async (withdrawalData) => {
    try {
      await requestWithdrawal(withdrawalData);
    } catch (error) {
      throw error;
    }
  };

  const handleBankDetailsSubmit = async (bankData) => {
    try {
      await addBankDetails(bankData);
      setShowBankModal(false);
      setAutoWithdrawalMessage("Bank details updated successfully!");
      setTimeout(() => setAutoWithdrawalMessage(""), 3000);
    } catch (error) {
      throw error;
    }
  };

  // Handle auto-withdrawal toggle - saves immediately
  const handleAutoWithdrawalToggle = async () => {
    const newEnabled = !autoWithdrawal;
    setAutoWithdrawalMessage("");
    
    try {
      await updateWalletSettings({
        autoWithdrawal: {
          enabled: newEnabled,
          threshold: autoThreshold,
        }
      });
      setAutoWithdrawal(newEnabled);
      setAutoWithdrawalMessage(
        newEnabled 
          ? "Auto-withdrawal enabled successfully!" 
          : "Auto-withdrawal disabled successfully!"
      );
      setTimeout(() => setAutoWithdrawalMessage(""), 3000);
    } catch (error) {
      setAutoWithdrawalMessage("Failed to update auto-withdrawal setting.");
      setTimeout(() => setAutoWithdrawalMessage(""), 3000);
    }
  };

  // Handle entering edit mode for threshold
  const handleEditThreshold = () => {
    setOriginalThreshold(autoThreshold);
    setIsEditingThreshold(true);
    setAutoWithdrawalMessage("");
  };

  // Handle saving threshold changes
  const handleSaveThreshold = async () => {
    setAutoWithdrawalMessage("");

    try {
      await updateWalletSettings({
        autoWithdrawal: {
          enabled: autoWithdrawal,
          threshold: autoThreshold,
        }
      });
      setIsEditingThreshold(false);
      setOriginalThreshold(autoThreshold);
      setAutoWithdrawalMessage("Threshold updated successfully!");
      setTimeout(() => setAutoWithdrawalMessage(""), 3000);
    } catch (error) {
      setAutoWithdrawalMessage("Failed to save threshold. Please try again.");
      setTimeout(() => setAutoWithdrawalMessage(""), 3000);
    }
  };

  // Handle canceling threshold edit
  const handleCancelThresholdEdit = () => {
    setAutoThreshold(originalThreshold);
    setIsEditingThreshold(false);
    setAutoWithdrawalMessage("");
  };

  const handleTransactionFilterChange = (filter) => {
    setTransactionFilter(filter);
    setCurrentPage(1);
    
    // Fetch transactions with new filter
    fetchTransactions({ 
      page: 1, 
      limit: 20, 
      type: filter === "All" ? undefined : filter.toLowerCase() 
    });
  };


  // Show loading spinner while initial data loads
  if (walletLoading && !wallet) {
    return (
      <div className="max-w-6xl mx-auto p-5 bg-white text-black rounded-xl">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="large" />
          <span className="ml-3 text-lg">Loading wallet data...</span>
        </div>
      </div>
    );
  }

  // Show error state if wallet fails to load
  if (walletError && !wallet) {
    return (
      <div className="max-w-6xl mx-auto p-5 bg-white text-black rounded-xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-600 mb-4">Error loading wallet data</div>
            <button 
              onClick={refreshWallet}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-5 bg-white text-black rounded-xl">
      {/* Header */}
      <div className="mb-6 pb-3 border-b border-gray-200">
        <h1 className="text-2xl font-semibold">Wallet Dashboard</h1>
      </div>

      {/* Core Balances */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3">Core Balances</h2>
        <div className="grid grid-cols-5 gap-3">
          {[
            { 
              label: "Available Balance", 
              value: wallet?.balance?.availableBalance,
              formatted: formattedBalances.available 
            },
            { 
              label: "Pending Balance", 
              value: wallet?.balance?.pendingBalance,
              formatted: formattedBalances.pending 
            },
            { 
              label: "Total Earnings", 
              value: wallet?.balance?.totalEarnings,
              formatted: formattedBalances.totalEarnings 
            },
            {
              label: "Total Withdrawals",
              value: wallet?.balance?.totalWithdrawals,
              formatted: formattedBalances.totalWithdrawals
            },
            {
              label: "Pending Withdrawals",
              value: wallet?.balance?.pendingWithdrawals,
              formatted: formattedBalances.pendingWithdrawals
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 p-3 h-20 flex flex-col justify-between rounded-lg"
            >
              <div className="text-xs text-gray-600">{item.label}</div>
              <div className="text-base font-semibold">
                {wallet?.metadata?.currency || "LKR"} {item.formatted || "0.00"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet Statistics */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3">Wallet Statistics</h2>
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold mb-1">
              {wallet?.statistics?.totalTransactions || 0}
            </div>
            <div className="text-xs text-gray-600">Total Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold mb-1">
              {wallet?.statistics?.successfulTransactions || 0}
            </div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold mb-1">
              {wallet?.statistics?.pendingTransactions || 0}
            </div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold mb-1">
              {wallet?.metadata?.currency || "LKR"}{" "}
              {formatCurrency(wallet?.statistics?.averageTransactionAmount || 0)}
            </div>
            <div className="text-xs text-gray-600">Average Amount</div>
          </div>
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3">Withdrawal Management</h2>
        <div
          className={`border-2 p-4 rounded-lg transition-all ${
            canWithdraw
              ? "bg-white border-black"
              : "bg-gray-100 border-gray-400"
          }`}
        >
          {/* Enable/Disable Toggle */}
          <div className="flex justify-between items-center mb-4 pb-3 border-gray-200">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  canWithdraw ? "bg-black" : "bg-gray-400"
                }`}
              ></div>
              <span className="font-medium">
                Withdrawals {canWithdraw ? "Available" : "Unavailable"}
              </span>
              {!canWithdraw && (
                <span className="text-xs text-gray-500">
                  {!wallet?.balance?.availableBalance 
                    ? "Insufficient balance" 
                    : (wallet?.withdrawalInfo?.monthlyWithdrawals >= wallet?.withdrawalInfo?.monthlyLimit)
                    ? "Monthly limit reached"
                    : bankDetails?.length === 0
                    ? "Bank details required"
                    : "Wallet inactive"
                  }
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 text-sm">
                <span className="text-gray-600 min-w-36">
                  Monthly Withdrawals:
                </span>
                <span className="font-medium">
                  {wallet?.withdrawalInfo?.monthlyWithdrawals || 0} /{" "}
                  {wallet?.withdrawalInfo?.monthlyLimit || 4}
                </span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-gray-600 min-w-36">Last Withdrawal:</span>
                <span className="font-medium">
                  {wallet?.withdrawalInfo?.lastWithdrawalDate 
                    ? new Date(wallet.withdrawalInfo.lastWithdrawalDate).toLocaleDateString()
                    : "Never"
                  }
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 items-end">
              <button
                className={`px-4 py-2 text-sm font-medium min-w-36 rounded-md transition-colors ${
                  isWithdrawalDisabled
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-gray-300"
                    : "bg-black text-white hover:bg-gray-800 border-2 border-black"
                }`}
                disabled={isWithdrawalDisabled}
                onClick={() => setShowWithdrawalModal(true)}
              >
                {withdrawalLoading ? "Processing..." : "Request Withdrawal"}
              </button>

              {/* Auto-Withdrawal Settings */}
              <div className="flex flex-col gap-3 items-end">
                {/* Toggle Switch */}
                <div className="flex items-center gap-3 text-sm">
                  <label className="text-gray-700 select-none font-medium">
                    Auto-Withdrawal
                  </label>
                  <button
                    onClick={handleAutoWithdrawalToggle}
                    disabled={settingsUpdating || isEditingThreshold}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 ${
                      autoWithdrawal ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        autoWithdrawal
                          ? "transform translate-x-6"
                          : "transform translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Conditional Content Based on State */}
                {autoWithdrawal ? (
                  <div className="flex flex-col gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-200 min-w-60">
                    {!isEditingThreshold ? (
                      /* View Mode */
                      <>
                        <div className="flex items-center justify-between w-full text-xs">
                          <span className="text-gray-600 font-medium">Threshold:</span>
                          <span className="font-semibold text-black bg-white px-2 py-1 rounded border">
                            {wallet?.metadata?.currency || "LKR"} {formatCurrency(autoThreshold)}
                          </span>
                        </div>
                        <button
                          onClick={handleEditThreshold}
                          className="px-3 py-1.5 text-xs font-medium border-2 border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                        >
                          Edit Threshold
                        </button>
                      </>
                    ) : (
                      /* Edit Mode */
                      <>
                        <div className="flex items-center justify-between w-full text-xs">
                          <span className="text-gray-600 font-medium">Threshold:</span>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                              {wallet?.metadata?.currency || "LKR"}
                            </span>
                            <input
                              type="number"
                              value={autoThreshold}
                              onChange={(e) => setAutoThreshold(parseFloat(e.target.value) || 0)}
                              className="w-28 pl-8 pr-2 py-1 border-2 border-gray-300 text-xs rounded-md focus:border-black focus:outline-none bg-white"
                              placeholder="10000"
                              min="1000"
                              max="1000000"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCancelThresholdEdit}
                            className="px-3 py-1.5 text-xs font-medium border-2 border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveThreshold}
                            disabled={settingsUpdating}
                            className="px-3 py-1.5 text-xs font-medium bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            {settingsUpdating ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Disabled State */
                  <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    Auto-Withdrawal: <span className="font-medium">Disabled</span>
                  </div>
                )}
              </div>

              {/* Success/Error Message */}
              {autoWithdrawalMessage && (
                <div
                  className={`text-xs p-3 rounded-lg border-2 max-w-64 text-center font-medium transition-all duration-200 ${
                    autoWithdrawalMessage.includes("successfully")
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {autoWithdrawalMessage}
                </div>
              )}

              {/* Settings Error Display */}
              {settingsError && (
                <div className="text-xs p-3 rounded-lg border-2 max-w-64 text-center bg-red-50 border-red-200 text-red-800 font-medium">
                  <span className="block font-semibold mb-1">Settings Error</span>
                  {settingsError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Transactions Table */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold">Recent Transactions</h2>
            {transactionsLoading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 mb-3">
            {["All", "sale", "refund", "withdrawal", "adjustment"].map((filter) => (
              <button
                key={filter}
                className={`px-3 py-1.5 text-xs border rounded-md ${
                  transactionFilter === filter
                    ? "bg-black text-white border-black"
                    : "bg-gray-100 text-black border-gray-200 hover:bg-gray-200"
                }`}
                onClick={() => handleTransactionFilterChange(filter)}
                disabled={transactionsLoading}
              >
                {filter === "All" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          <div className="border border-gray-200 overflow-x-auto rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold border-b border-gray-200">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold border-b border-gray-200">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold border-b border-gray-200">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold border-b border-gray-200">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold border-b border-gray-200">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactionsError ? (
                  <tr>
                    <td colSpan="5" className="px-3 py-6 text-center text-red-600">
                      Error loading transactions: {transactionsError}
                      <button
                        onClick={() => fetchTransactions({ page: currentPage, limit: 20 })}
                        className="block mt-2 mx-auto px-3 py-1 bg-black text-white text-xs rounded-md hover:bg-gray-800"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-3 py-6 text-center text-gray-500">
                      {transactionsLoading ? "Loading transactions..." : "No transactions found"}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction._id || transaction.transactionId} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm border-b border-gray-100">
                        {transaction.type?.charAt(0).toUpperCase() + transaction.type?.slice(1) || "Unknown"}
                      </td>
                      <td className="px-3 py-2 text-sm border-b border-gray-100">
                        {wallet?.metadata?.currency || "LKR"}{" "}
                        {formatCurrency(transaction.amount || 0)}
                      </td>
                      <td className="px-3 py-2 text-sm border-b border-gray-100">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium border rounded-md ${getTransactionStatusColor(
                            transaction.status
                          )}`}
                        >
                          {transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1) || "Unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm border-b border-gray-100">
                        {transaction.createdAt 
                          ? new Date(transaction.createdAt).toLocaleDateString()
                          : "N/A"
                        }
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 border-b border-gray-100">
                        {transaction.description || "No description"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* Bank Information */}
          <div>
            <h2 className="text-base font-semibold mb-3">Bank Information</h2>
            {bankDetailsLoading ? (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex items-center justify-center">
                <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full mr-2"></div>
                Loading bank details...
              </div>
            ) : bankDetailsError ? (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
                <div className="text-red-600 mb-2">Error loading bank details</div>
                <button
                  onClick={() => fetchBankDetails()}
                  className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            ) : primaryBankAccount ? (
              <div className="bg-white border border-gray-200 p-4 relative rounded-lg">
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 min-w-24">Bank Name:</span>
                    <span className="font-medium text-right">
                      {primaryBankAccount.bankName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 min-w-24">Account:</span>
                    <span className="font-medium text-right">
                      {primaryBankAccount.getMaskedAccountNumber ? 
                        primaryBankAccount.getMaskedAccountNumber() :
                        `****${primaryBankAccount.accountNumber?.slice(-4) || ""}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 min-w-24">Holder:</span>
                    <span className="font-medium text-right">
                      {primaryBankAccount.accountHolderName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 min-w-24">Branch:</span>
                    <span className="font-medium text-right">
                      {primaryBankAccount.branchName}
                    </span>
                  </div>
                  {primaryBankAccount.isVerified !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 min-w-24">Status:</span>
                      <span className={`font-medium text-right ${
                        primaryBankAccount.isVerified ? "text-green-600" : "text-yellow-600"
                      }`}>
                        {primaryBankAccount.isVerified ? "Verified" : "Pending Verification"}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowBankModal(true)}
                  className="absolute top-4 right-4 px-3 py-1.5 bg-white border border-gray-200 text-xs hover:bg-gray-50 rounded-md"
                  disabled={bankDetailsSubmitting}
                >
                  {bankDetailsSubmitting ? "Updating..." : "Edit"}
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                <div className="text-gray-600 mb-3">No bank details found</div>
                <button
                  onClick={() => setShowBankModal(true)}
                  className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800"
                >
                  Add Bank Details
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Settings & Metadata */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3">
          Wallet Settings & Metadata
        </h2>
        <div className="grid grid-cols-4 gap-4 bg-gray-50 border border-gray-200 p-4 rounded-lg">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Wallet ID:</span>
            <span className="text-sm font-medium">
              {wallet?._id?.substring(0, 12).toUpperCase() || "Loading..."}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Wallet Status:</span>
            <span className={`text-sm font-medium ${
              wallet?.metadata?.walletStatus === 'active' ? 'text-green-600' : 'text-red-600'
            }`}>
              {wallet?.metadata?.walletStatus?.charAt(0).toUpperCase() + wallet?.metadata?.walletStatus?.slice(1) || "Unknown"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Last Transaction:</span>
            <span className="text-sm font-medium">
              {wallet?.metadata?.lastTransactionDate 
                ? new Date(wallet.metadata.lastTransactionDate).toLocaleDateString()
                : "Never"
              }
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Last Balance Update:</span>
            <span className="text-sm font-medium">
              {wallet?.metadata?.lastBalanceUpdate 
                ? new Date(wallet.metadata.lastBalanceUpdate).toLocaleString()
                : "Never"
              }
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Created:</span>
            <span className="text-sm font-medium">
              {wallet?.metadata?.createdAt || wallet?.createdAt
                ? new Date(wallet.metadata?.createdAt || wallet.createdAt).toLocaleDateString()
                : "Unknown"
              }
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Currency:</span>
            <span className="text-sm font-medium">
              {wallet?.metadata?.currency || "LKR"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Bank Verification:</span>
            <span
              className={`text-sm font-medium ${
                primaryBankAccount?.isVerified ? "text-green-600" : "text-yellow-600"
              }`}
            >
              {primaryBankAccount?.isVerified ? "Verified" : primaryBankAccount ? "Pending" : "No Bank Details"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Auto Withdrawal:</span>
            <span className={`text-sm font-medium ${
              settings?.autoWithdrawal?.enabled || autoWithdrawal ? "text-green-600" : "text-gray-600"
            }`}>
              {settingsLoading ? "Loading..." : 
                (settings?.autoWithdrawal?.enabled || autoWithdrawal) ? 
                  `Enabled (${wallet?.metadata?.currency || "LKR"} ${formatCurrency(settings?.autoWithdrawal?.threshold || autoThreshold)})` : 
                  "Disabled"
              }
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RequestWithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onSubmit={handleWithdrawalRequest}
        availableBalance={wallet?.balance?.availableBalance || 0}
        bankDetails={bankDetails}
        primaryBankAccount={primaryBankAccount}
        monthlyWithdrawals={wallet?.withdrawalInfo?.monthlyWithdrawals || 0}
        monthlyLimit={wallet?.withdrawalInfo?.monthlyLimit || 4}
        currency={wallet?.metadata?.currency || "LKR"}
        isLoading={withdrawalLoading}
      />

      <BankDetailsModal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        onSubmit={handleBankDetailsSubmit}
        bankDetails={primaryBankAccount}
        isLoading={bankDetailsSubmitting}
      />
    </div>
  );
};

export default WalletDashboard;
