import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { todayISO } from '../utils';
import { TagInput } from './shared';
import { useToast } from '../context/ToastContext';

export default function IncomeModal({ onClose, onSaved, existing }) {
  const toast = useToast();
  const [form, setForm] = useState({
    amount: existing?.amount ?? '',
    source: existing?.source ?? '',
    date:   existing?.date?.slice(0,10) ?? todayISO(),
    notes:  existing?.notes ?? '',
    tags:   existing?.tags ?? [],
  });
  const [loading, setLoading] = useState(false);
  const [existingTags, setExistingTags] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard.tags()
      .then(tags => setExistingTags(tags.map(t => t.name)))
      .catch(() => setExistingTags([]));
  }, []);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.amount || parseFloat(form.amount) <= 0) return setError('Amount must be greater than 0');
    if (!form.source.trim()) return setError('Source is required');
    if (!form.date) return setError('Date is required');

    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        source: form.source.trim(),
        date: form.date,
        notes: form.notes || null,
        tags: form.tags,
      };
      if (existing) {
        await api.incomes.update(existing.id, payload);
        toast.success('Income updated');
      } else {
        await api.incomes.create(payload);
        toast.success('Income added');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{existing ? 'Edit Income' : 'Add Income'}</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input type="number" step="0.01" min="0.01" placeholder="0.00"
                    value={form.amount} onChange={set('amount')} required />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={set('date')} required />
                </div>
              </div>
              <div className="form-group">
                <label>Source</label>
                <input type="text" placeholder="e.g. Salary, Client Payment, Trip Fund"
                  value={form.source} onChange={set('source')} required />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea placeholder="Any additional context…"
                  value={form.notes} onChange={set('notes')} />
              </div>
              <div className="form-group">
                <label>Tags (press Enter to add)</label>
                <TagInput
                  value={form.tags}
                  suggestions={existingTags}
                  onChange={tags => setForm(f => ({ ...f, tags }))}
                />
              </div>
              {error && <div className="form-error">⚠ {error}</div>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Saving…' : existing ? 'Update' : 'Add Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
