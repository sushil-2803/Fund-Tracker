import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { fmt, fmtDate } from '../utils';
import { StatusBadge, Loading, EmptyState, ProgressBar, ConfirmModal } from '../components/shared';
import ExpenseModal from '../components/ExpenseModal';
import { useToast } from '../context/ToastContext';

export default function Expenses() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: searchParams.get('status') || '',
    date_from: '',
    date_to: '',
  });

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      setExpenses(await api.expenses.list(params));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filters]);

  async function handleDelete() {
    try {
      await api.expenses.delete(deleting.id);
      toast.success('Expense deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Expenses</div>
          <div className="page-subtitle">{expenses.length} record{expenses.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>+ Add Expense</button>
      </div>

      <div className="page-body">
        <div className="filters-bar">
          <input
            className="filter-input"
            type="text"
            placeholder="🔍 Search title, category, notes…"
            style={{ flex: 1, minWidth: 200 }}
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
          <select
            className="filter-input"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_SETTLED">Partial</option>
            <option value="SETTLED">Settled</option>
          </select>
          <input className="filter-input" type="date"
            value={filters.date_from}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
          <input className="filter-input" type="date"
            value={filters.date_to}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
        </div>

        <div className="card">
          {loading ? <Loading /> : expenses.length === 0 ? (
            <EmptyState icon="🧾" message="No expenses found"
              action={<button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>Add your first expense</button>} />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Settled</th>
                    <th>Pending</th>
                    <th>Settlement</th>
                    <th>Status</th>
                    <th>Tags</th>
                    <th className="table-action-col"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id} onClick={() => navigate(`/expenses/${exp.id}`)}>
                      <td style={{ fontWeight: 500 }}>{exp.title || exp.category}</td>
                      <td style={{ color: 'var(--text2)' }}>{exp.category}</td>
                      <td style={{ color: 'var(--text2)' }}>{fmtDate(exp.date)}</td>
                      <td className="amount">{fmt(exp.amount)}</td>
                      <td className="amount" style={{ color: 'var(--green)' }}>{fmt(exp.settled_amount)}</td>
                      <td className="amount" style={{ color: exp.pending_amount > 0 ? 'var(--amber)' : 'var(--text3)' }}>
                        {fmt(exp.pending_amount)}
                      </td>
                      <td style={{ minWidth: 100 }}>
                        <ProgressBar used={exp.settled_amount} total={exp.amount} />
                      </td>
                      <td><StatusBadge status={exp.status} /></td>
                      <td>
                        <div className="tags-wrap">
                          {exp.tags?.slice(0,2).map(t => (
                            <span key={t} className="tag">#{t}</span>
                          ))}
                          {exp.tags?.length > 2 && <span className="tag">+{exp.tags.length - 2}</span>}
                        </div>
                      </td>
                      <td className="table-action-col" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-xs"
                            onClick={() => setModal({ type: 'edit', item: exp })}>Edit</button>
                          <button className="btn btn-danger btn-xs"
                            onClick={() => setDeleting(exp)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal === 'add' && (
        <ExpenseModal onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal?.type === 'edit' && (
        <ExpenseModal onClose={() => setModal(null)} onSaved={load} existing={modal.item} />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete Expense"
          message={`Delete "${deleting.title || deleting.category}" (${fmt(deleting.amount)})? All related allocations will also be removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
