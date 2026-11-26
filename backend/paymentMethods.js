'use strict';

const PAYMENT_METHODS = Object.freeze(['cash', 'online', 'unspecified']);

function normalizePaymentMethod(value, fallback = 'unspecified') {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return PAYMENT_METHODS.includes(normalized) ? normalized : null;
}

module.exports = { PAYMENT_METHODS, normalizePaymentMethod };
