'use strict';

const { verifyAccessToken } = require('../jwt');

/**
 * authenticate — Hard-required auth middleware.
 * Extracts the Bearer token from Authorization header,
 * verifies it, and attaches `req.user` = { id, email, name }.
 * Returns 401 if missing/invalid/expired.
 */
function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid access token' });
  }
}

module.exports = { authenticate };
