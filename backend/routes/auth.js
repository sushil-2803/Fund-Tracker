'use strict';

const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, refreshExpiresAt } = require('../jwt');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ── Verify Google ID token and return payload ─────────────────────────────────
async function verifyGoogleToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not configured. Set it in backend/.env');
  }
  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error('Invalid Google token payload');
  return payload;
}

// ── Issue JWT access + refresh token pair ─────────────────────────────────────
async function issueTokens(user) {
  const accessToken  = signAccessToken({ sub: user.id, email: user.email, name: user.name });
  const refreshToken = signRefreshToken(user.id);
  const tokenHash    = hashToken(refreshToken);

  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [uuidv4(), user.id, tokenHash, refreshExpiresAt()]
  );

  return { accessToken, refreshToken };
}

// ── POST /api/auth/google ─────────────────────────────────────────────────────
// Accepts the Google ID token from the frontend after the user signs in with Google.
// Creates or updates the user row (upsert), then issues our own JWT pair.
router.post('/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'id_token is required' });

  try {
    const googlePayload = await verifyGoogleToken(id_token);

    const {
      sub:     googleId,
      email,
      name,
      picture: avatarUrl,
      email_verified,
    } = googlePayload;

    if (!email_verified) {
      return res.status(400).json({ error: 'Google account email is not verified' });
    }

    // Upsert: find by google_id, create if new, update name/avatar if existing
    const user = await transaction(async (client) => {
      const { rows: existing } = await client.query(
        `SELECT id, email, name, avatar_url FROM users WHERE google_id = $1`,
        [googleId]
      );

      if (existing[0]) {
        // Update name and avatar in case they changed on Google's side
        await client.query(
          `UPDATE users SET name = $1, avatar_url = $2 WHERE id = $3`,
          [name, avatarUrl || null, existing[0].id]
        );
        return { ...existing[0], name, avatar_url: avatarUrl };
      }

      // New user — check if email is already registered under a different google_id
      const { rows: byEmail } = await client.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
        [email]
      );
      if (byEmail[0]) {
        throw new Error('An account with this email already exists');
      }

      const id = uuidv4();
      await client.query(
        `INSERT INTO users (id, google_id, email, name, avatar_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, googleId, email.toLowerCase(), name, avatarUrl || null]
      );
      return { id, email: email.toLowerCase(), name, avatar_url: avatarUrl };
    });

    const { accessToken, refreshToken } = await issueTokens(user);

    res.json({
      user: {
        id:         user.id,
        email:      user.email,
        name:       user.name,
        avatar_url: user.avatar_url,
      },
      access_token:  accessToken,
      refresh_token: refreshToken,
    });
  } catch (err) {
    const is400 = ['not verified', 'already exists', 'not configured', 'Invalid'].some(s => err.message.includes(s));
    res.status(is400 ? 400 : 500).json({ error: err.message });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token is required' });

  try {
    let payload;
    try {
      payload = verifyRefreshToken(refresh_token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const tokenHash = hashToken(refresh_token);
    const { rows } = await query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at,
              u.email, u.name, u.avatar_url
       FROM   refresh_tokens rt
       JOIN   users u ON u.id = rt.user_id
       WHERE  rt.token_hash = $1`,
      [tokenHash]
    );

    const stored = rows[0];
    if (!stored)           return res.status(401).json({ error: 'Refresh token not found' });
    if (stored.revoked_at) return res.status(401).json({ error: 'Refresh token revoked' });
    if (new Date(stored.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Rotate: revoke old, issue new pair
    await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, [stored.id]);

    const user = { id: stored.user_id, email: stored.email, name: stored.name, avatar_url: stored.avatar_url };
    const { accessToken, refreshToken: newRefresh } = await issueTokens(user);

    res.json({ access_token: accessToken, refresh_token: newRefresh });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  const { refresh_token } = req.body;
  try {
    if (refresh_token) {
      const tokenHash = hashToken(refresh_token);
      await query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [tokenHash, req.user.id]
      );
    } else {
      await query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [req.user.id]
      );
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
