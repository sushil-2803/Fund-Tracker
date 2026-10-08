import apiClient from './client';
export const savingsApi = {
  list: () => apiClient.get('/savings'),
  create: (body) => apiClient.post('/savings', body),
};
export default savingsApi;
