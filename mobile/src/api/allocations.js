import apiClient from './client';

export const allocationsApi = {
  list: (params = {}) => apiClient.get('/allocations', { params }),
  create: (data) => apiClient.post('/allocations', data),
  createBulk: (allocations) => apiClient.post('/allocations/bulk', { allocations }),
  delete: (id) => apiClient.delete(`/allocations/${id}`),
};

export default allocationsApi;
