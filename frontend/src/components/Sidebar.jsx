import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { fmt } from '../utils';

const navItems = [
  { to: '/',            label: 'Dashboard',   icon: '⬡', end: true },
  { to: '/incomes',     label: 'Incomes',     icon: '↓' },
  { to: '/expenses',    label: 'Expenses',    icon: '↑' },
  { to: '/allocations', label: 'Allocations', icon: '⇄' },
  { to: '/analytics',   label: 'Analytics',   icon: '◎' },
  { to: '/tags',        label: 'Tags',        icon: '#' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.dashboard.summary().then(setSummary).catch(() => {});
    const id = setInterval(() => {
      api.dashboard.summary().then(setSummary).catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [user]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            <div className="logo-icon" style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>₹</div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Fund<span style={{ color: 'var(--accent)' }}>Tracker</span></span>
          </NavLink>
        </div>
        <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
          {open ? '✕' : '☰'}
        </button>
      </div>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        {/* Logo */}
        <NavLink to="/" className="sidebar-logo" style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setOpen(false)}>
          <div className="logo-icon">₹</div>
          <div className="logo-text">Fund<span>Tracker</span></div>
        </NavLink>

        {/* Nav */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Live balances */}
        {summary && (
          <div className="sidebar-stats">
            <div className="sidebar-section-label" style={{ marginBottom: 8 }}>Live Balances</div>
            <div className="sidebar-stat">
              <span className="sidebar-stat-label">Available</span>
              <span className="sidebar-stat-value" style={{ color: 'var(--green)' }}>
                {fmt(summary.available_funds)}
              </span>
            </div>
            <div className="sidebar-stat">
              <span className="sidebar-stat-label">Pending</span>
              <span className="sidebar-stat-value" style={{ color: summary.pending_reimbursements > 0 ? 'var(--amber)' : 'var(--text3)' }}>
                {fmt(summary.pending_reimbursements)}
              </span>
            </div>
            <div className="sidebar-stat">
              <span className="sidebar-stat-label">Net</span>
              <span className="sidebar-stat-value" style={{ color: (summary.total_income - summary.total_expenses) >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                {fmt(summary.total_income - summary.total_expenses)}
              </span>
            </div>
          </div>
        )}

        {/* User strip */}
        {user && (
          <div className="sidebar-user">
            <NavLink to="/profile" className="sidebar-user-info" onClick={() => setOpen(false)}>
              <div className="sidebar-avatar">
                {user.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </NavLink>
            <button className="sidebar-logout-btn" onClick={logout} title="Sign out">⏻</button>
          </div>
        )}
      </aside>
    </>
  );
}
