import axios from 'axios';

export const API_URL = 'https://web-production-5d8c.up.railway.app/api';

// Axios instance oluşturma
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Her istekte token'ı header'a ekler
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor: Hata durumlarını yakalar
api.interceptors.response.use(
  response => {
    // İstek başarılı ise, direkt response'u döndür
    return response;
  },
  error => {
    // 401 Unauthorized hatası olduğunda kullanıcıyı logout yap
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Endpoint Fonksiyonları
const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
};

const requestAPI = {
  createRequest: (requestData) => api.post('/requests', requestData),
  getMyRequests: () => api.get('/requests/my-requests'),
  getPendingRequests: () => api.get('/requests/pending'),
  getApprovedRequests: () => api.get('/requests/approved'),
  getOrderedRequests: () => api.get('/requests/ordered'),
  getDeliveredRequests: () => api.get('/requests/delivered'),
  getProductionRequests: () => api.get('/requests/production'),
  updateStatus: (id, statusData) => api.put(`/requests/${id}/status`, statusData),
  deliverRequest: (id, deliveryData) => api.put(`/requests/${id}/deliver`, deliveryData),
  deleteRequest: (id) => api.delete(`/requests/${id}`),
  updateRequest: (id, requestData) => api.put(`/requests/${id}`, requestData),
};

// Sipariş API
const orderAPI = {
  createOrder: (orderData) => api.post('/orders', orderData),
  getMyOrders: () => api.get('/orders/my-orders'),
  getOrderById: (id) => api.get(`/orders/${id}`),
  getPendingOrders: () => api.get('/orders/pending'),
};

// Satış ve Pazarlama API
const salesAPI = {
  createSalesRequest: (requestData) => api.post('/sales', requestData),
  getMySalesRequests: () => api.get('/sales/my-requests'),
  getPendingSalesRequests: () => api.get('/sales/pending'),
  getProcessingSalesRequests: () => api.get('/sales/processing'),
  getSalesRequestById: (id) => api.get(`/sales/${id}`),
  convertToProductionRequest: (id) => api.post(`/sales/${id}/convert`),
  uploadFiles: (salesRequestId, formData) => {
    return api.post(`/attachments/upload-multiple?salesRequestId=${salesRequestId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

// Ek API
const attachmentAPI = {
  uploadFile: (file, requestId, salesRequestId) => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (requestId) {
      formData.append('requestId', requestId);
    }
    
    if (salesRequestId) {
      formData.append('salesRequestId', salesRequestId);
    }
    
    return api.post('/attachments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  uploadFiles: (requestId, formData) => {
    // RequestId varsa query param olarak ekleyelim
    const url = requestId ? `/attachments/upload-multiple?requestId=${requestId}` : '/attachments/upload-multiple';
    
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  getAttachmentsByRequestId: (requestId) => api.get(`/attachments/request/${requestId}`),
  getAttachmentsBySalesRequestId: (salesRequestId) => api.get(`/attachments/sales/${salesRequestId}`),
  deleteAttachment: (attachmentId) => api.delete(`/attachments/${attachmentId}`),
};

export { api, authAPI, requestAPI, orderAPI, salesAPI, attachmentAPI };
export default api;