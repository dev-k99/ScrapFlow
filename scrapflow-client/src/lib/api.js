import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5010',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sf_token')
      localStorage.removeItem('sf_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const authApi = {
  login: (dto) => api.post('/api/auth/login', dto),
  register: (dto) => api.post('/api/auth/register', dto),
}

// Dashboard
export const dashboardApi = {
  get: (siteId) => api.get('/api/dashboard', { params: { siteId } }),
}

// Suppliers
export const suppliersApi = {
  getAll: (search) => api.get('/api/suppliers', { params: { search } }),
  getById: (id) => api.get(`/api/suppliers/${id}`),
  create: (dto) => api.post('/api/suppliers', dto),
  update: (id, dto) => api.put(`/api/suppliers/${id}`, dto),
  verify: (id) => api.post(`/api/suppliers/${id}/verify`),
}

// Materials
export const materialsApi = {
  getAll: () => api.get('/api/materials'),
  getById: (id) => api.get(`/api/materials/${id}`),
  updateDailyPrices: (prices) => api.post('/api/materials/daily-prices', prices),
  getMargins: () => api.get('/api/materials/margins'),
}

// Inbound Tickets
export const inboundApi = {
  getAll: (params) => api.get('/api/tickets/inbound', { params }),
  getById: (id) => api.get(`/api/tickets/inbound/${id}`),
  create: (dto) => api.post('/api/tickets/inbound', dto),
  recordGrossWeight: (id, dto) => api.put(`/api/tickets/inbound/${id}/gross-weight`, dto),
  recordGrading: (id, dto) => api.put(`/api/tickets/inbound/${id}/grading`, dto),
  recordTareWeight: (id, dto) => api.put(`/api/tickets/inbound/${id}/tare-weight`, dto),
  recordPayment: (id, dto) => api.put(`/api/tickets/inbound/${id}/payment`, dto),
  complete: (id, dto) => api.put(`/api/tickets/inbound/${id}/complete`, dto),
  cancel: (id) => api.put(`/api/tickets/inbound/${id}/cancel`),
  uploadPhoto: (id, formData) =>
    api.post(`/api/tickets/inbound/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

// Outbound Tickets
export const outboundApi = {
  getAll: (params) => api.get('/api/tickets/outbound', { params }),
  getById: (id) => api.get(`/api/tickets/outbound/${id}`),
  create: (dto) => api.post('/api/tickets/outbound', dto),
  recordGrossWeight: (id, dto) => api.put(`/api/tickets/outbound/${id}/gross-weight`, dto),
  recordGrading: (id, dto) => api.put(`/api/tickets/outbound/${id}/grading`, dto),
  recordTareWeight: (id, dto) => api.put(`/api/tickets/outbound/${id}/tare-weight`, dto),
  complete: (id, dto) => api.put(`/api/tickets/outbound/${id}/complete`, dto),
}

// Inventory
export const inventoryApi = {
  getLots: (params) => api.get('/api/inventory', { params }),
  getLotById: (id) => api.get(`/api/inventory/${id}`),
  adjustLot: (id, dto) => api.put(`/api/inventory/${id}/adjust`, dto),
  writeOff: (id, dto) => api.put(`/api/inventory/${id}/write-off`, dto),
}

// Reports
export const reportsApi = {
  getAll: () => api.get('/api/reports/itac'),
  generate: (year, month) => api.post('/api/reports/itac/generate', { year, month }),
  getById: (id) => api.get(`/api/reports/itac/${id}`),
  submit: (id) => api.post(`/api/reports/itac/${id}/submit`),
  downloadCsv: (id) => api.get(`/api/reports/itac/${id}/csv`, { responseType: 'blob' }),
}

// Sites
export const sitesApi = {
  getAll: () => api.get('/api/sites'),
  getById: (id) => api.get(`/api/sites/${id}`),
  create: (dto) => api.post('/api/sites', dto),
}

// Customers
export const customersApi = {
  getAll: (search) => api.get('/api/customers', { params: { search } }),
  getById: (id) => api.get(`/api/customers/${id}`),
  create: (dto) => api.post('/api/customers', dto),
}

// Users (admin)
export const usersApi = {
  getAll: () => api.get('/api/users'),
  deactivate: (id) => api.put(`/api/users/${id}/deactivate`),
}

export default api