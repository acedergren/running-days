# Configuration Reference

Complete reference for environment variables and configuration options in Running Days.

## Environment Variables

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | `file:./data/running-days.db` | SQLite database file path |

**Examples:**

```bash
# Default (development)
# Uses ./data/running-days.db relative to project root

# Custom path
DATABASE_URL=file:/var/data/running-days.db

# Absolute path on Linux/Mac
DATABASE_URL=file:/home/user/data/running-days.db

# Windows
DATABASE_URL=file:C:/Users/user/data/running-days.db
```

### Observability (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | - | OpenTelemetry collector endpoint |
| `OTEL_SERVICE_NAME` | No | `running-days` | Service name for traces |

**Examples:**

```bash
# Local Jaeger/Grafana Tempo
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Production collector
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.example.com:4318
OTEL_SERVICE_NAME=running-days-prod
```

### Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5173` (dev) / `3000` (prod) | HTTP server port |
| `HOST` | No | `localhost` | Server bind address |
| `ORIGIN` | No | Auto-detected | Full origin URL for CORS |

**Examples:**

```bash
# Development (defaults)
# PORT=5173
# HOST=localhost

# Production
PORT=3000
HOST=0.0.0.0
ORIGIN=https://app.running-days.com
```

### Build Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `ADAPTER` | No | `node` | SvelteKit adapter (`node` or `static`) |

---

## Configuration Files

### drizzle.config.ts

Database migration configuration:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./data/running-days.db',
  },
});
```

### svelte.config.js

SvelteKit configuration:

```javascript
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true,
    }),
    alias: {
      $lib: './src/lib',
    },
  },
};
```

### vite.config.ts

Vite build configuration:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    port: 5173,
    host: 'localhost',
  },
});
```

### tailwind.config.js

Not required - Tailwind CSS 4 uses `@config` directive in CSS:

```css
/* src/app.css */
@import 'tailwindcss';

@theme {
  /* Custom theme tokens */
  --color-accent-primary: oklch(0.72 0.2 25);
  --font-display: 'Space Grotesk', sans-serif;
}
```

---

## Database Setup

### Initial Setup

```bash
# Generate migration from schema
pnpm run db:generate

# Apply migrations (creates database if not exists)
pnpm run db:migrate
```

### Database Location

Default: `./data/running-days.db`

The directory is created automatically. For production, consider:

```bash
# Create persistent data directory
mkdir -p /var/data/running-days
chown appuser:appuser /var/data/running-days

# Set environment variable
export DATABASE_URL=file:/var/data/running-days/running-days.db
```

### Backup

```bash
# SQLite backup (while running - uses WAL mode)
sqlite3 data/running-days.db ".backup backup.db"

# Or simply copy (when app is stopped)
cp data/running-days.db backup.db
```

---

## Webhook Token Setup

### Create Token via Drizzle Studio

```bash
pnpm run db:studio
```

1. Navigate to `webhook_tokens` table
2. Insert new row:
   - `token`: Secure random string
   - `name`: Descriptive name (e.g., "iPhone 15 Pro")
   - `is_active`: `1`

### Create Token via CLI

```bash
# Generate a secure random token
TOKEN=$(openssl rand -hex 32)
echo "Your token: $TOKEN"

# Insert into database
sqlite3 data/running-days.db "INSERT INTO webhook_tokens (token, name, is_active, created_at) VALUES ('$TOKEN', 'My Device', 1, datetime('now'));"
```

### Token Security Best Practices

1. **Use long, random tokens** (32+ characters)
2. **Never commit tokens** to version control
3. **Rotate tokens** periodically
4. **Disable unused tokens** (set `is_active = 0`)
5. **Monitor `last_used_at`** for suspicious activity

---

## Deployment Configurations

### Node.js Deployment

```bash
# Build
pnpm run build

# Environment
export NODE_ENV=production
export PORT=3000
export DATABASE_URL=file:/var/data/running-days.db

# Start
node build
```

### Docker

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/data/running-days.db

VOLUME /data

EXPOSE 3000
CMD ["node", "build"]
```

```bash
docker build -t running-days .
docker run -d \
  -p 3000:3000 \
  -v running-days-data:/data \
  running-days
```

### Cloudflare Pages (Static Mode)

For static deployment without database:

```bash
# Use static adapter
pnpm run build:cf

# Deploy to Cloudflare Pages
pnpm run deploy:cf
```

Note: Static mode uses demo data only. Full functionality requires Node.js runtime.

### systemd Service

```ini
[Unit]
Description=Running Days
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/running-days
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_URL=file:/var/data/running-days/running-days.db
ExecStart=/usr/bin/node build
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable running-days
sudo systemctl start running-days
```

---

## Goal Configuration

### Default Goal

If no goal exists for the current year, the app creates one with `target_days = 300`.

### Modify Goal

```bash
# View current goals
sqlite3 data/running-days.db "SELECT * FROM goals;"

# Update goal for 2025
sqlite3 data/running-days.db "UPDATE goals SET target_days = 250 WHERE year = 2025;"

# Insert new goal
sqlite3 data/running-days.db "INSERT INTO goals (year, target_days, created_at, updated_at) VALUES (2026, 300, datetime('now'), datetime('now'));"
```

---

## Performance Tuning

### SQLite Configuration

The app uses WAL mode for better concurrency:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;  -- 64MB cache
PRAGMA temp_store = MEMORY;
```

### Memory Limits

For limited-memory environments:

```bash
# Limit Node.js heap
export NODE_OPTIONS="--max-old-space-size=256"
```

### Connection Pooling

Not applicable for SQLite (single-writer, embedded database).

---

## Troubleshooting

### Database Locked

```bash
# Check for active connections
fuser data/running-days.db

# Force unlock (use with caution)
sqlite3 data/running-days.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

### Migration Failures

```bash
# Check current migration state
ls drizzle/

# Manual migration
sqlite3 data/running-days.db < drizzle/0001_initial.sql
```

### Port Already in Use

```bash
# Find process using port
lsof -i :5173

# Kill process
kill -9 <PID>
```
