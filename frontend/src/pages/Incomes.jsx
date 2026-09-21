import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { fmt, fmtDate } from '../utils';
import { StatusBadge, Loading, EmptyState, ProgressBar, ConfirmModal } from '../components/shared';
import IncomeModal from '../components/IncomeModal';
import { useToast } from '../context/ToastContext';

export default function Incomes() {
  const navigate = useNavigate();
  const toast = useToast();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', date_from: '', date_to: '' });

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      setIncomes(await api.incomes.list(params));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filters]);

  async function handleDelete() {
    try {
      await api.incomes.delete(deleting.id);
      toast.success('Income deleted');
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
          <div className="page-title">Incomes</div>
          <div className="page-subtitle">{incomes.length} record{incomes.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>+ Add Income</button>
      </div>

      <div className="page-body">
        <div className="filters-bar">
          <input
            className="filter-input"
            type="text"
            placeholder="🔍 Search sources, notes…"
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
            <option value="UNUSED">Unused</option>
            <option value="PARTIALLY_USED">Partial</option>
            <option value="FULLY_USED">Fully Used</option>
          </select>
          <input className="filter-input" type="date" placeholder="From"
            value={filters.date_from}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
          <input className="filter-input" type="date" placeholder="To"
            value={filters.date_to}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
        </div>

        <div className="card">
          {loading ? <Loading /> : incomes.length === 0 ? (
            <EmptyState icon="💰" message="No incomes found"
              action={<button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>Add your first income</button>} />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Allocated</th>
                    <th>Remaining</th>
                    <th>Usage</th>
                    <th>Status</th>
                    <th>Tags</th>
                    <th className="table-action-col"></th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map(inc => (
                    <tr key={inc.id} onClick={() => navigate(`/incomes/${inc.id}`)}>
                      <td style={{ fontWeight: 500 }}>{inc.source}</td>
                      <td style={{ color: 'var(--text2)' }}>{fmtDate(inc.date)}</td>
                      <td className="amount">{fmt(inc.amount)}</td>
                      <td className="amount" style={{ color: 'var(--purple)' }}>{fmt(inc.allocated_amount)}</td>
                      <td className="amount" style={{ color: 'var(--green)' }}>{fmt(inc.remaining_amount)}</td>
                      <td style={{ minWidth: 100 }}>
                        <ProgressBar used={inc.allocated_amount} total={inc.amount} />
                      </td>
                      <td><StatusBadge status={inc.status} /></td>
                      <td>
                        <div className="tags-wrap">
                          {inc.tags?.slice(0,3).map(t => (
                            <span key={t} className="tag">#{t}</span>
                          ))}
                          {inc.tags?.length > 3 && <span className="tag">+{inc.tags.length - 3}</span>}
                        </div>
                      </td>
                      <td className="table-action-col" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-xs"
                            onClick={() => setModal({ type: 'edit', item: inc })}>Edit</button>
                          <button className="btn btn-danger btn-xs"
                            onClick={() => setDeleting(inc)}>Del</button>
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
        <IncomeModal onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal?.type === 'edit' && (
        <IncomeModal onClose={() => setModal(null)} onSaved={load} existing={modal.item} />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete Income"
          message={`Delete "${deleting.source}" (${fmt(deleting.amount)})? All related allocations will also be removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
