import apiClient from './client';

export const incomesApi = {
  list: (params = {}) => apiClient.get('/incomes', { params }),
  get: (id) => apiClient.get(`/incomes/${id}`),
  create: (data) => apiClient.post('/incomes', data),
  update: (id, data) => apiClient.put(`/incomes/${id}`, data),
  delete: (id) => apiClient.delete(`/incomes/${id}`),
};

export default incomesApi;
