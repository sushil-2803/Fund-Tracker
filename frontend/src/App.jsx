import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Sidebar       from './components/Sidebar';
import AuthPage      from './pages/AuthPage';
import Dashboard     from './pages/Dashboard';
import Incomes       from './pages/Incomes';
import IncomeDetail  from './pages/IncomeDetail';
import Expenses      from './pages/Expenses';
import ExpenseDetail from './pages/ExpenseDetail';
import Allocations   from './pages/Allocations';
import Analytics     from './pages/Analytics';
import Tags          from './pages/Tags';
import Profile       from './pages/Profile';
import NotFound      from './pages/NotFound';

function SplashLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 52, height: 52,
        background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 700, color: '#fff',
      }}>₹</div>
      <div className="spinner" style={{ width: 22, height: 22 }} />
      <span style={{ color: 'var(--text3)', fontSize: 13 }}>Restoring session…</span>
    </div>
  );
}

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <SplashLoader />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"             element={<Protected><Dashboard /></Protected>} />
          <Route path="/incomes"      element={<Protected><Incomes /></Protected>} />
          <Route path="/incomes/:id"  element={<Protected><IncomeDetail /></Protected>} />
          <Route path="/expenses"     element={<Protected><Expenses /></Protected>} />
          <Route path="/expenses/:id" element={<Protected><ExpenseDetail /></Protected>} />
          <Route path="/allocations"  element={<Protected><Allocations /></Protected>} />
          <Route path="/analytics"    element={<Protected><Analytics /></Protected>} />
          <Route path="/tags"         element={<Protected><Tags /></Protected>} />
          <Route path="/profile"      element={<Protected><Profile /></Protected>} />
          <Route path="/login"        element={<Navigate to="/" replace />} />
          <Route path="*"             element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
