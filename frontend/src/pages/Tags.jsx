import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { fmt, fmtDate } from '../utils';
import { StatusBadge, Loading, EmptyState } from '../components/shared';

export default function Tags() {
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState({ incomes: [], expenses: [] });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Load all tags on mount
  useEffect(() => {
    api.dashboard.tags()
      .then(setTags)
      .finally(() => setLoading(false));
  }, []);

  // When a tag is selected, fetch matching incomes + expenses
  useEffect(() => {
    if (!selected) { setResults({ incomes: [], expenses: [] }); return; }
    setSearching(true);
    Promise.all([
      api.incomes.list({ tag: selected }),
      api.expenses.list({ tag: selected }),
    ]).then(([incomes, expenses]) => {
      setResults({ incomes, expenses });
    }).finally(() => setSearching(false));
  }, [selected]);

  if (loading) return <Loading />;

  const totalTagged = results.incomes.length + results.expenses.length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Tags</div>
          <div className="page-subtitle">{tags.length} tag{tags.length !== 1 ? 's' : ''} in use</div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

          {/* ── Tag list panel ── */}
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div className="card-header"><span className="card-title">All Tags</span></div>
            {tags.length === 0 ? (
              <div style={{ padding: '20px 16px', color: 'var(--text3)', fontSize: 13 }}>
                No tags yet. Add tags when creating incomes or expenses.
              </div>
            ) : (
              <div style={{ padding: '8px 8px' }}>
                {selected && (
                  <button
                    className="btn btn-ghost btn-xs"
                    style={{ margin: '4px 8px 8px', width: 'calc(100% - 16px)' }}
                    onClick={() => setSelected(null)}
                  >
                    ✕ Clear selection
                  </button>
                )}
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setSelected(tag.name === selected ? null : tag.name)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontFamily: 'var(--font)',
                      transition: 'all 0.1s',
                      background: selected === tag.name ? 'var(--accent-dim)' : 'transparent',
                      color: selected === tag.name ? 'var(--accent)' : 'var(--text2)',
                      fontWeight: selected === tag.name ? 600 : 400,
                    }}
                  >
                    <span style={{ color: 'var(--text3)', marginRight: 4 }}>#</span>
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Results panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {!selected ? (
              <div className="card">
                <EmptyState
                  icon="🏷"
                  message="Select a tag on the left to browse matching records"
                />
              </div>
            ) : searching ? (
              <Loading />
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                  <span className="tag" style={{ fontSize: 13, padding: '4px 12px' }}>
                    #{selected}
                  </span>
                  <span style={{ color: 'var(--text3)', fontSize: 13 }}>
                    {totalTagged} record{totalTagged !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Incomes */}
                {results.incomes.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Incomes ({results.incomes.length})</span>
                      <span style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--green)' }}>
                        {fmt(results.incomes.reduce((s, i) => s + i.amount, 0))} total
                      </span>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Source</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Remaining</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.incomes.map(inc => (
                            <tr key={inc.id} onClick={() => navigate(`/incomes/${inc.id}`)}>
                              <td style={{ fontWeight: 500 }}>{inc.source}</td>
                              <td style={{ color: 'var(--text2)' }}>{fmtDate(inc.date)}</td>
                              <td className="amount">{fmt(inc.amount)}</td>
                              <td className="amount" style={{ color: 'var(--green)' }}>
                                {fmt(inc.remaining_amount)}
                              </td>
                              <td><StatusBadge status={inc.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Expenses */}
                {results.expenses.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Expenses ({results.expenses.length})</span>
                      <span style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--red)' }}>
                        {fmt(results.expenses.reduce((s, e) => s + e.amount, 0))} total
                      </span>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Pending</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.expenses.map(exp => (
                            <tr key={exp.id} onClick={() => navigate(`/expenses/${exp.id}`)}>
                              <td style={{ fontWeight: 500 }}>{exp.title || exp.category}</td>
                              <td style={{ color: 'var(--text2)' }}>{exp.category}</td>
                              <td style={{ color: 'var(--text2)' }}>{fmtDate(exp.date)}</td>
                              <td className="amount">{fmt(exp.amount)}</td>
                              <td className="amount" style={{ color: exp.pending_amount > 0 ? 'var(--amber)' : 'var(--text3)' }}>
                                {fmt(exp.pending_amount)}
                              </td>
                              <td><StatusBadge status={exp.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {totalTagged === 0 && (
                  <div className="card">
                    <EmptyState icon="🔍" message={`No records tagged #${selected}`} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
