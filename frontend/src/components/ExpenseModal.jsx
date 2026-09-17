import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { todayISO } from '../utils';
import { TagInput } from './shared';
import { useToast } from '../context/ToastContext';

const CATEGORIES = [
  'Food & Dining', 'Travel', 'Accommodation', 'Fuel', 'Rent',
  'Medical', 'Shopping', 'Utilities', 'Entertainment', 'Office',
  'Education', 'Salary', 'Freelance', 'Other',
];

export default function ExpenseModal({ onClose, onSaved, existing }) {
  const toast = useToast();
  const [form, setForm] = useState({
    amount:   existing?.amount ?? '',
    title:    existing?.title ?? existing?.category ?? '',
    category: existing?.category ?? '',
    date:     existing?.date?.slice(0,10) ?? todayISO(),
    notes:    existing?.notes ?? '',
    tags:     existing?.tags ?? [],
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
    if (!form.title.trim()) return setError('Title is required');
    if (!form.category.trim()) return setError('Category is required');
    if (!form.date) return setError('Date is required');

    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        title: form.title.trim(),
        category: form.category.trim(),
        date: form.date,
        notes: form.notes || null,
        tags: form.tags,
      };
      if (existing) {
        await api.expenses.update(existing.id, payload);
        toast.success('Expense updated');
      } else {
        await api.expenses.create(payload);
        toast.success('Expense added');
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
          <span className="modal-title">{existing ? 'Edit Expense' : 'Add Expense'}</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner with client"
                  value={form.title}
                  onChange={set('title')}
                  required
                  autoFocus
                />
              </div>
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
                <label>Category</label>
                <input
                  type="text"
                  placeholder="e.g. Food, Hotel, Fuel"
                  list="category-list"
                  value={form.category}
                  onChange={set('category')}
                  required
                />
                <datalist id="category-list">
                  {CATEGORIES.map(c => <option key={c} value={c} />)}
                </datalist>
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
              {loading ? 'Saving…' : existing ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
