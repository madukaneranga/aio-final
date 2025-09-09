const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

const getAuthHeaders = () => {
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
      message: `Server returned invalid response (${response.status})`,
    };
  }

  if (!response.ok) {
    // Enhanced error handling for different HTTP status codes
    let errorMessage = data.message || "API request failed";

    switch (response.status) {
      case 400:
        // Enhanced 400 error handling to show validation details
        if (data.errors && Array.isArray(data.errors)) {
          const validationErrors = data.errors.map(err => `${err.field}: ${err.message}`).join('; ');
          errorMessage = `Validation Error: ${validationErrors}`;
        } else {
          errorMessage = `Bad Request: ${data.message || "Invalid request parameters"}`;
        }
        console.error("Detailed 400 error:", data); // Log full error details
        break;
      case 401:
        errorMessage = "Authentication required. Please login again.";
        // Redirect to login if not already there
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        break;
      case 403:
        errorMessage = "Access denied. Admin privileges required.";
        break;
      case 404:
        errorMessage = `Resource not found: ${
          data.message || "The requested item was not found"
        }`;
        break;
      case 429:
        errorMessage = "Too many requests. Please try again later.";
        break;
      case 500:
        errorMessage =
          "Internal server error. Please contact support if this persists.";
        break;
      case 502:
      case 503:
      case 504:
        errorMessage =
          "Service temporarily unavailable. Please try again later.";
        break;
      default:
        errorMessage = `Request failed (${response.status}): ${
          data.message || "Unknown error"
        }`;
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = data;
    throw error;
  }

  return data;
};

// Store owner wallet API
export const walletAPI = {
  getSummary: async () => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/summary`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getTransactions: async () => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/transactions`, {
      credentials: "include",
      headers: getAuthHeaders(),
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

  addBankDetails: async (bankData) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/bank-details`, {
      method: 'POST',
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(bankData),
    });
    return handleResponse(response);
  },

  requestWithdrawal: async (withdrawalData) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/withdrawal`, {
      method: 'POST',
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(withdrawalData),
    });
    return handleResponse(response);
  },

  updateSettings: async (settings) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/settings`, {
      method: 'PUT',
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
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
    const response = await fetch(`${API_BASE_URL}/api/admin/${collection}`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
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
    const response = await fetch(`${API_BASE_URL}/api/admin/system/stats`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Advanced analytics dashboard
  getAnalyticsDashboard: async (period = "30") => {
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
    const response = await fetch(`${API_BASE_URL}/api/admin/system/health`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
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
  getAllUsers: (params = {}) => adminAPI.getCollectionData("all-users", params),
  createUser: (data) => adminAPI.createCollectionItem("all-users", data),
  updateUser: (id, data) =>
    adminAPI.updateCollectionItem("all-users", id, data),
  deleteUser: (id) => adminAPI.deleteCollectionItem("all-users", id),

  // Stores management
  getAllStores: (params = {}) =>
    adminAPI.getCollectionData("all-stores", params),
  createStore: (data) => adminAPI.createCollectionItem("all-stores", data),
  updateStore: (id, data) =>
    adminAPI.updateCollectionItem("all-stores", id, data),
  deleteStore: (id) => adminAPI.deleteCollectionItem("all-stores", id),

  // Products management
  getAllProducts: (params = {}) =>
    adminAPI.getCollectionData("all-products", params),
  createProduct: (data) => adminAPI.createCollectionItem("all-products", data),
  updateProduct: (id, data) =>
    adminAPI.updateCollectionItem("all-products", id, data),
  deleteProduct: (id) => adminAPI.deleteCollectionItem("all-products", id),

  // Orders management
  getAllOrders: (params = {}) =>
    adminAPI.getCollectionData("all-orders", params),
  updateOrder: (id, data) =>
    adminAPI.updateCollectionItem("all-orders", id, data),
  deleteOrder: (id) => adminAPI.deleteCollectionItem("all-orders", id),


  // Contact Reveals management
  getAllContactReveals: (params = {}) =>
    adminAPI.getCollectionData("all-contact-reveals", params),

  // Email Subscriptions management
  getAllEmailSubscriptions: (params = {}) =>
    adminAPI.getCollectionData("all-email-subscriptions", params),
  createEmailSubscription: (data) =>
    adminAPI.createCollectionItem("all-email-subscriptions", data),
  updateEmailSubscription: (id, data) =>
    adminAPI.updateCollectionItem("all-email-subscriptions", id, data),
  deleteEmailSubscription: (id) =>
    adminAPI.deleteCollectionItem("all-email-subscriptions", id),

  // Flash Deals management
  getAllFlashDeals: (params = {}) =>
    adminAPI.getCollectionData("all-flash-deals", params),
  createFlashDeal: (data) =>
    adminAPI.createCollectionItem("all-flash-deals", data),
  updateFlashDeal: (id, data) =>
    adminAPI.updateCollectionItem("all-flash-deals", id, data),
  deleteFlashDeal: (id) => adminAPI.deleteCollectionItem("all-flash-deals", id),

  // Notifications management
  getAllNotifications: (params = {}) =>
    adminAPI.getCollectionData("all-notifications", params),
  createNotification: (data) =>
    adminAPI.createCollectionItem("all-notifications", data),
  updateNotification: (id, data) =>
    adminAPI.updateCollectionItem("all-notifications", id, data),
  deleteNotification: (id) =>
    adminAPI.deleteCollectionItem("all-notifications", id),

  // Packages management
  getAllPackages: (params = {}) =>
    adminAPI.getCollectionData("all-packages", params),
  createPackage: (data) => adminAPI.createCollectionItem("all-packages", data),
  updatePackage: (id, data) =>
    adminAPI.updateCollectionItem("all-packages", id, data),
  deletePackage: (id) => adminAPI.deleteCollectionItem("all-packages", id),

  // Platform Settings management
  getAllPlatformSettings: (params = {}) =>
    adminAPI.getCollectionData("all-platform-settings", params),
  createPlatformSetting: (data) =>
    adminAPI.createCollectionItem("all-platform-settings", data),
  updatePlatformSetting: (id, data) =>
    adminAPI.updateCollectionItem("all-platform-settings", id, data),
  deletePlatformSetting: (id) =>
    adminAPI.deleteCollectionItem("all-platform-settings", id),

  // Posts management
  getAllPosts: (params = {}) => adminAPI.getCollectionData("all-posts", params),
  updatePost: (id, data) =>
    adminAPI.updateCollectionItem("all-posts", id, data),
  deletePost: (id) => adminAPI.deleteCollectionItem("all-posts", id),

  // Post Comments management
  getAllPostComments: (params = {}) =>
    adminAPI.getCollectionData("all-post-comments", params),
  updatePostComment: (id, data) =>
    adminAPI.updateCollectionItem("all-post-comments", id, data),
  deletePostComment: (id) =>
    adminAPI.deleteCollectionItem("all-post-comments", id),

  // Post Likes management
  getAllPostLikes: (params = {}) =>
    adminAPI.getCollectionData("all-post-likes", params),
  deletePostLike: (id) => adminAPI.deleteCollectionItem("all-post-likes", id),

  // Reviews management
  getAllReviews: (params = {}) =>
    adminAPI.getCollectionData("all-reviews", params),
  updateReview: (id, data) =>
    adminAPI.updateCollectionItem("all-reviews", id, data),
  deleteReview: (id) => adminAPI.deleteCollectionItem("all-reviews", id),

  // Search History management
  getAllSearchHistory: (params = {}) =>
    adminAPI.getCollectionData("all-search-history", params),
  deleteSearchHistory: (id) =>
    adminAPI.deleteCollectionItem("all-search-history", id),

  // Subscriptions management
  getAllSubscriptions: (params = {}) =>
    adminAPI.getCollectionData("all-subscriptions", params),
  updateSubscription: (id, data) =>
    adminAPI.updateCollectionItem("all-subscriptions", id, data),
  deleteSubscription: (id) =>
    adminAPI.deleteCollectionItem("all-subscriptions", id),

  // Categories management
  getAllCategories: (params = {}) =>
    adminAPI.getCollectionData("all-categories", params),
  createCategory: (data) =>
    adminAPI.createCollectionItem("all-categories", data),
  updateCategory: (id, data) =>
    adminAPI.updateCollectionItem("all-categories", id, data),
  deleteCategory: (id) => adminAPI.deleteCollectionItem("all-categories", id),

  // Variants management
  getAllVariants: (params = {}) =>
    adminAPI.getCollectionData("all-variants", params),
  createVariant: (data) => adminAPI.createCollectionItem("all-variants", data),
  updateVariant: (id, data) =>
    adminAPI.updateCollectionItem("all-variants", id, data),
  deleteVariant: (id) => adminAPI.deleteCollectionItem("all-variants", id),

  // Wallets management
  getAllWallets: (params = {}) =>
    adminAPI.getCollectionData("all-wallets", params),
  updateWallet: (id, data) =>
    adminAPI.updateCollectionItem("all-wallets", id, data),

  // Addons management
  getAllAddons: (params = {}) =>
    adminAPI.getCollectionData("all-addons", params),
  createAddon: (data) => adminAPI.createCollectionItem("all-addons", data),
  updateAddon: (id, data) =>
    adminAPI.updateCollectionItem("all-addons", id, data),
  deleteAddon: (id) => adminAPI.deleteCollectionItem("all-addons", id),

  // Comment Likes management
  getAllCommentLikes: (params = {}) =>
    adminAPI.getCollectionData("all-comment-likes", params),
  deleteCommentLike: (id) =>
    adminAPI.deleteCollectionItem("all-comment-likes", id),

  // Comment Reactions management
  getAllCommentReactions: (params = {}) =>
    adminAPI.getCollectionData("all-comment-reactions", params),
  deleteCommentReaction: (id) =>
    adminAPI.deleteCollectionItem("all-comment-reactions", id),

  // Marketing management
  getAllMarketing: (params = {}) =>
    adminAPI.getCollectionData("all-marketing", params),
  createMarketing: (data) =>
    adminAPI.createCollectionItem("all-marketing", data),
  updateMarketing: (id, data) =>
    adminAPI.updateCollectionItem("all-marketing", id, data),
  deleteMarketing: (id) => adminAPI.deleteCollectionItem("all-marketing", id),

  // =================== DATA EXPORT/IMPORT UTILITIES ===================

  exportCollectionData: async (collection, format = "csv") => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/${collection}?limit=10000`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    const data = await handleResponse(response);

    if (format === "csv") {
      return adminAPI.convertToCSV(data.data.items, collection);
    } else {
      return data.data.items;
    }
  },

  convertToCSV: (data, collection) => {
    if (!data || data.length === 0) return "";

    const headers = Object.keys(data[0])
      .filter((key) => key !== "__v")
      .join(",");
    const rows = data.map((item) => {
      return Object.keys(item)
        .filter((key) => key !== "__v")
        .map((key) => {
          const value = item[key];
          if (typeof value === "object" && value !== null) {
            return JSON.stringify(value).replace(/"/g, '""');
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    return [headers, ...rows].join("\n");
  },

  downloadCSV: (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export const contactRevealAPI = {
  // Full response functions
  _revealContact: async (storeId, recaptchaToken = null) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/reveal-contact`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ recaptchaToken }),
      }
    );
    return handleResponse(response);
  },

  _canReveal: async (storeId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/can-reveal`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getMyReveals: async (page = 1, limit = 10) => {
    const response = await fetch(
      `${API_BASE_URL}/api/my-reveals?page=${page}&limit=${limit}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getStoreReveals: async (storeId, period = "month", page = 1, limit = 20) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/reveals?period=${period}&page=${page}&limit=${limit}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  revealContact: async (storeId, recaptchaToken = null) => {
    const result = await contactRevealAPI._revealContact(
      storeId,
      recaptchaToken
    );
    return result.data;
  },

  canReveal: async (storeId) => {
    const result = await contactRevealAPI._canReveal(storeId);
    return result.data;
  },

  getMyReveals: async (page = 1, limit = 10) => {
    const result = await contactRevealAPI._getMyReveals(page, limit);
    return result.data;
  },

  getStoreReveals: async (storeId, period = "month", page = 1, limit = 20) => {
    const result = await contactRevealAPI._getStoreReveals(
      storeId,
      period,
      page,
      limit
    );
    return result.data;
  },
};

export const cartAPI = {
  // Full response functions
  _getCart: async () => {
    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _addToCart: async (itemData) => {
    const response = await fetch(`${API_BASE_URL}/api/cart/add`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData),
    });
    return handleResponse(response);
  },

  _updateQuantity: async (itemId, quantity) => {
    const response = await fetch(`${API_BASE_URL}/api/cart/update/${itemId}`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ quantity }),
    });
    return handleResponse(response);
  },

  _removeFromCart: async (itemId, permanent = false) => {
    const response = await fetch(
      `${API_BASE_URL}/api/cart/remove/${itemId}?permanent=${permanent}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _clearCart: async (permanent = false) => {
    const response = await fetch(
      `${API_BASE_URL}/api/cart/clear?permanent=${permanent}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getCartAnalytics: async (days = 30) => {
    const response = await fetch(
      `${API_BASE_URL}/api/cart/analytics?days=${days}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getCartState: async () => {
    const response = await fetch(`${API_BASE_URL}/api/cart/state`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getCart: async () => {
    const result = await cartAPI._getCart();
    return result.data;
  },

  addToCart: async (itemData) => {
    const result = await cartAPI._addToCart(itemData);
    return result.data;
  },

  updateQuantity: async (itemId, quantity) => {
    const result = await cartAPI._updateQuantity(itemId, quantity);
    return result.data;
  },

  removeFromCart: async (itemId, permanent = false) => {
    const result = await cartAPI._removeFromCart(itemId, permanent);
    return result.data;
  },

  clearCart: async (permanent = false) => {
    const result = await cartAPI._clearCart(permanent);
    return result.data;
  },

  getCartAnalytics: async (days = 30) => {
    const result = await cartAPI._getCartAnalytics(days);
    return result.data;
  },

  getCartState: async () => {
    const result = await cartAPI._getCartState();
    return result.data;
  },
};

// =================== AUTH API ===================
export const authAPI = {
  // Full response functions (for contexts)
  _login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  _register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  _getMe: async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _logout: async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _switchRole: async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/switch-role`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  login: async (email, password) => {
    const result = await authAPI._login(email, password);
    return result.data;
  },

  register: async (userData) => {
    const result = await authAPI._register(userData);
    return result.data;
  },

  getMe: async () => {
    const result = await authAPI._getMe();
    return result.data;
  },

  logout: async () => {
    const result = await authAPI._logout();
    return result.data;
  },

  switchRole: async () => {
    const result = await authAPI._switchRole();
    return result.data;
  },
};

// =================== PRODUCTS API ===================
export const productsAPI = {
  // Full response functions
  _getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/products?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _create: async (productData) => {
    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    return handleResponse(response);
  },

  _update: async (id, productData) => {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    return handleResponse(response);
  },

  _delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getRecommendations: async (productId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/products/${productId}/recommendations?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getListing: async (filters) => {
    const response = await fetch(`${API_BASE_URL}/api/products/listing`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(filters),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getAll: async (params = {}) => {
    const result = await productsAPI._getAll(params);
    return result.data;
  },

  getById: async (id) => {
    const result = await productsAPI._getById(id);
    return result.data;
  },

  create: async (productData) => {
    const result = await productsAPI._create(productData);
    return result.data;
  },

  update: async (id, productData) => {
    const result = await productsAPI._update(id, productData);
    return result.data;
  },

  delete: async (id) => {
    const result = await productsAPI._delete(id);
    return result.data;
  },

  getRecommendations: async (productId, params = {}) => {
    const result = await productsAPI._getRecommendations(productId, params);
    return result.data;
  },

  getListing: async (filters) => {
    const result = await productsAPI._getListing(filters);
    return result.data;
  },

  // ===== EXTENDED PRODUCTS FUNCTIONS =====
  // Full response functions
  _getRecommendationsByCategory: async (categories, exclude = []) => {
    const response = await fetch(
      `${API_BASE_URL}/api/products/recommendations?categories=${categories.join(
        ","
      )}&exclude=${exclude.join(",")}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _searchProducts: async (query) => {
    const response = await fetch(
      `${API_BASE_URL}/api/products/search?q=${encodeURIComponent(query)}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getProductsByStore: async (storeId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/products?storeId=${storeId}&${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getRecommendationsByCategory: async (categories, exclude = []) => {
    const result = await productsAPI._getRecommendationsByCategory(
      categories,
      exclude
    );
    return result.data;
  },

  searchProducts: async (query) => {
    const result = await productsAPI._searchProducts(query);
    return result.data;
  },

  getProductsByStore: async (storeId, params = {}) => {
    const result = await productsAPI._getProductsByStore(storeId, params);
    return result.data;
  },
};

// =================== STORES API ===================
export const storesAPI = {
  // Full response functions
  _getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/api/stores?${queryString}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/stores/${id}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getFeatured: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/stores/featured/list?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _create: async (storeData) => {
    const response = await fetch(`${API_BASE_URL}/api/stores`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(storeData),
    });
    return handleResponse(response);
  },

  _update: async (id, storeData) => {
    const response = await fetch(`${API_BASE_URL}/api/stores/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(storeData),
    });
    return handleResponse(response);
  },

  _delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/stores/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _incrementViews: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/stores/${id}/views`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getProducts: async (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${id}/products?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getAnalytics: async (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${id}/analytics?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getListing: async (filters) => {
    const response = await fetch(`${API_BASE_URL}/api/stores/listing`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(filters),
    });
    return handleResponse(response);
  },

  _getFollowCheck: async (id) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${id}/follow-check`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _updateViews: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/stores/${id}/views`, {
      method: "PATCH",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getAll: async (params = {}) => {
    const result = await storesAPI._getAll(params);
    return result.data;
  },

  getById: async (id) => {
    const result = await storesAPI._getById(id);
    return result.data;
  },

  getFeatured: async (params = {}) => {
    const result = await storesAPI._getFeatured(params);
    return result.data;
  },

  create: async (storeData) => {
    const result = await storesAPI._create(storeData);
    return result.data;
  },

  update: async (id, storeData) => {
    const result = await storesAPI._update(id, storeData);
    return result.data;
  },

  delete: async (id) => {
    const result = await storesAPI._delete(id);
    return result.data;
  },

  incrementViews: async (id) => {
    const result = await storesAPI._incrementViews(id);
    return result.data;
  },

  getProducts: async (id, params = {}) => {
    const result = await storesAPI._getProducts(id, params);
    return result.data;
  },

  getAnalytics: async (id, params = {}) => {
    const result = await storesAPI._getAnalytics(id, params);
    return result.data;
  },

  getListing: async (filters) => {
    const result = await storesAPI._getListing(filters);
    return result.data;
  },

  getFollowCheck: async (id) => {
    const result = await storesAPI._getFollowCheck(id);
    return result.data;
  },

  updateViews: async (id) => {
    const result = await storesAPI._updateViews(id);
    return result.data;
  },

  // ===== EXTENDED STORES FUNCTIONS =====
  // Full response functions
  _followStore: async (storeId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/follow`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _unfollowStore: async (storeId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/follow`,
      {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getItemCount: async (storeId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/item-count`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getVerificationDocs: async (storeId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/verification-docs`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _uploadVerificationDocs: async (storeId, formData) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/verification-docs`,
      {
        method: "POST",
        credentials: "include",
        body: formData, // FormData for file upload
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  followStore: async (storeId) => {
    const result = await storesAPI._followStore(storeId);
    return result.data;
  },

  unfollowStore: async (storeId) => {
    const result = await storesAPI._unfollowStore(storeId);
    return result.data;
  },

  getItemCount: async (storeId) => {
    const result = await storesAPI._getItemCount(storeId);
    return result.data;
  },

  getVerificationDocs: async (storeId) => {
    const result = await storesAPI._getVerificationDocs(storeId);
    return result.data;
  },

  uploadVerificationDocs: async (storeId, formData) => {
    const result = await storesAPI._uploadVerificationDocs(storeId, formData);
    return result.data;
  },
};

// =================== CATEGORIES API ===================
export const categoriesAPI = {
  // Full response functions
  _getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _create: async (categoryData) => {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getAll: async () => {
    const result = await categoriesAPI._getAll();
    return result.data;
  },

  create: async (categoryData) => {
    const result = await categoriesAPI._create(categoryData);
    return result.data;
  },
};

// =================== ORDERS API ===================
export const ordersAPI = {
  // Full response functions
  _getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/api/orders?${queryString}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _create: async (orderData) => {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(orderData),
    });
    return handleResponse(response);
  },

  _updateStatus: async (id, status) => {
    const response = await fetch(`${API_BASE_URL}/api/orders/${id}/status`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  _cancel: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/orders/${id}/cancel`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getReceipt: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/orders/${id}/receipt`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getAll: async (params = {}) => {
    const result = await ordersAPI._getAll(params);
    return result.data;
  },

  getById: async (id) => {
    const result = await ordersAPI._getById(id);
    return result.data;
  },

  create: async (orderData) => {
    const result = await ordersAPI._create(orderData);
    return result.data;
  },

  updateStatus: async (id, status) => {
    const result = await ordersAPI._updateStatus(id, status);
    return result.data;
  },

  cancel: async (id) => {
    const result = await ordersAPI._cancel(id);
    return result.data;
  },

  getReceipt: async (id) => {
    const result = await ordersAPI._getReceipt(id);
    return result.data;
  },

  // ===== EXTENDED ORDERS FUNCTIONS =====
  // Full response functions
  _confirmOrder: async (orderId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/orders/${orderId}/confirm`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getOrdersByStore: async () => {
    const response = await fetch(`${API_BASE_URL}/api/orders/store`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getOrderAnalytics: async (storeId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/orders/analytics?storeId=${storeId}&${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getThankYouOrder: async (transactionId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/thank-you/order/${transactionId}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _markDelivered: async (orderId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/orders/${orderId}/mark-delivered`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _markPaymentSent: async (orderId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/orders/${orderId}/mark-payment-sent`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _updatePaymentStatus: async (orderId, paymentStatus) => {
    const response = await fetch(
      `${API_BASE_URL}/api/orders/${orderId}/update-payment-status`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ paymentStatus }),
      }
    );
    return handleResponse(response);
  },

  _confirmDelivery: async (orderId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/orders/${orderId}/confirm-delivery`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  confirmOrder: async (orderId) => {
    const result = await ordersAPI._confirmOrder(orderId);
    return result.data;
  },

  getOrdersByStore: async () => {
    const result = await ordersAPI._getOrdersByStore();
    return result.data;
  },

  getOrderAnalytics: async (storeId, params = {}) => {
    const result = await ordersAPI._getOrderAnalytics(storeId, params);
    return result.data;
  },

  getThankYouOrder: async (transactionId) => {
    const result = await ordersAPI._getThankYouOrder(transactionId);
    return result.data;
  },

  markDelivered: async (orderId) => {
    const result = await ordersAPI._markDelivered(orderId);
    return result.data;
  },

  markPaymentSent: async (orderId) => {
    const result = await ordersAPI._markPaymentSent(orderId);
    return result.data;
  },

  updatePaymentStatus: async (orderId, paymentStatus) => {
    const result = await ordersAPI._updatePaymentStatus(orderId, paymentStatus);
    return result.data;
  },

  confirmDelivery: async (orderId) => {
    const result = await ordersAPI._confirmDelivery(orderId);
    return result.data;
  },
};

// =================== REVIEWS API ===================
export const reviewsAPI = {
  // Full response functions
  _getByProduct: async (productId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/reviews/product/${productId}?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _create: async (reviewData) => {
    const response = await fetch(`${API_BASE_URL}/api/reviews`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(reviewData),
    });
    return handleResponse(response);
  },

  _update: async (id, reviewData) => {
    const response = await fetch(`${API_BASE_URL}/api/reviews/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(reviewData),
    });
    return handleResponse(response);
  },

  _delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/reviews/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getByStore: async (storeId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/reviews/store/${storeId}?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getByProduct: async (productId, params = {}) => {
    const result = await reviewsAPI._getByProduct(productId, params);
    return result.data;
  },

  create: async (reviewData) => {
    const result = await reviewsAPI._create(reviewData);
    return result.data;
  },

  update: async (id, reviewData) => {
    const result = await reviewsAPI._update(id, reviewData);
    return result.data;
  },

  delete: async (id) => {
    const result = await reviewsAPI._delete(id);
    return result.data;
  },

  getByStore: async (storeId, params = {}) => {
    const result = await reviewsAPI._getByStore(storeId, params);
    return result.data;
  },

  // ===== EXTENDED REVIEWS FUNCTIONS =====
  // Full response functions
  _getStoreReviews: async (storeId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/reviews/store/${storeId}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _respondToReview: async (reviewId, responseText) => {
    console.log(responseText);
    const response = await fetch(
      `${API_BASE_URL}/api/reviews/${reviewId}/respond`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: responseText }),
      }
    );
    return handleResponse(response);
  },

  _reportReview: async (reviewId, reason) => {
    const response = await fetch(
      `${API_BASE_URL}/api/reviews/${reviewId}/report`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getStoreReviews: async (storeId, params = {}) => {
    const result = await reviewsAPI._getStoreReviews(storeId);
    return result.data;
  },

  respondToReview: async (reviewId, responseText) => {
    const result = await reviewsAPI._respondToReview(reviewId, responseText);
    return result.data;
  },

  reportReview: async (reviewId, reason) => {
    const result = await reviewsAPI._reportReview(reviewId, reason);
    return result.data;
  },
};

// =================== FLASH DEALS API ===================
export const flashDealsAPI = {
  // Full response functions
  _getCurrent: async () => {
    const response = await fetch(`${API_BASE_URL}/api/flash-deals/current`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _trackClick: async (flashDealId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/flash-deals/${flashDealId}/click`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getCurrent: async () => {
    const result = await flashDealsAPI._getCurrent();
    return result.data;
  },

  trackClick: async (flashDealId) => {
    const result = await flashDealsAPI._trackClick(flashDealId);
    return result.data;
  },

  // ===== EXTENDED FLASH DEALS FUNCTIONS =====
  // Full response functions
  _getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/flash-deals?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _create: async (dealData) => {
    const response = await fetch(`${API_BASE_URL}/api/flash-deals`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(dealData),
    });
    return handleResponse(response);
  },

  _update: async (dealId, dealData) => {
    const response = await fetch(`${API_BASE_URL}/api/flash-deals/${dealId}`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(dealData),
    });
    return handleResponse(response);
  },

  _delete: async (dealId) => {
    const response = await fetch(`${API_BASE_URL}/api/flash-deals/${dealId}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getAll: async (params = {}) => {
    const result = await flashDealsAPI._getAll(params);
    return result.data;
  },

  create: async (dealData) => {
    const result = await flashDealsAPI._create(dealData);
    return result.data;
  },

  update: async (dealId, dealData) => {
    const result = await flashDealsAPI._update(dealId, dealData);
    return result.data;
  },

  delete: async (dealId) => {
    const result = await flashDealsAPI._delete(dealId);
    return result.data;
  },
};

// =================== SOCIAL/POSTS API ===================
export const socialAPI = {
  // Full response functions
  _getPosts: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/api/posts?${queryString}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _createPost: async (postData) => {
    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(postData),
    });
    return handleResponse(response);
  },

  _likePost: async (postId) => {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getComments: async (postId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/posts/${postId}/comments?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _addComment: async (postId, commentData) => {
    const response = await fetch(
      `${API_BASE_URL}/api/posts/${postId}/comments`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(commentData),
      }
    );
    return handleResponse(response);
  },

  // ===== EXTENDED SOCIAL FUNCTIONS =====
  _getFeed: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/posts/feed?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _viewPost: async (postId) => {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/view`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _addPostComment: async (postId, commentData) => {
    const response = await fetch(
      `${API_BASE_URL}/api/posts/${postId}/comment`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(commentData),
      }
    );
    return handleResponse(response);
  },

  _getPostComments: async (postId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/posts/${postId}/comments?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getReplies: async (commentId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/posts/comments/${commentId}/replies?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _likeComment: async (commentId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/posts/comments/${commentId}/like`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _addReaction: async (commentId, data) => {
    const response = await fetch(
      `${API_BASE_URL}/api/posts/comments/${commentId}/reaction`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  _searchProductsForPost: async (query) => {
    const response = await fetch(
      `${API_BASE_URL}/api/posts/products/search?q=${encodeURIComponent(
        query
      )}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getPosts: async (params = {}) => {
    const result = await socialAPI._getPosts(params);
    return result.data;
  },

  createPost: async (postData) => {
    const result = await socialAPI._createPost(postData);
    return result.data;
  },

  likePost: async (postId) => {
    const result = await socialAPI._likePost(postId);
    return result.data;
  },

  getComments: async (postId, params = {}) => {
    const result = await socialAPI._getComments(postId, params);
    return result.data;
  },

  addComment: async (postId, commentData) => {
    const result = await socialAPI._addComment(postId, commentData);
    return result.data;
  },

  // ===== EXTENDED SOCIAL WRAPPER FUNCTIONS =====
  getFeed: async (params = {}) => {
    const result = await socialAPI._getFeed(params);
    return result.data;
  },

  viewPost: async (postId) => {
    const result = await socialAPI._viewPost(postId);
    return result.data;
  },

  addPostComment: async (postId, commentData) => {
    const result = await socialAPI._addPostComment(postId, commentData);
    return result.data;
  },

  getPostComments: async (postId, params = {}) => {
    const result = await socialAPI._getPostComments(postId, params);
    return result.data;
  },

  getReplies: async (commentId, params = {}) => {
    const result = await socialAPI._getReplies(commentId, params);
    return result.data;
  },

  likeComment: async (commentId) => {
    const result = await socialAPI._likeComment(commentId);
    return result.data;
  },

  addReaction: async (commentId, data) => {
    const result = await socialAPI._addReaction(commentId, data);
    return result.data;
  },

  searchProductsForPost: async (query) => {
    const result = await socialAPI._searchProductsForPost(query);
    return result.data;
  },
};

// =================== NOTIFICATIONS API ===================
export const notificationsAPI = {
  // Full response functions
  _getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/notifications?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _markAsRead: async (id) => {
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/${id}/read`,
      {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _markAllAsRead: async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/mark-all-read`,
      {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getAll: async (params = {}) => {
    const result = await notificationsAPI._getAll(params);
    return result.data;
  },

  markAsRead: async (id) => {
    const result = await notificationsAPI._markAsRead(id);
    return result.data;
  },

  markAllAsRead: async () => {
    const result = await notificationsAPI._markAllAsRead();
    return result.data;
  },

  _delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _softDelete: async (id) => {
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/${id}/delete`,
      {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  delete: async (id) => {
    const result = await notificationsAPI._delete(id);
    return result.data;
  },

  softDelete: async (id) => {
    const result = await notificationsAPI._softDelete(id);
    return result.data;
  },

  // ===== EXTENDED NOTIFICATIONS FUNCTIONS =====
  // Full response functions
  _hardDelete: async (notificationId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/${notificationId}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _bulkDelete: async (notificationIds) => {
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/bulk-delete`,
      {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: notificationIds }),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  hardDelete: async (notificationId) => {
    const result = await notificationsAPI._hardDelete(notificationId);
    return result.data;
  },

  bulkDelete: async (notificationIds) => {
    const result = await notificationsAPI._bulkDelete(notificationIds);
    return result.data;
  },
};

// =================== SUBSCRIPTIONS/PACKAGES API ===================
export const subscriptionsAPI = {
  // Full response functions
  _getPackages: async () => {
    const response = await fetch(`${API_BASE_URL}/api/packages`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _subscribe: async (packageName) => {
    const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(packageName),
    });
    return handleResponse(response);
  },

  _getMySubscriptions: async () => {
    const response = await fetch(`${API_BASE_URL}/api/subscriptions/my`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _cancel: async (subscriptionId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/subscriptions/${subscriptionId}/cancel`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getPackages: async () => {
    const result = await subscriptionsAPI._getPackages();
    console.log("res", result);

    return result.data;
  },

  subscribe: async (packageName) => {
    const result = await subscriptionsAPI._subscribe(packageName);
    return result.data;
  },

  getMySubscriptions: async () => {
    const result = await subscriptionsAPI._getMySubscriptions();
    return result.data;
  },

  cancel: async (subscriptionId) => {
    const result = await subscriptionsAPI._cancel(subscriptionId);
    return result.data;
  },

  // ===== EXTENDED SUBSCRIPTIONS FUNCTIONS =====
  // Full response functions
  _getMySubscription: async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/subscriptions/my-subscription`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _upgradeSubscription: async (packageId, paymentData) => {
    const response = await fetch(`${API_BASE_URL}/api/subscriptions/upgrade`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ packageId, ...paymentData }),
    });
    return handleResponse(response);
  },

  _pauseSubscription: async (subscriptionId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/subscriptions/${subscriptionId}/pause`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _resumeSubscription: async (subscriptionId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/subscriptions/${subscriptionId}/resume`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getSubscriptionHistory: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/subscriptions/history?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _processPackageUpgrade: async (data) => {
    const response = await fetch(
      `${API_BASE_URL}/api/subscriptions/process-upgrade`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getMySubscription: async () => {
    const result = await subscriptionsAPI._getMySubscription();
    return result.data;
  },

  upgradeSubscription: async (packageId, paymentData) => {
    const result = await subscriptionsAPI._upgradeSubscription(
      packageId,
      paymentData
    );
    return result.data;
  },

  pauseSubscription: async (subscriptionId) => {
    const result = await subscriptionsAPI._pauseSubscription(subscriptionId);
    return result.data;
  },

  resumeSubscription: async (subscriptionId) => {
    const result = await subscriptionsAPI._resumeSubscription(subscriptionId);
    return result.data;
  },

  getSubscriptionHistory: async (params = {}) => {
    const result = await subscriptionsAPI._getSubscriptionHistory(params);
    return result.data;
  },

  processPackageUpgrade: async (data) => {
    const result = await subscriptionsAPI._processPackageUpgrade(data);
    return result.data;
  },
};


export const wishlistAPI = {
  // Full response functions
  _getWishlist: async () => {
    const response = await fetch(`${API_BASE_URL}/api/wishlist`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _addToWishlist: async (itemData) => {
    const response = await fetch(`${API_BASE_URL}/api/wishlist/add`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData),
    });
    console.log("res", response);

    return handleResponse(response);
  },

  _removeFromWishlist: async (itemId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/wishlist/remove/${itemId}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _updateItemPriority: async (itemId, priority) => {
    const response = await fetch(
      `${API_BASE_URL}/api/wishlist/priority/${itemId}`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ priority }),
      }
    );
    return handleResponse(response);
  },

  _updateItemNotes: async (itemId, notes) => {
    const response = await fetch(
      `${API_BASE_URL}/api/wishlist/notes/${itemId}`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes }),
      }
    );
    return handleResponse(response);
  },

  _moveToCart: async (itemId, quantity = 1) => {
    const response = await fetch(
      `${API_BASE_URL}/api/wishlist/move-to-cart/${itemId}`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity }),
      }
    );
    return handleResponse(response);
  },

  _filterWishlist: async (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/wishlist/filter?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _shareWishlist: async () => {
    const response = await fetch(`${API_BASE_URL}/api/wishlist/share`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _removeSharing: async () => {
    const response = await fetch(`${API_BASE_URL}/api/wishlist/share`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getSharedWishlist: async (shareToken) => {
    const response = await fetch(
      `${API_BASE_URL}/api/wishlist/shared/${shareToken}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getWishlist: async () => {
    const result = await wishlistAPI._getWishlist();
    return result.data;
  },

  addToWishlist: async (itemData) => {
    const result = await wishlistAPI._addToWishlist(itemData);
    return result.data;
  },

  removeFromWishlist: async (itemId) => {
    const result = await wishlistAPI._removeFromWishlist(itemId);
    return result.data;
  },

  updateItemPriority: async (itemId, priority) => {
    const result = await wishlistAPI._updateItemPriority(itemId, priority);
    return result.data;
  },

  updateItemNotes: async (itemId, notes) => {
    const result = await wishlistAPI._updateItemNotes(itemId, notes);
    return result.data;
  },

  moveToCart: async (itemId, quantity = 1) => {
    const result = await wishlistAPI._moveToCart(itemId, quantity);
    return result.data;
  },

  filterWishlist: async (filters = {}) => {
    const result = await wishlistAPI._filterWishlist(filters);
    return result.data;
  },

  shareWishlist: async () => {
    const result = await wishlistAPI._shareWishlist();
    return result.data;
  },

  removeSharing: async () => {
    const result = await wishlistAPI._removeSharing();
    return result.data;
  },

  getSharedWishlist: async (shareToken) => {
    const result = await wishlistAPI._getSharedWishlist(shareToken);
    return result.data;
  },
};

// =================== CUSTOM SALES API ===================
export const customSalesAPI = {
  // Full response functions
  _getSalesProducts: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/products?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getSalesCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getCurrentFlashDeals: async () => {
    const response = await fetch(`${API_BASE_URL}/api/flash-deals/current`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getSalesProducts: async (params = {}) => {
    const result = await customSalesAPI._getSalesProducts(params);
    return result.data;
  },

  getSalesCategories: async () => {
    const result = await customSalesAPI._getSalesCategories();
    return result.data;
  },

  getCurrentFlashDeals: async () => {
    const result = await customSalesAPI._getCurrentFlashDeals();
    return result.data;
  },
};

// =================== PACKAGES API ===================
export const packagesAPI = {
  // Full response functions
  _getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/api/packages`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/packages/${id}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _getFeatures: async (packageName) => {
    const response = await fetch(
      `${API_BASE_URL}/api/packages/${packageName}/features`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getAll: async () => {
    const result = await packagesAPI._getAll();
    return result.data;
  },

  getById: async (id) => {
    const result = await packagesAPI._getById(id);
    return result.data;
  },

  getFeatures: async (packageName) => {
    const result = await packagesAPI._getFeatures(packageName);
    return result.data;
  },
};

// =================== MANAGE PRODUCTS API ===================
export const manageProductsAPI = {
  // Full response functions
  _getMyProducts: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/products/my?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _toggleProductStatus: async (productId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/products/${productId}/toggle-status`,
      {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getProductAnalytics: async (productId, period = "month") => {
    const response = await fetch(
      `${API_BASE_URL}/api/products/${productId}/analytics?period=${period}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _bulkUpdateProducts: async (productIds, updateData) => {
    const response = await fetch(`${API_BASE_URL}/api/products/bulk-update`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ productIds, updateData }),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getMyProducts: async (params = {}) => {
    const result = await manageProductsAPI._getMyProducts(params);
    return result.data;
  },

  toggleProductStatus: async (productId) => {
    const result = await manageProductsAPI._toggleProductStatus(productId);
    return result.data;
  },

  getProductAnalytics: async (productId, period = "month") => {
    const result = await manageProductsAPI._getProductAnalytics(
      productId,
      period
    );
    return result.data;
  },

  bulkUpdateProducts: async (productIds, updateData) => {
    const result = await manageProductsAPI._bulkUpdateProducts(
      productIds,
      updateData
    );
    return result.data;
  },
};

// =================== PRODUCT LIST API ===================
export const productListAPI = {
  // Full response functions
  _getStoreProducts: async (storeId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/products?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getProductCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getStoreProducts: async (storeId, params = {}) => {
    const result = await productListAPI._getStoreProducts(storeId, params);
    return result.data;
  },

  getProductCategories: async () => {
    const result = await productListAPI._getProductCategories();
    return result.data;
  },
};

// =================== STORE LIST API ===================
export const storeListAPI = {
  // Full response functions
  _getAllStores: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/api/stores?${queryString}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getAllStores: async (params = {}) => {
    const result = await storeListAPI._getAllStores(params);
    return result.data;
  },
};

// =================== CREATE STORE API ===================
export const createStoreAPI = {
  // Full response functions
  _getCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _createStore: async (storeData) => {
    // storeData should be FormData for file uploads
    const response = await fetch(`${API_BASE_URL}/api/stores`, {
      method: "POST",
      credentials: "include",
      body: storeData, // FormData, don't set Content-Type header
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getCategories: async () => {
    const result = await createStoreAPI._getCategories();
    return result.data;
  },

  createStore: async (storeData) => {
    const result = await createStoreAPI._createStore(storeData);
    return result.data;
  },
};

// =================== PAYMENTS API ===================
export const paymentsAPI = {
  // Full response functions
  _payhereIntent: async (orderData) => {
    const response = await fetch(
      `${API_BASE_URL}/api/payments/payhere-intent`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      }
    );
    return handleResponse(response);
  },

  _bankTransferIntent: async (orderData) => {
    const response = await fetch(
      `${API_BASE_URL}/api/payments/bank-transfer-intent`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      }
    );
    return handleResponse(response);
  },

  _codIntent: async (orderData) => {
    const response = await fetch(`${API_BASE_URL}/api/payments/cod-intent`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(orderData),
    });
    return handleResponse(response);
  },

  _confirm: async (paymentId, data) => {
    const response = await fetch(
      `${API_BASE_URL}/api/payments/${paymentId}/confirm`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  _getMethods: async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/payments/payment-methods`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getBankTransferPreview: async (orderData) => {
    const response = await fetch(
      `${API_BASE_URL}/api/payments/bank-transfer-preview`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  initialize: async (orderData, paymentMethod) => {
    if (paymentMethod === "payhere") {
      const result = await paymentsAPI._payhereIntent(orderData);
      return result.data;
    } else if (paymentMethod === "bank_transfer") {
      const result = await paymentsAPI._bankTransferIntent(orderData);
      return result.data;
    } else if (paymentMethod === "cod") {
      const result = await paymentsAPI._codIntent(orderData);
      return result.data;
    } else {
      const result = await paymentsAPI._initialize(orderData);
      return result.data;
    }
  },

  confirm: async (paymentId, data) => {
    const result = await paymentsAPI._confirm(paymentId, data);
    return result.data;
  },

  getMethods: async () => {
    const result = await paymentsAPI._getMethods();
    return result.data;
  },

  getBankTransferPreview: async (orderData) => {
    const result = await paymentsAPI._getBankTransferPreview(orderData);
    return result.data;
  },
};

// =================== CHECKOUT API ===================
export const checkoutAPI = {
  // Full response functions
  _process: async (checkoutData) => {
    const response = await fetch(`${API_BASE_URL}/api/checkout/process`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(checkoutData),
    });
    return handleResponse(response);
  },

  _validate: async (checkoutData) => {
    const response = await fetch(`${API_BASE_URL}/api/checkout/validate`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(checkoutData),
    });
    return handleResponse(response);
  },

  _applyPromoCode: async (code, orderData) => {
    const response = await fetch(`${API_BASE_URL}/api/checkout/promo-code`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, ...orderData }),
    });
    return handleResponse(response);
  },

  _calculateShipping: async (orderData) => {
    const response = await fetch(
      `${API_BASE_URL}/api/checkout/calculate-shipping`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  process: async (checkoutData) => {
    const result = await checkoutAPI._process(checkoutData);
    return result.data;
  },

  validate: async (checkoutData) => {
    const result = await checkoutAPI._validate(checkoutData);
    return result.data;
  },

  applyPromoCode: async (code, orderData) => {
    const result = await checkoutAPI._applyPromoCode(code, orderData);
    return result.data;
  },

  calculateShipping: async (orderData) => {
    const result = await checkoutAPI._calculateShipping(orderData);
    return result.data;
  },
};

// =================== DASHBOARD API ===================
export const dashboardAPI = {
  // Full response functions
  _getStats: async (storeId, period = "month") => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/dashboard?period=${period}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getDashboardData: async (storeId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/dashboard-data`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getEarnings: async (storeId, period = "month") => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/earnings?period=${period}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getSalesData: async (storeId, period = "month") => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/sales?period=${period}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getCustomerData: async (storeId, period = "month") => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/customers?period=${period}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getTopProducts: async (storeId, period = "month") => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/top-products?period=${period}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getRecentOrders: async (storeId, limit = 10) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/recent-orders?limit=${limit}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getInventoryAlerts: async (storeId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/inventory-alerts`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _exportSales: async (storeId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/stores/${storeId}/export-sales?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getStats: async (storeId, period = "month") => {
    const result = await dashboardAPI._getStats(storeId, period);
    return result.data;
  },

  getDashboardData: async (storeId) => {
    const result = await dashboardAPI._getDashboardData(storeId);
    return result.data;
  },

  getEarnings: async (storeId, period = "month") => {
    const result = await dashboardAPI._getEarnings(storeId, period);
    return result.data;
  },

  getSalesData: async (storeId, period = "month") => {
    const result = await dashboardAPI._getSalesData(storeId, period);
    return result.data;
  },

  getCustomerData: async (storeId, period = "month") => {
    const result = await dashboardAPI._getCustomerData(storeId, period);
    return result.data;
  },

  getTopProducts: async (storeId, period = "month") => {
    const result = await dashboardAPI._getTopProducts(storeId, period);
    return result.data;
  },

  getRecentOrders: async (storeId, limit = 10) => {
    const result = await dashboardAPI._getRecentOrders(storeId, limit);
    return result.data;
  },

  getInventoryAlerts: async (storeId) => {
    const result = await dashboardAPI._getInventoryAlerts(storeId);
    return result.data;
  },

  exportSales: async (storeId, params = {}) => {
    const result = await dashboardAPI._exportSales(storeId, params);
    return result.data;
  },
};

// =================== PROFILE API ===================
export const profileAPI = {
  // Full response functions
  _getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _updateProfile: async (data) => {
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: "PUT",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  _getVerificationStatus: async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/users/verification-status`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _uploadVerification: async (data) => {
    const response = await fetch(
      `${API_BASE_URL}/api/users/upload-verification`,
      {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getProfile: async () => {
    const result = await profileAPI._getProfile();
    return result.data;
  },

  updateProfile: async (data) => {
    const result = await profileAPI._updateProfile(data);
    return result.data;
  },

  getVerificationStatus: async () => {
    const result = await profileAPI._getVerificationStatus();
    return result.data;
  },

  uploadVerification: async (data) => {
    const result = await profileAPI._uploadVerification(data);
    return result.data;
  },
};

// =================== PLATFORM API ===================
export const platformAPI = {
  // Full response functions
  _getSettings: async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/platform-settings`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _updateSettings: async (settings) => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/platform-settings`,
      {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      }
    );
    return handleResponse(response);
  },

  _getSystemInfo: async () => {
    const response = await fetch(`${API_BASE_URL}/api/admin/system-info`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  _testConfiguration: async (config) => {
    const response = await fetch(`${API_BASE_URL}/api/admin/test-config`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getSettings: async () => {
    const result = await platformAPI._getSettings();
    return result.data;
  },

  updateSettings: async (settings) => {
    const result = await platformAPI._updateSettings(settings);
    return result.data;
  },

  getSystemInfo: async () => {
    const result = await platformAPI._getSystemInfo();
    return result.data;
  },

  testConfiguration: async (config) => {
    const result = await platformAPI._testConfiguration(config);
    return result.data;
  },
};

// =================== ANALYTICS API ===================
export const analyticsAPI = {
  // Full response functions
  _getAnalytics: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/analytics?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getRevenueData: async (period = "month") => {
    const response = await fetch(
      `${API_BASE_URL}/api/analytics/revenue?period=${period}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getUserGrowth: async (period = "month") => {
    const response = await fetch(
      `${API_BASE_URL}/api/analytics/users?period=${period}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getOrderMetrics: async (period = "month") => {
    const response = await fetch(
      `${API_BASE_URL}/api/analytics/orders?period=${period}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getTopProducts: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/analytics/products/top?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _getStorePerformance: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/analytics/stores?${queryString}`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  _exportAnalytics: async (params = {}) => {
    const response = await fetch(`${API_BASE_URL}/api/analytics/export`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  getAnalytics: async (params = {}) => {
    const result = await analyticsAPI._getAnalytics(params);
    return result.data;
  },

  getRevenueData: async (period = "month") => {
    const result = await analyticsAPI._getRevenueData(period);
    return result.data;
  },

  getUserGrowth: async (period = "month") => {
    const result = await analyticsAPI._getUserGrowth(period);
    return result.data;
  },

  getOrderMetrics: async (period = "month") => {
    const result = await analyticsAPI._getOrderMetrics(period);
    return result.data;
  },

  getTopProducts: async (params = {}) => {
    const result = await analyticsAPI._getTopProducts(params);
    return result.data;
  },

  getStorePerformance: async (params = {}) => {
    const result = await analyticsAPI._getStorePerformance(params);
    return result.data;
  },

  exportAnalytics: async (params = {}) => {
    const result = await analyticsAPI._exportAnalytics(params);
    return result.data;
  },
};

// =================== EMAIL SUBSCRIPTIONS API ===================
export const emailSubscriptionsAPI = {
  // Full response functions
  _subscribe: async (email) => {
    const response = await fetch(`${API_BASE_URL}/api/subscriptions/email`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  _unsubscribe: async (email) => {
    const response = await fetch(`${API_BASE_URL}/api/subscriptions/email`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  // Data-only wrapper functions
  subscribe: async (email) => {
    const result = await emailSubscriptionsAPI._subscribe(email);
    return result.data;
  },

  unsubscribe: async (email) => {
    const result = await emailSubscriptionsAPI._unsubscribe(email);
    return result.data;
  },
};
