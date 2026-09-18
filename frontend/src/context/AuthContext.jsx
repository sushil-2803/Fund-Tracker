import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAccessToken, setRefreshToken, getRefreshToken, clearTokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session from localStorage

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    async function restore() {
      const rt = getRefreshToken();
      if (!rt) { setLoading(false); return; }

      const ok = await api.auth.refresh();
      if (ok) {
        try {
          const me = await api.auth.me();
          setUser(me);
        } catch {
          clearTokens();
        }
      } else {
        clearTokens();
      }
      setLoading(false);
    }
    restore();
  }, []);

  // ── Forced logout when access token expires and refresh fails ─────────────
  useEffect(() => {
    const handle = () => setUser(null);
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  /**
   * Called after @react-oauth/google resolves with a credential (Google ID token).
   * Sends it to our backend, which verifies it server-side and returns our JWT pair.
   */
  const loginWithGoogle = useCallback(async (googleIdToken) => {
    const data = await api.auth.googleLogin(googleIdToken);
    setAccessToken(data.access_token);
    setRefreshToken(data.refresh_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.auth.logout(getRefreshToken()); } catch (_) {}
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
