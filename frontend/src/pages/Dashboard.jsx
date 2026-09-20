import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { fmt, fmtDateTime, fmtDate } from '../utils';
import { StatusBadge, Loading, EmptyState } from '../components/shared';
import AllocationModal from '../components/AllocationModal';
import IncomeModal from '../components/IncomeModal';
import ExpenseModal from '../components/ExpenseModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'income' | 'expense' | 'allocation'

  async function load() {
    try {
      const summary = await api.dashboard.summary();
      setData(summary);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <Loading />;

  const activityIcon = { income: '↓', expense: '↑', allocation: '⇄' };
  const activityColor = { income: 'var(--green)', expense: 'var(--red)', allocation: 'var(--accent)' };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Your financial overview at a glance</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal('expense')}>+ Expense</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal('income')}>+ Income</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('allocation')}>⇄ Allocate</button>
        </div>
      </div>

      <div className="page-body">
        {/* ── Metric Cards ── */}
        <div className="metrics-grid">
          <div className="metric-card green">
            <div className="metric-label">Total Income</div>
            <div className="metric-value green">{fmt(data.total_income)}</div>
            <div className="metric-sub">All sources combined</div>
          </div>
          <div className="metric-card red">
            <div className="metric-label">Total Expenses</div>
            <div className="metric-value red">{fmt(data.total_expenses)}</div>
            <div className="metric-sub">All expenses combined</div>
          </div>
          <div className="metric-card blue">
            <div className="metric-label">Available Funds</div>
            <div className="metric-value blue">{fmt(data.available_funds)}</div>
            <div className="metric-sub">Unallocated income balance</div>
          </div>
          <div className="metric-card amber">
            <div className="metric-label">Pending Amount</div>
            <div className="metric-value amber">{fmt(data.pending_reimbursements)}</div>
            <div className="metric-sub">Expenses not yet covered</div>
          </div>
          <div className="metric-card purple">
            <div className="metric-label">Total Allocated</div>
            <div className="metric-value purple">{fmt(data.total_allocated)}</div>
            <div className="metric-sub">Across all allocations</div>
          </div>
        </div>

        <div className="two-col">
          {/* ── Unsettled Expenses ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Unsettled Expenses</span>
              <button className="btn btn-ghost btn-xs" onClick={() => navigate('/expenses?status=PENDING')}>
                View all
              </button>
            </div>
            {data.unsettled_expenses.length === 0 ? (
              <EmptyState icon="✓" message="All expenses are settled!" />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Pending</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.unsettled_expenses.map(exp => (
                      <tr key={exp.id} onClick={() => navigate(`/expenses/${exp.id}`)}>
                        <td style={{ fontWeight: 500 }}>{exp.title || exp.category}</td>
                        <td style={{ color: 'var(--text2)' }}>{exp.category}</td>
                        <td style={{ color: 'var(--text2)' }}>{fmtDate(exp.date)}</td>
                        <td className="amount">{fmt(exp.amount)}</td>
                        <td className="amount" style={{ color: 'var(--amber)' }}>{fmt(exp.pending_amount)}</td>
                        <td><StatusBadge status={exp.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Recent Activity ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Activity</span>
            </div>
            {data.recent_activity.length === 0 ? (
              <EmptyState icon="📋" message="No activity yet" />
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {data.recent_activity.map(item => (
                  <div key={`${item.type}-${item.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: `${activityColor[item.type]}22`,
                      color: activityColor[item.type],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 600,
                    }}>
                      {activityIcon[item.type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {fmtDateTime(item.created_at)}
                      </div>
                    </div>
                    <div className="amount" style={{ fontSize: 13, color: activityColor[item.type], flexShrink: 0 }}>
                      {item.type === 'expense' ? '-' : '+'}{fmt(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {modal === 'income' && (
        <IncomeModal onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal === 'expense' && (
        <ExpenseModal onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal === 'allocation' && (
        <AllocationModal onClose={() => setModal(null)} onSaved={load} />
      )}
    </>
  );
}
