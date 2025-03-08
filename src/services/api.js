import axios from 'axios';

const API_URL = 'https://web-production-5d8c.up.railway.app/api';

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
  getDeliveredRequests: () => api.get('/requests/delivered'), // Yeni endpoint
  updateStatus: (id, statusData) => api.put(`/requests/${id}/status`, statusData),
  deliverRequest: (id, deliveryData) => api.put(`/requests/${id}/deliver`, deliveryData),
};

export { api, authAPI, requestAPI };
export default api;