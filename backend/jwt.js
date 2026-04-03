'use strict';

const jwt  = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'dev_access_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

/** Sign a short-lived access token containing the user payload. */
function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

/** Sign a long-lived refresh token (just the user id). */
function signRefreshToken(userId) {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

/** Verify an access token. Returns decoded payload or throws. */
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/** Verify a refresh token. Returns decoded payload or throws. */
function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/** SHA-256 hash a refresh token for safe DB storage. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Parse REFRESH_EXPIRES (e.g. "7d", "30d", "1h") into a JS Date. */
function refreshExpiresAt() {
  const str = REFRESH_EXPIRES;
  const unit = str.slice(-1);
  const val  = parseInt(str.slice(0, -1), 10);
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] || 86400000;
  return new Date(Date.now() + val * ms);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  refreshExpiresAt,
};
