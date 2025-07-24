import React, { useState, useEffect } from "react";
import { adminAPI } from "../utils/api";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "../utils/formatters";
import { Clock, CheckCircle, XCircle, Eye, Filter } from "lucide-react";

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchWithdrawals();
  }, [filters]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllWithdrawals(filters);
      setWithdrawals(response.data.withdrawals);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to fetch withdrawals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id, action) => {
    try {
      setProcessing(true);
      await adminAPI.processWithdrawal(id, {
        action,
        adminNotes,
      });

      setShowModal(false);
      setSelectedWithdrawal(null);
      setAdminNotes("");
      await fetchWithdrawals();
    } catch (error) {
      console.error("Failed to process withdrawal:", error);
    } finally {
      setProcessing(false);
    }
  };

  const openModal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setAdminNotes("");
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4 py-4 border-b">
              <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-8 w-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-black">
            Withdrawal Management
          </h1>
          <div className="flex items-center space-x-4">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value, page: 1 })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {withdrawals.filter((w) => w.status === "pending").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-green-600">Approved</p>
                <p className="text-2xl font-bold text-green-800">
                  {withdrawals.filter((w) => w.status === "approved").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm text-red-600">Rejected</p>
                <p className="text-2xl font-bold text-red-800">
                  {withdrawals.filter((w) => w.status === "rejected").length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawals List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No withdrawal requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-black">
                      Store
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-black">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-black">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-black">
                      Requested
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-black">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal) => (
                    <tr
                      key={withdrawal._id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-black">
                            {withdrawal.storeId?.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {withdrawal.storeId?.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-lg font-semibold text-black">
                          {formatCurrency(withdrawal.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                            withdrawal.status
                          )}`}
                        >
                          {withdrawal.status.charAt(0).toUpperCase() +
                            withdrawal.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-600">
                          {formatDate(
                            withdrawal.withdrawalDetails?.requestedAt ||
                              withdrawal.createdAt
                          )}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openModal(withdrawal)}
                            className="p-2 text-gray-600 hover:text-black transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {withdrawal.status === "pending" && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  handleProcess(withdrawal._id, "approve");
                                }}
                                className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openModal(withdrawal)}
                                className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-black mb-4">
              Process Withdrawal Request
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Store</p>
                <p className="font-medium text-black">
                  {selectedWithdrawal.storeId?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="font-medium text-black">
                  {formatCurrency(selectedWithdrawal.amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Bank Details</p>
                <p className="font-medium text-black">
                  {
                    selectedWithdrawal.withdrawalDetails?.bankAccountId
                      ?.bankName
                  }{" "}
                  -
                  {
                    selectedWithdrawal.withdrawalDetails?.bankAccountId
                      ?.accountNumber
                  }
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (Optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Add notes for the store owner..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={processing}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleProcess(selectedWithdrawal._id, "reject")}
                disabled={processing}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? "Processing..." : "Reject"}
              </button>
              <button
                onClick={() => handleProcess(selectedWithdrawal._id, "approve")}
                disabled={processing}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? "Processing..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawals;
