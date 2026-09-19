import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { api } from '../api/client';
import { fmt, fmtDate } from '../utils';
import { Loading } from '../components/shared';

// ── Colour palette matching CSS vars ─────────────────────────────────────────
const COLORS = ['#6c8ff7', '#3ecf8e', '#f5b942', '#f06b6b', '#b57bee', '#38bdf8', '#fb923c'];

const tooltipStyle = {
  backgroundColor: '#13161e',
  border: '1px solid #2a2f3e',
  borderRadius: 8,
  color: '#e8eaf2',
  fontSize: 12,
};

const axisStyle = { fill: '#5c6480', fontSize: 11 };

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>
      {children}
    </h2>
  );
}

// Custom tooltip for currency
function CurrencyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #2a2f3e', fontSize: 11, color: '#9ba3bc' }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#9ba3bc' }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard.summary(),
      api.incomes.list(),
      api.expenses.list(),
    ]).then(([s, inc, exp]) => {
      setSummary(s);
      setIncomes(inc);
      setExpenses(exp);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  // ── Derived chart data ────────────────────────────────────────────────────

  // 1. Income vs Expense by month (last 6 months)
  const monthlyMap = {};
  [...incomes, ...expenses].forEach(item => {
    const d = new Date(item.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, expense: 0 };
    if (item.source !== undefined) monthlyMap[key].income += item.amount;
    else monthlyMap[key].expense += item.amount;
  });
  const monthlyData = Object.values(monthlyMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-8)
    .map(d => ({
      ...d,
      month: new Date(d.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    }));

  // 2. Expense by category (pie)
  const catMap = {};
  expenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });
  const categoryData = Object.entries(catMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // 3. Income sources (pie)
  const srcMap = {};
  incomes.forEach(i => {
    srcMap[i.source] = (srcMap[i.source] || 0) + i.amount;
  });
  const sourceData = Object.entries(srcMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // 4. Settlement status breakdown
  const statusData = [
    { name: 'Settled',  value: expenses.filter(e => e.status === 'SETTLED').reduce((s, e) => s + e.amount, 0) },
    { name: 'Partial',  value: expenses.filter(e => e.status === 'PARTIALLY_SETTLED').reduce((s, e) => s + e.settled_amount, 0) },
    { name: 'Pending',  value: expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0) },
  ].filter(d => d.value > 0);

  // 5. Cumulative income vs expense over time
  const allDated = [
    ...incomes.map(i => ({ date: i.date, type: 'income', amount: i.amount })),
    ...expenses.map(e => ({ date: e.date, type: 'expense', amount: e.amount })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  let cumIncome = 0, cumExpense = 0;
  const cumulativeData = allDated.map(d => {
    if (d.type === 'income') cumIncome += d.amount;
    else cumExpense += d.amount;
    return {
      date: fmtDate(d.date),
      'Total Income': Math.round(cumIncome * 100) / 100,
      'Total Expenses': Math.round(cumExpense * 100) / 100,
    };
  }).slice(-20); // last 20 data points

  // 6. Top expenses bar
  const topExpenses = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map(e => ({ name: e.category, amount: e.amount, settled: e.settled_amount }));

  const hasData = incomes.length > 0 || expenses.length > 0;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-subtitle">
            {incomes.length} incomes · {expenses.length} expenses
          </div>
        </div>
      </div>

      <div className="page-body">
        {!hasData ? (
          <div className="empty-state" style={{ marginTop: 60 }}>
            <div className="empty-icon">📊</div>
            <p>Add some incomes and expenses to see analytics.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* ── Summary strip ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { label: 'Net Balance', value: summary.total_income - summary.total_expenses, color: summary.total_income >= summary.total_expenses ? 'var(--green)' : 'var(--red)' },
                { label: 'Allocation Rate', value: summary.total_income > 0 ? `${Math.round((summary.total_allocated / summary.total_income) * 100)}%` : '0%', color: 'var(--accent)', raw: true },
                { label: 'Settlement Rate', value: summary.total_expenses > 0 ? `${Math.round(((summary.total_expenses - summary.pending_reimbursements) / summary.total_expenses) * 100)}%` : '0%', color: 'var(--green)', raw: true },
                { label: 'Avg Expense', value: expenses.length ? expenses.reduce((s, e) => s + e.amount, 0) / expenses.length : 0, color: 'var(--amber)' },
              ].map(({ label, value, color, raw }) => (
                <div key={label} className="card" style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color }}>
                    {raw ? value : fmt(value)}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Row 1: Monthly bar + Cumulative area ── */}
            <div className="two-col">
              <div className="card">
                <div className="card-header"><span className="card-title">Monthly Income vs Expenses</span></div>
                <div className="card-body" style={{ paddingTop: 8 }}>
                  {monthlyData.length === 0 ? (
                    <p style={{ color: 'var(--text3)', fontSize: 13 }}>Not enough data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthlyData} barGap={3} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" vertical={false} />
                        <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                        <Tooltip content={<CurrencyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
                        <Bar dataKey="income"  name="Income"   fill="#3ecf8e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Expenses" fill="#f06b6b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">Cumulative Growth</span></div>
                <div className="card-body" style={{ paddingTop: 8 }}>
                  {cumulativeData.length < 2 ? (
                    <p style={{ color: 'var(--text3)', fontSize: 13 }}>Need more data points</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={cumulativeData}>
                        <defs>
                          <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f06b6b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f06b6b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" vertical={false} />
                        <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                        <Tooltip content={<CurrencyTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
                        <Area type="monotone" dataKey="Total Income"   stroke="#3ecf8e" fill="url(#gIncome)"  strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="Total Expenses" stroke="#f06b6b" fill="url(#gExpense)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* ── Row 2: Two pies ── */}
            <div className="two-col">
              <div className="card">
                <div className="card-header"><span className="card-title">Expenses by Category</span></div>
                <div className="card-body" style={{ paddingTop: 0 }}>
                  {categoryData.length === 0 ? (
                    <p style={{ color: 'var(--text3)', fontSize: 13 }}>No expenses yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                        >
                          {categoryData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => fmt(v)}
                          contentStyle={tooltipStyle}
                          itemStyle={{ color: 'var(--text)' }}
                        />
                        <Legend
                          formatter={(v) => <span style={{ fontSize: 11, color: 'var(--text2)' }}>{v}</span>}
                          iconType="circle"
                          iconSize={8}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">Income by Source</span></div>
                <div className="card-body" style={{ paddingTop: 0 }}>
                  {sourceData.length === 0 ? (
                    <p style={{ color: 'var(--text3)', fontSize: 13 }}>No incomes yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={sourceData}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                        >
                          {sourceData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => fmt(v)}
                          contentStyle={tooltipStyle}
                          itemStyle={{ color: 'var(--text)' }}
                        />
                        <Legend
                          formatter={(v) => <span style={{ fontSize: 11, color: 'var(--text2)' }}>{v}</span>}
                          iconType="circle"
                          iconSize={8}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* ── Row 3: Top expenses bar + Settlement pie ── */}
            <div className="two-col">
              <div className="card">
                <div className="card-header"><span className="card-title">Top Expenses (Amount vs Settled)</span></div>
                <div className="card-body" style={{ paddingTop: 8 }}>
                  {topExpenses.length === 0 ? (
                    <p style={{ color: 'var(--text3)', fontSize: 13 }}>No expenses yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={topExpenses} layout="vertical" barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" horizontal={false} />
                        <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false}
                          tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                        <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={90} />
                        <Tooltip content={<CurrencyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
                        <Bar dataKey="amount"  name="Total"   fill="#6c8ff7" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="settled" name="Settled" fill="#3ecf8e" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">Settlement Breakdown</span></div>
                <div className="card-body">
                  {statusData.length === 0 ? (
                    <p style={{ color: 'var(--text3)', fontSize: 13 }}>No expenses yet</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%" cy="50%"
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusData.map((entry, i) => {
                              const colors = { Settled: '#3ecf8e', Partial: '#f5b942', Pending: '#f06b6b' };
                              return <Cell key={i} fill={colors[entry.name] || COLORS[i]} stroke="transparent" />;
                            })}
                          </Pie>
                          <Tooltip
                            formatter={(v) => fmt(v)}
                            contentStyle={tooltipStyle}
                            itemStyle={{ color: 'var(--text)' }}
                          />
                          <Legend
                            formatter={(v) => <span style={{ fontSize: 11, color: 'var(--text2)' }}>{v}</span>}
                            iconType="circle"
                            iconSize={8}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        {statusData.map(d => {
                          const total = statusData.reduce((s, x) => s + x.value, 0);
                          const colors = { Settled: 'var(--green)', Partial: 'var(--amber)', Pending: 'var(--red)' };
                          return (
                            <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                              <span style={{ color: colors[d.name] }}>{d.name}</span>
                              <span style={{ fontFamily: 'var(--mono)', fontWeight: 500 }}>
                                {fmt(d.value)} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({Math.round((d.value / total) * 100)}%)</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
