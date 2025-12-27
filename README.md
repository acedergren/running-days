# Running Days

<p align="center">
  <img src="docs/dashboard-realistic-desktop.png" alt="Running Days Dashboard" width="700">
</p>

<p align="center">
  <strong>221 days. 1,756 km. One year of consistent running.</strong>
</p>

## Why Days, Not Streaks?

**Streaks are fragile. Consistency is sustainable.**

Most fitness apps celebrate streaks—run every single day or watch your progress reset to zero. Miss one day due to illness, travel, or life? Your 47-day streak becomes worthless.

**Running Days takes a different approach**: track the *total number of days* you run each year, aiming for a realistic goal like 300 days.

### The Math of Consistency

| Approach | Days Off Allowed | Reality |
|----------|------------------|---------|
| Daily Streak | 0 days/year | Unsustainable, leads to injury |
| 300 Days Goal | 65 days/year | ~5 days/week, room for rest & life |

With a 300-day goal, you can:
- Take a full week off when sick
- Skip runs during travel
- Rest when your body needs it
- Still achieve an impressive 82% running rate

<p align="center">
  <img src="docs/dashboard-realistic-mobile.png" alt="Running Days Mobile View" width="300">
</p>

<p align="center">
  <em>Track your year-long journey, not just your current streak</em>
</p>

## Features

- **Year-Long Progress**: See your running days accumulate throughout the year
- **On-Track Indicator**: Know if you're ahead or behind your goal pace
- **Automatic Sync**: Connects to Apple Health via Health Auto Export
- **Goal Management**: Set and adjust yearly targets via the settings page
- **Insights Dashboard**: Monthly charts, pace trends, and personal bests
- **PWA Support**: Install on your phone for quick access
- **Beautiful Dark UI**: Easy on the eyes during early morning runs

## Architecture

Running Days is built as a **monorepo** with separate frontend and backend services:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Landing Page   │     │   Dashboard     │     │   Mobile App    │
│ (Static Svelte) │     │   (SvelteKit)   │     │    (Future)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         └──────────────│   Backend API   │──────────────┘
                        │    (Fastify)    │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   PostgreSQL    │
                        │   (SQLite dev)  │
                        └─────────────────┘
```

### Monorepo Structure

```
running-days/
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Formatters, date utilities
│   ├── database/         # Drizzle ORM schema
│   ├── business-logic/   # Auth, workout processing, goals
│   └── observability/    # Logging, metrics, audit
│
├── apps/
│   ├── api/              # Fastify Backend API
│   ├── landing/          # Static landing page (www.running-days.com)
│   ├── dashboard/        # SvelteKit web app (app.running-days.com)
│   └── web/              # Legacy monolith (deprecated)
│
└── docker-compose.yml    # Local development orchestration
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | SvelteKit 2, Svelte 5 (runes), Tailwind CSS 4 |
| Backend | Fastify 5, TypeScript |
| Database | SQLite (dev) / PostgreSQL (prod), Drizzle ORM |
| Auth | JWT (jose), httpOnly cookies |
| Charts | LayerChart + D3 |
| Monorepo | pnpm workspaces + Turborepo |
| Testing | Vitest |
| Observability | Pino, Prometheus, Grafana |

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+

### Development

```bash
# Clone and install
git clone https://github.com/acedergren/running-days.git
cd running-days
pnpm install

# Build shared packages
pnpm build

# Start API server (port 3000)
pnpm --filter @running-days/api dev

# Start dashboard (port 5173)
pnpm --filter @running-days/dashboard dev
```

### Docker Compose

```bash
# Start all services
docker compose up

# API:       http://localhost:3000
# Dashboard: http://localhost:3001
```

### Environment Variables

Create `.env` files in each app:

**apps/api/.env**
```bash
DATABASE_URL=./data/running-days.db
JWT_SECRET=your-secret-at-least-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-at-least-32-characters
```

**apps/dashboard/.env**
```bash
API_BASE_URL=http://localhost:3000
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/auth/login` | POST | Login with email/password |
| `/api/v1/auth/logout` | POST | Clear auth cookies |
| `/api/v1/auth/refresh` | POST | Refresh access token |
| `/api/v1/auth/me` | GET | Get current user |
| `/api/v1/goals` | GET/POST | List/create goals |
| `/api/v1/goals/:year` | GET/PUT/DELETE | Manage specific goal |
| `/api/v1/goals/:year/progress` | GET | Full progress with streaks |
| `/api/v1/stats/dashboard` | GET | Dashboard data |
| `/api/v1/stats/insights` | GET | Charts and analytics |
| `/api/webhook` | POST | Health Auto Export webhook |

## Connecting Apple Health

This app syncs with [Health Auto Export](https://www.healthexportapp.com/):

1. Install Health Auto Export on your iPhone
2. Create a user account via the API
3. Configure webhook URL: `https://api.running-days.com/api/webhook?token=YOUR_TOKEN`
4. Select "Running" workouts and enable auto-sync

## Commands

```bash
# Development
pnpm dev                          # Start all apps in dev mode
pnpm build                        # Build all packages
pnpm test                         # Run all tests
pnpm check                        # Type-check all packages

# Specific apps
pnpm --filter @running-days/api dev
pnpm --filter @running-days/dashboard dev
pnpm --filter @running-days/landing build

# Database
pnpm --filter @running-days/database generate
pnpm --filter @running-days/database migrate
```

## CI/CD

The GitHub Actions pipeline:
1. **Lint & Type Check** - Validates code quality
2. **Unit Tests** - Runs Vitest test suites
3. **Build** - Builds all apps in parallel
4. **Docker** - Builds container images (main branch only)
5. **Security** - Audits dependencies

## License

GNU Affero General Public License v3.0 - see [LICENSE](LICENSE)

---

<p align="center">
  <em>Built for runners who want sustainable consistency, not unsustainable perfection.</em>
</p>
