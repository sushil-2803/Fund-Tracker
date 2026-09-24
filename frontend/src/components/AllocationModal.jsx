import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { fmt } from '../utils';
import { useToast } from '../context/ToastContext';

function newExpenseRow(presetExpenseId) {
  return {
    key: `${Date.now()}-${Math.random()}`,
    expense_id: presetExpenseId ?? '',
    amount: '',
    note: '',
  };
}

export default function AllocationModal({ onClose, onSaved, presetIncomeId, presetExpenseId }) {
  const toast = useToast();
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incomeId, setIncomeId] = useState(presetIncomeId ?? '');
  const [rows, setRows] = useState([newExpenseRow(presetExpenseId)]);
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

  // Total already committed to the selected income across all rows (excluding one row by key)
  function totalCommittedToIncome(exceptKey) {
    return rows.reduce((sum, row) => {
      if (row.key === exceptKey) return sum;
      return sum + (parseFloat(row.amount) || 0);
    }, 0);
  }

  // Amount committed to a specific expense across all rows (excluding one row by key)
  function committedToExpense(expenseId, exceptKey) {
    return rows.reduce((sum, row) => {
      if (row.key === exceptKey || row.expense_id !== expenseId) return sum;
      return sum + (parseFloat(row.amount) || 0);
    }, 0);
  }

  function rowLimit(row) {
    const income = incomeById.get(incomeId);
    const expense = expenseById.get(row.expense_id);
    if (!income || !expense) return 0;

    const incomeLeft = income.remaining_amount - totalCommittedToIncome(row.key);
    const expenseLeft = expense.pending_amount - committedToExpense(row.expense_id, row.key);
    return Math.max(0, Math.min(incomeLeft, expenseLeft));
  }

  // Remaining income balance after accounting for all currently entered amounts
  const incomeRemainingLive = useMemo(() => {
    const income = incomeById.get(incomeId);
    if (!income) return 0;
    const committed = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
    return Math.max(0, income.remaining_amount - committed);
  }, [incomeId, incomeById, rows]);

  function setRow(key, field, value) {
    setRows(current => current.map(row =>
      row.key === key ? { ...row, [field]: value } : row
    ));
    setError('');
  }

  function addRow() {
    setRows(current => [...current, newExpenseRow()]);
    setError('');
  }

  function removeRow(key) {
    setRows(current => current.length === 1 ? current : current.filter(row => row.key !== key));
    setError('');
  }

  function fillMax(key) {
    setRows(current => current.map(row =>
      row.key === key ? { ...row, amount: String(rowLimit(row)) } : row
    ));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!incomeId) return setError('Please select an income source.');

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 1;
      const amt = parseFloat(row.amount);
      const maxAmount = rowLimit(row);

      if (!row.expense_id) return setError(`Select an expense in row ${rowNumber}`);
      if (!amt || amt <= 0) return setError(`Amount must be > 0 in row ${rowNumber}`);
      if (amt > maxAmount + 0.001) return setError(`Row ${rowNumber} exceeds allocatable max of ${fmt(maxAmount)}`);
    }

    setLoading(true);
    try {
      const payload = rows.map(row => ({
        income_id: incomeId,
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

  const selectedIncome = incomeById.get(incomeId);

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

                {/* ── Income (selected once, shared across all expense rows) ── */}
                <div className="allocation-income-section">
                  <div className="form-group">
                    <label>Income Source</label>
                    <select
                      value={incomeId}
                      onChange={e => { setIncomeId(e.target.value); setError(''); }}
                      required
                      disabled={Boolean(presetIncomeId)}
                    >
                      <option value="">Select income…</option>
                      {incomes.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.source} — {fmt(i.remaining_amount)} remaining
                        </option>
                      ))}
                    </select>
                    {incomes.length === 0 && (
                      <span className="form-error" style={{ marginTop: 6 }}>No incomes with remaining balance</span>
                    )}
                  </div>

                  {selectedIncome && (
                    <div className="allocation-income-summary">
                      <div className="allocation-balance-row">
                        <span className="allocation-balance-label">Total amount</span>
                        <span className="allocation-balance-value">{fmt(selectedIncome.amount)}</span>
                      </div>
                      <div className="allocation-balance-row">
                        <span className="allocation-balance-label">Still available</span>
                        <span
                          className="allocation-balance-value"
                          style={{ color: incomeRemainingLive > 0 ? 'var(--green)' : 'var(--text3)' }}
                        >
                          {fmt(incomeRemainingLive)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Divider ── */}
                {selectedIncome && (
                  <div className="allocation-section-divider">
                    <span>Allocate to expenses</span>
                  </div>
                )}

                {/* ── Expense rows ── */}
                {selectedIncome && rows.map((row, index) => {
                  const selectedExpense = expenseById.get(row.expense_id);
                  const maxAmount = rowLimit(row);

                  return (
                    <div className="allocation-expense-row" key={row.key}>
                      <div className="allocation-expense-row-header">
                        <span className="allocation-expense-index">Expense {index + 1}</span>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => removeRow(row.key)}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="allocation-expense-fields">
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
                                {exp.title || exp.category} — {fmt(
                                  Math.max(0, exp.pending_amount - committedToExpense(exp.id, row.key))
                                )} pending
                              </option>
                            ))}
                          </select>
                          {expenses.length === 0 && (
                            <span className="form-error" style={{ marginTop: 6 }}>No expenses with pending balance</span>
                          )}
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
                          {selectedExpense && maxAmount > 0 && (
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

                        <div className="form-group">
                          <label>Note (optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Monthly electricity bill"
                            value={row.note}
                            onChange={e => setRow(row.key, 'note', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* ── Add expense button ── */}
                {selectedIncome && incomeRemainingLive > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ width: 'fit-content' }}
                    onClick={addRow}
                  >
                    + Add another expense
                  </button>
                )}

                {error && <div className="form-error">⚠ {error}</div>}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading || fetching || !incomeId || incomes.length === 0 || expenses.length === 0}
            >
              {loading
                ? 'Saving…'
                : rows.length === 1
                  ? 'Create Allocation'
                  : `Create ${rows.length} Allocations`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
