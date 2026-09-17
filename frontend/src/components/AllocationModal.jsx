import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { fmt } from '../utils';
import { useToast } from '../context/ToastContext';

function newAllocationRow(presetIncomeId, presetExpenseId) {
  return {
    key: `${Date.now()}-${Math.random()}`,
    income_id: presetIncomeId ?? '',
    expense_id: presetExpenseId ?? '',
    amount: '',
    note: '',
  };
}

export default function AllocationModal({ onClose, onSaved, presetIncomeId, presetExpenseId }) {
  const toast = useToast();
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rows, setRows] = useState([newAllocationRow(presetIncomeId, presetExpenseId)]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.incomes.list(),
      api.expenses.list(),
    ]).then(([inc, exp]) => {
      setIncomes(inc.filter(i => i.remaining_amount > 0 || i.id === presetIncomeId));
      setExpenses(exp.filter(e => e.pending_amount > 0 || e.id === presetExpenseId));
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [presetIncomeId, presetExpenseId]);

  const incomeById = useMemo(() => new Map(incomes.map(i => [i.id, i])), [incomes]);
  const expenseById = useMemo(() => new Map(expenses.map(e => [e.id, e])), [expenses]);

  function allocatedInRows(field, id, exceptKey) {
    return rows.reduce((sum, row) => {
      if (row.key === exceptKey || row[field] !== id) return sum;
      return sum + (parseFloat(row.amount) || 0);
    }, 0);
  }

  function rowLimit(row) {
    const income = incomeById.get(row.income_id);
    const expense = expenseById.get(row.expense_id);
    if (!income || !expense) return 0;

    const incomeLeft = income.remaining_amount - allocatedInRows('income_id', row.income_id, row.key);
    const expenseLeft = expense.pending_amount - allocatedInRows('expense_id', row.expense_id, row.key);
    return Math.max(0, Math.min(incomeLeft, expenseLeft));
  }

  function availableAmount(item, field, id, exceptKey, amountField) {
    return Math.max(0, item[amountField] - allocatedInRows(field, id, exceptKey));
  }

  function setRow(key, field, value) {
    setRows(current => current.map(row => (
      row.key === key ? { ...row, [field]: value } : row
    )));
    setError('');
  }

  function addRow() {
    setRows(current => [...current, newAllocationRow(presetIncomeId, presetExpenseId)]);
    setError('');
  }

  function removeRow(key) {
    setRows(current => current.length === 1 ? current : current.filter(row => row.key !== key));
    setError('');
  }

  function fillMax(key) {
    setRows(current => current.map(row => (
      row.key === key ? { ...row, amount: String(rowLimit(row)) } : row
    )));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 1;
      const amt = parseFloat(row.amount);
      const maxAmount = rowLimit(row);

      if (!row.income_id) return setError(`Select an income in row ${rowNumber}`);
      if (!row.expense_id) return setError(`Select an expense in row ${rowNumber}`);
      if (!amt || amt <= 0) return setError(`Amount must be > 0 in row ${rowNumber}`);
      if (amt > maxAmount + 0.001) return setError(`Row ${rowNumber} max allocatable is ${fmt(maxAmount)}`);
    }

    setLoading(true);
    try {
      const payload = rows.map(row => ({
        income_id: row.income_id,
        expense_id: row.expense_id,
        amount: parseFloat(row.amount),
        note: row.note || null,
      }));
      if (payload.length === 1) await api.allocations.create(payload[0]);
      else await api.allocations.createBulk(payload);
      toast.success(rows.length === 1 ? 'Allocation created' : `${rows.length} allocations created`);
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
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">New Allocation</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {fetching ? (
              <p style={{ color: 'var(--text3)' }}>Loading incomes and expenses…</p>
            ) : (
              <div className="form-grid">
                {rows.map((row, index) => {
                  const selectedIncome = incomeById.get(row.income_id);
                  const selectedExpense = expenseById.get(row.expense_id);
                  const maxAmount = rowLimit(row);

                  return (
                    <div className="allocation-row" key={row.key}>
                      <div className="allocation-row-header">
                        <span>Allocation {index + 1}</span>
                        {rows.length > 1 && (
                          <button type="button" className="btn btn-danger btn-xs" onClick={() => removeRow(row.key)}>
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="allocation-fields">
                        <div className="form-group">
                          <label>Income</label>
                          <select
                            value={row.income_id}
                            onChange={e => setRow(row.key, 'income_id', e.target.value)}
                            required
                            disabled={Boolean(presetIncomeId)}
                          >
                            <option value="">Select income…</option>
                            {incomes.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.source} — {fmt(availableAmount(i, 'income_id', i.id, row.key, 'remaining_amount'))} remaining
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Expense</label>
                          <select
                            value={row.expense_id}
                            onChange={e => setRow(row.key, 'expense_id', e.target.value)}
                            required
                            disabled={Boolean(presetExpenseId)}
                          >
                            <option value="">Select expense…</option>
                            {expenses.map(exp => (
                              <option key={exp.id} value={exp.id}>
                                {exp.title || exp.category} — {fmt(availableAmount(exp, 'expense_id', exp.id, row.key, 'pending_amount'))} pending
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>
                            Amount (₹)
                            {maxAmount > 0 && (
                              <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 8 }}>
                                max {fmt(maxAmount)}
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={maxAmount || undefined}
                            placeholder="0.00"
                            value={row.amount}
                            onChange={e => setRow(row.key, 'amount', e.target.value)}
                            required
                          />
                          {selectedIncome && selectedExpense && maxAmount > 0 && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              style={{ marginTop: 6, width: 'fit-content' }}
                              onClick={() => fillMax(row.key)}
                            >
                              Use max ({fmt(maxAmount)})
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Note (optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Covers hotel for trip"
                          value={row.note}
                          onChange={e => setRow(row.key, 'note', e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}

                {incomes.length === 0 && (
                  <span className="form-error">No incomes with remaining balance</span>
                )}
                {expenses.length === 0 && (
                  <span className="form-error">No expenses with pending balance</span>
                )}

                <button type="button" className="btn btn-ghost btn-sm" style={{ width: 'fit-content' }} onClick={addRow}>
                  + Add another allocation
                </button>

                {error && <div className="form-error">⚠ {error}</div>}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm"
              disabled={loading || fetching || incomes.length === 0 || expenses.length === 0}>
              {loading ? 'Saving…' : rows.length === 1 ? 'Create Allocation' : `Create ${rows.length} Allocations`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
