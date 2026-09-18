import { useMemo, useState } from 'react';
import { statusBadgeClass, statusLabel, pct, progressColor } from '../utils';

// ── TagInput ─────────────────────────────────────────────────────────────────
export function TagInput({ value = [], onChange, suggestions = [] }) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);

  const normalizedSuggestions = useMemo(() => {
    return [...new Set(suggestions.map(t => {
      const name = typeof t === 'string' ? t : t?.name;
      return name?.trim().toLowerCase();
    }).filter(Boolean))]
      .filter(tag => !value.includes(tag))
      .sort((a, b) => a.localeCompare(b));
  }, [suggestions, value]);

  const filteredSuggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    const tags = q
      ? normalizedSuggestions.filter(tag => tag.includes(q))
      : normalizedSuggestions;
    return tags.slice(0, 8);
  }, [input, normalizedSuggestions]);

  function addTagValue(rawTag) {
    const tag = rawTag.trim().toLowerCase();
    if (!tag) return;
    if (!value.includes(tag)) onChange([...value, tag]);
    setInput('');
  }

  function addTag(e) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      addTagValue(input);
    }
  }

  function removeTag(tag) {
    onChange(value.filter(t => t !== tag));
  }

  return (
    <div className="tag-input-wrap">
      <div className="tags-wrap" style={{ marginBottom: value.length ? '8px' : 0 }}>
        {value.map(tag => (
          <span key={tag} className="tag">
            #{tag}
            <button className="tag-remove" onClick={() => removeTag(tag)}>×</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder="Type tag + Enter"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={addTag}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {focused && filteredSuggestions.length > 0 && (
        <div className="tag-suggestions">
          {filteredSuggestions.map(tag => (
            <button
              key={tag}
              type="button"
              className="tag-suggestion"
              onMouseDown={e => {
                e.preventDefault();
                addTagValue(tag);
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${statusBadgeClass(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
export function ProgressBar({ used, total }) {
  const p = pct(used, total);
  const color = progressColor(p);
  return (
    <div>
      <div className="progress-wrap">
        <div className={`progress-bar ${color}`} style={{ width: `${p}%` }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, display: 'block' }}>
        {Math.round(p)}%
      </span>
    </div>
  );
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
export function ConfirmModal({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text2)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Loading ───────────────────────────────────────────────────────────────────
export function Loading() {
  return (
    <div className="loading">
      <div className="spinner" />
      <span>Loading…</span>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', message = 'No records found', action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p>{message}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
