import apiClient from './client';

export const dashboardApi = {
  summary: () => apiClient.get('/dashboard/summary'),
  tags: () => apiClient.get('/dashboard/tags'),
};

export default dashboardApi;
