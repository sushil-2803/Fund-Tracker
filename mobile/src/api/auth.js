import apiClient from './client';

export const authApi = {
  /** Sign in with Google ID token */
  googleLogin: (idToken) => apiClient.post('/auth/google', { id_token: idToken }),

  /** Sign in with Demo mode (Development / Testing) */
  demoLogin: (email = 'demo@fundtracker.app') => apiClient.post('/auth/demo', { email }),

  /** Refresh access token using refresh token */
  refresh: (refreshToken) => apiClient.post('/auth/refresh', { refresh_token: refreshToken }),

  /** Revoke token and log out */
  logout: (refreshToken) => apiClient.post('/auth/logout', { refresh_token: refreshToken }),

  /** Fetch currently authenticated user profile */
  me: () => apiClient.get('/auth/me'),
};

export default authApi;
