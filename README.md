# FundTracker 💸

A full-stack **Fund Allocation Expense Tracker** with **Google OAuth** authentication.
Every income, expense, and allocation is privately scoped to the signed-in user.

---

## Tech Stack

| Layer    | Technology                                              |
|----------|---------------------------------------------------------|
| Frontend | React 18, React Router 6, Recharts, Vite                |
| Auth UI  | `@react-oauth/google` (Google Sign-In button)           |
| Backend  | Node.js ≥ 18, Express 4                                 |
| Auth API | `google-auth-library` (ID token verification) + JWT     |
| Database | PostgreSQL 14+ via `pg`                                 |

---

## Authentication Flow

```
User clicks "Sign in with Google"
        │
        ▼ (Google popup / One-Tap)
Google returns an ID token (signed JWT from Google)
        │
        ▼
POST /api/auth/google  { id_token }
        │
        ▼ (backend verifies with google-auth-library)
Upsert user in DB (create on first login, update name/avatar on subsequent logins)
        │
        ▼
Issue our own JWT pair:
  access_token  → stored in JS memory (15 min, never in localStorage)
  refresh_token → stored in localStorage (7 days, rotated on use, hashed in DB)
        │
        ▼
All API requests: Authorization: Bearer <access_token>
        │
  Token expired? → POST /api/auth/refresh → new pair → retry transparently
  Refresh fails? → clear tokens → redirect to /login
```

No passwords. No registration form. Users are created automatically on first Google Sign-In.

---

## Quick Start

### 1 — Get a Google Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorised JavaScript origins:
   - `http://localhost:3000` (dev)
   - `https://yourdomain.com` (prod)
6. Click **Create** — copy the **Client ID**

### 2 — Configure environment

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/fund_tracker
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<different-64-char-hex>

JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
PORT=3001
CLIENT_ORIGIN=http://localhost:3000
NODE_ENV=development
```

**Frontend** (`frontend/.env.local`):
```env
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```
> Use the **same Client ID** in both files.

### 3 — Install & migrate

```bash
# Install all dependencies
npm run install:all

# Create the PostgreSQL database
createdb fund_tracker

# Run migrations (creates all tables)
npm run migrate

# Load demo data (optional)
npm run seed
```

### 4 — Start dev servers

```bash
npm install        # installs concurrently at root (one-time)
npm run dev        # starts API on :3001 and UI on :3000 simultaneously
```

Open **http://localhost:3000** → Google Sign-In page.

---

## Project Structure

```
fund-tracker/
├── backend/
│   ├── server.js               # Express entry + startup DB check
│   ├── db.js                   # pg Pool + query() / transaction()
│   ├── jwt.js                  # signAccessToken, verifyRefreshToken, hashToken
│   ├── helpers.js              # enrichIncome / enrichExpense / tag utils
│   ├── migrate.js              # Idempotent schema (users, refresh_tokens, incomes…)
│   ├── seed.js                 # Demo data with synthetic Google users
│   ├── .env.example
│   ├── middleware/
│   │   └── auth.js             # Bearer token middleware → req.user
│   └── routes/
│       ├── auth.js             # POST /google, /refresh, /logout, GET /me
│       ├── incomes.js          # user-scoped CRUD
│       ├── expenses.js         # user-scoped CRUD
│       ├── allocations.js      # user-scoped, FOR UPDATE locking
│       └── dashboard.js        # user-scoped SQL aggregations
│
├── frontend/
│   ├── .env.example            # VITE_GOOGLE_CLIENT_ID
│   └── src/
│       ├── main.jsx            # GoogleOAuthProvider > BrowserRouter > AuthProvider
│       ├── App.jsx             # Auth guard + route tree
│       ├── api/client.js       # googleLogin(), tryRefresh(), Bearer header injection
│       ├── context/
│       │   ├── AuthContext.jsx # loginWithGoogle(), logout(), session restore
│       │   └── ToastContext.jsx
│       ├── components/
│       │   └── Sidebar.jsx     # Google avatar, live balances
│       └── pages/
│           ├── AuthPage.jsx    # GoogleLogin button from @react-oauth/google
│           ├── Profile.jsx     # Google account info, sign-out
│           └── …               # Dashboard, Incomes, Expenses, Allocations,
│                               # Analytics, Tags, NotFound
```

---

## API Reference

### Public endpoints
```
POST /api/auth/google   { id_token }   → { user, access_token, refresh_token }
POST /api/auth/refresh  { refresh_token } → { access_token, refresh_token }
GET  /api/health
```

### Protected endpoints (`Authorization: Bearer <access_token>`)
```
GET  /api/auth/me
POST /api/auth/logout   { refresh_token? }   # omit = revoke all sessions

GET/POST/PUT/DELETE  /api/incomes[/:id]
GET/POST/PUT/DELETE  /api/expenses[/:id]
GET/POST/DELETE      /api/allocations[/:id]
GET                  /api/dashboard/summary
GET                  /api/dashboard/tags
```

---

## Database Schema

```sql
users (id, google_id UNIQUE, email UNIQUE/LOWER, name, avatar_url, created_at, updated_at)
refresh_tokens (id, user_id→users, token_hash UNIQUE, expires_at, revoked_at)

incomes    (id, user_id→users, amount NUMERIC(14,2), source, date, notes, …)
expenses   (id, user_id→users, amount NUMERIC(14,2), category, date, notes, …)
allocations(id, user_id→users, income_id→incomes, expense_id→expenses, amount, note, …)

tags (id, name UNIQUE/LOWER)
income_tags  (income_id, tag_id)
expense_tags (expense_id, tag_id)
```

---

## Security Model

| Concern | Implementation |
|---------|---------------|
| Google ID token verification | `google-auth-library` — cryptographic check against Google's public keys |
| Session access token | Short-lived JWT (15 min) in JS memory only — survives navigation, lost on tab close |
| Session refresh token | Long-lived JWT (7d) in `localStorage`, SHA-256 hashed before DB storage |
| Refresh token rotation | Each `/refresh` revokes old token, issues new pair — reuse = full revoke |
| Data isolation | Every query has `WHERE user_id = $1` — 404 for cross-user access |
| Concurrent allocation | `SELECT … FOR UPDATE` prevents double-spending in race conditions |

---

## Production Checklist

- [ ] Set `GOOGLE_CLIENT_ID` and add your prod domain to Google OAuth origins
- [ ] Set strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (64+ bytes each)
- [ ] Set `NODE_ENV=production` (enables static SPA serving, quieter logs)
- [ ] Use `DATABASE_URL` with `?sslmode=require` for managed Postgres
- [ ] Run `npm run build` then `cd backend && npm start`
- [ ] Schedule periodic cleanup of expired refresh tokens:
  ```sql
  DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL;
  ```
