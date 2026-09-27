import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { queryClient } from './queryClient';

const ACCESS_TOKEN_KEY = 'fundtracker_access_token';
const REFRESH_TOKEN_KEY = 'fundtracker_refresh_token';

// ── Environment & Production URL Security ─────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

function sanitizeBaseUrl(url) {
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

export function validateApiUrl(rawUrl) {
  const url = sanitizeBaseUrl(rawUrl);

  if (isProduction) {
    if (!url) {
      throw new Error(
        'Production configuration error: EXPO_PUBLIC_API_BASE_URL is missing. Production builds strictly require a secure HTTPS API endpoint.'
      );
    }
    if (!url.startsWith('https://')) {
      throw new Error(
        `Production security violation: Insecure API URL (${url}). Production builds strictly require HTTPS and never allow unencrypted HTTP connections.`
      );
    }
  }

  return url || 'http://localhost:3001';
}

// Initial Base URL resolution
const rawEnvUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
let currentHost = validateApiUrl(rawEnvUrl);
let currentApiUrl = `${currentHost}/api`;

// ── SecureStore Token Helpers ─────────────────────────────────────────────────
export async function getStoredAccessToken() {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (e) {
    console.warn('SecureStore error reading access token:', e);
    return null;
  }
}

export async function setStoredAccessToken(token) {
  try {
    if (token) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    }
  } catch (e) {
    console.warn('SecureStore error writing access token:', e);
  }
}

export async function getStoredRefreshToken() {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (e) {
    console.warn('SecureStore error reading refresh token:', e);
    return null;
  }
}

export async function setStoredRefreshToken(token) {
  try {
    if (token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (e) {
    console.warn('SecureStore error writing refresh token:', e);
  }
}

let logoutListener = null;
export function setLogoutListener(callback) {
  logoutListener = callback;
}

/**
 * Completely clears SecureStore credentials and TanStack Query cache.
 */
export async function clearSecureStoreAndCache() {
  await Promise.all([
    setStoredAccessToken(null),
    setStoredRefreshToken(null),
  ]);
  queryClient.clear();
  if (logoutListener) {
    logoutListener();
  }
}

// ── Axios Instance ────────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: currentApiUrl,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export function setApiBaseUrl(newHost) {
  if (!newHost) return;
  currentHost = validateApiUrl(newHost);
  currentApiUrl = `${currentHost}/api`;
  apiClient.defaults.baseURL = currentApiUrl;
}

export function getApiBaseUrl() {
  return currentApiUrl;
}

export function getApiHost() {
  return currentHost;
}

// ── Request Interceptor (Bearer Token) ────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getStoredAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor with Shared Refresh Promise ──────────────────────────
let refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid refreshing when calling auth endpoints itself
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/google') || originalRequest.url?.includes('/auth/demo')) {
        await clearSecureStoreAndCache();
        return Promise.reject(error.response?.data || error);
      }

      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshToken = await getStoredRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            // Raw axios call to bypass interceptors loop
            const refreshResponse = await axios.post(
              `${currentApiUrl}/auth/refresh`,
              { refresh_token: refreshToken },
              { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
            );

            const { access_token, refresh_token: newRefreshToken } = refreshResponse.data;
            if (!access_token) {
              throw new Error('No access token returned from refresh endpoint');
            }

            await setStoredAccessToken(access_token);
            if (newRefreshToken) {
              await setStoredRefreshToken(newRefreshToken);
            }

            return access_token;
          } catch (refreshErr) {
            await clearSecureStoreAndCache();
            throw refreshErr;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      try {
        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        const retriedResponse = await axios(originalRequest);
        return retriedResponse.data;
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
