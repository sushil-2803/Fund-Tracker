import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { fmt, fmtDate, fmtDateTime } from '../utils';
import { StatusBadge, Loading, ProgressBar, ConfirmModal } from '../components/shared';
import ExpenseModal from '../components/ExpenseModal';
import AllocationModal from '../components/AllocationModal';
import { useToast } from '../context/ToastContext';

export default function ExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deletingAlloc, setDeletingAlloc] = useState(null);
  const [deletingAllocLoading, setDeletingAllocLoading] = useState(false);

  async function load() {
    try {
      setExpense(await api.expenses.get(id));
    } catch {
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function deleteAllocation() {
    setDeletingAllocLoading(true);
    try {
      await api.allocations.delete(deletingAlloc.id);
      toast.success('Allocation removed');
      setDeletingAlloc(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingAllocLoading(false);
    }
  }

  if (loading) return <Loading />;
  if (!expense) return null;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>← Back</button>
          <div>
            <div className="page-title">{expense.title || expense.category}</div>
            <div className="page-subtitle">{expense.category} · {fmtDate(expense.date)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal('edit')}>Edit</button>
          {expense.status !== 'SETTLED' && (
            <button className="btn btn-primary btn-sm" onClick={() => setModal('allocate')}>+ Settle</button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="detail-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Covered By ({expense.allocations?.length ?? 0} incomes)</span>
                <StatusBadge status={expense.status} />
              </div>
              {!expense.allocations?.length ? (
                <div style={{ padding: '24px 20px', color: 'var(--text3)', fontSize: 13 }}>
                  No income has been allocated to this expense yet.
                  {expense.status !== 'SETTLED' && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: 12, display: 'block' }}
                      onClick={() => setModal('allocate')}
                    >
                      Allocate income now
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Income Source</th>
                        <th>Income Total</th>
                        <th>Allocated</th>
                        <th>Date</th>
                        <th>Note</th>
                        <th className="table-action-col"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {expense.allocations.map(alloc => (
                        <tr key={alloc.id}
                          onClick={() => navigate(`/incomes/${alloc.income_id}`)}>
                          <td style={{ fontWeight: 500 }}>{alloc.income_source}</td>
                          <td className="amount">{fmt(alloc.income_amount)}</td>
                          <td className="amount" style={{ color: 'var(--green)' }}>{fmt(alloc.amount)}</td>
                          <td style={{ color: 'var(--text2)' }}>{fmtDateTime(alloc.created_at)}</td>
                          <td style={{ color: 'var(--text2)', fontSize: 12 }}>{alloc.note || '—'}</td>
                          <td className="table-action-col" onClick={e => e.stopPropagation()}>
                            <button className="btn btn-danger btn-xs"
                              onClick={() => setDeletingAlloc(alloc)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {expense.notes && (
              <div className="card">
                <div className="card-header"><span className="card-title">Notes</span></div>
                <div className="card-body">
                  <p style={{ color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {expense.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Settlement</span></div>
              <div className="card-body">
                <div className="stat-row">
                  <span className="stat-row-label">Total Amount</span>
                  <span className="stat-row-value amount">{fmt(expense.amount)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-row-label">Settled</span>
                  <span className="stat-row-value amount" style={{ color: 'var(--green)' }}>
                    {fmt(expense.settled_amount)}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-row-label">Pending</span>
                  <span className="stat-row-value amount" style={{ color: expense.pending_amount > 0 ? 'var(--amber)' : 'var(--text3)' }}>
                    {fmt(expense.pending_amount)}
                  </span>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Settlement Progress</div>
                  <ProgressBar used={expense.settled_amount} total={expense.amount} />
                </div>
              </div>
            </div>

            {expense.tags?.length > 0 && (
              <div className="card">
                <div className="card-header"><span className="card-title">Tags</span></div>
                <div className="card-body">
                  <div className="tags-wrap">
                    {expense.tags.map(t => <span key={t} className="tag">#{t}</span>)}
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header"><span className="card-title">Metadata</span></div>
              <div className="card-body">
                <div className="stat-row">
                  <span className="stat-row-label">Category</span>
                  <span style={{ fontSize: 13 }}>{expense.category}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-row-label">Date</span>
                  <span style={{ fontSize: 13 }}>{fmtDate(expense.date)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-row-label">Created</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDateTime(expense.created_at)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-row-label">Updated</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDateTime(expense.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal === 'edit' && (
        <ExpenseModal onClose={() => setModal(null)} onSaved={load} existing={expense} />
      )}
      {modal === 'allocate' && (
        <AllocationModal onClose={() => setModal(null)} onSaved={load} presetExpenseId={expense.id} />
      )}
      {deletingAlloc && (
        <ConfirmModal
          title="Remove Allocation"
          message={`Remove this allocation of ${fmt(deletingAlloc.amount)} from ${deletingAlloc.income_source}?`}
          onConfirm={deleteAllocation}
          onCancel={() => setDeletingAlloc(null)}
          loading={deletingAllocLoading}
        />
      )}
    </>
  );
}
