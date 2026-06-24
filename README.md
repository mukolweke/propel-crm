# Propel CRM — EstatePulse Tracker

A privacy-first real estate contact tracking and reporting system built with Vue 3, Vite, Pinia, Vue Router, Tailwind CSS, and Headless UI.

## Features

- **Authentication** — Login, forgot password, route guards (mock auth)
- **Dashboard** — KPIs, charts, quick actions, activity feed
- **Contacts** — Table/grid views, search, filters, pagination, CRUD
- **Interactions** — Fast activity logging with timeline
- **Follow-ups** — Overdue/upcoming tasks, complete & reschedule
- **Reports** — Daily/weekly/monthly analytics with mock export
- **Shared Lists** — Privacy-first contact sharing with permissions
- **Settings** — Profile, password, notifications, preferences

## Tech Stack

- Vue 3 (Composition API)
- TypeScript
- Vite
- Pinia
- Vue Router
- Tailwind CSS v4
- Headless UI
- Heroicons
- Axios (API-ready)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Login

Sign in with credentials provided by your administrator. New accounts must change their password on first login.

See [DEPLOYMENT.md](DEPLOYMENT.md) for bootstrapping a new environment.

## Project Structure

```
src/
├── assets/          # Global styles
├── components/      # Reusable UI and feature components
├── composables/     # Shared composition functions
├── layouts/         # Auth and dashboard layouts
├── mock/            # Mock JSON data (55 contacts)
├── pages/           # Route pages
├── router/          # Vue Router config + guards
├── services/        # API and auth services
├── stores/          # Pinia stores
├── types/           # TypeScript interfaces
└── utils/           # Helpers and constants
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |

## Stitch Design Assets

This project was built to match the **EstatePulse Tracker** Stitch project (ID: `10933418778808578168`). To download Stitch screen images and HTML, set `STITCH_API_KEY` and use the [@google/stitch-sdk](https://www.npmjs.com/package/@google/stitch-sdk):

```bash
export STITCH_API_KEY=your-key
npx tsx scripts/fetch-stitch-assets.ts
```

## Backend Integration

The frontend is API-ready. Configure `VITE_API_URL` in `.env` and replace mock store methods with real API calls via `src/services/api.ts`.

## License

Private — Mukolwe Softs
