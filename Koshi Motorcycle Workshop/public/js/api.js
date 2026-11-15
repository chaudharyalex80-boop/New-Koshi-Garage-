// Koshi Motorcycle Workshop - Client API Wrapper
const API_BASE = '/api';

async function request(endpoint, options = {}) {
  try {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Request failed with status ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: data }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: data }),

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats'),

  // Inventory
  getInventory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inventory${qs ? '?' + qs : ''}`);
  },
  getInventoryItem: (id) => request(`/inventory/${id}`),
  createInventoryItem: (data) => request('/inventory', { method: 'POST', body: data }),
  updateInventoryItem: (id, data) => request(`/inventory/${id}`, { method: 'PUT', body: data }),
  restockInventoryItem: (id, data) => request(`/inventory/${id}/restock`, { method: 'POST', body: data }),
  adjustInventoryItem: (id, data) => request(`/inventory/${id}/adjust`, { method: 'POST', body: data }),
  deleteInventoryItem: (id) => request(`/inventory/${id}`, { method: 'DELETE' }),
  getCategories: () => request('/inventory/categories'),
  getLowStockItems: () => request('/inventory/low-stock'),

  // Billing & Invoices
  getNextInvoiceNumber: () => request('/billing/next-number'),
  getInvoices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/billing/invoices${qs ? '?' + qs : ''}`);
  },
  getInvoiceDetail: (id) => request(`/billing/invoices/${id}`),
  createInvoice: (data) => request('/billing/invoices', { method: 'POST', body: data }),
  recordInvoicePayment: (id, data) => request(`/billing/invoices/${id}/payment`, { method: 'POST', body: data }),
  voidInvoice: (id) => request(`/billing/invoices/${id}`, { method: 'DELETE' }),

  // Services
  getServices: () => request('/services'),
  createService: (data) => request('/services', { method: 'POST', body: data }),
  updateService: (id, data) => request(`/services/${id}`, { method: 'PUT', body: data }),
  deleteService: (id) => request(`/services/${id}`, { method: 'DELETE' }),

  // Customers & Vehicles
  getCustomers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/customers${qs ? '?' + qs : ''}`);
  },
  getCustomerDetail: (id) => request(`/customers/${id}`),
  getVehicleHistory: (plate) => request(`/vehicles/${encodeURIComponent(plate)}/history`),

  // Reports & Ledger
  getSalesReport: (days = 30) => request(`/reports/sales?days=${days}`),
  getStockLedger: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/stock-ledger${qs ? '?' + qs : ''}`);
  },
  getStockValuation: () => request('/reports/valuation'),

  // Demo Reset
  resetDemoData: () => request('/backup/reset-demo', { method: 'POST' }),
  getBackupDownloadUrl: () => `${API_BASE}/backup/export`
};

window.api = api;

