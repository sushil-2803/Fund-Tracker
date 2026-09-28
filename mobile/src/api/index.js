import { authApi } from './auth';
import { incomesApi } from './incomes';
import { expensesApi } from './expenses';
import { allocationsApi } from './allocations';
import { dashboardApi } from './dashboard';
import apiClient, {
  setApiBaseUrl,
  getApiBaseUrl,
  getApiHost,
  validateApiUrl,
  clearSecureStoreAndCache,
  getStoredAccessToken,
  setStoredAccessToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
  setLogoutListener,
} from './client';
import { queryClient } from './queryClient';

export const api = {
  auth: authApi,
  incomes: incomesApi,
  expenses: expensesApi,
  allocations: allocationsApi,
  dashboard: dashboardApi,
};

export {
  apiClient,
  queryClient,
  authApi,
  incomesApi,
  expensesApi,
  allocationsApi,
  dashboardApi,
  setApiBaseUrl,
  getApiBaseUrl,
  getApiHost,
  validateApiUrl,
  clearSecureStoreAndCache,
  getStoredAccessToken,
  setStoredAccessToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
  setLogoutListener,
};

export default api;
