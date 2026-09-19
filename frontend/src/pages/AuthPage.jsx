import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Google's brand colours (required by Google's branding guidelines)
const GOOGLE_BLUE = '#4285F4';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

export default function AuthPage() {
  const { loginWithGoogle } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // useGoogleLogin gives us an access token flow OR token_response flow.
  // We use the "implicit" (credential) flow via GoogleOAuthProvider + useGoogleLogin.
  // @react-oauth/google's useGoogleLogin with flow:'auth-code' gives an auth code
  // that needs a server exchange. Instead we use the one-tap / popup credential flow
  // from GoogleOAuthProvider which gives us an id_token directly.
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      // credentialResponse.credential is the Google ID token (JWT)
      await loginWithGoogle(credentialResponse.credential);
      toast.success('Welcome to FundTracker!');
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60,
            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
            borderRadius: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#fff',
            marginBottom: 16,
            boxShadow: '0 8px 32px rgba(108,143,247,0.35)',
          }}>₹</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
            Fund<span style={{ color: 'var(--accent)' }}>Tracker</span>
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 8 }}>
            Track every rupee. Know where it went.
          </p>
        </div>

        {/* Sign-in card */}
        <div className="card">
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              Sign in securely with your Google account.<br />
              No password to remember.
            </p>

            {/* Google Sign-In button — rendered by us, triggers @react-oauth/google */}
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              loading={loading}
            />

            {error && (
              <div style={{
                marginTop: 16,
                padding: '10px 14px',
                background: 'var(--red-dim)',
                border: '1px solid var(--red)',
                borderRadius: 8,
                color: 'var(--red)',
                fontSize: 13,
                textAlign: 'left',
              }}>
                ⚠ {error}
              </div>
            )}

            <p style={{ marginTop: 24, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
              By signing in, your financial data is private to your account.<br />
              We never share your data.
            </p>
          </div>
        </div>

        {/* Feature hints */}
        <div style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
        }}>
          {[
            { icon: '↓↑', label: 'Track incomes & expenses' },
            { icon: '⇄',  label: 'Link funds to expenses' },
            { icon: '◎',  label: 'Visual analytics' },
          ].map(f => (
            <div key={f.label} style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Styled Google Sign-In button ──────────────────────────────────────────────
// Wraps useGoogleLogin (popup flow) inside a custom-styled button.
function GoogleSignInButton({ onSuccess, onError, loading }) {
  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      // useGoogleLogin with default flow gives us an access_token, not an id_token.
      // We need the id_token. Use the implicit/credential flow instead.
      // This shouldn't be reached in credential flow — see GoogleOneTapButton below.
      onError();
    },
    onError,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      {/* One-tap rendered button from GoogleOAuthProvider */}
      <div id="google-signin-rendered" />
      {/* Custom fallback button using popup flow for id_token */}
      <GooglePopupButton onSuccess={onSuccess} onError={onError} loading={loading} />
    </div>
  );
}

// Uses GoogleLogin component indirectly via manual credential rendering
import { GoogleLogin } from '@react-oauth/google';

function GooglePopupButton({ onSuccess, onError, loading }) {
  return (
    <div style={{ width: '100%' }}>
      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '12px 20px',
          background: 'var(--bg3)', border: '1px solid var(--border2)',
          borderRadius: 10, color: 'var(--text2)', fontSize: 14,
        }}>
          <div className="spinner" style={{ width: 18, height: 18 }} />
          Signing in…
        </div>
      ) : (
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          useOneTap={false}
          theme="filled_black"
          size="large"
          width="356"
          text="signin_with"
          shape="rectangular"
          logo_alignment="left"
        />
      )}
    </div>
  );
}
