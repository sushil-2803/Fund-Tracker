import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { fmt, fmtDate, fmtDateTime } from '../utils';
import { StatusBadge, Loading, ProgressBar, ConfirmModal } from '../components/shared';
import IncomeModal from '../components/IncomeModal';
import AllocationModal from '../components/AllocationModal';
import { useToast } from '../context/ToastContext';

export default function IncomeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [income, setIncome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deletingAlloc, setDeletingAlloc] = useState(null);
  const [deletingAllocLoading, setDeletingAllocLoading] = useState(false);

  async function load() {
    try {
      setIncome(await api.incomes.get(id));
    } catch {
      navigate('/incomes');
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
  if (!income) return null;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/incomes')}>← Back</button>
          <div>
            <div className="page-title">{income.source}</div>
            <div className="page-subtitle">{fmtDate(income.date)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal('edit')}>Edit</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('allocate')}>+ Allocate</button>
        </div>
      </div>

      <div className="page-body">
        <div className="detail-grid">
          {/* Left: main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Allocation history */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Linked Expenses ({income.allocations?.length ?? 0})</span>
                <StatusBadge status={income.status} />
              </div>
              {!income.allocations?.length ? (
                <div style={{ padding: '24px 20px', color: 'var(--text3)', fontSize: 13 }}>
                  No allocations yet. Click "Allocate" to link this income to an expense.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Expense</th>
                        <th>Expense Total</th>
                        <th>Allocated</th>
                        <th>Date</th>
                        <th>Note</th>
                        <th className="table-action-col"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {income.allocations.map(alloc => (
                        <tr key={alloc.id}
                          onClick={() => navigate(`/expenses/${alloc.expense_id}`)}>
                          <td style={{ fontWeight: 500 }}>{alloc.expense_title || alloc.expense_category}</td>
                          <td className="amount">{fmt(alloc.expense_amount)}</td>
                          <td className="amount" style={{ color: 'var(--purple)' }}>{fmt(alloc.amount)}</td>
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

            {/* Notes */}
            {income.notes && (
              <div className="card">
                <div className="card-header"><span className="card-title">Notes</span></div>
                <div className="card-body">
                  <p style={{ color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {income.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: sidebar stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Breakdown</span></div>
              <div className="card-body">
                <div className="stat-row">
                  <span className="stat-row-label">Total Amount</span>
                  <span className="stat-row-value amount">{fmt(income.amount)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-row-label">Allocated</span>
                  <span className="stat-row-value amount" style={{ color: 'var(--purple)' }}>
                    {fmt(income.allocated_amount)}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-row-label">Remaining</span>
                  <span className="stat-row-value amount" style={{ color: 'var(--green)' }}>
                    {fmt(income.remaining_amount)}
                  </span>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Usage</div>
                  <ProgressBar used={income.allocated_amount} total={income.amount} />
                </div>
              </div>
            </div>

            {income.tags?.length > 0 && (
              <div className="card">
                <div className="card-header"><span className="card-title">Tags</span></div>
                <div className="card-body">
                  <div className="tags-wrap">
                    {income.tags.map(t => <span key={t} className="tag">#{t}</span>)}
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header"><span className="card-title">Metadata</span></div>
              <div className="card-body">
                <div className="stat-row">
                  <span className="stat-row-label">Date</span>
                  <span style={{ fontSize: 13 }}>{fmtDate(income.date)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-row-label">Created</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDateTime(income.created_at)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-row-label">Updated</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDateTime(income.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal === 'edit' && (
        <IncomeModal onClose={() => setModal(null)} onSaved={load} existing={income} />
      )}
      {modal === 'allocate' && (
        <AllocationModal onClose={() => setModal(null)} onSaved={load} presetIncomeId={income.id} />
      )}
      {deletingAlloc && (
        <ConfirmModal
          title="Remove Allocation"
          message={`Remove this allocation of ${fmt(deletingAlloc.amount)} to ${deletingAlloc.expense_title || deletingAlloc.expense_category}?`}
          onConfirm={deleteAllocation}
          onCancel={() => setDeletingAlloc(null)}
          loading={deletingAllocLoading}
        />
      )}
    </>
  );
}
