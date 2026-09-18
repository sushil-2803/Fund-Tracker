const baseUrl =
  window.location.hostname === '192.168.1.57'
    ? import.meta.env.VITE_LOCAL_API_BASE_URL
    : import.meta.env.VITE_API_BASE_URL;

const BASE = (baseUrl || '/api').replace(/\/$/, '');

// ── Token storage ─────────────────────────────────────────────────────────────
// Access token: JS memory only (cleared on page refresh — intentional)
// Refresh token: localStorage (persists sessions across page loads)
let _accessToken = null;

export function setAccessToken(t)  { _accessToken = t; }
export function getAccessToken()   { return _accessToken; }
export function clearTokens() {
  _accessToken = null;
  localStorage.removeItem('refresh_token');
}
export function getRefreshToken()  { return localStorage.getItem('refresh_token'); }
export function setRefreshToken(t) { localStorage.setItem('refresh_token', t); }

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function request(method, path, body, retry = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);

  // Access token expired → try silent refresh once, then retry original request
  if (res.status === 401 && retry) {
    const data = await res.json().catch(() => ({}));
    if (data.code === 'TOKEN_EXPIRED') {
      const ok = await tryRefresh();
      if (ok) return request(method, path, body, false);
    }
    clearTokens();
    window.dispatchEvent(new Event('auth:logout'));
    throw new Error(data.error || 'Session expired. Please sign in again.');
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

// ── Silent refresh ────────────────────────────────────────────────────────────
export async function tryRefresh() {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.access_token);
    setRefreshToken(data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

// ── API surface ───────────────────────────────────────────────────────────────
export const api = {
  auth: {
    // Exchange a Google ID token for our JWT pair
    googleLogin: (id_token) => request('POST', '/auth/google',  { id_token }),
    logout:      (refresh_token) => request('POST', '/auth/logout', { refresh_token }),
    refresh:     () => tryRefresh(),
    me:          () => request('GET',  '/auth/me'),
  },

  dashboard: {
    summary: () => request('GET', '/dashboard/summary'),
    tags:    () => request('GET', '/dashboard/tags'),
  },

  incomes: {
    list:   (p = {}) => { const qs = new URLSearchParams(p).toString(); return request('GET', `/incomes${qs ? '?' + qs : ''}`); },
    get:    (id)     => request('GET',    `/incomes/${id}`),
    create: (b)      => request('POST',   '/incomes', b),
    update: (id, b)  => request('PUT',    `/incomes/${id}`, b),
    delete: (id)     => request('DELETE', `/incomes/${id}`),
  },

  expenses: {
    list:   (p = {}) => { const qs = new URLSearchParams(p).toString(); return request('GET', `/expenses${qs ? '?' + qs : ''}`); },
    get:    (id)     => request('GET',    `/expenses/${id}`),
    create: (b)      => request('POST',   '/expenses', b),
    update: (id, b)  => request('PUT',    `/expenses/${id}`, b),
    delete: (id)     => request('DELETE', `/expenses/${id}`),
  },

  allocations: {
    list:   (p = {}) => { const qs = new URLSearchParams(p).toString(); return request('GET', `/allocations${qs ? '?' + qs : ''}`); },
    create: (b)      => request('POST',   '/allocations', b),
    createBulk: (allocations) => request('POST', '/allocations/bulk', { allocations }),
    delete: (id)     => request('DELETE', `/allocations/${id}`),
  },
};
