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

  getDetails: async () => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/details`, {
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

  getAnalytics: async (period = 'month') => {
    const response = await fetch(
      `${API_BASE_URL}/api/wallet/analytics?period=${period}`,
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

  updateSettings: async (data) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/settings`, {
      method: "PUT",
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
  
  submitBankChangeRequest: async (changeRequestData) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/bank-details/change-request`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(changeRequestData),
    });
    return handleResponse(response);
  },
  
  getBankChangeRequests: async () => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/bank-details/change-requests`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  
  cancelBankChangeRequest: async (requestId) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/bank-details/change-request/${requestId}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Credit management
  getCreditPackages: async () => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/credits/packages`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  purchaseCredits: async (packageId) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/credits/purchase`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ packageId }),
    });
    return handleResponse(response);
  },

  getCredits: async (page = 1, limit = 10) => {
    const response = await fetch(
      `${API_BASE_URL}/api/wallet/credits?page=${page}&limit=${limit}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
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

export const contactRevealAPI = {
  revealContact: async (storeId, recaptchaToken = null) => {
    const response = await fetch(`${API_BASE_URL}/api/stores/${storeId}/reveal-contact`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ recaptchaToken }),
    });
    return handleResponse(response);
  },

  canReveal: async (storeId) => {
    const response = await fetch(`${API_BASE_URL}/api/stores/${storeId}/can-reveal`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getMyReveals: async (page = 1, limit = 10) => {
    const response = await fetch(
      `${API_BASE_URL}/api/my-reveals?page=${page}&limit=${limit}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  getStoreReveals: async (storeId, period = 'month', page = 1, limit = 20) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/reveals?period=${period}&page=${page}&limit=${limit}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },
};
