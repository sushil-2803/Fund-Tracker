/**
 * Format number as Indian currency string (₹ with commas)
 */
export function fmt(n) {
  if (n == null) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Format ISO date string to readable date
 */
export function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
}

/**
 * Format ISO datetime to readable datetime
 */
export function fmtDateTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}, ${hours}:${minutes}`;
}

/**
 * Today's date as YYYY-MM-DD for date inputs
 */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Status → badge class
 */
export function statusBadgeClass(status) {
  const map = {
    SETTLED: 'green',
    FULLY_USED: 'green',
    PARTIALLY_SETTLED: 'amber',
    PARTIALLY_USED: 'amber',
    PENDING: 'red',
    UNUSED: 'blue',
  };
  return map[status] || 'blue';
}

/**
 * Status → human label
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
  return map[status] || status;
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
  if (!total) return 0;
  return clamp((used / total) * 100, 0, 100);
}

/**
 * Progress bar color based on fill percentage.
 */
export function progressColor(p) {
  if (p >= 100) return 'green';
  if (p >= 50) return 'amber';
  return 'red';
}
