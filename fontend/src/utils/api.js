const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  //console.log(token);
  return {
    "Content-Type": "application/json",
  };
};

const handleResponse = async (response) => {
  let data;
  
  try {
    data = await response.json();
  } catch (parseError) {
    // If JSON parsing fails, create a generic error response
    data = {
      success: false,
      message: `Server returned invalid response (${response.status})`
    };
  }

  if (!response.ok) {
    // Enhanced error handling for different HTTP status codes
    let errorMessage = data.message || "API request failed";
    
    switch (response.status) {
      case 400:
        errorMessage = `Bad Request: ${data.message || 'Invalid request parameters'}`;
        break;
      case 401:
        errorMessage = 'Authentication required. Please login again.';
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        break;
      case 403:
        errorMessage = 'Access denied. Admin privileges required.';
        break;
      case 404:
        errorMessage = `Resource not found: ${data.message || 'The requested item was not found'}`;
        break;
      case 429:
        errorMessage = 'Too many requests. Please try again later.';
        break;
      case 500:
        errorMessage = 'Internal server error. Please contact support if this persists.';
        break;
      case 502:
      case 503:
      case 504:
        errorMessage = 'Service temporarily unavailable. Please try again later.';
        break;
      default:
        errorMessage = `Request failed (${response.status}): ${data.message || 'Unknown error'}`;
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = data;
    throw error;
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
  // Existing withdrawal methods
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

  // =================== COMPREHENSIVE COLLECTION MANAGEMENT ===================
  
  // Generic CRUD operations for all collections
  getCollectionData: async (collection, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/admin/${collection}?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  getCollectionItem: async (collection, id) => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/${collection}/${id}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  createCollectionItem: async (collection, data) => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/${collection}`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  updateCollectionItem: async (collection, id, data) => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/${collection}/${id}`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  deleteCollectionItem: async (collection, id) => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/${collection}/${id}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  toggleItemStatus: async (collection, id) => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/${collection}/${id}/toggle-status`,
      {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  bulkOperation: async (collection, action, ids, data = {}) => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/${collection}/bulk`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids, action, data }),
      }
    );
    return handleResponse(response);
  },

  // =================== SYSTEM MONITORING & ANALYTICS ===================

  // Real-time system statistics
  getSystemStats: async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/system/stats`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Advanced analytics dashboard
  getAnalyticsDashboard: async (period = '30') => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/analytics/dashboard?period=${period}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // System health monitoring
  getSystemHealth: async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/system/health`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Admin activity logs
  getActivityLogs: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/admin/activity-logs?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // =================== SPECIFIC COLLECTION HELPERS ===================

  // Users management
  getAllUsers: (params = {}) => adminAPI.getCollectionData('all-users', params),
  createUser: (data) => adminAPI.createCollectionItem('all-users', data),
  updateUser: (id, data) => adminAPI.updateCollectionItem('all-users', id, data),
  deleteUser: (id) => adminAPI.deleteCollectionItem('all-users', id),

  // Stores management  
  getAllStores: (params = {}) => adminAPI.getCollectionData('all-stores', params),
  createStore: (data) => adminAPI.createCollectionItem('all-stores', data),
  updateStore: (id, data) => adminAPI.updateCollectionItem('all-stores', id, data),
  deleteStore: (id) => adminAPI.deleteCollectionItem('all-stores', id),

  // Products management
  getAllProducts: (params = {}) => adminAPI.getCollectionData('all-products', params),
  createProduct: (data) => adminAPI.createCollectionItem('all-products', data),
  updateProduct: (id, data) => adminAPI.updateCollectionItem('all-products', id, data),
  deleteProduct: (id) => adminAPI.deleteCollectionItem('all-products', id),

  // Services management
  getAllServices: (params = {}) => adminAPI.getCollectionData('all-services', params),
  createService: (data) => adminAPI.createCollectionItem('all-services', data),
  updateService: (id, data) => adminAPI.updateCollectionItem('all-services', id, data),
  deleteService: (id) => adminAPI.deleteCollectionItem('all-services', id),

  // Orders management
  getAllOrders: (params = {}) => adminAPI.getCollectionData('all-orders', params),
  updateOrder: (id, data) => adminAPI.updateCollectionItem('all-orders', id, data),
  deleteOrder: (id) => adminAPI.deleteCollectionItem('all-orders', id),

  // Bookings management
  getAllBookings: (params = {}) => adminAPI.getCollectionData('all-bookings', params),
  updateBooking: (id, data) => adminAPI.updateCollectionItem('all-bookings', id, data),
  deleteBooking: (id) => adminAPI.deleteCollectionItem('all-bookings', id),

  // Chats management
  getAllChats: (params = {}) => adminAPI.getCollectionData('all-chats', params),
  deleteChat: (id) => adminAPI.deleteCollectionItem('all-chats', id),

  // Chat Analytics management
  getAllChatAnalytics: (params = {}) => adminAPI.getCollectionData('all-chat-analytics', params),

  // Commissions management
  getAllCommissions: (params = {}) => adminAPI.getCollectionData('all-commissions', params),
  updateCommission: (id, data) => adminAPI.updateCollectionItem('all-commissions', id, data),

  // Contact Reveals management
  getAllContactReveals: (params = {}) => adminAPI.getCollectionData('all-contact-reveals', params),

  // Email Subscriptions management
  getAllEmailSubscriptions: (params = {}) => adminAPI.getCollectionData('all-email-subscriptions', params),
  createEmailSubscription: (data) => adminAPI.createCollectionItem('all-email-subscriptions', data),
  updateEmailSubscription: (id, data) => adminAPI.updateCollectionItem('all-email-subscriptions', id, data),
  deleteEmailSubscription: (id) => adminAPI.deleteCollectionItem('all-email-subscriptions', id),

  // Flash Deals management
  getAllFlashDeals: (params = {}) => adminAPI.getCollectionData('all-flash-deals', params),
  createFlashDeal: (data) => adminAPI.createCollectionItem('all-flash-deals', data),
  updateFlashDeal: (id, data) => adminAPI.updateCollectionItem('all-flash-deals', id, data),
  deleteFlashDeal: (id) => adminAPI.deleteCollectionItem('all-flash-deals', id),

  // Notifications management
  getAllNotifications: (params = {}) => adminAPI.getCollectionData('all-notifications', params),
  createNotification: (data) => adminAPI.createCollectionItem('all-notifications', data),
  updateNotification: (id, data) => adminAPI.updateCollectionItem('all-notifications', id, data),
  deleteNotification: (id) => adminAPI.deleteCollectionItem('all-notifications', id),

  // Packages management
  getAllPackages: (params = {}) => adminAPI.getCollectionData('all-packages', params),
  createPackage: (data) => adminAPI.createCollectionItem('all-packages', data),
  updatePackage: (id, data) => adminAPI.updateCollectionItem('all-packages', id, data),
  deletePackage: (id) => adminAPI.deleteCollectionItem('all-packages', id),

  // Pending Transactions management
  getAllPendingTransactions: (params = {}) => adminAPI.getCollectionData('all-pending-transactions', params),
  updatePendingTransaction: (id, data) => adminAPI.updateCollectionItem('all-pending-transactions', id, data),
  deletePendingTransaction: (id) => adminAPI.deleteCollectionItem('all-pending-transactions', id),

  // Platform Settings management
  getAllPlatformSettings: (params = {}) => adminAPI.getCollectionData('all-platform-settings', params),
  createPlatformSetting: (data) => adminAPI.createCollectionItem('all-platform-settings', data),
  updatePlatformSetting: (id, data) => adminAPI.updateCollectionItem('all-platform-settings', id, data),
  deletePlatformSetting: (id) => adminAPI.deleteCollectionItem('all-platform-settings', id),

  // Posts management
  getAllPosts: (params = {}) => adminAPI.getCollectionData('all-posts', params),
  updatePost: (id, data) => adminAPI.updateCollectionItem('all-posts', id, data),
  deletePost: (id) => adminAPI.deleteCollectionItem('all-posts', id),

  // Post Comments management
  getAllPostComments: (params = {}) => adminAPI.getCollectionData('all-post-comments', params),
  updatePostComment: (id, data) => adminAPI.updateCollectionItem('all-post-comments', id, data),
  deletePostComment: (id) => adminAPI.deleteCollectionItem('all-post-comments', id),

  // Post Likes management
  getAllPostLikes: (params = {}) => adminAPI.getCollectionData('all-post-likes', params),
  deletePostLike: (id) => adminAPI.deleteCollectionItem('all-post-likes', id),

  // Reviews management
  getAllReviews: (params = {}) => adminAPI.getCollectionData('all-reviews', params),
  updateReview: (id, data) => adminAPI.updateCollectionItem('all-reviews', id, data),
  deleteReview: (id) => adminAPI.deleteCollectionItem('all-reviews', id),

  // Search History management
  getAllSearchHistory: (params = {}) => adminAPI.getCollectionData('all-search-history', params),
  deleteSearchHistory: (id) => adminAPI.deleteCollectionItem('all-search-history', id),

  // Subscriptions management
  getAllSubscriptions: (params = {}) => adminAPI.getCollectionData('all-subscriptions', params),
  updateSubscription: (id, data) => adminAPI.updateCollectionItem('all-subscriptions', id, data),
  deleteSubscription: (id) => adminAPI.deleteCollectionItem('all-subscriptions', id),

  // Time Slots management
  getAllTimeSlots: (params = {}) => adminAPI.getCollectionData('all-time-slots', params),
  createTimeSlot: (data) => adminAPI.createCollectionItem('all-time-slots', data),
  updateTimeSlot: (id, data) => adminAPI.updateCollectionItem('all-time-slots', id, data),
  deleteTimeSlot: (id) => adminAPI.deleteCollectionItem('all-time-slots', id),

  // Categories management
  getAllCategories: (params = {}) => adminAPI.getCollectionData('all-categories', params),
  createCategory: (data) => adminAPI.createCollectionItem('all-categories', data),
  updateCategory: (id, data) => adminAPI.updateCollectionItem('all-categories', id, data),
  deleteCategory: (id) => adminAPI.deleteCollectionItem('all-categories', id),

  // Variants management
  getAllVariants: (params = {}) => adminAPI.getCollectionData('all-variants', params),
  createVariant: (data) => adminAPI.createCollectionItem('all-variants', data),
  updateVariant: (id, data) => adminAPI.updateCollectionItem('all-variants', id, data),
  deleteVariant: (id) => adminAPI.deleteCollectionItem('all-variants', id),

  // Wallets management
  getAllWallets: (params = {}) => adminAPI.getCollectionData('all-wallets', params),
  updateWallet: (id, data) => adminAPI.updateCollectionItem('all-wallets', id, data),

  // Addons management
  getAllAddons: (params = {}) => adminAPI.getCollectionData('all-addons', params),
  createAddon: (data) => adminAPI.createCollectionItem('all-addons', data),
  updateAddon: (id, data) => adminAPI.updateCollectionItem('all-addons', id, data),
  deleteAddon: (id) => adminAPI.deleteCollectionItem('all-addons', id),

  // Comment Likes management
  getAllCommentLikes: (params = {}) => adminAPI.getCollectionData('all-comment-likes', params),
  deleteCommentLike: (id) => adminAPI.deleteCollectionItem('all-comment-likes', id),

  // Comment Reactions management
  getAllCommentReactions: (params = {}) => adminAPI.getCollectionData('all-comment-reactions', params),
  deleteCommentReaction: (id) => adminAPI.deleteCollectionItem('all-comment-reactions', id),

  // Marketing management
  getAllMarketing: (params = {}) => adminAPI.getCollectionData('all-marketing', params),
  createMarketing: (data) => adminAPI.createCollectionItem('all-marketing', data),
  updateMarketing: (id, data) => adminAPI.updateCollectionItem('all-marketing', id, data),
  deleteMarketing: (id) => adminAPI.deleteCollectionItem('all-marketing', id),

  // =================== DATA EXPORT/IMPORT UTILITIES ===================

  exportCollectionData: async (collection, format = 'csv') => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/${collection}?limit=10000`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    const data = await handleResponse(response);
    
    if (format === 'csv') {
      return adminAPI.convertToCSV(data.data.items, collection);
    } else {
      return data.data.items;
    }
  },

  convertToCSV: (data, collection) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]).filter(key => key !== '__v').join(',');
    const rows = data.map(item => {
      return Object.keys(item)
        .filter(key => key !== '__v')
        .map(key => {
          const value = item[key];
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value).replace(/"/g, '""');
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(',');
    });
    
    return [headers, ...rows].join('\n');
  },

  downloadCSV: (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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
