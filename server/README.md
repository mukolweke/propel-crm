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
npm run seed    # optional — loads demo data
npm run dev     # http://localhost:4000/graphql
```

### Demo credentials (after seeding)

| Email | Password |
|-------|----------|
| alex@propel.re | password123 |
| sarah@propel.re | password123 |
| michael@propel.re | password123 |

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
  login(input: { email: "alex@propel.re", password: "password123" }) {
    accessToken
    refreshToken
    user { id fullName email role }
  }
}
```

Send authenticated requests with header:

```
Authorization: Bearer <accessToken>
```

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
5. Set env vars from `.env.example`
6. URL: `https://your-app.onrender.com/graphql`

### Backend — Railway

1. New project → deploy from repo
2. Set root to `server/`
3. Add `MONGODB_URI`, JWT secrets, `CORS_ORIGINS`
4. Railway auto-detects Node build

### Frontend — Vercel / Netlify

Deploy the Vue app separately. Set API URL in frontend env:

```
VITE_GRAPHQL_URL=https://your-api.onrender.com/graphql
```

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
| `npm run seed` | Load demo data |
| `npm run typecheck` | Type check only |

## Scaling notes (future)

- **Redis** — session cache / rate limiting (not implemented; design-ready)
- **Cloudinary** — profile images via `profileImage` field
- **Report snapshots** — pre-aggregated daily metrics model included
- Horizontal scale: stateless API + MongoDB Atlas handles connection pooling

## License

Private — portfolio / demo use.
