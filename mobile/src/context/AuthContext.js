import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import {
  api,
  setStoredAccessToken,
  setStoredRefreshToken,
  getStoredRefreshToken,
  clearSecureStoreAndCache,
  setLogoutListener,
} from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Setup auto-logout callback from client interceptor
  useEffect(() => {
    setLogoutListener(() => {
      setUser(null);
    });
  }, []);

  // Initialize Google Sign-In configuration at runtime
  useEffect(() => {
    try {
      if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

        const isWebConfigured = webClientId && !webClientId.startsWith('REPLACE_WITH');
        const isIosConfigured = iosClientId && !iosClientId.startsWith('REPLACE_WITH');

        if (isWebConfigured || (Platform.OS === 'ios' && isIosConfigured)) {
          GoogleSignin.configure({
            scopes: ['profile', 'email'],
            webClientId: isWebConfigured ? webClientId : undefined,
            iosClientId: Platform.OS === 'ios' && isIosConfigured ? iosClientId : undefined,
            offlineAccess: true,
            forceCodeForRefreshToken: true,
          });
        }
      }
    } catch (err) {
      console.log('GoogleSignin configuration skipped or unavailable in current environment:', err.message);
    }
  }, []);

  // Restore Session on App Launch from SecureStore
  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const rt = await getStoredRefreshToken();
      if (!rt) {
        setIsLoading(false);
        return;
      }

      const refreshRes = await api.auth.refresh(rt);
      if (refreshRes && refreshRes.access_token) {
        await setStoredAccessToken(refreshRes.access_token);
        if (refreshRes.refresh_token) {
          await setStoredRefreshToken(refreshRes.refresh_token);
        }
        const profile = await api.auth.me();
        setUser(profile);
      } else {
        await clearSecureStoreAndCache();
        setUser(null);
      }
    } catch (err) {
      console.warn('Session restore failed:', err.message);
      await clearSecureStoreAndCache();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Login with Google ID token
  const loginWithGoogleToken = async (idToken) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await api.auth.googleLogin(idToken);
      if (res.access_token && res.refresh_token) {
        if (user?.id && res.user?.id && user.id !== res.user.id) {
          await clearSecureStoreAndCache();
        }
        await setStoredAccessToken(res.access_token);
        await setStoredRefreshToken(res.refresh_token);
        setUser(res.user);
        return res.user;
      }
      throw new Error('Invalid response from authentication server');
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Trigger Google Sign-In Native Modal
  const signInWithGoogle = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      if (!webClientId || webClientId.startsWith('REPLACE_WITH')) {
        throw new Error(
          'Google Sign-In is not configured yet (placeholder Client ID). Please use "Explore Demo Mode" or add real credentials to mobile/.env.'
        );
      }

      if (GoogleSignin && typeof GoogleSignin.hasPlayServices === 'function') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data?.idToken || userInfo.idToken;
        if (!idToken) {
          throw new Error('Could not obtain Google ID Token from device');
        }
        return await loginWithGoogleToken(idToken);
      } else {
        throw new Error('Google Sign-In native module is not available (requires custom dev build or release build).');
      }
    } catch (error) {
      if (error.code === statusCodes?.SIGN_IN_CANCELLED) {
        console.log('User cancelled Google sign in');
      } else if (error.code === statusCodes?.IN_PROGRESS) {
        console.log('Sign in already in progress');
      } else if (error.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        setAuthError('Google Play Services not available on device');
      } else {
        setAuthError(error.message || 'Google Sign-In failed');
      }
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Demo sign-in for development connected to backend database
  const signInWithDemo = async (email = 'demo@fundtracker.app') => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await api.auth.demoLogin(email);
      if (res.access_token && res.refresh_token) {
        if (user?.id && res.user?.id && user.id !== res.user.id) {
          await clearSecureStoreAndCache();
        }
        await setStoredAccessToken(res.access_token);
        await setStoredRefreshToken(res.refresh_token);
        setUser(res.user);
        return res.user;
      }
      throw new Error('Failed to start demo session');
    } catch (err) {
      console.warn('Demo login via API failed, using local offline demo:', err.message);
      const fallbackUser = {
        id: 'demo-local-001',
        name: 'Demo User (Offline)',
        email: 'demo@fundtracker.app',
        avatar_url: 'https://ui-avatars.com/api/?name=Demo+User&background=6c8ff7&color=fff',
        created_at: new Date().toISOString(),
      };
      setUser(fallbackUser);
      return fallbackUser;
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Direct login helper for tests/custom flows
  const directLogin = async (userData, accessToken, refreshToken) => {
    if (user?.id && userData?.id && user.id !== userData.id) {
      await clearSecureStoreAndCache();
    }
    if (accessToken) await setStoredAccessToken(accessToken);
    if (refreshToken) await setStoredRefreshToken(refreshToken);
    setUser(userData);
  };

  // Sign out (clears SecureStore and React Query cache)
  const logout = async () => {
    try {
      const rt = await getStoredRefreshToken();
      if (rt) {
        await api.auth.logout(rt).catch(() => {});
      }
      if (GoogleSignin && typeof GoogleSignin.signOut === 'function') {
        await GoogleSignin.signOut().catch(() => {});
      }
    } catch (err) {
      console.warn('Logout cleanup error:', err);
    } finally {
      await clearSecureStoreAndCache();
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await api.auth.me();
      setUser(profile);
      return profile;
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticating,
        authError,
        signInWithGoogle,
        signInWithDemo,
        loginWithGoogleToken,
        directLogin,
        logout,
        refreshProfile,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
