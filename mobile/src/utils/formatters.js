import { COLORS, PAYMENT_METHOD_OPTIONS } from '../theme/theme';

/**
 * Format number as Indian currency string (₹ with commas)
 */
export function fmt(n) {
  if (n == null || isNaN(n)) return '₹0';
  const num = Number(n);
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Format ISO date string to DD-MM-YYYY
 */
export function fmtDate(d) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${date.getFullYear()}`;
  } catch {
    return String(d);
  }
}

/**
 * Format ISO datetime to DD-MM-YYYY, HH:mm
 */
export function fmtDateTime(d) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${date.getFullYear()}, ${hours}:${minutes}`;
  } catch {
    return String(d);
  }
}

/**
 * Today's date as YYYY-MM-DD
 */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function paymentMethodLabel(method) {
  const normalized = String(method || '').toLowerCase();
  return PAYMENT_METHOD_OPTIONS.find(option => option.value === normalized)?.label || 'Not specified';
}

/**
 * Status → color configuration
 */
export function statusBadgeConfig(status) {
  switch (status) {
    case 'SETTLED':
    case 'FULLY_USED':
      return {
        bg: COLORS.successBg,
        text: COLORS.success,
        border: COLORS.successDim,
      };
    case 'PARTIALLY_SETTLED':
    case 'PARTIALLY_USED':
      return {
        bg: COLORS.warningBg,
        text: COLORS.warning,
        border: COLORS.warningDim,
      };
    case 'PENDING':
      return {
        bg: COLORS.dangerBg,
        text: COLORS.danger,
        border: COLORS.dangerDim,
      };
    case 'UNUSED':
      return {
        bg: COLORS.infoBg,
        text: COLORS.info,
        border: COLORS.infoDim,
      };
    default:
      return {
        bg: COLORS.bgElevated,
        text: COLORS.textMuted,
        border: COLORS.border,
      };
  }
}

/**
 * Status → human readable label
 */
export function statusLabel(status) {
  const map = {
    SETTLED: 'Settled',
    FULLY_USED: 'Fully Used',
    PARTIALLY_SETTLED: 'Partial',
    PARTIALLY_USED: 'Partial',
    PENDING: 'Pending',
    UNUSED: 'Unused',
  };
  return map[status] || status || 'Unknown';
}

/**
 * Clamp a number between min and max.
 */
export function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

/**
 * Compute fill percentage for progress bars.
 */
export function pct(used, total) {
  if (!total || total <= 0) return 0;
  return clamp((used / total) * 100, 0, 100);
}

/**
 * Progress bar color based on fill percentage.
 */
export function progressColor(p) {
  if (p >= 100) return COLORS.success;
  if (p >= 50) return COLORS.warning;
  return COLORS.danger;
}

/**
 * Relative time ago string
 */
export function timeAgo(d) {
  if (!d) return '';
  const now = new Date();
  const past = new Date(d);
  const diffSecs = Math.floor((now - past) / 1000);

  if (diffSecs < 60) return 'just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return fmtDate(d);
}
