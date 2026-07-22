import { apiFetch } from '@shared/utils/apiClient';

export const apiService = {
  // Admin Auth
  login: (credentials: any) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ ...credentials, role: 'super_admin' }) }),
  getProfile: () => apiFetch('/api/auth/me'),

  // Products & Categories
  getProducts: () => apiFetch('/api/products'),
  createProduct: (data: any) => apiFetch('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string | number, data: any) => apiFetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string | number) => apiFetch(`/api/products/${id}`, { method: 'DELETE' }),

  getCategories: () => apiFetch('/api/products/categories'),
  createCategory: (name: string) => apiFetch('/api/products/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  updateCategory: (id: string | number, name: string) => apiFetch(`/api/products/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteCategory: (id: string | number) => apiFetch(`/api/products/categories/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: () => apiFetch('/api/orders'),
  updateOrderStatus: (id: string | number, data: any) => apiFetch(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id: string | number) => apiFetch(`/api/orders/${id}`, { method: 'DELETE' }),

  // Store Settings & Shipments
  getStoreSettings: () => apiFetch('/api/admin/store-settings'),
  updateStoreSetting: (key: string, value: any) => apiFetch('/api/admin/store-settings', { method: 'POST', body: JSON.stringify({ key, value }) }),
  createShipment: (shipmentData: any) => apiFetch('/api/shipments/create-shipment', { method: 'POST', body: JSON.stringify(shipmentData) }),
  getNotifyRequests: () => apiFetch('/api/admin/notify-requests'),
};
