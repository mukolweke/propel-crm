# Propel CRM API

GraphQL backend for the Propel CRM real estate contact tracking system.

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Language | TypeScript |
| API | GraphQL (Apollo Server 4) |
| Database | MongoDB Atlas (free tier) |
| ODM | Mongoose |
| Auth | JWT (access + refresh) |
| Validation | Zod |

## Quick start

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB Atlas URI and JWT secrets

npm install
# Bootstrap super admin — see ../DEPLOYMENT.md
# export SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=...
npm run seed    # optional — creates super admin if missing
npm run dev     # http://localhost:4000/graphql
```

See [DEPLOYMENT.md](../DEPLOYMENT.md) for bootstrap credentials (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`) and first-login password change flow.

## Project structure

```
src/
├── config/          # env + database
├── graphql/         # schema, resolvers, types
├── modules/         # feature services (auth, contacts, …)
├── middleware/      # auth + authorization
├── models/          # Mongoose schemas
├── utils/           # jwt, logger, helpers
├── validators/      # Zod input schemas
└── server.ts
```

## GraphQL endpoint

- **Dev:** `http://localhost:4000/graphql`
- **Health:** `http://localhost:4000/health`

### Example: login

```graphql
mutation Login {
  login(input: { email: "your-email@example.com", password: "your-password" }) {
    mustChangePassword
    user { id fullName email role }
  }
}
```

## Cookie-based authentication

The API stores JWTs in **httpOnly, Secure, SameSite=Strict** cookies — not in `localStorage`. The Vue app must call GraphQL with `credentials: 'include'`.

**Local development:** use the Vite proxy so browser requests are same-origin:

```env
# .env (frontend root)
VITE_GRAPHQL_URL=/graphql
VITE_API_PROXY_TARGET=http://localhost:4000
```

State-changing requests (mutations) also send a double-submit `X-CSRF-Token` header matching the `propel_csrf` cookie set at login.

Login, refresh, and logout set/clear cookies server-side. GraphQL responses no longer include bearer tokens in the JSON body.

## Privacy & authorization

Contacts are **owner-scoped**. A user cannot read or modify another agent's contacts unless explicitly shared via `SharedAccess` with permission:

| Permission | Access |
|------------|--------|
| `view` | Read contact |
| `report` | Read + reporting |
| `edit` | Full edit |

Enforced in service layer + authorization helpers.

## Deployment (cheap / free tier)

### MongoDB Atlas (free)

1. Create cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Add database user + network access (0.0.0.0/0 for demo)
3. Copy connection string → `MONGODB_URI`

### Backend — Render (free tier)

1. Connect GitHub repo
2. **Root directory:** `server`
3. **Build:** `npm install && npm run build`
4. **Start:** `npm start`
5. Set env vars from `.env.example` (`NODE_ENV=production`, `CORS_ORIGINS=https://…`)
6. URL: `https://your-app.onrender.com/graphql`

Render terminates TLS at the edge and forwards `X-Forwarded-Proto: https`. The app redirects any plain-HTTP request to HTTPS and sets HSTS in production.

### Backend — Railway

1. New project → deploy from repo
2. Set root to `server/`
3. Add `MONGODB_URI`, JWT secrets, `NODE_ENV=production`, `CORS_ORIGINS=https://…`
4. Railway auto-detects Node build

### Frontend — Vercel / Netlify

Deploy the Vue app separately. Set API URL in frontend env:

```
VITE_GRAPHQL_URL=https://your-api.onrender.com/graphql
```

Use `https://` for both the SPA URL and GraphQL endpoint. Auth cookies are `Secure` in production and are not sent over plain HTTP.

### Docker (optional)

```bash
cd server
docker build -t propel-crm-api .
docker run -p 4000:4000 --env-file .env propel-crm-api
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Production server |
| `npm run seed` | Create super admin if missing (requires `SEED_ADMIN_*` env — see DEPLOYMENT.md) |
| `npm run typecheck` | Type check only |

## Scaling notes (future)

- **Redis** — session cache / rate limiting (not implemented; design-ready)
- **Cloudinary** — profile images via `profileImage` field
- **Report snapshots** — pre-aggregated daily metrics model included
- Horizontal scale: stateless API + MongoDB Atlas handles connection pooling

## License

Private — portfolio / demo use.
