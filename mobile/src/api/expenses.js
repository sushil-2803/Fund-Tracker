import apiClient from './client';

export const expensesApi = {
  list: (params = {}) => apiClient.get('/expenses', { params }),
  get: (id) => apiClient.get(`/expenses/${id}`),
  create: (data) => apiClient.post('/expenses', data),
  update: (id, data) => apiClient.put(`/expenses/${id}`, data),
  delete: (id) => apiClient.delete(`/expenses/${id}`),
};

export default expensesApi;
