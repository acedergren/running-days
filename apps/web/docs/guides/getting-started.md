# Getting Started with Running Days

This guide will help you set up Running Days to track your yearly running goal with automatic Apple Health sync.

## Prerequisites

- **Node.js 22+** - [Download](https://nodejs.org/)
- **pnpm** - Install with `npm install -g pnpm`
- **iOS Device** with Apple Health data
- **Health Auto Export** app - [App Store](https://apps.apple.com/app/health-auto-export-json-csv/id1115567069)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/acedergren/running-days.git
cd running-days

# Install dependencies
pnpm install

# Navigate to web app
cd apps/web
```

### 2. Set Up the Database

```bash
# Generate initial migration
pnpm run db:generate

# Apply migrations
pnpm run db:migrate
```

This creates an SQLite database at `data/running-days.db`.

### 3. Create a Webhook Token

You need a token to authenticate the Health Auto Export webhook. Create one using Drizzle Studio:

```bash
pnpm run db:studio
```

In the Studio UI:
1. Navigate to `webhook_tokens` table
2. Click "Insert Row"
3. Fill in:
   - `token`: A secure random string (e.g., `my-secret-token-12345`)
   - `name`: A description (e.g., "iPhone 15 Pro")
   - `is_active`: `1` (true)
4. Save the record

Alternatively, use the SQLite CLI:

```bash
sqlite3 data/running-days.db "INSERT INTO webhook_tokens (token, name, is_active, created_at) VALUES ('my-secret-token', 'My iPhone', 1, datetime('now'));"
```

### 4. Start the Development Server

```bash
pnpm run dev
```

The app will be available at `http://localhost:5173`

---

## Configure Health Auto Export

### Step 1: Download the App

Install [Health Auto Export](https://apps.apple.com/app/health-auto-export-json-csv/id1115567069) from the App Store.

### Step 2: Create an Automation

1. Open Health Auto Export
2. Go to **Automations** tab
3. Tap **Create New Automation**
4. Select **REST API** as the export type

### Step 3: Configure the Webhook

| Setting | Value |
|---------|-------|
| **URL** | `http://your-server:5173/api/webhook?token=YOUR_TOKEN` |
| **Method** | POST |
| **Content Type** | JSON |
| **Data Types** | Workouts only |

Replace `YOUR_TOKEN` with the token you created earlier.

### Step 4: Set the Schedule

Choose when to sync:
- **On Workout Completion** - Recommended for real-time updates
- **Hourly** - Good for battery life
- **Manual** - Export when you want

### Step 5: Test the Connection

1. Tap **Test** in Health Auto Export
2. Check your Running Days dashboard for new data
3. Or verify via the API:

```bash
curl "http://localhost:5173/api/webhook?token=YOUR_TOKEN"
```

Expected response:
```json
{
  "status": "ok",
  "message": "Token valid",
  "tokenName": "My iPhone"
}
```

---

## Understanding the Dashboard

### Progress Ring

The central ring shows your progress toward 300 running days:

- **Inner number** - Days completed this year
- **Ring fill** - Visual percentage (82% = 247/300 days)
- **Glow intensity** - Indicates how close you are to goal

### Status Badge

Below the ring, a badge shows if you're ahead or behind pace:

| Badge | Meaning |
|-------|---------|
| 🟢 "12 days ahead" | You can take 12 rest days and still hit goal |
| 🟡 "On pace" | You're exactly where you need to be |
| 🔴 "5 days behind" | You need to run more frequently to catch up |

### Year Statistics

| Stat | Description |
|------|-------------|
| **Distance** | Total kilometers run this year |
| **Time** | Total hours spent running |
| **Avg Pace** | Average pace in min:sec per km |
| **Days Left** | Calendar days remaining in the year |

---

## Customizing Your Goal

The default goal is **300 running days** per year, which allows for 65 rest days.

To change your goal:

### Using Drizzle Studio

```bash
pnpm run db:studio
```

1. Navigate to `goals` table
2. Find or create a row for the current year
3. Update `target_days` to your desired number
4. Save

### Using SQLite

```bash
# Update existing goal
sqlite3 data/running-days.db "UPDATE goals SET target_days = 250 WHERE year = 2025;"

# Or insert new goal
sqlite3 data/running-days.db "INSERT INTO goals (year, target_days, created_at, updated_at) VALUES (2025, 250, datetime('now'), datetime('now'));"
```

### Goal Suggestions

| Goal | Rest Days | Difficulty |
|------|-----------|------------|
| 365 | 0 | Extreme (streak-based) |
| 300 | 65 | Challenging but flexible |
| 250 | 115 | Moderate |
| 200 | 165 | Beginner-friendly |

---

## Troubleshooting

### Webhook Not Receiving Data

1. **Check token is active:**
   ```bash
   sqlite3 data/running-days.db "SELECT token, is_active FROM webhook_tokens;"
   ```

2. **Test endpoint manually:**
   ```bash
   curl -X POST "http://localhost:5173/api/webhook?token=YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"data":{"workouts":[{"name":"Running","start":"2025-01-15T08:00:00Z","end":"2025-01-15T08:30:00Z","duration":1800,"distance":5000}]}}'
   ```

3. **Check Health Auto Export settings:**
   - Verify URL is correct
   - Ensure "Workouts" is selected as data type
   - Check iOS permissions for Health data

### Data Not Showing on Dashboard

1. **Verify data was imported:**
   ```bash
   sqlite3 data/running-days.db "SELECT COUNT(*) FROM workouts;"
   ```

2. **Check it's a running workout:**
   Only workouts with names containing "running" or "run" are counted.

3. **Verify the year:**
   Dashboard shows current year only. Check the `year` column in `daily_stats`.

### Development Server Issues

```bash
# Clear SvelteKit cache
rm -rf .svelte-kit

# Reinstall dependencies
pnpm install

# Restart dev server
pnpm run dev
```

---

## Production Deployment

### Option 1: Node.js Server

```bash
# Build the app
pnpm run build

# Start production server
node build
```

### Option 2: Cloudflare Pages (Static)

```bash
# Build for Cloudflare
pnpm run build:cf

# Deploy
pnpm run deploy:cf
```

Note: Cloudflare deployment uses demo data; database requires a Node.js runtime.

### Environment Variables

For production, set:

```bash
# Database path (Node.js)
DATABASE_URL=file:/path/to/running-days.db

# Optional: Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://your-collector:4318
```

---

## Next Steps

- Explore the [Insights](/insights) page for detailed analytics
- Check out the [API Reference](/docs/api/webhook.md) for webhook details
- Read the [Architecture Overview](/docs/architecture/system-overview.md) to understand the codebase
