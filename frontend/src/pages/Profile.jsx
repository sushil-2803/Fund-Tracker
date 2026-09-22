import { useAuth } from '../context/AuthContext';
import { fmtDateTime } from '../utils';

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Account</div>
          <div className="page-subtitle">Signed in with Google</div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={logout}>Sign Out</button>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Identity card */}
          <div className="card">
            <div className="card-header"><span className="card-title">Google Account</span></div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--border2)' }}
                  />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'var(--accent-dim)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 700,
                  }}>
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{user?.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{user?.email}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                    <svg width="14" height="14" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>Authenticated via Google</span>
                  </div>
                </div>
              </div>

              <div className="stat-row">
                <span className="stat-row-label">Member Since</span>
                <span style={{ fontSize: 13 }}>{fmtDateTime(user?.created_at)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-row-label">User ID</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
                  {user?.id?.slice(0, 20)}…
                </span>
              </div>
            </div>
          </div>

          {/* Session management */}
          <div className="card">
            <div className="card-header"><span className="card-title">Session</span></div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
                Your session is managed with a secure token that refreshes automatically.
                Sign out to revoke access on this device.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-danger btn-sm" onClick={logout}>
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Data notice */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: 12,
            color: 'var(--text3)',
            lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--text2)' }}>Your data is private.</strong>{' '}
            All incomes, expenses, and allocations are scoped to your account.
            No other user can see your financial data.
          </div>
        </div>
      </div>
    </>
  );
}
