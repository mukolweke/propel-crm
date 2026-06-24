# Propel CRM — Deployment & Bootstrap

How to provision a new environment without hardcoded or guessable credentials.

## Prerequisites

- MongoDB Atlas cluster (or local MongoDB for development)
- `server/.env` filled from `server/.env.example` (JWT secrets, `MONGODB_URI`, SMTP, etc.)
- **Never commit** real passwords or connection strings to git

## Bootstrap super admin (first deploy)

The seed script creates the initial `super_admin` account **only when one does not already exist** for the configured email. It does **not** ship with a default password.

### 1. Set bootstrap environment variables

Set these in your shell, CI secret store, or hosting provider — **not** in committed files:

| Variable | Required | Description |
|----------|----------|-------------|
| `SEED_ADMIN_EMAIL` | Yes | Email for the initial super admin |
| `SEED_ADMIN_PASSWORD` | Yes | Strong temporary password (same rules as user passwords) |
| `SEED_CONFIRM` | Yes in production | Must be `yes` to allow seeding when `NODE_ENV=production` |

Password policy: minimum 8 characters, uppercase, lowercase, digit, and special character.

**Local development example:**

```bash
cd server
export SEED_ADMIN_EMAIL="you@your-domain.com"
export SEED_ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 20)Aa1!"
npm run seed
```

Use a password manager to save `SEED_ADMIN_PASSWORD` until first login, then clear it from your shell history.

**Production / staging example (Render, Railway, etc.):**

1. Add `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` as **secret** environment variables in the host dashboard.
2. Set `SEED_CONFIRM=yes` for the one-time bootstrap job only.
3. Run `npm run seed` as a release/post-deploy command, or exec into the container once.
4. Remove `SEED_CONFIRM` (and optionally `SEED_ADMIN_PASSWORD`) from the running service after bootstrap — they are not needed for normal API operation.

### 2. Run the seed script

```bash
cd server
npm run seed
```

If `SEED_ADMIN_EMAIL` or `SEED_ADMIN_PASSWORD` is missing, the script **exits with an error** and creates nothing.

### 3. First login — forced password change

The seeded super admin is created with `mustChangePassword: true`. On first login:

1. Sign in with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
2. The app redirects to **Change password** (API blocks all other app routes until this completes).
3. Set a new password; only then can you access the admin dashboard.

This is enforced server-side via `assertNotMustChangePassword` on protected GraphQL operations and client-side route guards.

### 4. Onboard agents

After changing the bootstrap password, create agent accounts from **Admin → Users** in the UI (or `createUser` GraphQL mutation). Each new agent also receives `mustChangePassword: true`.

## Docker

```bash
# server/.env must include MONGODB_URI, JWT secrets, SMTP, etc.
export SEED_ADMIN_EMAIL="you@your-domain.com"
export SEED_ADMIN_PASSWORD="YourStr0ng!TempPass"
docker compose exec api npm run seed
```

## Resetting a environment (destructive)

| Command | Effect |
|---------|--------|
| `RESET_DB=yes npm run seed` | Wipes **all** data and recreates super admin from env vars |
| `CLEAR_DEMO=yes npm run seed` | Clears contacts/activity; keeps super admin for `SEED_ADMIN_EMAIL` |

Both require `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to be set.

## Security checklist

- [ ] Rotate any credentials that were ever committed to git (see Atlas → Database Access)
- [ ] Restrict MongoDB Network Access to deployment IPs (not `0.0.0.0/0`)
- [ ] Remove `SEED_ADMIN_PASSWORD` from long-lived production env after bootstrap
- [ ] Do not document real passwords in README, tickets, or chat

### Frontend environment

Cookie auth requires same-origin GraphQL requests in development. Configure the Vite proxy:

```env
VITE_GRAPHQL_URL=/graphql
VITE_API_PROXY_TARGET=http://localhost:4000
```

The API sets `httpOnly` JWT cookies at login. Mutations include an `X-CSRF-Token` header (double-submit cookie pattern).

### HTTPS (production)

The API enforces TLS in production:

- **HTTP → HTTPS:** App middleware returns `301` to `https://{host}{path}` when the request is not secure (uses `trust proxy` + `X-Forwarded-Proto` behind Render/Railway).
- **HSTS:** `Strict-Transport-Security: max-age=31536000; includeSubDomains` via Helmet when `NODE_ENV=production`.
- **Cookies:** `propel_access_token`, `propel_refresh_token`, and `propel_csrf` use `Secure` in production — browsers only send them over HTTPS.

**Required production env:**

```env
NODE_ENV=production
CORS_ORIGINS=https://your-frontend.vercel.app
```

`CORS_ORIGINS` must use `https://` URLs; the server refuses to start in production with `http://` origins.

**Manual verification after deploy:**

```bash
# Should 301 to HTTPS (or connection refused if the host blocks port 80)
curl -sI http://your-api.onrender.com/health

# Should include HSTS on HTTPS responses
curl -sI https://your-api.onrender.com/health | grep -i strict-transport-security
```

Frontend hosts (Vercel/Netlify) terminate TLS at the CDN; ensure `VITE_GRAPHQL_URL` uses `https://`.

## Related docs

- API setup: [server/README.md](server/README.md)
- Frontend: [README.md](README.md)
