import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { fmt, fmtDateTime } from '../utils';
import { Loading, EmptyState, ConfirmModal } from '../components/shared';
import AllocationModal from '../components/AllocationModal';
import { useToast } from '../context/ToastContext';

export default function Allocations() {
  const navigate = useNavigate();
  const toast = useToast();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      setAllocations(await api.allocations.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete() {
    setDeletingLoading(true);
    try {
      await api.allocations.delete(deleting.id);
      toast.success('Allocation removed');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingLoading(false);
    }
  }

  const filtered = allocations.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.income_source?.toLowerCase().includes(q) ||
      a.expense_title?.toLowerCase().includes(q) ||
      a.expense_category?.toLowerCase().includes(q) ||
      a.note?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Allocations</div>
          <div className="page-subtitle">{filtered.length} allocation{filtered.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          ⇄ New Allocation
        </button>
      </div>

      <div className="page-body">
        <div className="filters-bar">
          <input
            className="filter-input"
            type="text"
            placeholder="🔍 Search income source, expense, note…"
            style={{ flex: 1, minWidth: 240 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="card">
          {loading ? <Loading /> : filtered.length === 0 ? (
            <EmptyState
              icon="⇄"
              message={search ? 'No allocations match your search' : 'No allocations yet'}
              action={
                !search && (
                  <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                    Create first allocation
                  </button>
                )
              }
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Income Source</th>
                    <th>→</th>
                    <th>Expense</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Note</th>
                    <th>Created</th>
                    <th className="table-action-col"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(alloc => (
                    <tr key={alloc.id}>
                      <td>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ fontWeight: 500 }}
                          onClick={() => navigate(`/incomes/${alloc.income_id}`)}
                        >
                          {alloc.income_source}
                        </button>
                      </td>
                      <td style={{ color: 'var(--accent)', fontWeight: 700 }}>⇄</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ fontWeight: 500 }}
                          onClick={() => navigate(`/expenses/${alloc.expense_id}`)}
                        >
                          {alloc.expense_title || alloc.expense_category}
                        </button>
                      </td>
                      <td style={{ color: 'var(--text2)', fontSize: 12 }}>{alloc.expense_category}</td>
                      <td className="amount" style={{ color: 'var(--accent)' }}>
                        {fmt(alloc.amount)}
                      </td>
                      <td style={{ color: 'var(--text2)', fontSize: 12, maxWidth: 200 }}>
                        {alloc.note || <span style={{ color: 'var(--text3)' }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {fmtDateTime(alloc.created_at)}
                      </td>
                      <td className="table-action-col">
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => setDeleting(alloc)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary footer */}
        {filtered.length > 0 && (
          <div style={{
            marginTop: 14,
            display: 'flex',
            justifyContent: 'flex-end',
            color: 'var(--text2)',
            fontSize: 13,
            gap: 6,
          }}>
            Total allocated:
            <span className="amount" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {fmt(filtered.reduce((s, a) => s + a.amount, 0))}
            </span>
          </div>
        )}
      </div>

      {showModal && (
        <AllocationModal onClose={() => setShowModal(false)} onSaved={load} />
      )}
      {deleting && (
        <ConfirmModal
          title="Remove Allocation"
          message={`Remove the allocation of ${fmt(deleting.amount)} from "${deleting.income_source}" → "${deleting.expense_title || deleting.expense_category}"? This will update the balances on both sides.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          loading={deletingLoading}
        />
      )}
    </>
  );
}
