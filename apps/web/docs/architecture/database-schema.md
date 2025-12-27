# Database Schema Reference

Running Days uses **SQLite** with **Drizzle ORM** for type-safe database access. The schema is defined in `src/lib/server/db/schema.ts`.

## Tables Overview

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `workouts` | Individual running workout records | `id` (UUID) |
| `daily_stats` | Aggregated stats per day | `date` (YYYY-MM-DD) |
| `goals` | Yearly target configuration | `id` (autoincrement) |
| `webhook_tokens` | API authentication tokens | `id` (autoincrement) |

---

## workouts

Stores individual running workout records imported from Apple Health.

### Schema

```sql
CREATE TABLE workouts (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    distance_meters REAL NOT NULL,
    energy_burned_kcal REAL,
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    avg_pace_seconds_per_km REAL,
    elevation_gain_meters REAL,
    weather_temp REAL,
    weather_condition TEXT,
    source TEXT DEFAULT 'health_auto_export',
    raw_payload TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX workouts_date_idx ON workouts(date);
```

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | TEXT | No | UUID from Health Auto Export or generated |
| `date` | TEXT | No | Date in YYYY-MM-DD format |
| `start_time` | TEXT | No | ISO 8601 datetime |
| `end_time` | TEXT | No | ISO 8601 datetime |
| `duration_seconds` | INTEGER | No | Workout duration in seconds |
| `distance_meters` | REAL | No | Distance in meters |
| `energy_burned_kcal` | REAL | Yes | Active calories burned |
| `avg_heart_rate` | INTEGER | Yes | Average heart rate (BPM) |
| `max_heart_rate` | INTEGER | Yes | Maximum heart rate (BPM) |
| `avg_pace_seconds_per_km` | REAL | Yes | Pace in seconds per kilometer |
| `elevation_gain_meters` | REAL | Yes | Elevation gained |
| `weather_temp` | REAL | Yes | Temperature during workout |
| `weather_condition` | TEXT | Yes | Weather description |
| `source` | TEXT | No | Data source identifier |
| `raw_payload` | TEXT | Yes | Original JSON for debugging |
| `created_at` | TEXT | No | Record creation timestamp |
| `updated_at` | TEXT | No | Last update timestamp |

### TypeScript Types

```typescript
type Workout = {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    durationSeconds: number;
    distanceMeters: number;
    energyBurnedKcal: number | null;
    avgHeartRate: number | null;
    maxHeartRate: number | null;
    avgPaceSecondsPerKm: number | null;
    elevationGainMeters: number | null;
    weatherTemp: number | null;
    weatherCondition: string | null;
    source: string | null;
    rawPayload: string | null;
    createdAt: string;
    updatedAt: string;
};
```

---

## daily_stats

Aggregated statistics for each day that has at least one run. One row per unique running day.

### Schema

```sql
CREATE TABLE daily_stats (
    date TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    run_count INTEGER NOT NULL DEFAULT 1,
    total_distance_meters REAL NOT NULL,
    total_duration_seconds INTEGER NOT NULL,
    avg_pace_seconds_per_km REAL,
    longest_run_meters REAL,
    fastest_pace_seconds_per_km REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX daily_stats_year_idx ON daily_stats(year);
```

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `date` | TEXT | No | Date in YYYY-MM-DD format (primary key) |
| `year` | INTEGER | No | Year for easy filtering |
| `run_count` | INTEGER | No | Number of runs that day |
| `total_distance_meters` | REAL | No | Sum of all run distances |
| `total_duration_seconds` | INTEGER | No | Sum of all run durations |
| `avg_pace_seconds_per_km` | REAL | Yes | Weighted average pace |
| `longest_run_meters` | REAL | Yes | Longest single run |
| `fastest_pace_seconds_per_km` | REAL | Yes | Fastest single run pace |
| `created_at` | TEXT | No | Record creation timestamp |
| `updated_at` | TEXT | No | Last update timestamp |

### Aggregation Logic

When multiple workouts occur on the same day:

```typescript
// Total stats are summed
totalDistanceMeters = sum(all workout distances)
totalDurationSeconds = sum(all workout durations)
runCount = count(workouts)

// Average pace is weighted by distance
avgPaceSecondsPerKm = totalDurationSeconds / (totalDistanceMeters / 1000)

// Best performances are tracked
longestRunMeters = max(all workout distances)
fastestPaceSecondsPerKm = min(all workout paces)  // Lower = faster
```

---

## goals

Yearly goal configuration. Each year has one goal record.

### Schema

```sql
CREATE TABLE goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL UNIQUE,
    target_days INTEGER NOT NULL DEFAULT 300,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Auto-incrementing ID |
| `year` | INTEGER | No | Year (unique constraint) |
| `target_days` | INTEGER | No | Target running days (default: 300) |
| `created_at` | TEXT | No | Record creation timestamp |
| `updated_at` | TEXT | No | Last update timestamp |

### Default Goal

If no goal exists for the current year, one is automatically created with `target_days = 300`.

---

## webhook_tokens

API authentication tokens for the webhook endpoint.

### Schema

```sql
CREATE TABLE webhook_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_used_at TEXT,
    created_at TEXT NOT NULL
);
```

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Auto-incrementing ID |
| `token` | TEXT | No | Secret token (unique) |
| `name` | TEXT | No | Human-readable identifier |
| `is_active` | INTEGER | No | 1 = active, 0 = disabled |
| `last_used_at` | TEXT | Yes | Last successful use timestamp |
| `created_at` | TEXT | No | Token creation timestamp |

---

## Indexes

| Index | Table | Column(s) | Purpose |
|-------|-------|-----------|---------|
| `workouts_date_idx` | workouts | date | Fast queries by date |
| `daily_stats_year_idx` | daily_stats | year | Fast year aggregations |

---

## Migrations

Migrations are managed by Drizzle Kit and stored in `drizzle/` directory.

### Commands

```bash
# Generate migration from schema changes
pnpm run db:generate

# Apply pending migrations
pnpm run db:migrate

# Open Drizzle Studio (visual database browser)
pnpm run db:studio
```

---

## Common Queries

### Count Running Days for Year

```typescript
const runningDays = await db
    .select({ count: sql<number>`count(*)` })
    .from(dailyStats)
    .where(eq(dailyStats.year, 2025));
```

### Get Year Statistics

```typescript
const stats = await db
    .select({
        totalDistance: sql<number>`sum(${dailyStats.totalDistanceMeters})`,
        totalDuration: sql<number>`sum(${dailyStats.totalDurationSeconds})`,
        avgPace: sql<number>`avg(${dailyStats.avgPaceSecondsPerKm})`
    })
    .from(dailyStats)
    .where(eq(dailyStats.year, 2025));
```

### Get Recent Workouts

```typescript
const recent = await db
    .select()
    .from(workouts)
    .orderBy(desc(workouts.startTime))
    .limit(10);
```

### Check for Duplicate Workout

```typescript
const existing = await db.query.workouts.findFirst({
    where: eq(workouts.id, workoutId)
});
```
