const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  //console.log(token);
  return {
    "Content-Type": "application/json",
  };
};

const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }

  return data;
};

export const walletAPI = {
  getSummary: async () => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/summary`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getTransactions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/wallet/transactions?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  requestWithdrawal: async (data) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/withdraw`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getBankDetails: async () => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/bank-details`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateBankDetails: async (data) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/bank-details`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

export const adminAPI = {
  getPendingWithdrawals: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/admin/withdrawals/pending?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  getAllWithdrawals: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/admin/withdrawals?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  processWithdrawal: async (id, data) => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/withdrawals/${id}/process`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  getAnalytics: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/admin/analytics?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },
};
