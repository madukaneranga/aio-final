const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = {
  // Auth endpoints
  auth: {
    login: (credentials) => 
      fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json',
                    'Access-Control-Allow-Origin':'*',
                    'Access-Control-Allow-Methods':'POST,PATCH,OPTIONS' },
        body: JSON.stringify(credentials)
      }),
    
    register: (userData) =>
      fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      }),
    
    me: (token) =>
      fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
    
    googleAuth: (token) =>
      fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
  },

  // Store endpoints
  stores: {
    getAll: (params = '') =>
      fetch(`${API_BASE_URL}/api/stores?${params}`),
    
    getById: (id) =>
      fetch(`${API_BASE_URL}/api/stores/${id}`),
    
    create: (formData, token) =>
      fetch(`${API_BASE_URL}/api/stores`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      }),
    
    update: (id, formData, token) =>
      fetch(`${API_BASE_URL}/api/stores/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      }),
    
    getFeatured: () =>
      fetch(`${API_BASE_URL}/api/stores/featured/list`)
  },

  // Product endpoints
  products: {
    getAll: (params = '') =>
      fetch(`${API_BASE_URL}/api/products?${params}`),
    
    getById: (id) =>
      fetch(`${API_BASE_URL}/api/products/${id}`),
    
    create: (formData, token) =>
      fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      }),
    
    update: (id, formData, token) =>
      fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      }),
    
    delete: (id, token) =>
      fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
  },

  // Service endpoints
  services: {
    getAll: (params = '') =>
      fetch(`${API_BASE_URL}/api/services?${params}`),
    
    getById: (id) =>
      fetch(`${API_BASE_URL}/api/services/${id}`),
    
    create: (formData, token) =>
      fetch(`${API_BASE_URL}/api/services`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      }),
    
    update: (id, formData, token) =>
      fetch(`${API_BASE_URL}/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      }),
    
    delete: (id, token) =>
      fetch(`${API_BASE_URL}/api/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
  },

  // Order endpoints
  orders: {
    getCustomerOrders: (token) =>
      fetch(`${API_BASE_URL}/api/orders/customer`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
    
    getStoreOrders: (token) =>
      fetch(`${API_BASE_URL}/api/orders/store`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
    
    getById: (id, token) =>
      fetch(`${API_BASE_URL}/api/orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
    
    updateStatus: (id, status, token, trackingNumber = '') =>
      fetch(`${API_BASE_URL}/api/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, trackingNumber })
      })
  },

  // Booking endpoints
  bookings: {
    getCustomerBookings: (token) =>
      fetch(`${API_BASE_URL}/api/bookings/customer`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
    
    getStoreBookings: (token) =>
      fetch(`${API_BASE_URL}/api/bookings/store`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
    
    getById: (id, token) =>
      fetch(`${API_BASE_URL}/api/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
    
    updateStatus: (id, status, token) =>
      fetch(`${API_BASE_URL}/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })
  },

  // Payment endpoints
  payments: {
    createOrderIntent: (orderData, token) =>
      fetch(`${API_BASE_URL}/api/payments/create-order-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      }),
    
    createBookingIntent: (bookingData, token) =>
      fetch(`${API_BASE_URL}/api/payments/create-booking-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
      })
  },

  // User endpoints
  users: {
    getProfile: (token) =>
      fetch(`${API_BASE_URL}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
    
    updateProfile: (formData, token) =>
      fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
  }
};

export default api;