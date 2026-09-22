import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 16, padding: 40,
    }}>
      <div style={{ fontSize: 64 }}>🌀</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>404 — Lost in the ledger</h1>
      <p style={{ color: 'var(--text2)', fontSize: 15 }}>That page doesn't exist in your books.</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        ← Back to Dashboard
      </button>
    </div>
  );
}
